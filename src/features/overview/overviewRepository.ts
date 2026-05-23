import { prisma } from '@/utils/prisma.js';

class OverviewRepository {
   async getStats() {
      const [total, atRisk, critical, averages, revenueAtRisk] =
         await prisma.$transaction([
            prisma.customer.count(),
            prisma.customer.count({
               where: { riskLevel: 'HIGH' },
            }),
            prisma.customer.count({
               where: { churnProbability: { gte: 0.75 } },
            }),
            prisma.customer.aggregate({
               _avg: {
                  MonthlyCharges: true,
                  tenure: true,
               },
            }),
            prisma.customer.aggregate({
               where: { riskLevel: 'HIGH' },
               _sum: {
                  MonthlyCharges: true,
               },
            }),
         ]);

      return {
         total,
         atRisk,
         critical,
         avgMonthly: averages._avg.MonthlyCharges ?? 0,
         avgTenure: averages._avg.tenure ?? 0,
         revenueAtRisk: (revenueAtRisk._sum.MonthlyCharges ?? 0) * 12,
      };
   }
}

export const overviewRepository = new OverviewRepository();
