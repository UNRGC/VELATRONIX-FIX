# API

Base: `/api`. Autenticación: `Authorization: Bearer <jwt>` (excepto rutas públicas).
Errores: `{ "error": "mensaje" }` con código HTTP acorde (401/403/404/409/422).

## Públicas (sin auth)

### `POST /public/repairs/lookup`
Consulta una reparación. Requiere folio **y** correo. Error genérico si no coincide.
```json
{ "folio": "REP-20260704-A8K3", "email": "cliente@correo.com" }
```
Respuesta: vista pública (estado, equipo, diagnóstico, notas visibles, pago, historial público).
Nunca incluye notas internas ni IDs internos.

### `POST /public/repairs/payment-proof` (multipart)
Sube comprobante. Valida folio+correo **antes** de persistir el archivo.
Campos: `folio`, `email`, `payment_request_id`, `file` (PDF/JPG/PNG/WEBP, ≤5 MB).

## Auth

| Método | Ruta | Rol |
|--------|------|-----|
| POST | `/auth/login` | — |
| GET  | `/auth/me` | autenticado |
| POST | `/auth/logout` | autenticado |

## Usuarios (solo ADMIN)

| Método | Ruta |
|--------|------|
| GET  | `/users` |
| POST | `/users` |
| GET  | `/users/:id` |
| PATCH | `/users/:id` |
| PATCH | `/users/:id/activate` |
| PATCH | `/users/:id/deactivate` |

## Reparaciones (autenticado)

| Método | Ruta | Notas |
|--------|------|-------|
| GET   | `/repairs` | filtros: `folio, customer, email, phone, status, deviceType, dateFrom, dateTo` |
| POST  | `/repairs` | ADMIN, EMPLOYEE. Genera folio, envía correo |
| GET   | `/repairs/:id` | detalle completo |
| PATCH | `/repairs/:id` | ADMIN, EMPLOYEE. Edita cliente/equipo |
| PATCH | `/repairs/:id/diagnosis` | ADMIN, EMPLOYEE, TECHNICIAN. Puede crear solicitud de pago |
| PATCH | `/repairs/:id/status` | cambio de estado administrativo (transición validada) |
| GET   | `/repairs/:id/history` | historial completo |

## Pagos

| Método | Ruta | Rol |
|--------|------|-----|
| POST  | `/repairs/:id/payment-request` | ADMIN, EMPLOYEE, TECHNICIAN |
| GET   | `/repairs/:id/payment-requests` | autenticado |
| PATCH | `/payment-requests/:id/validate` | ADMIN |
| PATCH | `/payment-requests/:id/reject` | ADMIN (body: `{ reason }`) |
| PATCH | `/payment-requests/:id/cancel` | ADMIN |

## Comprobantes (autenticado)

| Método | Ruta |
|--------|------|
| GET | `/payment-proofs?status=PENDING` |
| GET | `/payment-proofs/:id` |
| GET | `/payment-proofs/:id/download` |

## Notificaciones (autenticado)

| Método | Ruta |
|--------|------|
| GET   | `/notifications` |
| PATCH | `/notifications/:id/read` |
| PATCH | `/notifications/read-all` |

## Configuración de pago (solo ADMIN)

| Método | Ruta |
|--------|------|
| GET   | `/payment-settings` |
| PATCH | `/payment-settings` |

## Dashboard (autenticado)

`GET /dashboard` → contadores (pagos por validar, comprobantes nuevos, en espera de revisión,
listos para entrega, no leídas) + reparaciones recientes.
