import { Prisma } from '@prisma/client';

// Sin caracteres ambiguos (0/O, 1/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSuffix(len = 4): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function buildFolio(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `REP-${y}${m}${d}-${randomSuffix()}`;
}

// Genera un folio único reintentando ante colisiones del índice único.
export async function generateUniqueFolio(
  tx: Prisma.TransactionClient,
  maxAttempts = 8
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const folio = buildFolio();
    const existing = await tx.repair.findUnique({ where: { folio } });
    if (!existing) return folio;
  }
  throw new Error('No se pudo generar un folio único');
}
