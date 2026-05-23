import { overviewRepository } from './overviewRepository.js';
import { OverviewStats } from './overviewTypes.js';

class OverviewService {
   async getOverview(): Promise<OverviewStats> {
      const stats = await overviewRepository.getStats();

      return {
         total: stats.total,
         atRisk: stats.atRisk,
         critical: stats.critical,
         retained: stats.total - stats.atRisk,
         avgMonthly: round(stats.avgMonthly),
         avgTenure: round(stats.avgTenure),
         revenueAtRisk: round(stats.revenueAtRisk),
      };
   }
}

function round(value: number) {
   return Math.round(value * 100) / 100;
}

export const overviewService = new OverviewService();
