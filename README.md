# VELATRONIX — Sistema de consulta y gestión de reparaciones

Sistema web para administrar reparaciones de equipos electrónicos (PC, laptop, impresora,
celular, tablet, otro). Tiene un **panel interno** autenticado (Administrador / Recepción /
Técnico) y una **vista pública** donde el cliente consulta su reparación con **folio + correo**
y adjunta comprobantes de pago. No hay pagos en línea: el sistema muestra instrucciones
(transferencia / depósito / efectivo) y el personal valida los comprobantes manualmente.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + TypeScript, Express, Prisma ORM, PostgreSQL, JWT, Multer, Nodemailer, Zod |
| Frontend | React + TypeScript + Vite, React Router, TanStack Query, React Hook Form |
| Infra | Docker Compose (postgres, backend, frontend, mailpit) |

## Estructura

```
VELATRONIX-FIX/
├── backend/       API Express + Prisma
├── frontend/      SPA React (panel + vista pública)
├── docker-compose.yml
├── .env.example
└── docs/          requerimientos, flujos, estados, api
```

## Puesta en marcha (Docker)

Requiere Docker Desktop.

```bash
cp .env.example .env        # ajusta secretos si quieres
docker compose up --build
```

Servicios:

| Servicio | URL | Notas |
|----------|-----|-------|
| Frontend | http://localhost:5173 | Panel en `/admin`, consulta pública en `/consultar` |
| Backend  | http://localhost:4000/api | API REST |
| Mailpit  | http://localhost:8025 | Bandeja de correos de prueba |
| Postgres | localhost:5432 | Datos persistentes en volumen `postgres_data` |

El backend aplica migraciones y siembra el usuario administrador al arrancar. Credenciales
iniciales (configurables en `.env`):

- **Correo:** `admin@reparaciones.local`
- **Contraseña:** `Admin1234!`

> La landing existente solo debe enlazar al botón hacia `http://localhost:5173/consultar`
> (o el dominio público que configures en `APP_PUBLIC_URL` / `VITE_API_URL`).

## Desarrollo local (sin Docker)

Necesitas un PostgreSQL local y ajustar `DATABASE_URL`.

```bash
# Backend
cd backend
npm install
npx prisma migrate deploy && npx tsx prisma/seed.ts
npm run dev            # http://localhost:4000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

## Verificación

```bash
cd backend  && npm run check   # self-checks de la máquina de estados, folios y uploads
cd backend  && npx tsc --noEmit
cd frontend && npm run build
```

Flujo manual completo y criterios de aceptación: ver [docs/flujos.md](docs/flujos.md).

## Roles y permisos

Resumen en [docs/estados.md](docs/estados.md) y la matriz completa en la sección 17 del plan.
La autorización se valida **en el backend** (los controles de UI solo muestran/ocultan).

## Seguridad (resumen)

- Consulta pública requiere folio **y** correo; mensajes de error genéricos.
- Comprobantes se guardan fuera del árbol público y se descargan solo autenticado.
- Uploads validan tipo (PDF/JPG/PNG/WEBP) y tamaño (5 MB); se validan folio+correo antes de persistir.
- Contraseñas con bcrypt; JWT con expiración; transiciones de estado controladas por el backend.
