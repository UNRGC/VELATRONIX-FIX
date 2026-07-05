import nodemailer from 'nodemailer';
import { env } from '../env';
import { prisma } from '../prisma';

// Solo relajamos la verificación TLS para servidores de prueba locales (Mailpit).
// Con un proveedor SMTP real la verificación queda activa.
const isLocalSmtp = ['mailpit', 'localhost', '127.0.0.1'].includes(env.smtp.host);

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
  ...(isLocalSmtp ? { tls: { rejectUnauthorized: false } } : {}),
});

const from = `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`;

/**
 * Envía un correo y registra el intento en EmailLog. Nunca lanza: un fallo de correo
 * no debe tumbar la operación de negocio (queda registrado como FAILED).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  template: string;
  repairId?: string;
}): Promise<void> {
  try {
    const info = await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
    await prisma.emailLog.create({
      data: {
        repairId: opts.repairId,
        recipientEmail: opts.to,
        subject: opts.subject,
        template: opts.template,
        status: 'SENT',
        providerResponse: info.messageId,
        sentAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.emailLog.create({
      data: {
        repairId: opts.repairId,
        recipientEmail: opts.to,
        subject: opts.subject,
        template: opts.template,
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    console.error(`[email] Falló envío a ${opts.to}:`, err);
  }
}
