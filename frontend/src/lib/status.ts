// Copia ligera de etiquetas/tono de estado para el frontend (riel + insignias).
export type RepairStatus =
  | 'EN_ESPERA_REVISION'
  | 'EN_DIAGNOSTICO'
  | 'DIAGNOSTICADO'
  | 'EN_ESPERA_PAGO'
  | 'PAGO_EN_VALIDACION'
  | 'EN_PROCESO_REPARACION'
  | 'REPARACION_REALIZADA'
  | 'LISTO_PARA_ENTREGA'
  | 'DEVOLUCION_SIN_REPARACION'
  | 'ENTREGADO_CERRADO';

type Tone = 'wait' | 'active' | 'ok' | 'alert' | 'done';

export const STATUS: Record<RepairStatus, { label: string; tone: Tone }> = {
  EN_ESPERA_REVISION: { label: 'En espera de revisión', tone: 'wait' },
  EN_DIAGNOSTICO: { label: 'En proceso de diagnóstico', tone: 'active' },
  DIAGNOSTICADO: { label: 'Revisado, consulta el diagnóstico', tone: 'active' },
  EN_ESPERA_PAGO: { label: 'En espera de pago', tone: 'wait' },
  PAGO_EN_VALIDACION: { label: 'Pago en validación', tone: 'wait' },
  EN_PROCESO_REPARACION: { label: 'En proceso de reparación', tone: 'active' },
  REPARACION_REALIZADA: { label: 'Reparación realizada', tone: 'ok' },
  LISTO_PARA_ENTREGA: { label: 'Listo para entrega', tone: 'ok' },
  DEVOLUCION_SIN_REPARACION: { label: 'Devolución sin reparación', tone: 'alert' },
  ENTREGADO_CERRADO: { label: 'Entregado / cerrado', tone: 'done' },
};

// Secuencia principal del riel (la devolución es una rama terminal alterna).
export const RAIL_STEPS: RepairStatus[] = [
  'EN_ESPERA_REVISION',
  'EN_DIAGNOSTICO',
  'DIAGNOSTICADO',
  'EN_ESPERA_PAGO',
  'PAGO_EN_VALIDACION',
  'EN_PROCESO_REPARACION',
  'REPARACION_REALIZADA',
  'LISTO_PARA_ENTREGA',
  'ENTREGADO_CERRADO',
];

export const DEVICE_LABELS: Record<string, string> = {
  PC: 'PC',
  LAPTOP: 'Laptop',
  PRINTER: 'Impresora',
  PHONE: 'Celular',
  TABLET: 'Tablet',
  OTHER: 'Otro',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NOT_REQUIRED: 'No requerido',
  PENDING: 'Pendiente de pago',
  PROOF_RECEIVED: 'Comprobante recibido',
  VALIDATED: 'Validado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

export const METHOD_LABELS: Record<string, string> = {
  TRANSFER: 'Transferencia',
  DEPOSIT: 'Depósito',
  CASH: 'Efectivo',
};
