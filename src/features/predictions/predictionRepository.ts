import { Prisma, RiskLevel } from '@prisma/client';
import { prisma } from '@/utils/prisma.js';

class PredictionRepository {
   async savePrediction(params: {
      customerID: string;
      churnProbability: number;
      riskLevel: RiskLevel;
      customerRiskFactors: Prisma.InputJsonValue;
      logTopFactors: Prisma.InputJsonValue;
      modelVersion?: string;
      threshold?: number;
   }) {
      return await prisma.$transaction(async (tx) => {
         await tx.customer.update({
            where: { customerID: params.customerID },
            data: {
               churnProbability: params.churnProbability,
               riskLevel: params.riskLevel,
               riskFactors: params.customerRiskFactors,
               lastPredictedAt: new Date(),
               predictionStatus: 'SUCCESS',
               predictionError: null,
            },
         });

         return await tx.predictionLog.create({
            data: {
               customerID: params.customerID,
               churnProbability: params.churnProbability,
               riskLevel: params.riskLevel,
               topFactors: params.logTopFactors,
               modelVersion: params.modelVersion,
               threshold: params.threshold,
            },
         });
      });
   }

   async findRecentLogs(limit: number) {
      return await prisma.predictionLog.findMany({
         orderBy: { createdAt: 'desc' },
         take: limit,
      });
   }

   async findCustomerProbabilities() {
      return await prisma.customer.findMany({
         select: {
            churnProbability: true,
         },
      });
   }
}

export const predictionRepository = new PredictionRepository();
