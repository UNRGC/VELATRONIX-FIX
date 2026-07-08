import { Router } from 'express';
import { z } from 'zod';
import { DeviceType, Prisma, RepairStatus, Role } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { AuthedRequest, requireAuth, requireRole } from '../auth/middleware';
import { generateUniqueFolio } from './folio';
import { applyTransition, InternalActor, DEDICATED_ONLY, TransitionError } from './stateMachine';
import { createPaymentRequest, findActivePaymentRequest, paymentReturnStatus } from '../payments/service';
import { emailClient } from '../email/notify';

export const repairsRouter = Router();
repairsRouter.use(requireAuth);

const repairInclude = {
  customer: true,
  assignedTechnician: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, name: true } },
  paymentRequests: { orderBy: { createdAt: 'desc' }, include: { proofs: { orderBy: { uploadedAt: 'desc' } } } },
  paymentProofs: { orderBy: { uploadedAt: 'desc' } },
} satisfies Prisma.RepairInclude;

function actorFrom(req: AuthedRequest): InternalActor {
  return { type: 'INTERNAL_USER', userId: req.user!.id, role: req.user!.role };
}

function canAccessRepair(req: AuthedRequest, repair: { assignedTechnicianId?: string | null }) {
  if (req.user!.role === Role.ADMIN || req.user!.role === Role.EMPLOYEE) return true;
  return req.user!.role === Role.TECHNICIAN && repair.assignedTechnicianId === req.user!.id;
}

function ensureRepairAccess(req: AuthedRequest, repair: { assignedTechnicianId?: string | null }) {
  if (!canAccessRepair(req, repair)) throw new HttpError(403, 'No tienes permiso para esta reparación');
}

function repairForUser<T extends { paymentRequests?: unknown[]; paymentProofs?: unknown[] }>(repair: T, req: AuthedRequest): T {
  if (req.user!.role !== Role.TECHNICIAN) return repair;
  return {
    ...repair,
    paymentProofs: [],
    paymentRequests: (repair.paymentRequests ?? []).map((pr) => ({ ...(pr as object), proofs: [] })),
  };
}

// Listado interno con filtros y alcance limitado para técnicos.
repairsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const q = req.query;
    const where: Prisma.RepairWhereInput = {};
    if (req.user!.role === Role.TECHNICIAN) where.assignedTechnicianId = req.user!.id;
    if (q.folio) where.folio = { contains: String(q.folio), mode: 'insensitive' };
    const status = String(q.status || '');
    const deviceType = String(q.deviceType || '');
    if (status in RepairStatus) where.status = status as RepairStatus;
    if (deviceType in DeviceType) where.deviceType = deviceType as DeviceType;
    const customer: Prisma.CustomerWhereInput = {};
    if (q.customer) customer.name = { contains: String(q.customer), mode: 'insensitive' };
    if (q.email) customer.email = { contains: String(q.email), mode: 'insensitive' };
    if (q.phone) customer.phone = { contains: String(q.phone) };
    if (Object.keys(customer).length) where.customer = customer;
    if (q.dateFrom || q.dateTo) {
      where.receivedAt = {};
      if (q.dateFrom) where.receivedAt.gte = new Date(String(q.dateFrom));
      if (q.dateTo) where.receivedAt.lte = new Date(String(q.dateTo));
    }

    const repairs = await prisma.repair.findMany({
      where,
      include: { customer: { select: { name: true, email: true, phone: true } }, assignedTechnician: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(repairs);
  })
);

// Alta de reparación y folio inicial.
const createSchema = z.object({
  customer: z
    .object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
    .refine((c) => c.email || c.phone, { message: 'Se requiere correo o teléfono', path: ['email'] }),
  deviceType: z.nativeEnum(DeviceType),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceSerialNumber: z.string().optional(),
  deviceColor: z.string().optional(),
  receivedAccessories: z.string().optional(),
  physicalCondition: z.string().optional(),
  reportedIssue: z.string().min(1),
  internalNotes: z.string().optional(),
  assignedTechnicianId: z.string().optional(),
});

repairsRouter.post(
  '/',
  requireRole(Role.ADMIN, Role.EMPLOYEE),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = createSchema.parse(req.body);
    const actor = actorFrom(req);

    const created = await prisma.$transaction(async (tx) => {
      const email = data.customer.email?.toLowerCase();
      const phone = data.customer.phone;
      let customer = email ? await tx.customer.findFirst({ where: { email } }) : await tx.customer.findFirst({ where: { phone } });
      if (!customer) {
        customer = await tx.customer.create({ data: { name: data.customer.name, email, phone } });
      }
      const folio = await generateUniqueFolio(tx);
      const repair = await tx.repair.create({
        data: {
          folio,
          customerId: customer.id,
          deviceType: data.deviceType,
          deviceBrand: data.deviceBrand,
          deviceModel: data.deviceModel,
          deviceSerialNumber: data.deviceSerialNumber,
          deviceColor: data.deviceColor,
          receivedAccessories: data.receivedAccessories,
          physicalCondition: data.physicalCondition,
          reportedIssue: data.reportedIssue,
          internalNotes: data.internalNotes,
          assignedTechnicianId: data.assignedTechnicianId,
          createdByUserId: actor.userId,
          status: 'EN_ESPERA_REVISION',
        },
      });
      await tx.repairHistory.create({
        data: {
          repairId: repair.id,
          toStatus: 'EN_ESPERA_REVISION',
          action: 'Folio generado. Equipo recibido.',
          publicNote: 'Tu equipo fue recibido y está en espera de revisión.',
          actorUserId: actor.userId,
          actorType: 'INTERNAL_USER',
        },
      });
      return { repair, customer };
    });

    await emailClient('FOLIO_CREATED', created.repair, created.customer);
    res.status(201).json(await getFullRepair(created.repair.id));
  })
);

// Detalle completo según permisos del usuario.
repairsRouter.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const repair = await getFullRepair(req.params.id);
    if (!repair) throw new HttpError(404, 'Reparación no encontrada');
    ensureRepairAccess(req, repair);
    res.json(repairForUser(repair, req));
  })
);

// Edición operativa de datos de cliente y equipo.
const editSchema = z.object({
  customer: z.object({ name: z.string().min(1).optional(), email: z.string().email().optional(), phone: z.string().optional() }).optional(),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  deviceSerialNumber: z.string().optional(),
  deviceColor: z.string().optional(),
  receivedAccessories: z.string().optional(),
  physicalCondition: z.string().optional(),
  reportedIssue: z.string().min(1).optional(),
  internalNotes: z.string().optional(),
  customerVisibleNotes: z.string().optional(),
  assignedTechnicianId: z.string().nullable().optional(),
});

repairsRouter.patch(
  '/:id',
  requireRole(Role.ADMIN, Role.EMPLOYEE),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = editSchema.parse(req.body);
    const repair = await prisma.repair.findUnique({ where: { id: req.params.id } });
    if (!repair) throw new HttpError(404, 'Reparación no encontrada');
    const { customer, ...rest } = data;
    await prisma.$transaction(async (tx) => {
      if (customer && Object.keys(customer).length) {
        await tx.customer.update({
          where: { id: repair.customerId },
          data: { ...customer, email: customer.email?.toLowerCase() },
        });
      }
      await tx.repair.update({ where: { id: repair.id }, data: { ...rest, updatedByUserId: req.user!.id } });
    });
    res.json(await getFullRepair(repair.id));
  })
);

// Diagnóstico editable por admin o por técnico asignado.
const diagnosisSchema = z.object({
  diagnosis: z.string().min(1),
  requiredActions: z.string().optional(),
  estimatedCost: z.number().nonnegative().optional(),
  customerVisibleNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  requiresPayment: z.boolean(),
  amount: z.number().positive().optional(),
  concept: z.string().optional(),
  allowedMethods: z.array(z.enum(['TRANSFER', 'DEPOSIT', 'CASH'])).optional(),
});

const DIAGNOSABLE: RepairStatus[] = ['EN_ESPERA_REVISION', 'EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'EN_ESPERA_PAGO'];

repairsRouter.patch(
  '/:id/diagnosis',
  requireRole(Role.ADMIN, Role.TECHNICIAN),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = diagnosisSchema.parse(req.body);
    if (data.requiresPayment && (!data.amount || !data.concept)) {
      throw new HttpError(422, 'El monto y el concepto son obligatorios cuando se requiere pago');
    }
    const actor = actorFrom(req);
    const repair = await prisma.repair.findUnique({ where: { id: req.params.id }, include: { customer: true } });
    if (!repair) throw new HttpError(404, 'Reparación no encontrada');
    ensureRepairAccess(req, repair);
    if (!DIAGNOSABLE.includes(repair.status)) {
      throw new HttpError(409, 'El diagnóstico ya no puede editarse en este estado');
    }

    await prisma.$transaction(async (tx) => {
      await tx.repair.update({
        where: { id: repair.id },
        data: {
          diagnosis: data.diagnosis,
          requiredActions: data.requiredActions,
          estimatedCost: data.estimatedCost != null ? new Prisma.Decimal(data.estimatedCost) : undefined,
          customerVisibleNotes: data.customerVisibleNotes,
          internalNotes: data.internalNotes,
          updatedByUserId: actor.userId,
        },
      });

      // El primer diagnóstico registra explícitamente el inicio del trabajo técnico.
      let status = repair.status;
      if (status === 'EN_ESPERA_REVISION') {
        await applyTransition(tx, repair.id, 'EN_DIAGNOSTICO', actor);
        status = 'EN_DIAGNOSTICO';
      }

      if (data.requiresPayment) {
        // Evita duplicar pagos activos; el flujo admite una solicitud pendiente.
        const active = await findActivePaymentRequest(tx, repair.id);
        if (!active) {
          await createPaymentRequest(
            tx,
            repair.id,
            { amount: data.amount!, concept: data.concept!, allowedMethods: data.allowedMethods, returnStatus: paymentReturnStatus(status) },
            actor
          );
          if (status !== 'EN_ESPERA_PAGO') {
            await applyTransition(tx, repair.id, 'EN_ESPERA_PAGO', actor, {
              publicNote: 'Se requiere pago o anticipo para continuar con la reparación.',
            });
          }
        }
      } else if (status === 'EN_DIAGNOSTICO') {
        await applyTransition(tx, repair.id, 'DIAGNOSTICADO', actor, {
          publicNote: 'Tu equipo ya fue revisado. Consulta el diagnóstico.',
          actionOverride: 'Diagnóstico registrado',
        });
      } else {
        // Reedición de diagnóstico sin cambio de estado.
        await tx.repairHistory.create({
          data: { repairId: repair.id, action: 'Diagnóstico actualizado', actorUserId: actor.userId, actorType: 'INTERNAL_USER' },
        });
      }
    });

    const fresh = await prisma.repair.findUnique({ where: { id: repair.id } });
    await emailClient(data.requiresPayment ? 'PAYMENT_REQUESTED' : 'DIAGNOSIS', fresh!, repair.customer, {
      amount: data.amount?.toFixed(2),
      concept: data.concept,
    });
    const full = await getFullRepair(repair.id);
    res.json(full ? repairForUser(full, req) : full);
  })
);

// Cambio de estado administrativo para transiciones sin efectos colaterales dedicados.
const statusSchema = z.object({
  status: z.nativeEnum(RepairStatus),
  publicNote: z.string().optional(),
  internalNote: z.string().optional(),
});

repairsRouter.patch(
  '/:id/status',
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = statusSchema.parse(req.body);
    if (DEDICATED_ONLY.includes(data.status)) {
      throw new HttpError(409, 'Este cambio de estado se realiza desde su acción dedicada (diagnóstico o pago)');
    }
    const current = await prisma.repair.findUnique({ where: { id: req.params.id }, include: { customer: true } });
    if (!current) throw new HttpError(404, 'Reparación no encontrada');
    ensureRepairAccess(req, current);
    if (current.status === 'PAGO_EN_VALIDACION') {
      throw new HttpError(409, 'Valida o rechaza el pago desde la sección de pagos');
    }

    let updated;
    try {
      updated = await prisma.$transaction((tx) =>
        applyTransition(tx, current.id, data.status, actorFrom(req), {
          publicNote: data.publicNote,
          internalNote: data.internalNote,
        })
      );
    } catch (e) {
      if (e instanceof TransitionError) throw new HttpError(409, e.message);
      throw e;
    }

    await emailForStatus(updated.status, updated, current.customer);
    const full = await getFullRepair(current.id);
    res.json(full ? repairForUser(full, req) : full);
  })
);

// Historial interno de movimientos de la reparación.
repairsRouter.get(
  '/:id/history',
  asyncHandler(async (req: AuthedRequest, res) => {
    const repair = await prisma.repair.findUnique({ where: { id: req.params.id }, select: { assignedTechnicianId: true } });
    if (!repair) throw new HttpError(404, 'Reparación no encontrada');
    ensureRepairAccess(req, repair);
    const history = await prisma.repairHistory.findMany({
      where: { repairId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { actorUser: { select: { name: true } } },
    });
    res.json(history);
  })
);

// Helpers locales del router.
function getFullRepair(id: string) {
  return prisma.repair.findUnique({
    where: { id },
    include: { ...repairInclude, history: { orderBy: { createdAt: 'desc' }, include: { actorUser: { select: { name: true } } } } },
  });
}

// Correo al cliente según el estado alcanzado por el cambio administrativo.
async function emailForStatus(status: RepairStatus, repair: Parameters<typeof emailClient>[1], customer: { name: string; email: string | null }) {
  const map: Partial<Record<RepairStatus, Parameters<typeof emailClient>[0]>> = {
    EN_PROCESO_REPARACION: 'IN_PROCESS',
    REPARACION_REALIZADA: 'REPAIR_DONE',
    LISTO_PARA_ENTREGA: 'READY',
    DEVOLUCION_SIN_REPARACION: 'RETURN_NO_REPAIR',
    ENTREGADO_CERRADO: 'CLOSED',
  };
  const kind = map[status];
  if (kind) await emailClient(kind, repair, customer);
}
