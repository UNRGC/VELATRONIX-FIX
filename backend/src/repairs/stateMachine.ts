import { Prisma, RepairStatus, Role, ActorType } from '@prisma/client';

// Quién puede disparar una transición: un rol interno, el cliente público, o el sistema.
export type Allow = Role | 'PUBLIC' | 'SYSTEM';

export interface Transition {
  to: RepairStatus;
  allow: Allow[];
  action: string;
}

// Fuente única de transiciones válidas. Todo salto fuera del mapa se rechaza en backend.
export const TRANSITIONS: Record<RepairStatus, Transition[]> = {
  EN_ESPERA_REVISION: [
    { to: 'EN_DIAGNOSTICO', allow: ['ADMIN', 'TECHNICIAN'], action: 'Diagnóstico iniciado' },
    { to: 'DEVOLUCION_SIN_REPARACION', allow: ['ADMIN'], action: 'Devolución sin reparación' },
  ],
  EN_DIAGNOSTICO: [
    { to: 'DIAGNOSTICADO', allow: ['ADMIN', 'TECHNICIAN'], action: 'Diagnóstico registrado' },
    { to: 'EN_ESPERA_PAGO', allow: ['ADMIN', 'TECHNICIAN'], action: 'Solicitud de pago generada' },
    { to: 'DEVOLUCION_SIN_REPARACION', allow: ['ADMIN'], action: 'Devolución sin reparación' },
  ],
  DIAGNOSTICADO: [
    { to: 'EN_ESPERA_PAGO', allow: ['ADMIN', 'TECHNICIAN'], action: 'Solicitud de pago generada' },
    { to: 'EN_PROCESO_REPARACION', allow: ['ADMIN', 'TECHNICIAN'], action: 'Reparación en proceso' },
    { to: 'DEVOLUCION_SIN_REPARACION', allow: ['ADMIN'], action: 'Devolución sin reparación' },
  ],
  EN_ESPERA_PAGO: [
    { to: 'PAGO_EN_VALIDACION', allow: ['PUBLIC'], action: 'Comprobante de pago recibido' },
    { to: 'EN_PROCESO_REPARACION', allow: ['ADMIN', 'EMPLOYEE'], action: 'Pago confirmado en efectivo' },
    // Pago final solicitado con el equipo reparado: al validarse vuelve al estado previo.
    { to: 'REPARACION_REALIZADA', allow: ['ADMIN', 'EMPLOYEE'], action: 'Pago confirmado en efectivo' },
    { to: 'LISTO_PARA_ENTREGA', allow: ['ADMIN', 'EMPLOYEE'], action: 'Pago confirmado en efectivo' },
    { to: 'DEVOLUCION_SIN_REPARACION', allow: ['ADMIN'], action: 'Devolución sin reparación' },
  ],
  PAGO_EN_VALIDACION: [
    { to: 'EN_PROCESO_REPARACION', allow: ['ADMIN', 'EMPLOYEE'], action: 'Pago validado' },
    { to: 'REPARACION_REALIZADA', allow: ['ADMIN', 'EMPLOYEE'], action: 'Pago validado' },
    { to: 'LISTO_PARA_ENTREGA', allow: ['ADMIN', 'EMPLOYEE'], action: 'Pago validado' },
    { to: 'EN_ESPERA_PAGO', allow: ['ADMIN', 'EMPLOYEE'], action: 'Comprobante rechazado' },
  ],
  EN_PROCESO_REPARACION: [
    { to: 'REPARACION_REALIZADA', allow: ['ADMIN', 'TECHNICIAN'], action: 'Reparación realizada' },
    // Pago adicional durante reparación, por ejemplo piezas detectadas al trabajar.
    { to: 'EN_ESPERA_PAGO', allow: ['ADMIN', 'TECHNICIAN'], action: 'Solicitud de pago generada' },
    { to: 'DEVOLUCION_SIN_REPARACION', allow: ['ADMIN'], action: 'Devolución sin reparación' },
  ],
  REPARACION_REALIZADA: [
    { to: 'LISTO_PARA_ENTREGA', allow: ['ADMIN', 'TECHNICIAN'], action: 'Listo para entrega' },
    // Pago final antes de entregar.
    { to: 'EN_ESPERA_PAGO', allow: ['ADMIN', 'TECHNICIAN'], action: 'Solicitud de pago generada' },
  ],
  LISTO_PARA_ENTREGA: [
    { to: 'ENTREGADO_CERRADO', allow: ['ADMIN', 'EMPLOYEE'], action: 'Equipo entregado y cerrado' },
    { to: 'EN_ESPERA_PAGO', allow: ['ADMIN', 'TECHNICIAN'], action: 'Solicitud de pago generada' },
  ],
  DEVOLUCION_SIN_REPARACION: [
    { to: 'ENTREGADO_CERRADO', allow: ['ADMIN', 'EMPLOYEE'], action: 'Equipo entregado y cerrado' },
  ],
  ENTREGADO_CERRADO: [], // estado terminal
};

// Transiciones reservadas para endpoints con efectos colaterales propios.
export const DEDICATED_ONLY: RepairStatus[] = ['DIAGNOSTICADO', 'EN_ESPERA_PAGO', 'PAGO_EN_VALIDACION'];

export type Actor =
  | { type: 'INTERNAL_USER'; userId: string; role: Role }
  | { type: 'PUBLIC_CLIENT' }
  | { type: 'SYSTEM' };

export type InternalActor = Extract<Actor, { type: 'INTERNAL_USER' }>;

function actorAllowed(actor: Actor, allow: Allow[]): boolean {
  if (actor.type === 'PUBLIC_CLIENT') return allow.includes('PUBLIC');
  if (actor.type === 'SYSTEM') return allow.includes('SYSTEM');
  return allow.includes(actor.role);
}

export function findTransition(from: RepairStatus, to: RepairStatus): Transition | undefined {
  return TRANSITIONS[from]?.find((t) => t.to === to);
}

export class TransitionError extends Error {}

// Aplica una transición dentro de una transacción y escribe el historial asociado.
export async function applyTransition(
  tx: Prisma.TransactionClient,
  repairId: string,
  to: RepairStatus,
  actor: Actor,
  opts: { publicNote?: string; internalNote?: string; actionOverride?: string } = {}
) {
  const repair = await tx.repair.findUnique({ where: { id: repairId } });
  if (!repair) throw new TransitionError('Reparación no encontrada');

  const transition = findTransition(repair.status, to);
  if (!transition) {
    throw new TransitionError(`Transición no permitida: ${repair.status} → ${to}`);
  }
  if (!actorAllowed(actor, transition.allow)) {
    throw new TransitionError('No tienes permiso para realizar este cambio de estado');
  }

  const timestamps: Prisma.RepairUncheckedUpdateInput = {};
  if (to === 'LISTO_PARA_ENTREGA') timestamps.readyAt = new Date();
  if (to === 'ENTREGADO_CERRADO') {
    timestamps.deliveredAt = new Date();
    timestamps.closedAt = new Date();
  }

  const updated = await tx.repair.update({
    where: { id: repairId },
    data: {
      status: to,
      updatedByUserId: actor.type === 'INTERNAL_USER' ? actor.userId : undefined,
      ...timestamps,
    },
  });

  await tx.repairHistory.create({
    data: {
      repairId,
      fromStatus: repair.status,
      toStatus: to,
      action: opts.actionOverride || transition.action,
      publicNote: opts.publicNote,
      internalNote: opts.internalNote,
      actorUserId: actor.type === 'INTERNAL_USER' ? actor.userId : undefined,
      actorType: actor.type as ActorType,
    },
  });

  return updated;
}
