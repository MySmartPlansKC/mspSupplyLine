import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { initSupplylinePool } from '../config/database';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import { AppError, sendError } from './utilities/httpErrors';

initSupplylinePool();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'msp-supplyline',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  sendError(res, err instanceof AppError ? err : err);
});

app.listen(port, () => {
  console.log(`SupplyLine API listening on http://localhost:${port}`);
});

export { app };
