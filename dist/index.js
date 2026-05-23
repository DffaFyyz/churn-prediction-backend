import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import routes from './routes/routes.js';
import { auth } from './utils/auth.js';
import { globalErrorHandler } from './middleware/errorMiddleware.js';
const app = express();
const port = process.env.PORT || 8000;
const frontendOrigin = process.env.FRONTEND_ORIGIN ||
    process.env.FRONTEND_URL ||
    'http://localhost:5173';
app.use(cors({
    origin: [frontendOrigin],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json());
app.use('/api', routes);
app.use(globalErrorHandler);
app.listen(port, () => {
    console.log(`Retentio backend is running at http://localhost:${port}`);
});
