import { PaymentRequest, PaymentProof, Repair, RepairHistory, Customer } from '@prisma/client';
import { STATUS_LABELS, STATUS_CLIENT_MESSAGE, PAYMENT_STATUS_LABELS } from '../repairs/labels';

type FullRepair = Repair & {
  customer: Customer;
  paymentRequests: (PaymentRequest & { proofs: PaymentProof[] })[];
  history: RepairHistory[];
};

// Una solicitud de pago "activa" es la más reciente que no está validada ni cancelada.
function activePaymentRequest(repair: FullRepair) {
  return repair.paymentRequests.find((pr) => pr.status === 'PENDING' || pr.status === 'REJECTED' || pr.status === 'PROOF_RECEIVED');
}

// El cliente solo puede subir comprobante si hay pago activo y la reparación espera pago.
export function canUploadProof(repair: FullRepair): boolean {
  const pr = activePaymentRequest(repair);
  return repair.status === 'EN_ESPERA_PAGO' && !!pr && (pr.status === 'PENDING' || pr.status === 'REJECTED');
}

// Construye la vista pública sin notas internas, IDs de usuarios ni rutas de archivos.
export function serializePublicRepair(repair: FullRepair) {
  const pr = activePaymentRequest(repair);
  const showPayment = repair.paymentStatus !== 'NOT_REQUIRED' && !!pr;
  const snapshot = (pr?.instructionsSnapshot as Record<string, unknown> | null) ?? null;
  const latestProof = pr?.proofs[0];

  return {
    folio: repair.folio,
    status: repair.status, // Código necesario para resaltar el riel de estados.
    statusLabel: STATUS_LABELS[repair.status],
    statusMessage: STATUS_CLIENT_MESSAGE[repair.status],
    customerName: repair.customer.name,
    device: {
      type: repair.deviceType,
      brand: repair.deviceBrand,
      model: repair.deviceModel,
      color: repair.deviceColor,
    },
    reportedIssue: repair.reportedIssue,
    receivedAt: repair.receivedAt,
    diagnosis: repair.diagnosis,
    requiredActions: repair.requiredActions,
    visibleNotes: repair.customerVisibleNotes,
    payment: showPayment
      ? {
          status: repair.paymentStatus,
          statusLabel: PAYMENT_STATUS_LABELS[repair.paymentStatus],
          amount: pr ? pr.amount.toString() : null,
          concept: pr?.concept ?? null,
          allowedMethods: pr?.allowedMethods ?? [],
          instructions: snapshot
            ? {
                beneficiaryName: snapshot.beneficiaryName ?? null,
                bankName: snapshot.bankName ?? null,
                accountNumber: snapshot.accountNumber ?? null,
                clabe: snapshot.clabe ?? null,
                cardNumber: snapshot.cardNumber ?? null,
                concept: snapshot.concept ?? null,
                transferInstructions: snapshot.transferInstructions ?? null,
                depositInstructions: snapshot.depositInstructions ?? null,
                cashPaymentInstructions: snapshot.cashPaymentInstructions ?? null,
                additionalNotes: snapshot.additionalNotes ?? null,
              }
            : null,
          proofSubmitted: latestProof
            ? { status: latestProof.status, uploadedAt: latestProof.uploadedAt, rejectionReason: latestProof.rejectionReason }
            : null,
          paymentRequestId: pr?.id ?? null,
        }
      : null,
    canUploadProof: canUploadProof(repair),
    history: repair.history
      .filter((h) => h.publicNote || h.toStatus)
      .map((h) => ({
        date: h.createdAt,
        action: h.action,
        note: h.publicNote,
        statusLabel: h.toStatus ? STATUS_LABELS[h.toStatus] : null,
      })),
  };
}
