import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '@/utils/appError.js';
import {
   ClaimCaseSchema,
   CreateOfferSchema,
   CreateOutreachSchema,
   ListCasesSchema,
   OpenCaseSchema,
   UpdateCaseSchema,
   UpdateOfferStatusSchema,
} from './interventionSchema.js';
import { interventionService } from './interventionService.js';
import { CurrentUser } from './interventionTypes.js';

export const listCases = async (req: Request, res: Response) => {
   const query = ListCasesSchema.parse(req.query);
   const result = await interventionService.listCases(query, getCurrentUser(res));

   res.status(200).json({
      msg: 'success',
      ...result,
   });
};

export const getCaseById = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const result = await interventionService.getCaseById(
      id,
      getCurrentUser(res),
   );

   res.status(200).json(result);
};

export const openCase = async (req: Request, res: Response) => {
   const validation = OpenCaseSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await interventionService.openCase(
      validation.data,
      getCurrentUser(res),
   );

   res.status(201).json(result);
};

export const updateCase = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const validation = UpdateCaseSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await interventionService.updateCase(
      id,
      validation.data,
      getCurrentUser(res),
   );

   res.status(200).json(result);
};

export const claimCase = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const validation = ClaimCaseSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await interventionService.claimCase(
      id,
      validation.data.assignedToId,
      getCurrentUser(res),
   );

   res.status(200).json(result);
};

export const createOutreach = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const validation = CreateOutreachSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await interventionService.createOutreach(
      id,
      validation.data,
      getCurrentUser(res),
   );

   res.status(201).json(result);
};

export const getOutreachLogs = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const result = await interventionService.getOutreachLogs(
      id,
      getCurrentUser(res),
   );

   res.status(200).json(result);
};

export const createOffer = async (req: Request, res: Response) => {
   const id = req.params.id as string;
   const validation = CreateOfferSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await interventionService.createOffer(
      id,
      validation.data,
      getCurrentUser(res),
   );

   res.status(201).json(result);
};

export const updateOfferStatus = async (req: Request, res: Response) => {
   const offerId = req.params.offerId as string;
   const validation = UpdateOfferStatusSchema.safeParse(req.body);

   if (!validation.success) {
      return res.status(400).json({ errors: validation.error.format() });
   }

   const result = await interventionService.updateOfferStatus(
      offerId,
      validation.data.status,
      getCurrentUser(res),
   );

   res.status(200).json(result);
};

export const getAnalytics = async (_req: Request, res: Response) => {
   const result = await interventionService.getAnalytics(getCurrentUser(res));

   res.status(200).json(result);
};

function getCurrentUser(res: Response): CurrentUser {
   const id = res.locals.user.id;
   const role = res.locals.user.role;

   if (!id || (role !== 'CS_AGENT' && role !== 'MANAGER')) {
      throw new AppError('Invalid authenticated user', 401);
   }

   return {
      id,
      role: role as UserRole,
   };
}
