import { Request, Response } from 'express';
import { analyticsService } from './analyticsService.js';

export const getByContract = async (_req: Request, res: Response) => {
   const result = await analyticsService.getByContract();

   res.status(200).json(result);
};
