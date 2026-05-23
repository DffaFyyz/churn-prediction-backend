import { Customer, RiskLevel } from '@prisma/client';
import { z } from 'zod';
import {
   CreateCustomerSchema,
   GetCustomerSchema,
   UpdateCustomerSchema,
} from './customerSchema.js';

export type GetCustomerSchema = z.infer<typeof GetCustomerSchema>;
export type CreateCustomerRequest = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerSchema>;

export interface RiskFactor {
   feature: string;
   impact: number;
   direction: 'increases' | 'decreases';
}

export type CustomerWithName = Omit<
   Customer,
   'createdAt' | 'updatedAt' | 'riskLevel' | 'riskFactors' | 'lastPredictedAt'
> & {
   displayName: string;
   riskLevel: RiskLevel | null;
   riskFactors: RiskFactor[];
   lastUpdated: string;
   lastPredictedAt: string | null;
};

export interface GetCustomersResponse {
   data: CustomerWithName[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
   };
}
