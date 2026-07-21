import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../env';
import { ALLOWED_MIME, hasAllowedSignature, isAllowedUpload } from './mime';

// Archivos fuera del árbol público; solo se sirven vía ruta autenticada de descarga.
fs.mkdirSync(env.uploadDir, { recursive: true });
const uploadRoot = path.resolve(env.uploadDir);

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
  if (!hasAllowedSignature(file.mimetype, file.buffer)) {
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
