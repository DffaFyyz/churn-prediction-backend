import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   createCustomer,
   deleteCustomer,
   getCustomerById,
   getCustomers,
   updateCustomer,
} from './customerController.js';

const router: Router = express.Router();

router.get('/', requireAuth, requirePermission('view_customers'), getCustomers);
router.post(
   '/',
   requireAuth,
   requirePermission('manage_customers'),
   createCustomer,
);
router.get(
   '/:id',
   requireAuth,
   requirePermission('view_customers'),
   getCustomerById,
);
router.patch(
   '/:id',
   requireAuth,
   requirePermission('manage_customers'),
   updateCustomer,
);
router.delete(
   '/:id',
   requireAuth,
   requirePermission('manage_customers'),
   deleteCustomer,
);

export default router;
