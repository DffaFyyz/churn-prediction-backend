import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import { getOverview } from './overviewController.js';

const router: Router = express.Router();

router.get('/', requireAuth, requirePermission('view_analytics'), getOverview);

export default router;
