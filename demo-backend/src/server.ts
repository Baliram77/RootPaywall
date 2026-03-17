import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes';
import { config } from './config';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

registerRoutes(app);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'demo-api' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Demo API server running at http://localhost:${config.port}`);
  console.log('  GET  /public/article   – free content');
  console.log('  GET  /premium/article  – premium (402 until unlocked)');
  console.log('  POST /unlock           – body: { txHash, resourceId }');
  console.log('  Use  Authorization: Bearer <token>  for premium after unlock.');
});
