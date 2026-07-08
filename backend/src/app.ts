import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import { env } from './env';

export function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
  });
  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Rutas públicas con límites propios: consulta de folio y carga de comprobantes.
  app.use('/api/public/repairs/lookup', publicLimiter);
  app.use('/api/public/repairs/payment-proof', publicLimiter);
  app.use('/api/public', publicRouter);

  // Rutas internas: la autorización fina se aplica en cada router.
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/repairs', repairsRouter);
  app.use('/api', paymentsRouter); // Expone prefijos de reparación y solicitudes de pago.
  app.use('/api/payment-proofs', proofsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/payment-settings', settingsRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use(errorHandler);
  return app;
}
