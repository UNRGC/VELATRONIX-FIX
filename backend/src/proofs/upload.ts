import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../env';

// Tipos permitidos (§6.2). Se valida MIME + extensión.
export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Archivos fuera del árbol público; solo se sirven vía ruta autenticada de descarga.
fs.mkdirSync(env.uploadDir, { recursive: true });

export function isAllowedUpload(mimetype: string): boolean {
  return mimetype in ALLOWED_MIME;
}

// Guardamos en memoria: así validamos folio+correo ANTES de persistir el archivo (§18).
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
  const ext = ALLOWED_MIME[file.mimetype] || path.extname(file.originalname);
  const storedFilename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
  const filePath = path.join(env.uploadDir, storedFilename);
  fs.writeFileSync(filePath, file.buffer);
  return { storedFilename, filePath };
}
