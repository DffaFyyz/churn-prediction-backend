import { PredictionLog, RiskLevel } from '@prisma/client';

export interface FlaskTopFactor {
   feature: string;
   shap_value: number;
   direction: 'increases_risk' | 'decreases_risk';
}

export interface FlaskPredictionResponse {
   churn_probability: number;
   risk_level: RiskLevel;
   top_factors: FlaskTopFactor[];
}

export interface PredictionRiskFactor {
   feature: string;
   impact: number;
   shapValue: number;
   direction: 'increases' | 'decreases';
}

export interface RunPredictionResponse {
   customerID: string;
   churnProbability: number;
   riskLevel: RiskLevel;
   riskFactors: PredictionRiskFactor[];
   predictionLog: PredictionLog;
}

export interface PredictionHistoryPoint {
   day: string;
   predictions: number;
   flagged: number;
}

export interface RiskDistributionBucket {
   range: string;
   count: number;
   lower: number;
}
