import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  appPublicUrl: process.env.APP_PUBLIC_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || process.env.APP_PUBLIC_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5', 10),
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromName: process.env.SMTP_FROM_NAME || 'Velatronix Reparaciones',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@velatronix.local',
  },
  internalNotifyEmails: (process.env.INTERNAL_NOTIFY_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
