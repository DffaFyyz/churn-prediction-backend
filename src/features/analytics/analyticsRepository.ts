import { prisma } from '@/utils/prisma.js';

class AnalyticsRepository {
   async countByContract() {
      return await prisma.customer.groupBy({
         by: ['Contract'],
         _count: {
            _all: true,
            Churn: true,
         },
         where: {},
      });
   }

   async countChurnedByContract() {
      return await prisma.customer.groupBy({
         by: ['Contract'],
         where: {
            Churn: 'Yes',
         },
         _count: {
            _all: true,
         },
      });
   }
}

export const analyticsRepository = new AnalyticsRepository();
