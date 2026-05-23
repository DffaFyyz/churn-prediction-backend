import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { getByContract } from './analyticsController.js';

const router: Router = express.Router();

router.get(
   '/by-contract',
   requireAuth,
   getByContract,
);

export default router;
