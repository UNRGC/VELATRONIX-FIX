import assert from 'assert';
import { RepairStatus } from '@prisma/client';
import { TRANSITIONS, findTransition, DEDICATED_ONLY } from './repairs/stateMachine';
import { buildFolio } from './repairs/folio';
import { isAllowedUpload } from './proofs/upload';

// Ejecuta con: npm run check  (lógica pura, no toca la base de datos).

// --- Folio ---
for (let i = 0; i < 50; i++) {
  assert.match(buildFolio(), /^REP-\d{8}-[A-HJ-NP-Z2-9]{4}$/, 'formato de folio inválido');
}

// --- Máquina de estados ---
// Transición válida existe; salto inválido no.
assert.ok(findTransition('EN_ESPERA_REVISION', 'EN_DIAGNOSTICO'), 'debe permitir iniciar diagnóstico');
assert.ok(!findTransition('EN_ESPERA_REVISION', 'ENTREGADO_CERRADO'), 'no debe permitir saltar a cerrado');
assert.ok(!findTransition('EN_ESPERA_REVISION', 'EN_PROCESO_REPARACION'), 'no debe saltar a reparación sin diagnóstico');

// Estado terminal sin salidas.
assert.deepStrictEqual(TRANSITIONS.ENTREGADO_CERRADO, [], 'ENTREGADO_CERRADO debe ser terminal');

// Solo el cliente público puede pasar a PAGO_EN_VALIDACION.
const proof = findTransition('EN_ESPERA_PAGO', 'PAGO_EN_VALIDACION');
assert.ok(proof && proof.allow.includes('PUBLIC') && !proof.allow.includes('TECHNICIAN'), 'comprobante solo por cliente');

// Validar pago: solo ADMIN, desde PAGO_EN_VALIDACION.
const validate = findTransition('PAGO_EN_VALIDACION', 'EN_PROCESO_REPARACION');
assert.ok(validate && validate.allow.length === 1 && validate.allow[0] === 'ADMIN', 'validar pago solo ADMIN');

// Pago secuencial: se puede volver a solicitar pago estando ya en reparación.
const rePay = findTransition('EN_PROCESO_REPARACION', 'EN_ESPERA_PAGO');
assert.ok(rePay && rePay.allow.includes('ADMIN') && rePay.allow.includes('TECHNICIAN'), 'pago adicional mid-reparación');

// Marcar realizada: técnico o admin, no empleado.
const done = findTransition('EN_PROCESO_REPARACION', 'REPARACION_REALIZADA');
assert.ok(done && done.allow.includes('TECHNICIAN') && done.allow.includes('ADMIN') && !done.allow.includes('EMPLOYEE'), 'realizada: tec/admin');

// Todos los destinos son estados válidos del enum.
const valid = new Set(Object.values(RepairStatus));
for (const [from, list] of Object.entries(TRANSITIONS)) {
  for (const t of list) {
    assert.ok(valid.has(t.to), `destino inválido desde ${from}: ${t.to}`);
    assert.ok(t.allow.length > 0, `transición sin roles: ${from}->${t.to}`);
  }
}

// Los estados dedicados no son alcanzables por el endpoint genérico.
assert.deepStrictEqual(DEDICATED_ONLY.sort(), ['DIAGNOSTICADO', 'EN_ESPERA_PAGO', 'PAGO_EN_VALIDACION'].sort());

// --- Uploads ---
assert.ok(isAllowedUpload('application/pdf') && isAllowedUpload('image/png'), 'PDF/PNG permitidos');
assert.ok(!isAllowedUpload('application/x-msdownload') && !isAllowedUpload('text/html'), 'ejecutables rechazados');

console.log('✓ selfcheck OK');
