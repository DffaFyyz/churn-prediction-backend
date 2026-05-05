import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/summary
router.get('/summary', async (req, res, next) => {
  try {
    const [
      totalCustomers,
      churned,
      retained,
      byRisk,
      byContract,
      avgMonthlyCharges,
      recentCustomers,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { isChurned: true } }),
      prisma.customer.count({ where: { isChurned: false } }),
      prisma.customer.groupBy({
        by: ['riskLevel'],
        _count: { _all: true },
      }),
      prisma.customer.groupBy({
        by: ['contract'],
        _count: { _all: true },
      }),
      prisma.customer.aggregate({
        _avg: { monthlyCharges: true, tenure: true, churnRiskScore: true },
      }),
      prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerCode: true,
          riskLevel: true,
          churnRiskScore: true,
          contract: true,
          monthlyCharges: true,
          createdAt: true,
        },
      }),
    ]);

    const churnRate = totalCustomers > 0 ? (churned / totalCustomers) * 100 : 0;

    // Normalisasi byRisk supaya semua level ada
    const riskMap = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0, UNKNOWN: 0 };
    for (const r of byRisk) {
      const key = r.riskLevel || 'UNKNOWN';
      riskMap[key] = r._count._all;
    }

    res.json({
      totalCustomers,
      churned,
      retained,
      churnRate: Number(churnRate.toFixed(2)),
      avgMonthlyCharges: Number((avgMonthlyCharges._avg.monthlyCharges || 0).toFixed(2)),
      avgTenure: Number((avgMonthlyCharges._avg.tenure || 0).toFixed(1)),
      avgRiskScore: Number((avgMonthlyCharges._avg.churnRiskScore || 0).toFixed(3)),
      byRisk: riskMap,
      byContract: byContract.map((c) => ({ contract: c.contract, count: c._count._all })),
      recentCustomers,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/risk-distribution - histogram churn score
router.get('/risk-distribution', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { churnRiskScore: { not: null } },
      select: { churnRiskScore: true },
    });
    // Bucket 10 bins (0-0.1, 0.1-0.2, ...)
    const bins = Array.from({ length: 10 }, (_, i) => ({
      range: `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}`,
      count: 0,
    }));
    for (const c of customers) {
      const idx = Math.min(9, Math.floor(c.churnRiskScore * 10));
      bins[idx].count++;
    }
    res.json({ bins });
  } catch (err) {
    next(err);
  }
});

export default router;
