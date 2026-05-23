import express from 'express';
import customerRoutes from '../features/customers/customerRoutes.js';
import predictionRoutes from '../features/predictions/predictionRoutes.js';
const router = express.Router();
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
router.use('/predictions', predictionRoutes);
export default router;
