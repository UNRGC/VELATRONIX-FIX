import { RepairStatus, PaymentStatus } from '@prisma/client';

// Etiquetas públicas: el cliente no ve los códigos internos del enum.
export const STATUS_LABELS: Record<RepairStatus, string> = {
  EN_ESPERA_REVISION: 'En espera de revisión',
  EN_DIAGNOSTICO: 'En proceso de diagnóstico',
  DIAGNOSTICADO: 'Revisado, consulta el diagnóstico',
  EN_ESPERA_PAGO: 'En espera de pago',
  PAGO_EN_VALIDACION: 'Pago en validación',
  EN_PROCESO_REPARACION: 'En proceso de reparación',
  REPARACION_REALIZADA: 'Reparación realizada',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  DEVOLUCION_SIN_REPARACION: 'Devolución sin reparación',
  ENTREGADO_CERRADO: 'Entregado / cerrado',
};

// Mensaje contextual mostrado al cliente según el estado actual.
export const STATUS_CLIENT_MESSAGE: Record<RepairStatus, string> = {
  EN_ESPERA_REVISION: 'Tu equipo fue recibido y está en espera de revisión.',
  EN_DIAGNOSTICO: 'Tu equipo está en proceso de diagnóstico.',
  DIAGNOSTICADO: 'Tu equipo ya fue revisado. Consulta el diagnóstico.',
  EN_ESPERA_PAGO: 'Se requiere pago o anticipo para continuar con la reparación.',
  PAGO_EN_VALIDACION: 'Comprobante recibido. El pago está pendiente de confirmación.',
  EN_PROCESO_REPARACION: 'Pago confirmado. Tu equipo está en proceso de reparación.',
  REPARACION_REALIZADA: 'La reparación fue realizada. Consulta las notas del técnico.',
  LISTO_PARA_ENTREGA: 'Tu equipo está listo para entrega.',
  DEVOLUCION_SIN_REPARACION: 'El equipo está listo para devolución sin reparación.',
  ENTREGADO_CERRADO: 'El equipo fue entregado y el servicio fue cerrado.',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NOT_REQUIRED: 'No requerido',
  PENDING: 'Pendiente de pago',
  PROOF_RECEIVED: 'Comprobante recibido',
  VALIDATED: 'Validado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};
