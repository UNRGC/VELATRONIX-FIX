import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { requireAuth, requireRole } from '../auth/middleware';
import { env } from '../env';

export const proofsRouter = Router();
// Los comprobantes solo se consultan o descargan desde sesión interna autorizada.
proofsRouter.use(requireAuth, requireRole(Role.ADMIN, Role.EMPLOYEE));

proofsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = req.query.status === 'PENDING' ? { status: 'PENDING' as const } : {};
    const proofs = await prisma.paymentProof.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        repair: { select: { folio: true, customer: { select: { name: true } } } },
        paymentRequest: { select: { id: true, amount: true, concept: true, status: true } },
      },
    });
    res.json(proofs);
  })
);

proofsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const proof = await prisma.paymentProof.findUnique({
      where: { id: req.params.id },
      include: { repair: { select: { folio: true } }, paymentRequest: true },
    });
    if (!proof) throw new HttpError(404, 'Comprobante no encontrado');
    res.json(proof);
  })
);

proofsRouter.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const proof = await prisma.paymentProof.findUnique({ where: { id: req.params.id } });
    if (!proof) throw new HttpError(404, 'Comprobante no encontrado');
    const uploadRoot = path.resolve(env.uploadDir);
    const filePath = path.resolve(proof.filePath);
    if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) throw new HttpError(400, 'Ruta de archivo inválida');
    if (!fs.existsSync(filePath)) throw new HttpError(410, 'El archivo ya no está disponible');
    res.setHeader('Content-Type', proof.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(proof.originalFilename)}`);
    fs.createReadStream(filePath).pipe(res);
  })
);
