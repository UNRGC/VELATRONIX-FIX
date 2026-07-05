import express from 'express';
import cors from 'cors';
import { errorHandler } from './http';
import { authRouter } from './auth/routes';
import { usersRouter } from './users/routes';
import { repairsRouter } from './repairs/routes';
import { paymentsRouter } from './payments/routes';
import { proofsRouter } from './proofs/routes';
import { notificationsRouter } from './notifications/routes';
import { settingsRouter } from './settings/routes';
import { dashboardRouter } from './dashboard/routes';
import { publicRouter } from './public/routes';

export function buildApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Público (sin auth)
  app.use('/api/public', publicRouter);

  // Privado
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/repairs', repairsRouter);
  app.use('/api', paymentsRouter); // /repairs/:id/payment-request, /payment-requests/:id/...
  app.use('/api/payment-proofs', proofsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/payment-settings', settingsRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use(errorHandler);
  return app;
}
