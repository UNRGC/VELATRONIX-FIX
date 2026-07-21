import { Prisma, RepairStatus } from '@prisma/client';
import { applyTransition, Actor } from '../repairs/stateMachine';
import { syncRepairPaymentStatus } from './paymentStatus';

export const PAYMENT_METHODS = ['TRANSFER', 'DEPOSIT', 'CASH'] as const;

// Estado de retorno tras validar un pago. Los pagos finales regresan al estado operativo previo;
// el resto continúa el flujo normal de reparación.
export function paymentReturnStatus(fromStatus: RepairStatus): RepairStatus {
  if (fromStatus === 'REPARACION_REALIZADA' || fromStatus === 'LISTO_PARA_ENTREGA') return fromStatus;
  return 'EN_PROCESO_REPARACION';
}

// Campos de PaymentSettings que se muestran al cliente (JSON-safe, sin fechas ni IDs).
const SNAPSHOT_FIELDS = [
  'beneficiaryName',
  'bankName',
  'accountNumber',
  'clabe',
  'cardNumber',
  'concept',
  'transferInstructions',
  'depositInstructions',
  'cashPaymentInstructions',
  'additionalNotes',
] as const;

function toSnapshot(settings: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  if (!settings) return undefined;
  const snap: Record<string, string> = {};
  for (const f of SNAPSHOT_FIELDS) {
    if (settings[f]) snap[f] = String(settings[f]);
  }
  return snap;
}

// Crea la solicitud y congela las instrucciones vigentes. La transición de estado
// queda en el llamador para que el historial conserve el contexto correcto.
export async function createPaymentRequest(
  tx: Prisma.TransactionClient,
  repairId: string,
  data: { amount: number; concept: string; allowedMethods?: string[]; returnStatus?: RepairStatus },
  actor: Actor
) {
  const settings = await tx.paymentSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
  const pr = await tx.paymentRequest.create({
    data: {
      repairId,
      amount: new Prisma.Decimal(data.amount),
      concept: data.concept,
      allowedMethods: data.allowedMethods?.length ? data.allowedMethods : [...PAYMENT_METHODS],
      instructionsSnapshot: toSnapshot(settings as Record<string, unknown> | null),
      status: 'PENDING',
      returnStatus: data.returnStatus,
      createdByUserId: actor.type === 'INTERNAL_USER' ? actor.userId : undefined,
    },
  });
  await syncRepairPaymentStatus(tx, repairId);
  return pr;
}

// Solicitud activa: pendiente, en validación o rechazada con posibilidad de reenvío.
// El flujo de negocio permite solo una solicitud activa por reparación.
export function findActivePaymentRequest(tx: Prisma.TransactionClient, repairId: string) {
  return tx.paymentRequest.findFirst({
    where: { repairId, status: { in: ['PENDING', 'PROOF_RECEIVED', 'REJECTED'] } },
    orderBy: { createdAt: 'desc' },
  });
}

// Valida el pago y devuelve la reparación al estado que corresponde al origen de la solicitud.
export async function validatePayment(tx: Prisma.TransactionClient, paymentRequestId: string, actor: Actor) {
  const pr = await tx.paymentRequest.findUnique({ where: { id: paymentRequestId }, include: { repair: { include: { customer: true } } } });
  if (!pr) throw new Error('Solicitud de pago no encontrada');
  if (pr.status === 'VALIDATED') throw new Error('El pago ya fue validado');

  await tx.paymentRequest.update({
    where: { id: pr.id },
    data: {
      status: 'VALIDATED',
      validatedByUserId: actor.type === 'INTERNAL_USER' ? actor.userId : undefined,
      validatedAt: new Date(),
    },
  });
  await tx.paymentProof.updateMany({
    where: { paymentRequestId: pr.id, status: 'PENDING' },
    data: { status: 'VALIDATED', validatedAt: new Date() },
  });
  await syncRepairPaymentStatus(tx, pr.repairId);

  const repair = await applyTransition(tx, pr.repairId, pr.returnStatus ?? 'EN_PROCESO_REPARACION', actor, {
    actionOverride: 'Pago validado',
    publicNote: 'Pago confirmado. La reparación continuará conforme al diagnóstico indicado.',
  });
  return { repair, customer: pr.repair.customer };
}

// Rechaza el comprobante: la reparación vuelve a EN_ESPERA_PAGO y el cliente puede reenviar.
export async function rejectPayment(
  tx: Prisma.TransactionClient,
  paymentRequestId: string,
  reason: string,
  actor: Actor
) {
  const pr = await tx.paymentRequest.findUnique({ where: { id: paymentRequestId }, include: { repair: { include: { customer: true } } } });
  if (!pr) throw new Error('Solicitud de pago no encontrada');

  await tx.paymentRequest.update({
    where: { id: pr.id },
    data: {
      status: 'REJECTED',
      rejectedByUserId: actor.type === 'INTERNAL_USER' ? actor.userId : undefined,
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });
  await tx.paymentProof.updateMany({
    where: { paymentRequestId: pr.id, status: 'PENDING' },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason },
  });
  // El estado de pago queda rechazado, pero la solicitud sigue activa para permitir reenvío.
  await syncRepairPaymentStatus(tx, pr.repairId);

  const repair = await applyTransition(tx, pr.repairId, 'EN_ESPERA_PAGO', actor, {
    actionOverride: 'Comprobante rechazado',
    internalNote: reason,
    publicNote: 'El comprobante fue revisado, pero no pudo ser confirmado. Envía nuevamente tu comprobante o comunícate con el negocio.',
  });
  return { repair, customer: pr.repair.customer, reason };
}
