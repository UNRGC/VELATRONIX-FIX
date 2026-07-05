import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler } from '../http';
import { AuthedRequest, requireAuth, requireRole } from '../auth/middleware';

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole(Role.ADMIN));

// Siempre existe una sola fila (creada por el seed). La devolvemos o creamos vacía.
async function getSettings() {
  return (await prisma.paymentSettings.findFirst({ orderBy: { updatedAt: 'desc' } })) ?? prisma.paymentSettings.create({ data: {} });
}

settingsRouter.get('/', asyncHandler(async (_req, res) => res.json(await getSettings())));

const patchSchema = z.object({
  beneficiaryName: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  clabe: z.string().optional(),
  cardNumber: z.string().optional(),
  concept: z.string().optional(),
  transferInstructions: z.string().optional(),
  depositInstructions: z.string().optional(),
  cashPaymentInstructions: z.string().optional(),
  additionalNotes: z.string().optional(),
});

settingsRouter.patch(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = patchSchema.parse(req.body);
    const current = await getSettings();
    const updated = await prisma.paymentSettings.update({
      where: { id: current.id },
      data: { ...data, updatedByUserId: req.user!.id },
    });
    res.json(updated);
  })
);
