import { PredictionHistorySchema, RunPredictionParamsSchema, } from './predictionSchema.js';
import { predictionService } from './predictionService.js';
export const runPrediction = async (req, res) => {
    const params = RunPredictionParamsSchema.parse(req.params);
    const result = await predictionService.runPrediction(params.customerID);
    res.status(200).json({
        msg: 'success',
        data: result,
    });
};
export const getPredictionHistory = async (req, res) => {
    const query = PredictionHistorySchema.parse(req.query);
    const result = await predictionService.getHistory(query.limit);
    res.status(200).json(result);
};
export const getPredictionDistribution = async (_req, res) => {
    const result = await predictionService.getDistribution();
    res.status(200).json(result);
};
