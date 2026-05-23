import {
   CasePriority,
   CaseStatus,
   OfferStatus,
   Prisma,
} from '@prisma/client';
import { prisma } from '@/utils/prisma.js';

const caseInclude = {
   customer: true,
   assignedTo: {
      select: {
         id: true,
         name: true,
         email: true,
         role: true,
      },
   },
   createdBy: {
      select: {
         id: true,
         name: true,
         email: true,
         role: true,
      },
   },
   outreachLogs: {
      orderBy: { createdAt: 'desc' },
      include: {
         agent: {
            select: {
               id: true,
               name: true,
               email: true,
               role: true,
            },
         },
      },
   },
   retentionOffers: {
      orderBy: { createdAt: 'desc' },
      include: {
         offeredBy: {
            select: {
               id: true,
               name: true,
               email: true,
               role: true,
            },
         },
      },
   },
} satisfies Prisma.InterventionCaseInclude;

class InterventionRepository {
   async findCustomer(customerID: string) {
      return await prisma.customer.findUnique({
         where: { customerID },
      });
   }

   async findActiveCaseByCustomer(customerID: string) {
      return await prisma.interventionCase.findFirst({
         where: {
            customerID,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
         },
         include: caseInclude,
         orderBy: { createdAt: 'desc' },
      });
   }

   async createCase(data: Prisma.InterventionCaseCreateInput) {
      return await prisma.interventionCase.create({
         data,
         include: caseInclude,
      });
   }

   async findCases(params: {
      where: Prisma.InterventionCaseWhereInput;
      page: number;
      limit: number;
   }) {
      const skip = (params.page - 1) * params.limit;

      const [data, total] = await prisma.$transaction([
         prisma.interventionCase.findMany({
            where: params.where,
            include: {
               customer: true,
               assignedTo: {
                  select: {
                     id: true,
                     name: true,
                     email: true,
                     role: true,
                  },
               },
               createdBy: {
                  select: {
                     id: true,
                     name: true,
                     email: true,
                     role: true,
                  },
               },
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: params.limit,
         }),
         prisma.interventionCase.count({ where: params.where }),
      ]);

      return { data, total };
   }

   async findCaseById(id: string) {
      return await prisma.interventionCase.findUnique({
         where: { id },
         include: caseInclude,
      });
   }

   async updateCase(id: string, data: Prisma.InterventionCaseUpdateInput) {
      return await prisma.interventionCase.update({
         where: { id },
         data,
         include: caseInclude,
      });
   }

   async createOutreach(params: {
      caseId: string;
      customerID: string;
      agentId?: string;
      channel: Prisma.OutreachLogCreateInput['channel'];
      outcome: Prisma.OutreachLogCreateInput['outcome'];
      notes?: string;
      nextFollowUpAt?: Date;
   }) {
      return await prisma.$transaction(async (tx) => {
         const log = await tx.outreachLog.create({
            data: {
               case: { connect: { id: params.caseId } },
               customer: { connect: { customerID: params.customerID } },
               ...(params.agentId && {
                  agent: { connect: { id: params.agentId } },
               }),
               channel: params.channel,
               outcome: params.outcome,
               notes: params.notes,
               nextFollowUpAt: params.nextFollowUpAt,
            },
            include: {
               agent: {
                  select: {
                     id: true,
                     name: true,
                     email: true,
                     role: true,
                  },
               },
            },
         });

         await tx.interventionCase.updateMany({
            where: { id: params.caseId, status: 'OPEN' },
            data: { status: 'IN_PROGRESS' },
         });

         return log;
      });
   }

   async findOutreachLogs(caseId: string) {
      return await prisma.outreachLog.findMany({
         where: { caseId },
         include: {
            agent: {
               select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
               },
            },
         },
         orderBy: { createdAt: 'desc' },
      });
   }

   async createOffer(params: {
      caseId: string;
      customerID: string;
      offeredById?: string;
      data: Omit<
         Prisma.RetentionOfferCreateInput,
         'case' | 'customer' | 'offeredBy'
      >;
   }) {
      return await prisma.retentionOffer.create({
         data: {
            ...params.data,
            case: { connect: { id: params.caseId } },
            customer: { connect: { customerID: params.customerID } },
            ...(params.offeredById && {
               offeredBy: { connect: { id: params.offeredById } },
            }),
         },
         include: {
            offeredBy: {
               select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
               },
            },
         },
      });
   }

   async findOfferById(id: string) {
      return await prisma.retentionOffer.findUnique({
         where: { id },
         include: {
            case: true,
            offeredBy: {
               select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
               },
            },
         },
      });
   }

   async updateOfferStatus(id: string, status: OfferStatus) {
      return await prisma.retentionOffer.update({
         where: { id },
         data: {
            status,
            ...(status !== 'OFFERED' && { respondedAt: new Date() }),
         },
         include: {
            offeredBy: {
               select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
               },
            },
         },
      });
   }

   async getAnalyticsBase() {
      const [
         totalCases,
         openCases,
         inProgressCases,
         resolvedCases,
         closedCases,
         unassignedCases,
         offersByStatus,
         casesByPriority,
         highRiskWithoutCase,
         outreachLogs,
         activeCases,
      ] = await prisma.$transaction([
         prisma.interventionCase.count(),
         prisma.interventionCase.count({ where: { status: 'OPEN' } }),
         prisma.interventionCase.count({ where: { status: 'IN_PROGRESS' } }),
         prisma.interventionCase.count({ where: { status: 'RESOLVED' } }),
         prisma.interventionCase.count({ where: { status: 'CLOSED' } }),
         prisma.interventionCase.count({
            where: { status: 'OPEN', assignedToId: null },
         }),
         prisma.retentionOffer.groupBy({
            by: ['status'],
            orderBy: { status: 'asc' },
            _count: { _all: true },
         }),
         prisma.interventionCase.groupBy({
            by: ['priority'],
            orderBy: { priority: 'asc' },
            _count: { _all: true },
         }),
         prisma.customer.count({
            where: {
               riskLevel: 'HIGH',
               interventionCases: {
                  none: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
               },
            },
         }),
         prisma.outreachLog.findMany({
            select: {
               caseId: true,
               createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
         }),
         prisma.interventionCase.findMany({
            select: {
               id: true,
               createdAt: true,
            },
         }),
      ]);

      return {
         totalCases,
         openCases,
         inProgressCases,
         resolvedCases,
         closedCases,
         unassignedCases,
         offersByStatus,
         casesByPriority,
         highRiskWithoutCase,
         outreachLogs,
         activeCases,
      };
   }

   async countCasesByStatus(status: CaseStatus) {
      return await prisma.interventionCase.count({ where: { status } });
   }

   async countCasesByPriority(priority: CasePriority) {
      return await prisma.interventionCase.count({ where: { priority } });
   }
}

export const interventionRepository = new InterventionRepository();
