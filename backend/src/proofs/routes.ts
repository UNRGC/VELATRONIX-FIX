import { Router } from 'express';
import fs from 'fs';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { requireAuth } from '../auth/middleware';

export const proofsRouter = Router();
// Los comprobantes solo se consultan/descargan autenticado (§18).
proofsRouter.use(requireAuth);

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
    if (!fs.existsSync(proof.filePath)) throw new HttpError(410, 'El archivo ya no está disponible');
    res.setHeader('Content-Type', proof.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(proof.originalFilename)}"`);
    fs.createReadStream(proof.filePath).pipe(res);
  })
);
