import { Request, Response } from 'express';
import { overviewService } from './overviewService.js';

export const getOverview = async (_req: Request, res: Response) => {
   const result = await overviewService.getOverview();

   res.status(200).json(result);
};
