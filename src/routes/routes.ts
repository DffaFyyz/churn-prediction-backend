import express from 'express';
import type { Router } from 'express';
import analyticsRoutes from '@/features/analytics/analyticsRoutes.js';
import customerRoutes from '@/features/customers/customerRoutes.js';
import interventionRoutes from '@/features/interventions/interventionRoutes.js';
import overviewRoutes from '@/features/overview/overviewRoutes.js';
import predictionRoutes from '@/features/predictions/predictionRoutes.js';

const router: Router = express.Router();

router.get('/health', (_req, res) => {
   res.status(200).json({
      msg: 'success',
      data: {
         service: 'retentio-backend',
         status: 'ok',
      },
   });
});

router.use('/customers', customerRoutes);
router.use('/interventions', interventionRoutes);
router.use('/overview', overviewRoutes);
router.use('/predictions', predictionRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
