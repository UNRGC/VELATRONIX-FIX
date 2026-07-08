import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler } from '../http';
import { AuthedRequest, requireAuth } from '../auth/middleware';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// Resumen para el dashboard (§16.2).
dashboardRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const technicianScope = req.user!.role === Role.TECHNICIAN ? { assignedTechnicianId: req.user!.id } : {};
    const showPaymentCounters = req.user!.role === Role.ADMIN || req.user!.role === Role.EMPLOYEE;
    const [pendingValidation, newProofs, waitingReview, readyForPickup, recent, unread] = await Promise.all([
      showPaymentCounters ? prisma.repair.count({ where: { status: 'PAGO_EN_VALIDACION' } }) : Promise.resolve(0),
      showPaymentCounters ? prisma.paymentProof.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
      prisma.repair.count({ where: { ...technicianScope, status: 'EN_ESPERA_REVISION' } }),
      prisma.repair.count({ where: { ...technicianScope, status: 'LISTO_PARA_ENTREGA' } }),
      prisma.repair.findMany({
        where: technicianScope,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { customer: { select: { name: true } } },
      }),
      prisma.notification.count({
        where: { isRead: false, OR: [{ recipientRole: req.user!.role }, { recipientUserId: req.user!.id }] },
      }),
    ]);
    res.json({
      counts: { pendingValidation, newProofs, waitingReview, readyForPickup, unread },
      recent,
    });
  })
);
