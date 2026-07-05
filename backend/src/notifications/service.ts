import { Prisma, Role } from '@prisma/client';
import { prisma } from '../prisma';

// Crea una notificación in-panel dirigida a un rol (p. ej. ADMIN ve comprobantes nuevos).
export async function notifyRole(
  role: Role,
  data: { type: string; title: string; message: string; repairId?: string },
  tx: Prisma.TransactionClient = prisma
) {
  await tx.notification.create({
    data: {
      recipientRole: role,
      type: data.type,
      title: data.title,
      message: data.message,
      repairId: data.repairId,
    },
  });
}
