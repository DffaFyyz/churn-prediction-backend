import { Prisma } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { customerRepository } from '@/features/customers/customerRepository.js';
import { mapCustomerToTelcoFeatures } from './telcoFeatureMapper.js';
import { predictionRepository } from './predictionRepository.js';
import { FlaskPredictionSchema } from './predictionSchema.js';
import {
   FlaskTopFactor,
   PredictionHistoryPoint,
   PredictionRiskFactor,
   RiskDistributionBucket,
   RunPredictionResponse,
} from './predictionTypes.js';

const mlServiceUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:5000';
const modelVersion = process.env.ML_MODEL_VERSION ?? 'xgboost_churn_model';
const riskThreshold = Number(process.env.ML_RISK_THRESHOLD ?? 0.59);

class PredictionService {
   async runPrediction(customerID: string): Promise<RunPredictionResponse> {
      const customer = await customerRepository.findById(customerID);
      if (!customer) {
         throw new AppError('Customer not found', 404);
      }

      const modelFeatures = mapCustomerToTelcoFeatures(customer);
      const flaskPrediction = await this.callPredictionService(modelFeatures);
      const riskFactors = this.normalizeTopFactors(flaskPrediction.top_factors);

      const predictionLog = await predictionRepository.savePrediction({
         customerID,
         churnProbability: flaskPrediction.churn_probability,
         riskLevel: flaskPrediction.risk_level,
         customerRiskFactors: riskFactors as unknown as Prisma.InputJsonValue,
         logTopFactors:
            flaskPrediction.top_factors as unknown as Prisma.InputJsonValue,
         modelVersion,
         threshold: riskThreshold,
      });

      return {
         customerID,
         churnProbability: flaskPrediction.churn_probability,
         riskLevel: flaskPrediction.risk_level,
         riskFactors,
         predictionLog,
      };
   }

   async getHistory(limit: number): Promise<PredictionHistoryPoint[]> {
      const logs = await predictionRepository.findRecentLogs(limit);
      const byDay = new Map<string, PredictionHistoryPoint>();

      for (const log of logs) {
         const day = log.createdAt.toISOString().slice(0, 10);
         const current =
            byDay.get(day) ??
            ({
               day,
               predictions: 0,
               flagged: 0,
            } satisfies PredictionHistoryPoint);

         current.predictions += 1;
         if (log.riskLevel === 'HIGH') current.flagged += 1;
         byDay.set(day, current);
      }

      return Array.from(byDay.values()).sort((a, b) =>
         a.day.localeCompare(b.day),
      );
   }

   async getDistribution(): Promise<RiskDistributionBucket[]> {
      const customers = await predictionRepository.findCustomerProbabilities();
      const buckets: RiskDistributionBucket[] = [
         { range: '0-20%', count: 0, lower: 0 },
         { range: '20-40%', count: 0, lower: 0.2 },
         { range: '40-60%', count: 0, lower: 0.4 },
         { range: '60-80%', count: 0, lower: 0.6 },
         { range: '80-100%', count: 0, lower: 0.8 },
      ];

      for (const customer of customers) {
         const index = Math.min(
            Math.floor(customer.churnProbability / 0.2),
            buckets.length - 1,
         );
         buckets[index].count += 1;
      }

      return buckets;
   }

   private async callPredictionService(modelFeatures: Record<string, number>) {
      const response = await fetch(`${mlServiceUrl}/predict`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(modelFeatures),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
         throw new AppError(
            body?.message ?? 'Failed to process prediction',
            502,
         );
      }

      return FlaskPredictionSchema.parse(body);
   }

   private normalizeTopFactors(
      factors: FlaskTopFactor[],
   ): PredictionRiskFactor[] {
      const maxAbsShap = Math.max(
         ...factors.map((factor) => Math.abs(factor.shap_value)),
         1,
      );

      return factors.map((factor) => ({
         feature: factor.feature,
         shapValue: factor.shap_value,
         impact: Math.round((Math.abs(factor.shap_value) / maxAbsShap) * 1000) /
            1000,
         direction:
            factor.direction === 'increases_risk' ? 'increases' : 'decreases',
      }));
   }
}

export const predictionService = new PredictionService();
