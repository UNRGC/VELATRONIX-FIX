import { env } from '../env';

function layout(title: string, bodyHtml: string): string {
  const consultUrl = `${env.appPublicUrl}/consultar`;
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;color:#16202A;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="border-left:4px solid #12707A;padding:4px 16px;margin-bottom:24px;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#12707A;">${env.smtp.fromName}</div>
    </div>
    <div style="background:#fff;border:1px solid #E1E7EA;border-radius:8px;padding:28px;">
      <h1 style="font-size:20px;margin:0 0 16px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#6B7A85;margin-top:20px;">
      Consulta el estado de tu equipo en
      <a href="${consultUrl}" style="color:#12707A;">${consultUrl}</a> con tu folio y correo.
    </p>
  </div></body></html>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;line-height:1.5;">${text}</p>`;
}

function folioBox(folio: string): string {
  return `<div style="font-family:monospace;font-size:18px;background:#F5F7F8;border:1px dashed #B7C2C8;border-radius:6px;padding:12px;text-align:center;margin:0 0 16px;letter-spacing:1px;">${folio}</div>`;
}

export interface EmailContext {
  folio: string;
  customerName: string;
  amount?: string;
  concept?: string;
  rejectionReason?: string;
  visibleNotes?: string;
}

export type EmailKind =
  | 'FOLIO_CREATED'
  | 'DIAGNOSIS'
  | 'PAYMENT_REQUESTED'
  | 'PROOF_RECEIVED'
  | 'PAYMENT_VALIDATED'
  | 'PROOF_REJECTED'
  | 'IN_PROCESS'
  | 'REPAIR_DONE'
  | 'READY'
  | 'RETURN_NO_REPAIR'
  | 'CLOSED'
  | 'INTERNAL_NEW_PROOF';

export function renderEmail(kind: EmailKind, ctx: EmailContext): { subject: string; html: string } {
  const hi = p(`Hola ${ctx.customerName},`);
  switch (kind) {
    case 'FOLIO_CREATED':
      return {
        subject: `Equipo recibido — Folio ${ctx.folio}`,
        html: layout(
          'Recibimos tu equipo',
          hi + p('Tu equipo fue registrado. Guarda este folio para consultar el estado de tu reparación:') + folioBox(ctx.folio)
        ),
      };
    case 'DIAGNOSIS':
      return {
        subject: `Diagnóstico disponible — Folio ${ctx.folio}`,
        html: layout(
          'Tu equipo ya fue revisado',
          hi + folioBox(ctx.folio) + p('Ya está disponible el diagnóstico. Consúltalo para ver las indicaciones a seguir.') +
            (ctx.visibleNotes ? p(`<strong>Notas:</strong> ${ctx.visibleNotes}`) : '')
        ),
      };
    case 'PAYMENT_REQUESTED':
      return {
        subject: `Pago requerido — Folio ${ctx.folio}`,
        html: layout(
          'Se requiere pago o anticipo',
          hi + folioBox(ctx.folio) +
            p(`Para continuar con la reparación se requiere un pago${ctx.amount ? ` de <strong>$${ctx.amount}</strong>` : ''}${ctx.concept ? ` por concepto de ${ctx.concept}` : ''}.`) +
            p('Consulta la reparación para ver los datos de transferencia, depósito o pago en efectivo, y adjuntar tu comprobante.')
        ),
      };
    case 'PROOF_RECEIVED':
      return {
        subject: `Comprobante recibido — Folio ${ctx.folio}`,
        html: layout(
          'Comprobante recibido',
          hi + folioBox(ctx.folio) + p('Recibimos tu comprobante. Tu pago está pendiente de confirmación por el personal del negocio.')
        ),
      };
    case 'PAYMENT_VALIDATED':
      return {
        subject: `Pago confirmado — Folio ${ctx.folio}`,
        html: layout(
          'Pago confirmado',
          hi + folioBox(ctx.folio) + p('Pago confirmado. La reparación continuará conforme al diagnóstico indicado.')
        ),
      };
    case 'PROOF_REJECTED':
      return {
        subject: `Comprobante no confirmado — Folio ${ctx.folio}`,
        html: layout(
          'No pudimos confirmar tu comprobante',
          hi + folioBox(ctx.folio) +
            p('El comprobante fue revisado, pero no pudo ser confirmado. Comunícate con el negocio o envía nuevamente tu comprobante.') +
            (ctx.rejectionReason ? p(`<strong>Motivo:</strong> ${ctx.rejectionReason}`) : '')
        ),
      };
    case 'IN_PROCESS':
      return {
        subject: `En proceso de reparación — Folio ${ctx.folio}`,
        html: layout('Tu equipo está en proceso de reparación', hi + folioBox(ctx.folio) + p('Tu equipo entró en proceso de reparación.')),
      };
    case 'REPAIR_DONE':
      return {
        subject: `Reparación realizada — Folio ${ctx.folio}`,
        html: layout(
          'Reparación realizada',
          hi + folioBox(ctx.folio) + p('La reparación fue realizada. Consulta las notas del técnico.') +
            (ctx.visibleNotes ? p(`<strong>Notas del técnico:</strong> ${ctx.visibleNotes}`) : '')
        ),
      };
    case 'READY':
      return {
        subject: `Listo para entrega — Folio ${ctx.folio}`,
        html: layout('Tu equipo está listo para entrega', hi + folioBox(ctx.folio) + p('Puedes pasar a recoger tu equipo.')),
      };
    case 'RETURN_NO_REPAIR':
      return {
        subject: `Devolución sin reparación — Folio ${ctx.folio}`,
        html: layout(
          'Devolución sin reparación',
          hi + folioBox(ctx.folio) + p('Tu equipo está listo para devolución sin reparación. Consulta el diagnóstico y las notas.') +
            (ctx.visibleNotes ? p(`<strong>Notas:</strong> ${ctx.visibleNotes}`) : '')
        ),
      };
    case 'CLOSED':
      return {
        subject: `Servicio cerrado — Folio ${ctx.folio}`,
        html: layout('Equipo entregado', hi + folioBox(ctx.folio) + p('El equipo fue entregado y el servicio fue cerrado. Gracias por tu preferencia.')),
      };
    case 'INTERNAL_NEW_PROOF':
      return {
        subject: `Nuevo comprobante recibido — Folio ${ctx.folio}`,
        html: layout(
          'Nuevo comprobante de pago',
          p(`Se recibió un nuevo comprobante de pago para el folio <strong>${ctx.folio}</strong>. Requiere validación en el panel.`)
        ),
      };
  }
}
