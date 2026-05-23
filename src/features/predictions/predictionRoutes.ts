import express from 'express';
import type { Router } from 'express';
import { requireAuth } from '@/middleware/authMiddleware.js';
import {
   getPredictionDistribution,
   getPredictionHistory,
   runPrediction,
} from './predictionController.js';

const router: Router = express.Router();

router.post(
   '/:customerID/run',
   requireAuth,
   runPrediction,
);
router.get(
   '/history',
   requireAuth,
   getPredictionHistory,
);
router.get(
   '/distribution',
   requireAuth,
   getPredictionDistribution,
);

export default router;
