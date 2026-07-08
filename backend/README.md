# Backend Velatronix — API de reparaciones

Express + TypeScript + Prisma + PostgreSQL. Imagen Docker basada en `node:20-slim` (con OpenSSL
para Prisma). El arranque en contenedor (`docker-entrypoint.sh`) sincroniza el schema (`prisma db
push`, sin historial de migraciones), siembra el admin y levanta la API.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor con recarga (tsx watch) |
| `npm run check` | Self-checks de máquina de estados, folios y uploads (sin DB) |
| `npm run prisma:push` | `prisma db push` — sincroniza la base con `schema.prisma` |
| `npm run seed` | Crea admin inicial + fila de PaymentSettings |
| `npm run build` | Compila a `dist/` |

## Estructura (`src/`)

- `auth/` — login, JWT en cookie `HttpOnly`, compatibilidad con Bearer, middleware `requireAuth` / `requireRole`.
- `repairs/` — rutas, **`stateMachine.ts`** (transiciones + permisos), `folio.ts`, `labels.ts`.
- `payments/` — `service.ts` (crear/validar/rechazar) + rutas.
- `proofs/` — `upload.ts` (Multer en memoria, validación MIME/firma/tamaño) + descarga autenticada para `ADMIN`/`EMPLOYEE`.
- `public/` — lookup por folio+correo/teléfono y subida de comprobante (serialización pública segura).
- `email/` — Nodemailer + plantillas + `EmailLog`.
- `notifications/`, `settings/`, `dashboard/`, `users/`.

## Autorización

- `ADMIN`: acceso total.
- `EMPLOYEE`: recepción, captura/edición de datos de cliente y equipo, validación/rechazo/cancelación de pagos, consulta/descarga de comprobantes y cierre de entrega.
- `TECHNICIAN`: diagnóstico, solicitudes de pago y avance técnico solo sobre reparaciones asignadas (`assignedTechnicianId`). No recibe ni descarga comprobantes.

Las rutas de reparación filtran o rechazan acceso según rol y asignación. La máquina de estados
en `repairs/stateMachine.ts` es la fuente de verdad para transiciones permitidas.

Variables de entorno: ver `.env.example` en la raíz.
