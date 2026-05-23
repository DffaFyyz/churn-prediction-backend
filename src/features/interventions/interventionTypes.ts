import {
   CasePriority,
   CaseStatus,
   OfferStatus,
   OutreachChannel,
   OutreachOutcome,
   OfferType,
   UserRole,
} from '@prisma/client';
import { z } from 'zod';
import {
   ClaimCaseSchema,
   CreateOfferSchema,
   CreateOutreachSchema,
   ListCasesSchema,
   OpenCaseSchema,
   UpdateCaseSchema,
   UpdateOfferStatusSchema,
} from './interventionSchema.js';

export type ListCasesQuery = z.infer<typeof ListCasesSchema>;
export type OpenCaseRequest = z.infer<typeof OpenCaseSchema>;
export type UpdateCaseRequest = z.infer<typeof UpdateCaseSchema>;
export type ClaimCaseRequest = z.infer<typeof ClaimCaseSchema>;
export type CreateOutreachRequest = z.infer<typeof CreateOutreachSchema>;
export type CreateOfferRequest = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferStatusRequest = z.infer<typeof UpdateOfferStatusSchema>;

export interface CurrentUser {
   id: string;
   role: UserRole;
}

export interface RecommendedAction {
   type: OfferType | 'FOLLOW_UP' | 'SERVICE_QUALITY' | 'PAYMENT_SUPPORT';
   label: string;
   reason: string;
}

export interface ListCasesResponse {
   data: unknown[];
   meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
      scope: 'mine' | 'unassigned' | 'all';
   };
}

export interface InterventionAnalytics {
   totalCases: number;
   openCases: number;
   inProgressCases: number;
   resolvedCases: number;
   closedCases: number;
   unassignedCases: number;
   highRiskCustomersWithoutActiveCase: number;
   averageTimeToFirstOutreachHours: number;
   offerAcceptanceRate: number;
   offersByStatus: Record<OfferStatus, number>;
   casesByPriority: Record<CasePriority, number>;
}

export const caseStatuses: CaseStatus[] = [
   'OPEN',
   'IN_PROGRESS',
   'RESOLVED',
   'CLOSED',
];

export const casePriorities: CasePriority[] = ['LOW', 'MEDIUM', 'HIGH'];
export const offerStatuses: OfferStatus[] = [
   'OFFERED',
   'ACCEPTED',
   'REJECTED',
   'EXPIRED',
   'CANCELLED',
];
export const outreachChannels: OutreachChannel[] = [
   'PHONE',
   'EMAIL',
   'WHATSAPP',
   'SMS',
   'IN_APP',
   'OTHER',
];
export const outreachOutcomes: OutreachOutcome[] = [
   'CONTACTED',
   'NO_RESPONSE',
   'INTERESTED',
   'NOT_INTERESTED',
   'COMPLAINED',
   'ESCALATED',
   'FOLLOW_UP_NEEDED',
];
