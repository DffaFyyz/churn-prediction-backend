import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { getOverview } from './overviewController.js';

const router: Router = express.Router();

router.get('/', requireAuth, getOverview);

export default router;
