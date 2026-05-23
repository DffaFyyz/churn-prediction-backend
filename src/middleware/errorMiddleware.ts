import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '@/utils/appError.js';

export const globalErrorHandler = (
   err: unknown,
   _req: Request,
   res: Response,
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   _next: NextFunction,
) => {
   if (err instanceof ZodError) {
      return res.status(400).json({
         status: 'fail',
         msg: 'Validation Error',
         errors: err.issues,
      });
   }

   if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
         return res.status(409).json({
            status: 'fail',
            msg: 'Duplicate field value: Data already exists',
         });
      }

      if (err.code === 'P2025') {
         return res.status(404).json({
            status: 'fail',
            msg: 'Record not found',
         });
      }
   }

   if (err instanceof AppError) {
      return res.status(err.statusCode).json({
         status: err.status,
         msg: err.message,
      });
   }

   console.error('ERROR:', err);

   return res.status(500).json({
      status: 'error',
      msg: err instanceof Error ? err.message : 'Internal Server Error',
   });
};
