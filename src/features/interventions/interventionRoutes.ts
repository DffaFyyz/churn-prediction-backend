import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import { requirePermission } from '@/middleware/permissionMiddleware.js';
import {
   claimCase,
   createOffer,
   createOutreach,
   getAnalytics,
   getCaseById,
   getOutreachLogs,
   listCases,
   openCase,
   updateCase,
   updateOfferStatus,
} from './interventionController.js';

const router: Router = express.Router();

router.get('/cases', requireAuth, requirePermission('view_interventions'), listCases);
router.get(
   '/cases/:id',
   requireAuth,
   requirePermission('view_interventions'),
   getCaseById,
);
router.post(
   '/cases',
   requireAuth,
   requirePermission('manage_interventions'),
   openCase,
);
router.patch(
   '/cases/:id',
   requireAuth,
   requirePermission('manage_interventions'),
   updateCase,
);
router.post(
   '/cases/:id/claim',
   requireAuth,
   requirePermission('manage_interventions'),
   claimCase,
);
router.post(
   '/cases/:id/outreach',
   requireAuth,
   requirePermission('manage_interventions'),
   createOutreach,
);
router.get(
   '/cases/:id/outreach',
   requireAuth,
   requirePermission('view_interventions'),
   getOutreachLogs,
);
router.post(
   '/cases/:id/offers',
   requireAuth,
   requirePermission('manage_interventions'),
   createOffer,
);
router.patch(
   '/offers/:offerId/status',
   requireAuth,
   requirePermission('manage_interventions'),
   updateOfferStatus,
);
router.get(
   '/analytics',
   requireAuth,
   requirePermission('view_intervention_analytics'),
   getAnalytics,
);

export default router;
