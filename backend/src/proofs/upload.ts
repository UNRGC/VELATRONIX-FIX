import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../env';

// Tipos aceptados para comprobantes. La firma real se valida antes de persistir.
export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Archivos fuera del árbol público; solo se sirven vía ruta autenticada de descarga.
fs.mkdirSync(env.uploadDir, { recursive: true });
const uploadRoot = path.resolve(env.uploadDir);

export function isAllowedUpload(mimetype: string): boolean {
  return mimetype in ALLOWED_MIME;
}

function hasAllowedSignature(file: Express.Multer.File): boolean {
  const b = file.buffer;
  if (file.mimetype === 'application/pdf') return b.subarray(0, 4).toString('ascii') === '%PDF';
  if (file.mimetype === 'image/jpeg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (file.mimetype === 'image/png') return b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === 'image/webp') return b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

// Almacenamiento en memoria para validar folio y contacto antes de escribir a disco.
export const uploadProof = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedUpload(file.mimetype)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido. Usa PDF, JPG, PNG o WEBP.'));
  },
});

// Escribe el buffer validado a disco y devuelve la ruta y el nombre interno.
export function persistProof(file: Express.Multer.File): { storedFilename: string; filePath: string } {
  if (!hasAllowedSignature(file)) {
    throw new Error('El contenido del archivo no coincide con el tipo declarado.');
  }
  const ext = ALLOWED_MIME[file.mimetype] || path.extname(file.originalname);
  const storedFilename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  const filePath = path.resolve(uploadRoot, storedFilename);
  if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error('Ruta de archivo inválida.');
  }
  fs.writeFileSync(filePath, file.buffer);
  return { storedFilename, filePath };
}
