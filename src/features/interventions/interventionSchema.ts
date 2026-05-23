import { z } from 'zod';

const CaseStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
const CasePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const ScopeSchema = z.enum(['mine', 'unassigned', 'all']);
const OutreachChannelSchema = z.enum([
   'PHONE',
   'EMAIL',
   'WHATSAPP',
   'SMS',
   'IN_APP',
   'OTHER',
]);
const OutreachOutcomeSchema = z.enum([
   'CONTACTED',
   'NO_RESPONSE',
   'INTERESTED',
   'NOT_INTERESTED',
   'COMPLAINED',
   'ESCALATED',
   'FOLLOW_UP_NEEDED',
]);
const OfferTypeSchema = z.enum([
   'DISCOUNT',
   'CONTRACT_UPGRADE',
   'FREE_SUPPORT',
   'SERVICE_BUNDLE',
   'DEVICE_PROTECTION',
   'CUSTOM',
]);
const OfferStatusSchema = z.enum([
   'OFFERED',
   'ACCEPTED',
   'REJECTED',
   'EXPIRED',
   'CANCELLED',
]);
const CaseResolutionOutcomeSchema = z.enum([
   'RETAINED',
   'OFFER_ACCEPTED',
   'OFFER_REJECTED',
   'CUSTOMER_UNREACHABLE',
   'CHURN_CONFIRMED',
   'OTHER',
]);

export const ListCasesSchema = z.object({
   page: z.coerce.number().int().min(1).default(1),
   limit: z.coerce.number().int().min(1).max(100).default(10),
   status: CaseStatusSchema.optional(),
   priority: CasePrioritySchema.optional(),
   customerID: z.string().trim().min(1).optional(),
   scope: ScopeSchema.optional(),
});

export const OpenCaseSchema = z.object({
   customerID: z.string().trim().min(1),
   assignedToId: z.string().trim().min(1).optional(),
   priority: CasePrioritySchema.optional(),
   reason: z.string().trim().min(1).optional(),
});

export const UpdateCaseSchema = z.object({
   status: CaseStatusSchema.optional(),
   priority: CasePrioritySchema.optional(),
   assignedToId: z.string().trim().min(1).nullable().optional(),
   reason: z.string().trim().min(1).nullable().optional(),
   resolutionOutcome: CaseResolutionOutcomeSchema.nullable().optional(),
   resolutionNote: z.string().trim().min(1).nullable().optional(),
   finalOutreachLogId: z.string().trim().min(1).nullable().optional(),
   finalOfferId: z.string().trim().min(1).nullable().optional(),
});

export const ClaimCaseSchema = z.object({
   assignedToId: z.string().trim().min(1).optional(),
});

export const CreateOutreachSchema = z.object({
   channel: OutreachChannelSchema,
   outcome: OutreachOutcomeSchema,
   notes: z.string().trim().min(1).optional(),
   nextFollowUpAt: z.coerce.date().optional(),
});

export const CreateOfferSchema = z
   .object({
      offerType: OfferTypeSchema,
      title: z.string().trim().min(1),
      description: z.string().trim().min(1).optional(),
      discountPercent: z.number().min(0).max(100).optional(),
      discountAmount: z.number().min(0).optional(),
      durationMonths: z.number().int().min(1).optional(),
   })
   .refine(
      (data) =>
         data.discountPercent === undefined || data.discountAmount === undefined,
      {
         message: 'Use either discountPercent or discountAmount, not both',
         path: ['discountPercent'],
      },
   );

export const UpdateOfferStatusSchema = z.object({
   status: OfferStatusSchema,
});
