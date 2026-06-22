/**
 * server.js — entry point for the Stratum backend.
 * Run with: npm start  (or npm run dev for auto-restart)
 */
import express from 'express';
import cors from 'cors';
import { env, assertEnv } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

assertEnv();

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors({ origin: env.frontendUrl === '*' ? true : env.frontendUrl }));
app.use(express.json());

// Disable caching on all API responses — submissions change frequently
// and stale 304s would show outdated approve/reject status to users.
app.disable('etag');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ── Health check (useful for Render/Railway uptime checks) ──
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'stratum-backend' }));

// ── API routes ──────────────────────────────────────────
app.use('/api', apiRoutes);

// ── 404 + error handling ────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 Stratum backend running on port ${env.port}`);
  console.log(`   CORS allowed origin: ${env.frontendUrl}`);
});
