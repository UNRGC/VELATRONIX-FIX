import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../http';
import { AuthedRequest, requireAuth } from '../auth/middleware';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

// Resumen para el dashboard (§16.2).
dashboardRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const [pendingValidation, newProofs, waitingReview, readyForPickup, recent, unread] = await Promise.all([
      prisma.repair.count({ where: { status: 'PAGO_EN_VALIDACION' } }),
      prisma.paymentProof.count({ where: { status: 'PENDING' } }),
      prisma.repair.count({ where: { status: 'EN_ESPERA_REVISION' } }),
      prisma.repair.count({ where: { status: 'LISTO_PARA_ENTREGA' } }),
      prisma.repair.findMany({
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
