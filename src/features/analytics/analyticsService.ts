import { analyticsRepository } from './analyticsRepository.js';
import { ContractAggregate } from './analyticsTypes.js';

const contractOrder = ['Month-to-month', 'One year', 'Two year'];

class AnalyticsService {
   async getByContract(): Promise<ContractAggregate[]> {
      const [totals, churned] = await Promise.all([
         analyticsRepository.countByContract(),
         analyticsRepository.countChurnedByContract(),
      ]);

      const churnedByContract = new Map(
         churned.map((item) => [item.Contract, item._count._all]),
      );

      return totals
         .map((item) => ({
            contract: item.Contract,
            total: item._count._all,
            churned: churnedByContract.get(item.Contract) ?? 0,
         }))
         .sort(
            (a, b) =>
               contractOrder.indexOf(a.contract) -
               contractOrder.indexOf(b.contract),
         );
   }
}

export const analyticsService = new AnalyticsService();
