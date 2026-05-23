import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

const rolePermissions: Record<UserRole, string[]> = {
   CS_AGENT: [
      'view_customers',
      'manage_customers',
      'run_prediction',
      'view_predictions',
   ],
   MANAGER: [
      'view_customers',
      'manage_customers',
      'run_prediction',
      'view_predictions',
      'create_intervention',
      'view_analytics',
      'manage_risk_settings',
      'batch_upload_customers',
   ],
};

export const requirePermission = (permissionName: string) => {
   return async (_req: Request, res: Response, next: NextFunction) => {
      const user = res.locals.user;
      const role = user.role as UserRole | undefined;

      if (!role || !rolePermissions[role]?.includes(permissionName)) {
         return res.status(403).json({
            success: false,
            message: 'You do not have the permission to access this feature.',
         });
      }

      next();
   };
};
