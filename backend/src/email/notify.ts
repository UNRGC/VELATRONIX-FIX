import { Customer, Repair } from '@prisma/client';
import { env } from '../env';
import { sendEmail } from './mailer';
import { EmailContext, EmailKind, renderEmail } from './templates';

// Envía un correo de evento al cliente, construyendo el contexto desde la reparación.
export async function emailClient(
  kind: EmailKind,
  repair: Repair,
  customer: Pick<Customer, 'name' | 'email'>,
  extra: Partial<EmailContext> = {}
) {
  // Sin correo (cliente registrado solo con teléfono): no hay a dónde enviar el aviso.
  if (!customer.email) return;
  const ctx: EmailContext = {
    folio: repair.folio,
    customerName: customer.name,
    visibleNotes: repair.customerVisibleNotes ?? undefined,
    ...extra,
  };
  const { subject, html } = renderEmail(kind, ctx);
  await sendEmail({ to: customer.email, subject, html, template: kind, repairId: repair.id });
}

// Avisa por correo a la(s) dirección(es) interna(s) configurada(s).
export async function emailInternal(kind: EmailKind, repair: Repair, extra: Partial<EmailContext> = {}) {
  if (env.internalNotifyEmails.length === 0) return;
  const { subject, html } = renderEmail(kind, {
    folio: repair.folio,
    customerName: '',
    ...extra,
  });
  for (const to of env.internalNotifyEmails) {
    await sendEmail({ to, subject, html, template: kind, repairId: repair.id });
  }
}
