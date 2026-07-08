import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { applyTransition } from '../repairs/stateMachine';
import { serializePublicRepair, canUploadProof } from './serialize';
import { persistProof, uploadProof } from '../proofs/upload';
import { notifyRole } from '../notifications/service';
import { emailClient, emailInternal } from '../email/notify';

export const publicRouter = Router();

// Mensaje genérico para no revelar si falló el folio o el dato de contacto.
const NOT_FOUND = 'No se encontró una reparación con los datos proporcionados.';

const fullInclude = {
  customer: true,
  paymentRequests: { orderBy: { createdAt: 'desc' as const }, include: { proofs: { orderBy: { uploadedAt: 'desc' as const } } } },
  history: { orderBy: { createdAt: 'desc' as const } },
};

// Solo dígitos, para comparar teléfonos sin importar espacios/guiones/paréntesis.
function digitsOnly(s: string) {
  return s.replace(/\D/g, '');
}

// Busca reparación validando folio + (correo O teléfono). Devuelve null (no distingue el motivo).
async function findByFolioAndContact(folio: string, contact: string) {
  const repair = await prisma.repair.findUnique({ where: { folio: folio.trim() }, include: fullInclude });
  if (!repair) return null;
  const c = contact.trim().toLowerCase();
  const emailMatch = !!repair.customer.email && repair.customer.email.toLowerCase() === c;
  const phoneMatch = !!repair.customer.phone && digitsOnly(repair.customer.phone) === digitsOnly(contact) && digitsOnly(contact).length > 0;
  if (!emailMatch && !phoneMatch) return null;
  return repair;
}

// Consulta pública protegida por folio y dato de contacto.
const lookupSchema = z.object({ folio: z.string().min(1), contact: z.string().min(1) });

publicRouter.post(
  '/repairs/lookup',
  asyncHandler(async (req, res) => {
    const { folio, contact } = lookupSchema.parse(req.body);
    const repair = await findByFolioAndContact(folio, contact);
    if (!repair) throw new HttpError(404, NOT_FOUND);
    res.json(serializePublicRepair(repair));
  })
);

// Traduce errores de multer (tipo/tamaño) a respuestas 400.
function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadProof.single('file')(req, res, (err) => {
    if (err) return next(new HttpError(400, err.message || 'Archivo inválido'));
    next();
  });
}

publicRouter.post(
  '/repairs/payment-proof',
  handleUpload,
  asyncHandler(async (req, res) => {
    const folio = String(req.body.folio || '');
    const contact = String(req.body.contact || '');
    const paymentRequestId = String(req.body.payment_request_id || '');
    if (!folio || !contact) throw new HttpError(400, 'Folio y correo o teléfono son obligatorios');
    if (!req.file) throw new HttpError(400, 'Adjunta un archivo');

    // El archivo solo se persiste después de validar identidad y solicitud activa.
    const repair = await findByFolioAndContact(folio, contact);
    if (!repair) throw new HttpError(404, NOT_FOUND);

    const pr = repair.paymentRequests.find((p) => p.id === paymentRequestId);
    if (!pr) throw new HttpError(400, 'Solicitud de pago no válida');
    if (!canUploadProof(repair)) throw new HttpError(409, 'No hay una solicitud de pago activa que admita comprobante');

    let storedFilename: string;
    let filePath: string;
    try {
      ({ storedFilename, filePath } = persistProof(req.file));
    } catch (err) {
      throw new HttpError(400, err instanceof Error ? err.message : 'Archivo inválido');
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentProof.create({
        data: {
          paymentRequestId: pr.id,
          repairId: repair.id,
          originalFilename: req.file!.originalname,
          storedFilename,
          filePath,
          mimeType: req.file!.mimetype,
          sizeBytes: req.file!.size,
          status: 'PENDING',
        },
      });
      await tx.paymentRequest.update({ where: { id: pr.id }, data: { status: 'PROOF_RECEIVED' } });
      await tx.repair.update({ where: { id: repair.id }, data: { paymentStatus: 'PROOF_RECEIVED' } });
      await applyTransition(tx, repair.id, 'PAGO_EN_VALIDACION', { type: 'PUBLIC_CLIENT' }, {
        publicNote: 'Comprobante recibido. El pago está pendiente de confirmación.',
        actionOverride: 'Comprobante de pago recibido',
      });
      await notifyRole(
        Role.ADMIN,
        {
          type: 'PAYMENT_PROOF',
          title: 'Nuevo comprobante de pago',
          message: `Nuevo comprobante de pago recibido para el folio ${repair.folio}.`,
          repairId: repair.id,
        },
        tx
      );
    });

    await emailClient('PROOF_RECEIVED', repair, repair.customer);
    await emailInternal('INTERNAL_NEW_PROOF', repair);

    const fresh = await prisma.repair.findUnique({ where: { id: repair.id }, include: fullInclude });
    res.status(201).json(serializePublicRepair(fresh!));
  })
);
