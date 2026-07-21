// Validación pura de tipos de comprobante: sin dependencias de entorno ni disco,
// para poder ejecutarse en el selfcheck sin configuración.

// Tipos aceptados para comprobantes. La firma real se valida antes de persistir.
export const ALLOWED_MIME: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export function isAllowedUpload(mimetype: string): boolean {
  return mimetype in ALLOWED_MIME;
}

export function hasAllowedSignature(mimetype: string, b: Buffer): boolean {
  if (mimetype === 'application/pdf') return b.subarray(0, 4).toString('ascii') === '%PDF';
  if (mimetype === 'image/jpeg') return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mimetype === 'image/png') return b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === 'image/webp') return b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}
