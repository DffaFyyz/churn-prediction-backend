import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ApiError } from '../middleware/error.middleware.js';
import { predictChurn, riskLevelFromScore, checkMlHealth } from '../services/ml.service.js';

const router = Router();
router.use(authenticate);

// GET /api/predictions/health - cek ML service
router.get('/health', async (req, res) => {
  const status = await checkMlHealth();
  res.json(status);
});

// POST /api/predictions/predict - predict tanpa simpan
router.post('/predict', async (req, res, next) => {
  try {
    const result = await predictChurn(req.body);
    res.json({
      score: result.score,
      riskLevel: riskLevelFromScore(result.score),
      topFactors: result.topFactors,
    });
  } catch (err) {
    next(new ApiError(503, `ML service error: ${err.message}`));
  }
});

// POST /api/predictions/customer/:id - predict ulang & simpan
router.post('/customer/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw new ApiError(404, 'Customer tidak ditemukan');

    const result = await predictChurn(customer);
    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        churnRiskScore: result.score,
        riskLevel: riskLevelFromScore(result.score),
        topRiskFactors: result.topFactors,
        lastPredictedAt: new Date(),
      },
    });
    res.json({ customer: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/predictions/batch - predict ulang semua
router.post('/batch', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany();
    let success = 0;
    let failed = 0;

    for (const c of customers) {
      try {
        const result = await predictChurn(c);
        await prisma.customer.update({
          where: { id: c.id },
          data: {
            churnRiskScore: result.score,
            riskLevel: riskLevelFromScore(result.score),
            topRiskFactors: result.topFactors,
            lastPredictedAt: new Date(),
          },
        });
        success++;
      } catch {
        failed++;
      }
    }
    res.json({ total: customers.length, success, failed });
  } catch (err) {
    next(err);
  }
});

export default router;
