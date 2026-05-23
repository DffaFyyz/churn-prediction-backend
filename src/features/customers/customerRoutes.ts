import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   getCustomerById,
   getCustomers,
   updateCustomer,
} from './customerController.js';

const router: Router = express.Router();

router.get('/', requireAuth, requirePermission('view_customers'), getCustomers);
router.get(
   '/:id',
   requireAuth,
   getCustomerById,
);
router.patch(
   '/:id',
   requireAuth,
   updateCustomer,
);

export default router;
