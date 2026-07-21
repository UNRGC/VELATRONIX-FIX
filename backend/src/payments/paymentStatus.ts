import { Prisma, PaymentStatus } from '@prisma/client';

const ACTIVE: PaymentStatus[] = ['PENDING', 'PROOF_RECEIVED', 'REJECTED'];

// Derivación pura del espejo Repair.paymentStatus a partir de las solicitudes
// (ordenadas de más reciente a más antigua). Separada para el selfcheck.
export function derivePaymentState(statuses: PaymentStatus[]): { paymentStatus: PaymentStatus; requiresPayment: boolean } {
  const active = statuses.find((s) => ACTIVE.includes(s));
  if (active) return { paymentStatus: active, requiresPayment: true };
  if (statuses.includes('VALIDATED')) return { paymentStatus: 'VALIDATED', requiresPayment: false };
  if (statuses.length > 0) return { paymentStatus: 'CANCELLED', requiresPayment: false };
  return { paymentStatus: 'NOT_REQUIRED', requiresPayment: false };
}

// Única vía de escritura de Repair.paymentStatus/requiresPayment: siempre se
// recalculan desde las solicitudes de pago, así el espejo no puede divergir.
// Llamar dentro de la misma transacción, después de mutar las solicitudes.
export async function syncRepairPaymentStatus(tx: Prisma.TransactionClient, repairId: string): Promise<void> {
  const requests = await tx.paymentRequest.findMany({
    where: { repairId },
    orderBy: { createdAt: 'desc' },
    select: { status: true },
  });
  const state = derivePaymentState(requests.map((r) => r.status));
  await tx.repair.update({ where: { id: repairId }, data: state });
}
