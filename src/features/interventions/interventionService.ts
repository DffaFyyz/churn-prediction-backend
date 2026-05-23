import {
   CasePriority,
   CaseStatus,
   Customer,
   OfferStatus,
   Prisma,
   UserRole,
} from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import { interventionRepository } from './interventionRepository.js';
import {
   casePriorities,
   CurrentUser,
   InterventionAnalytics,
   ListCasesQuery,
   ListCasesResponse,
   offerStatuses,
   OpenCaseRequest,
   RecommendedAction,
   UpdateCaseRequest,
   CreateOutreachRequest,
   CreateOfferRequest,
} from './interventionTypes.js';

const activeStatuses: CaseStatus[] = ['OPEN', 'IN_PROGRESS'];

class InterventionService {
   async openCase(
      payload: OpenCaseRequest,
      user: CurrentUser,
   ) {
      const customer = await interventionRepository.findCustomer(
         payload.customerID,
      );
      if (!customer) {
         throw new AppError('Customer not found', 404);
      }

      const existing = await interventionRepository.findActiveCaseByCustomer(
         payload.customerID,
      );
      if (existing) {
         if (
            this.isManager(user) ||
            existing.assignedToId === user.id ||
            existing.createdById === user.id
         ) {
            return existing;
         }

         throw new AppError('Customer already has an active case', 409);
      }

      const assignedToId = this.isManager(user)
         ? payload.assignedToId
         : user.id;
      const recommendedActions = this.generateRecommendedActions(customer);

      return await interventionRepository.createCase({
         customer: { connect: { customerID: customer.customerID } },
         ...(assignedToId && {
            assignedTo: { connect: { id: assignedToId } },
         }),
         createdBy: { connect: { id: user.id } },
         priority: payload.priority ?? 'MEDIUM',
         title: `${customer.fullName ?? `Customer ${customer.customerID}`} churn case`,
         reason: payload.reason,
         churnProbabilitySnapshot: customer.churnProbability,
         riskLevelSnapshot: customer.riskLevel,
         riskFactorsSnapshot: this.toJsonInput(customer.riskFactors),
         recommendedActions: recommendedActions as unknown as Prisma.InputJsonValue,
      });
   }

   async listCases(
      query: ListCasesQuery,
      user: CurrentUser,
   ): Promise<ListCasesResponse> {
      const scope = query.scope ?? (this.isManager(user) ? 'all' : 'mine');

      if (!this.isManager(user) && scope === 'all') {
         throw new AppError('CS agents cannot view all cases', 403);
      }

      const where: Prisma.InterventionCaseWhereInput = {
         ...(query.status && { status: query.status }),
         ...(query.priority && { priority: query.priority }),
         ...(query.customerID && {
            customerID: { contains: query.customerID, mode: 'insensitive' },
         }),
      };

      if (scope === 'mine') {
         where.OR = [
            { assignedToId: user.id },
            { createdById: user.id },
         ];
      }

      if (scope === 'unassigned') {
         where.assignedToId = null;
         where.status = 'OPEN';
      }

      const { data, total } = await interventionRepository.findCases({
         where,
         page: query.page,
         limit: query.limit,
      });

      return {
         data,
         meta: {
            page: query.page,
            limit: query.limit,
            totalRecords: total,
            totalPages: Math.ceil(total / query.limit),
            scope,
         },
      };
   }

   async getCaseById(id: string, user: CurrentUser) {
      const interventionCase = await interventionRepository.findCaseById(id);
      if (!interventionCase) {
         throw new AppError('Case not found', 404);
      }

      this.assertCanViewCase(interventionCase, user);
      return interventionCase;
   }

   async updateCase(
      id: string,
      payload: UpdateCaseRequest,
      user: CurrentUser,
   ) {
      const interventionCase = await interventionRepository.findCaseById(id);
      if (!interventionCase) {
         throw new AppError('Case not found', 404);
      }

      if (this.isManager(user)) {
         this.validateResolutionUpdate(payload);
         return await interventionRepository.updateCase(
            id,
            this.buildCaseUpdate(payload),
         );
      }

      this.assertCanHandleCase(interventionCase, user);
      if (payload.assignedToId !== undefined) {
         throw new AppError('CS agents cannot assign or reassign cases', 403);
      }
      if (payload.priority !== undefined || payload.reason !== undefined) {
         throw new AppError('CS agents cannot update case metadata', 403);
      }
      if (payload.status && !['IN_PROGRESS', 'RESOLVED'].includes(payload.status)) {
         throw new AppError('CS agents cannot close cases', 403);
      }
      this.validateResolutionUpdate(payload);

      return await interventionRepository.updateCase(
         id,
         this.buildCaseUpdate({
            status: payload.status,
            resolutionOutcome: payload.resolutionOutcome,
            resolutionNote: payload.resolutionNote,
            finalOutreachLogId: payload.finalOutreachLogId,
            finalOfferId: payload.finalOfferId,
         }),
      );
   }

   async claimCase(
      id: string,
      assignedToId: string | undefined,
      user: CurrentUser,
   ) {
      const interventionCase = await interventionRepository.findCaseById(id);
      if (!interventionCase) {
         throw new AppError('Case not found', 404);
      }

      if (this.isManager(user)) {
         return await interventionRepository.updateCase(id, {
            assignedTo: assignedToId
               ? { connect: { id: assignedToId } }
               : { connect: { id: user.id } },
            status: 'IN_PROGRESS',
         });
      }

      if (interventionCase.assignedToId && interventionCase.assignedToId !== user.id) {
         throw new AppError('Case is already assigned', 409);
      }

      if (interventionCase.status !== 'OPEN') {
         throw new AppError('Only open cases can be claimed', 409);
      }

      return await interventionRepository.updateCase(id, {
         assignedTo: { connect: { id: user.id } },
         status: 'IN_PROGRESS',
      });
   }

   async createOutreach(
      caseId: string,
      payload: CreateOutreachRequest,
      user: CurrentUser,
   ) {
      const interventionCase = await interventionRepository.findCaseById(caseId);
      if (!interventionCase) {
         throw new AppError('Case not found', 404);
      }

      this.assertCanHandleCase(interventionCase, user);

      return await interventionRepository.createOutreach({
         caseId,
         customerID: interventionCase.customerID,
         agentId: user.id,
         channel: payload.channel,
         outcome: payload.outcome,
         notes: payload.notes,
         nextFollowUpAt: payload.nextFollowUpAt,
      });
   }

   async getOutreachLogs(caseId: string, user: CurrentUser) {
      const interventionCase = await interventionRepository.findCaseById(caseId);
      if (!interventionCase) {
         throw new AppError('Case not found', 404);
      }

      this.assertCanViewCase(interventionCase, user);
      return await interventionRepository.findOutreachLogs(caseId);
   }

   async createOffer(
      caseId: string,
      payload: CreateOfferRequest,
      user: CurrentUser,
   ) {
      const interventionCase = await interventionRepository.findCaseById(caseId);
      if (!interventionCase) {
         throw new AppError('Case not found', 404);
      }

      this.assertCanHandleCase(interventionCase, user);

      return await interventionRepository.createOffer({
         caseId,
         customerID: interventionCase.customerID,
         offeredById: user.id,
         data: payload,
      });
   }

   async updateOfferStatus(
      offerId: string,
      status: OfferStatus,
      user: CurrentUser,
   ) {
      const offer = await interventionRepository.findOfferById(offerId);
      if (!offer) {
         throw new AppError('Offer not found', 404);
      }

      this.assertCanHandleCase(offer.case, user);
      return await interventionRepository.updateOfferStatus(offerId, status);
   }

   async getAnalytics(user: CurrentUser): Promise<InterventionAnalytics> {
      if (!this.isManager(user)) {
         throw new AppError('Only managers can view intervention analytics', 403);
      }

      const base = await interventionRepository.getAnalyticsBase();
      const offersByStatus = Object.fromEntries(
         offerStatuses.map((status) => [status, 0]),
      ) as Record<OfferStatus, number>;
      for (const item of base.offersByStatus) {
         offersByStatus[item.status] = countGroupByItem(item._count);
      }

      const casesByPriority = Object.fromEntries(
         casePriorities.map((priority) => [priority, 0]),
      ) as Record<CasePriority, number>;
      for (const item of base.casesByPriority) {
         casesByPriority[item.priority] = countGroupByItem(item._count);
      }

      const firstOutreachByCase = new Map<string, Date>();
      for (const log of base.outreachLogs) {
         if (!firstOutreachByCase.has(log.caseId)) {
            firstOutreachByCase.set(log.caseId, log.createdAt);
         }
      }

      const caseCreatedById = new Map(
         base.activeCases.map((item) => [item.id, item.createdAt]),
      );
      const deltas = Array.from(firstOutreachByCase.entries())
         .map(([caseId, firstOutreachAt]) => {
            const createdAt = caseCreatedById.get(caseId);
            if (!createdAt) return null;
            return firstOutreachAt.getTime() - createdAt.getTime();
         })
         .filter((value): value is number => value !== null && value >= 0);

      const acceptedOffers = offersByStatus.ACCEPTED;
      const totalRespondedOffers =
         offersByStatus.ACCEPTED +
         offersByStatus.REJECTED +
         offersByStatus.EXPIRED +
         offersByStatus.CANCELLED;

      return {
         totalCases: base.totalCases,
         openCases: base.openCases,
         inProgressCases: base.inProgressCases,
         resolvedCases: base.resolvedCases,
         closedCases: base.closedCases,
         unassignedCases: base.unassignedCases,
         highRiskCustomersWithoutActiveCase: base.highRiskWithoutCase,
         averageTimeToFirstOutreachHours:
            deltas.length === 0
               ? 0
               : round(
                    deltas.reduce((sum, value) => sum + value, 0) /
                       deltas.length /
                       1000 /
                       60 /
                       60,
                 ),
         offerAcceptanceRate:
            totalRespondedOffers === 0
               ? 0
               : round(acceptedOffers / totalRespondedOffers),
         offersByStatus,
         casesByPriority,
      };
   }

   private buildCaseUpdate(
      payload: UpdateCaseRequest,
   ): Prisma.InterventionCaseUpdateInput {
      return {
         ...(payload.status && {
            status: payload.status,
            ...(payload.status === 'RESOLVED' && { resolvedAt: new Date() }),
            ...(payload.status === 'CLOSED' && { closedAt: new Date() }),
         }),
         ...(payload.priority && { priority: payload.priority }),
         ...(payload.assignedToId !== undefined && {
            assignedTo: payload.assignedToId
               ? { connect: { id: payload.assignedToId } }
               : { disconnect: true },
         }),
         ...(payload.reason !== undefined && { reason: payload.reason }),
         ...(payload.resolutionOutcome !== undefined && {
            resolutionOutcome: payload.resolutionOutcome,
         }),
         ...(payload.resolutionNote !== undefined && {
            resolutionNote: payload.resolutionNote,
         }),
         ...(payload.finalOutreachLogId !== undefined && {
            finalOutreachLogId: payload.finalOutreachLogId,
         }),
         ...(payload.finalOfferId !== undefined && {
            finalOfferId: payload.finalOfferId,
         }),
      };
   }

   private validateResolutionUpdate(payload: UpdateCaseRequest) {
      if (payload.status !== 'RESOLVED' && payload.status !== 'CLOSED') return;

      if (!payload.resolutionOutcome) {
         throw new AppError('Resolution outcome is required', 400);
      }

      if (!payload.resolutionNote?.trim()) {
         throw new AppError('Resolution note is required', 400);
      }
   }

   private assertCanViewCase(
      interventionCase: {
         assignedToId: string | null;
         createdById: string | null;
      },
      user: CurrentUser,
   ) {
      if (this.isManager(user)) return;
      if (
         interventionCase.assignedToId === user.id ||
         interventionCase.createdById === user.id
      ) {
         return;
      }

      throw new AppError('You do not have access to this case', 403);
   }

   private assertCanHandleCase(
      interventionCase: {
         assignedToId: string | null;
         createdById: string | null;
      },
      user: CurrentUser,
   ) {
      if (this.isManager(user)) return;
      if (
         interventionCase.assignedToId === user.id ||
         interventionCase.createdById === user.id
      ) {
         return;
      }

      throw new AppError('You cannot update this case', 403);
   }

   private isManager(user: CurrentUser) {
      return user.role === 'MANAGER';
   }

   private generateRecommendedActions(customer: Customer): RecommendedAction[] {
      const actions: RecommendedAction[] = [];
      const factorNames = this.extractRiskFactorNames(customer.riskFactors);
      const hasFactor = (name: string) =>
         factorNames.some((factor) => factor.includes(name.toLowerCase()));

      if (customer.MonthlyCharges >= 70 || hasFactor('monthlycharges')) {
         actions.push({
            type: 'DISCOUNT',
            label: 'Offer 10% discount for 3 months',
            reason: 'Monthly charges are a churn driver',
         });
      }

      if (
         customer.Contract === 'Month-to-month' ||
         hasFactor('contract_month-to-month')
      ) {
         actions.push({
            type: 'CONTRACT_UPGRADE',
            label: 'Offer yearly contract promo',
            reason: 'Month-to-month contracts have higher churn risk',
         });
      }

      if (customer.tenure <= 12 || hasFactor('tenure')) {
         actions.push({
            type: 'FOLLOW_UP',
            label: 'Schedule onboarding or loyalty follow-up',
            reason: 'Tenure appears in churn risk factors',
         });
      }

      if (customer.TechSupport === 'No' || hasFactor('techsupport_no')) {
         actions.push({
            type: 'FREE_SUPPORT',
            label: 'Offer temporary free tech support',
            reason: 'No tech support is a churn driver',
         });
      }

      if (customer.OnlineSecurity === 'No' || hasFactor('onlinesecurity_no')) {
         actions.push({
            type: 'SERVICE_BUNDLE',
            label: 'Offer security bundle trial',
            reason: 'Online security is missing for this customer',
         });
      }

      if (
         customer.InternetService === 'Fiber optic' ||
         hasFactor('internetservice_fiber optic')
      ) {
         actions.push({
            type: 'SERVICE_QUALITY',
            label: 'Check service quality complaint',
            reason: 'Fiber optic service is associated with churn risk',
         });
      }

      if (
         customer.PaymentMethod === 'Electronic check' ||
         hasFactor('paymentmethod_electronic check')
      ) {
         actions.push({
            type: 'PAYMENT_SUPPORT',
            label: 'Suggest payment method education or autopay support',
            reason: 'Electronic check payment is a churn driver',
         });
      }

      if (actions.length === 0) {
         actions.push({
            type: 'FOLLOW_UP',
            label: 'Run retention follow-up',
            reason: 'Customer is flagged for churn risk',
         });
      }

      return actions;
   }

   private extractRiskFactorNames(value: Prisma.JsonValue): string[] {
      if (!Array.isArray(value)) return [];
      return value
         .map((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
               return null;
            }
            const feature = (item as Record<string, unknown>).feature;
            return typeof feature === 'string' ? feature.toLowerCase() : null;
         })
         .filter((item): item is string => item !== null);
   }

   private toJsonInput(value: Prisma.JsonValue) {
      if (value === null) return undefined;
      return value as Prisma.InputJsonValue;
   }
}

function round(value: number) {
   return Math.round(value * 100) / 100;
}

function countGroupByItem(
   value: true | { _all?: number } | undefined,
): number {
   return typeof value === 'object' ? value._all ?? 0 : 0;
}

export const interventionService = new InterventionService();
