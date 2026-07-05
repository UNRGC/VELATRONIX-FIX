# Backend — API de reparaciones

Express + TypeScript + Prisma + PostgreSQL.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor con recarga (tsx watch) |
| `npm run check` | Self-checks de máquina de estados, folios y uploads (sin DB) |
| `npm run prisma:migrate` | `prisma migrate deploy` |
| `npm run seed` | Crea admin inicial + fila de PaymentSettings |
| `npm run build` | Compila a `dist/` |
| `npx prisma migrate dev` | Crea/aplica migración en desarrollo |

## Estructura (`src/`)

- `auth/` — login, JWT, middleware `requireAuth` / `requireRole`.
- `repairs/` — rutas, **`stateMachine.ts`** (transiciones + permisos), `folio.ts`, `labels.ts`.
- `payments/` — `service.ts` (crear/validar/rechazar) + rutas.
- `proofs/` — `upload.ts` (Multer en memoria, validación tipo/tamaño) + descarga autenticada.
- `public/` — lookup por folio+correo y subida de comprobante (serialización pública segura).
- `email/` — Nodemailer + plantillas + `EmailLog`.
- `notifications/`, `settings/`, `dashboard/`, `users/`.

Variables de entorno: ver `.env.example` en la raíz.
