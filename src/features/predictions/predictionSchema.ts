import { z } from 'zod';

export const RunPredictionParamsSchema = z.object({
   customerID: z.string().min(1),
});

export const PredictionHistorySchema = z.object({
   limit: z.coerce.number().min(1).max(500).default(200),
});

export const FlaskPredictionSchema = z.object({
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
