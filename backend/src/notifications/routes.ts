import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../http';
import { AuthedRequest, requireAuth } from '../auth/middleware';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

// Notificaciones visibles por rol o asignadas directamente al usuario.
function scope(req: AuthedRequest) {
  return { OR: [{ recipientRole: req.user!.role }, { recipientUserId: req.user!.id }] };
}

notificationsRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const notifications = await prisma.notification.findMany({
      where: scope(req),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const unread = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unread });
  })
);

notificationsRouter.patch(
  '/:id/read',
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, ...scope(req) },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ ok: true });
  })
);

notificationsRouter.patch(
  '/read-all',
  asyncHandler(async (req: AuthedRequest, res) => {
    await prisma.notification.updateMany({
      where: { isRead: false, ...scope(req) },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ ok: true });
  })
);
