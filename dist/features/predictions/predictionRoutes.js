import express from 'express';
import { getPredictionDistribution, getPredictionHistory, runPrediction, } from './predictionController.js';
const router = express.Router();
router.post('/:customerID/run', 
// requireAuth,
runPrediction);
router.get('/history', 
// requireAuth,
getPredictionHistory);
router.get('/distribution', 
// requireAuth,
getPredictionDistribution);
export default router;
