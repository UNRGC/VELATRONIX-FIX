# API

Base: `/api`. Autenticación interna por cookie `HttpOnly` emitida en login. También se acepta
`Authorization: Bearer <jwt>` para compatibilidad con clientes no navegador.
Errores: `{ "error": "mensaje" }` con código HTTP acorde (401/403/404/409/422).

## Públicas (sin auth)

### `POST /public/repairs/lookup`
Consulta una reparación. Requiere folio **y** correo o teléfono. Error genérico si no coincide.
```json
{ "folio": "REP-20260704-A8K3", "contact": "cliente@correo.com" }
```
Respuesta: vista pública (estado, equipo, diagnóstico, notas visibles, pago, historial público).
Nunca incluye notas internas ni IDs internos.

### `POST /public/repairs/payment-proof` (multipart)
Sube comprobante. Valida folio+contacto **antes** de persistir el archivo.
Campos: `folio`, `contact`, `payment_request_id`, `file` (PDF/JPG/PNG/WEBP, ≤5 MB).

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
| GET   | `/repairs` | filtros: `folio, customer, email, phone, status, deviceType, dateFrom, dateTo`. TECHNICIAN solo recibe asignadas |
| POST  | `/repairs` | ADMIN, EMPLOYEE. Genera folio, envía correo |
| GET   | `/repairs/:id` | ADMIN/EMPLOYEE: detalle completo. TECHNICIAN: solo asignadas y sin comprobantes |
| PATCH | `/repairs/:id` | ADMIN, EMPLOYEE. Edita cliente/equipo |
| PATCH | `/repairs/:id/diagnosis` | ADMIN, TECHNICIAN asignado. Puede crear solicitud de pago |
| PATCH | `/repairs/:id/status` | cambio de estado validado por máquina de estados y asignación |
| GET   | `/repairs/:id/history` | historial completo; TECHNICIAN solo asignadas |

## Pagos

| Método | Ruta | Rol |
|--------|------|-----|
| POST  | `/repairs/:id/payment-request` | ADMIN, TECHNICIAN asignado |
| GET   | `/repairs/:id/payment-requests` | ADMIN/EMPLOYEE; TECHNICIAN asignado sin proofs |
| PATCH | `/payment-requests/:id/validate` | ADMIN, EMPLOYEE |
| PATCH | `/payment-requests/:id/reject` | ADMIN, EMPLOYEE (body: `{ reason }`) |
| PATCH | `/payment-requests/:id/cancel` | ADMIN, EMPLOYEE |

## Comprobantes (ADMIN, EMPLOYEE)

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
listos para entrega, no leídas) + reparaciones recientes. Para `TECHNICIAN`, los contadores y
recientes se limitan a reparaciones asignadas y no incluyen métricas de comprobantes.
