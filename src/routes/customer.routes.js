import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Parser as Json2csvParser } from 'json2csv';

import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { predictChurn, riskLevelFromScore } from '../services/ml.service.js';

const router = Router();

router.use(authenticate);

// Helper: build prisma where filter from query
function buildWhere(query) {
  const where = {};

  if (query.search) {
    const s = query.search;
    where.OR = [
      { customerCode: { contains: s, mode: 'insensitive' } },
      { paymentMethod: { contains: s, mode: 'insensitive' } },
      { contract: { contains: s, mode: 'insensitive' } },
      { internetService: { contains: s, mode: 'insensitive' } },
    ];
  }
  if (query.riskLevel) {
    const levels = String(query.riskLevel)
      .split(',')
      .filter((l) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(l));
    if (levels.length) where.riskLevel = { in: levels };
  }
  if (query.contract) where.contract = query.contract;
  if (query.internetService) where.internetService = query.internetService;
  if (query.gender) where.gender = query.gender;
  if (query.isChurned !== undefined && query.isChurned !== '') {
    where.isChurned = query.isChurned === 'true';
  }
  if (query.minTenure) where.tenure = { ...(where.tenure || {}), gte: Number(query.minTenure) };
  if (query.maxTenure) where.tenure = { ...(where.tenure || {}), lte: Number(query.maxTenure) };

  return where;
}

// GET /api/customers - list with filter, search, pagination
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    const where = buildWhere(req.query);

    const [total, items] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/export - export to CSV
router.get('/export', async (req, res, next) => {
  try {
    const where = buildWhere(req.query);
    const items = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const fields = [
      'customerCode',
      'gender',
      'seniorCitizen',
      'partner',
      'dependents',
      'tenure',
      'contract',
      'paperlessBilling',
      'paymentMethod',
      'monthlyCharges',
      'totalCharges',
      'phoneService',
      'multipleLines',
      'internetService',
      'onlineSecurity',
      'onlineBackup',
      'deviceProtection',
      'techSupport',
      'streamingTV',
      'streamingMovies',
      'churnRiskScore',
      'riskLevel',
      'isChurned',
      'createdAt',
    ];
    const parser = new Json2csvParser({ fields });
    const csv = parser.parse(items);

    res.header('Content-Type', 'text/csv');
    res.attachment(`customers-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!customer) throw new ApiError(404, 'Customer tidak ditemukan');
    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post(
  '/',
  [
    body('customerCode').notEmpty(),
    body('gender').isIn(['Male', 'Female']),
    body('tenure').isInt({ min: 0 }),
    body('contract').isIn(['Month-to-month', 'One year', 'Two year']),
    body('monthlyCharges').isFloat({ min: 0 }),
    body('totalCharges').isFloat({ min: 0 }),
    body('internetService').isIn(['DSL', 'Fiber optic', 'No']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const data = { ...req.body, createdById: req.user.id };

      // Try to predict churn dengan ML service (optional - skip kalau gagal)
      try {
        const prediction = await predictChurn(data);
        data.churnRiskScore = prediction.score;
        data.riskLevel = riskLevelFromScore(prediction.score);
        data.topRiskFactors = prediction.topFactors;
        data.lastPredictedAt = new Date();
      } catch (mlErr) {
        console.warn('[ML] prediction skipped:', mlErr.message);
      }

      const customer = await prisma.customer.create({ data });
      res.status(201).json({ customer });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    delete data.id;
    delete data.createdById;
    delete data.createdAt;

    // Re-predict kalau field penting berubah
    const fieldsThatAffectPrediction = [
      'tenure', 'contract', 'monthlyCharges', 'totalCharges',
      'internetService', 'paymentMethod',
    ];
    const shouldRepredict = fieldsThatAffectPrediction.some((f) => f in data);

    if (shouldRepredict) {
      const existing = await prisma.customer.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, 'Customer tidak ditemukan');
      try {
        const merged = { ...existing, ...data };
        const prediction = await predictChurn(merged);
        data.churnRiskScore = prediction.score;
        data.riskLevel = riskLevelFromScore(prediction.score);
        data.topRiskFactors = prediction.topFactors;
        data.lastPredictedAt = new Date();
      } catch (mlErr) {
        console.warn('[ML] re-prediction skipped:', mlErr.message);
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data,
    });
    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ message: 'Customer berhasil dihapus' });
  } catch (err) {
    next(err);
  }
});

export default router;
