import 'dotenv/config';
import { Prisma, PrismaClient, RiskLevel } from '@prisma/client';
import { z } from 'zod';
import { mapCustomerToTelcoFeatures } from '../src/features/predictions/telcoFeatureMapper.js';

const prisma = new PrismaClient();
const mlServiceUrl = process.env.ML_SERVICE_URL ?? 'http://localhost:5000';
const modelVersion = process.env.ML_MODEL_VERSION ?? 'xgboost_churn_model';
const riskThreshold = Number(process.env.ML_RISK_THRESHOLD ?? 0.59);
const batchSize = Number(process.env.PREDICTION_BATCH_SIZE ?? 10);

const FlaskPredictionSchema = z.object({
   churn_probability: z.number().min(0).max(1),
   risk_level: z.enum(['LOW', 'HIGH']),
   top_factors: z.array(
      z.object({
         feature: z.string(),
         shap_value: z.number(),
         direction: z.enum(['increases_risk', 'decreases_risk']),
      }),
   ),
});

type FlaskPrediction = z.infer<typeof FlaskPredictionSchema>;

type NormalizedRiskFactor = {
   feature: string;
   impact: number;
   shapValue: number;
   direction: 'increases' | 'decreases';
};

async function predictCustomer(customerID: string) {
   const customer = await prisma.customer.findUnique({
      where: { customerID },
   });

   if (!customer) {
      throw new Error(`Customer ${customerID} not found`);
   }

   const features = mapCustomerToTelcoFeatures(customer);
   const response = await fetch(`${mlServiceUrl}/predict`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(features),
   });

   const body = await response.json().catch(() => null);

   if (!response.ok) {
      throw new Error(
         `Flask prediction failed for ${customerID}: ${
            body?.message ?? body?.error ?? response.statusText
         }`,
      );
   }

   const prediction = FlaskPredictionSchema.parse(body);
   const riskFactors = normalizeTopFactors(prediction.top_factors);

   await prisma.$transaction(async (tx) => {
      await tx.customer.update({
         where: { customerID },
         data: {
            churnProbability: prediction.churn_probability,
            riskLevel: prediction.risk_level,
            riskFactors: riskFactors as unknown as Prisma.InputJsonValue,
            lastPredictedAt: new Date(),
         },
      });

      await tx.predictionLog.create({
         data: {
            customerID,
            churnProbability: prediction.churn_probability,
            riskLevel: prediction.risk_level as RiskLevel,
            topFactors:
               prediction.top_factors as unknown as Prisma.InputJsonValue,
            modelVersion,
            threshold: riskThreshold,
         },
      });
   });

   return prediction;
}

function normalizeTopFactors(
   factors: FlaskPrediction['top_factors'],
): NormalizedRiskFactor[] {
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

async function runInBatches<T>(
   items: T[],
   size: number,
   handler: (item: T) => Promise<void>,
) {
   for (let index = 0; index < items.length; index += size) {
      const batch = items.slice(index, index + size);
      await Promise.all(batch.map(handler));
      console.log(`Predicted ${Math.min(index + size, items.length)}/${items.length}`);
   }
}

async function main() {
   const customers = await prisma.customer.findMany({
      select: { customerID: true },
      orderBy: { customerID: 'asc' },
   });

   if (customers.length === 0) {
      console.log('No customers found. Run npm run prisma:seed first.');
      return;
   }

   console.log(
      `Running Flask predictions for ${customers.length} customers via ${mlServiceUrl}/predict`,
   );

   let high = 0;
   let low = 0;

   await runInBatches(customers, batchSize, async ({ customerID }) => {
      const prediction = await predictCustomer(customerID);
      if (prediction.risk_level === 'HIGH') high += 1;
      else low += 1;
   });

   console.log(
      `Updated ${customers.length} customers with model predictions (${high} HIGH, ${low} LOW).`,
   );
}

main()
   .catch((error) => {
      console.error(error);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
