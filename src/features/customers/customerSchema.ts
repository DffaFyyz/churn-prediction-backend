import { z } from 'zod';

const YesNoSchema = z.enum(['Yes', 'No']);
const ContractSchema = z.enum(['Month-to-month', 'One year', 'Two year']);
const InternetServiceSchema = z.enum(['DSL', 'Fiber optic', 'No']);
const PaymentMethodSchema = z.enum([
   'Electronic check',
   'Mailed check',
   'Bank transfer (automatic)',
   'Credit card (automatic)',
]);
const ServiceOptionSchema = z.enum(['Yes', 'No', 'No internet service']);
const MultipleLinesSchema = z.enum(['Yes', 'No', 'No phone service']);
const RiskLevelSchema = z.enum(['LOW', 'HIGH']);

export const GetCustomerSchema = z
   .object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
      search: z.string().optional(),
      minProbability: z.coerce.number().min(0).max(1).optional(),
      maxProbability: z.coerce.number().min(0).max(1).optional(),
      contract: ContractSchema.optional(),
      internet: InternetServiceSchema.optional(),
      riskLevel: RiskLevelSchema.optional(),
      minTenure: z.coerce.number().int().min(0).optional(),
      maxTenure: z.coerce.number().int().min(0).optional(),
   })
   .refine(
      (data) =>
         data.minProbability === undefined ||
         data.maxProbability === undefined ||
         data.minProbability <= data.maxProbability,
      {
         message: 'minProbability must be less than or equal to maxProbability',
         path: ['minProbability'],
      },
   )
   .refine(
      (data) =>
         data.minTenure === undefined ||
         data.maxTenure === undefined ||
         data.minTenure <= data.maxTenure,
      {
         message: 'minTenure must be less than or equal to maxTenure',
         path: ['minTenure'],
      },
   );

const CustomerPayloadSchema = z.object({
   displayName: z.string().trim().min(1).optional(),
   fullName: z.string().trim().min(1).optional(),
   gender: z.enum(['Male', 'Female']),
   SeniorCitizen: z.union([z.literal(0), z.literal(1)]),
   Partner: YesNoSchema,
   Dependents: YesNoSchema,
   tenure: z.number().int().min(0),
   Contract: ContractSchema,
   PaperlessBilling: YesNoSchema,
   PaymentMethod: PaymentMethodSchema,
   MonthlyCharges: z.number().min(0),
   TotalCharges: z.number().min(0),
   PhoneService: YesNoSchema,
   MultipleLines: MultipleLinesSchema,
   InternetService: InternetServiceSchema,
   OnlineSecurity: ServiceOptionSchema,
   OnlineBackup: ServiceOptionSchema,
   DeviceProtection: ServiceOptionSchema,
   TechSupport: ServiceOptionSchema,
   StreamingTV: ServiceOptionSchema,
   StreamingMovies: ServiceOptionSchema,
   Churn: YesNoSchema.optional(),
});

export const CreateCustomerSchema = CustomerPayloadSchema;
export const UpdateCustomerSchema = CustomerPayloadSchema.partial();
