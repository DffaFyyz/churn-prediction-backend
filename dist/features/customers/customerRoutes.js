import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware.js';
import { requirePermission } from '../../middleware/permissionMiddleware.js';
import { getCustomerById, getCustomers, updateCustomer, } from './customerController.js';
const router = express.Router();
router.get('/', requireAuth, requirePermission('view_customers'), getCustomers);
router.get('/:id', requireAuth, requirePermission('view_customers'), getCustomerById);
router.patch('/:id', requireAuth, requirePermission('manage_customers'), updateCustomer);
export default router;
