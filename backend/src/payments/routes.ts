import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { AuthedRequest, requireAuth, requireRole } from '../auth/middleware';
import { InternalActor, applyTransition, TransitionError } from '../repairs/stateMachine';
import { createPaymentRequest, findActivePaymentRequest, paymentReturnStatus, rejectPayment, validatePayment } from './service';
import { emailClient } from '../email/notify';

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

function actorFrom(req: AuthedRequest): InternalActor {
  return { type: 'INTERNAL_USER', userId: req.user!.id, role: req.user!.role };
}

function ensureAssignedTechnician(req: AuthedRequest, repair: { assignedTechnicianId?: string | null }) {
  if (req.user!.role === Role.ADMIN) return;
  if (req.user!.role === Role.TECHNICIAN && repair.assignedTechnicianId === req.user!.id) return;
  throw new HttpError(403, 'No tienes permiso para esta reparación');
}

function paymentRequestsForUser<T extends { proofs?: unknown[] }>(list: T[], req: AuthedRequest): T[] {
  if (req.user!.role !== Role.TECHNICIAN) return list;
  return list.map((pr) => ({ ...pr, proofs: [] }));
}

const createSchema = z.object({
  amount: z.number().positive(),
  concept: z.string().min(1),
  allowedMethods: z.array(z.enum(['TRANSFER', 'DEPOSIT', 'CASH'])).optional(),
});

// Solicitud de pago creada por admin o por el técnico asignado.
paymentsRouter.post(
  '/repairs/:id/payment-request',
  requireRole(Role.ADMIN, Role.TECHNICIAN),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = createSchema.parse(req.body);
    const repair = await prisma.repair.findUnique({ where: { id: req.params.id }, include: { customer: true } });
    if (!repair) throw new HttpError(404, 'Reparación no encontrada');
    ensureAssignedTechnician(req, repair);

    // Pagos secuenciales: solo una solicitud activa a la vez.
    if (await findActivePaymentRequest(prisma, repair.id)) {
      throw new HttpError(409, 'Ya existe una solicitud de pago activa. Valida o cancela la anterior antes de crear otra.');
    }

    // Si ya estaba en espera de pago, no hay estado de retorno nuevo que capturar.
    const returnStatus = repair.status !== 'EN_ESPERA_PAGO' ? paymentReturnStatus(repair.status) : undefined;

    try {
      await prisma.$transaction(async (tx) => {
        await createPaymentRequest(tx, repair.id, { ...data, returnStatus }, actorFrom(req));
        // La transición registra en historial desde qué etapa se pausó la reparación por pago.
        if (repair.status !== 'EN_ESPERA_PAGO') {
          await applyTransition(tx, repair.id, 'EN_ESPERA_PAGO', actorFrom(req), {
            publicNote: 'Se requiere pago o anticipo para continuar con la reparación.',
          });
        }
      });
    } catch (e) {
      if (e instanceof TransitionError) throw new HttpError(409, `No se puede solicitar pago en el estado actual (${repair.status})`);
      throw e;
    }

    const fresh = await prisma.repair.findUnique({ where: { id: repair.id } });
    await emailClient('PAYMENT_REQUESTED', fresh!, repair.customer, { amount: data.amount.toFixed(2), concept: data.concept });
    res.status(201).json(await prisma.paymentRequest.findMany({ where: { repairId: repair.id }, orderBy: { createdAt: 'desc' } }));
  })
);

paymentsRouter.get(
  '/repairs/:id/payment-requests',
  asyncHandler(async (req: AuthedRequest, res) => {
    const repair = await prisma.repair.findUnique({ where: { id: req.params.id }, select: { assignedTechnicianId: true } });
    if (!repair) throw new HttpError(404, 'Reparación no encontrada');
    if (req.user!.role === Role.TECHNICIAN) ensureAssignedTechnician(req, repair);
    const list = await prisma.paymentRequest.findMany({
      where: { repairId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { proofs: { orderBy: { uploadedAt: 'desc' } } },
    });
    res.json(paymentRequestsForUser(list, req));
  })
);

// Validación operativa de pagos: solo administración o recepción.
paymentsRouter.patch(
  '/payment-requests/:id/validate',
  requireRole(Role.ADMIN, Role.EMPLOYEE),
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await prisma
      .$transaction((tx) => validatePayment(tx, req.params.id, actorFrom(req)))
      .catch((e) => {
        if (e instanceof TransitionError) throw new HttpError(409, e.message);
        throw new HttpError(400, e instanceof Error ? e.message : 'No se pudo validar el pago');
      });
    await emailClient('PAYMENT_VALIDATED', result.repair, result.customer);
    res.json({ ok: true });
  })
);

const rejectSchema = z.object({ reason: z.string().min(1) });

paymentsRouter.patch(
  '/payment-requests/:id/reject',
  requireRole(Role.ADMIN, Role.EMPLOYEE),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { reason } = rejectSchema.parse(req.body);
    const result = await prisma
      .$transaction((tx) => rejectPayment(tx, req.params.id, reason, actorFrom(req)))
      .catch((e) => {
        if (e instanceof TransitionError) throw new HttpError(409, e.message);
        throw new HttpError(400, e instanceof Error ? e.message : 'No se pudo rechazar el pago');
      });
    await emailClient('PROOF_REJECTED', result.repair, result.customer, { rejectionReason: reason });
    res.json({ ok: true });
  })
);

paymentsRouter.patch(
  '/payment-requests/:id/cancel',
  requireRole(Role.ADMIN, Role.EMPLOYEE),
  asyncHandler(async (req: AuthedRequest, res) => {
    const pr = await prisma.paymentRequest.findUnique({ where: { id: req.params.id } });
    if (!pr) throw new HttpError(404, 'Solicitud de pago no encontrada');
    await prisma.$transaction(async (tx) => {
      await tx.paymentRequest.update({ where: { id: pr.id }, data: { status: 'CANCELLED' } });
      await tx.repair.update({ where: { id: pr.repairId }, data: { paymentStatus: 'CANCELLED' } });
      await tx.repairHistory.create({
        data: { repairId: pr.repairId, action: 'Solicitud de pago cancelada', actorUserId: req.user!.id, actorType: 'INTERNAL_USER' },
      });
    });
    res.json({ ok: true });
  })
);
