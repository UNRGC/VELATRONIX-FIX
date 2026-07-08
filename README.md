# Velatronix — Sistema de consulta y gestión de reparaciones

Sistema web de **Velatronix** para administrar reparaciones de equipos electrónicos (PC, laptop,
impresora, celular, tablet, otro). Tiene un **panel interno** autenticado (Administrador /
Recepción / Técnico) y una **vista pública** donde el cliente consulta su reparación con
**folio + correo** y adjunta comprobantes de pago. No hay pagos en línea: el sistema muestra
instrucciones (transferencia / depósito / efectivo) y el personal valida los comprobantes
manualmente.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + TypeScript, Express, Prisma ORM, PostgreSQL, JWT, Multer, Nodemailer, Zod |
| Frontend | React + TypeScript + Vite, React Router, TanStack Query, React Hook Form |
| Infra | Docker Compose · nginx (SPA + reverse-proxy `/api`) · listo para Dokploy |

## Estructura

```
VELATRONIX-FIX/
├── backend/                  API Express + Prisma
├── frontend/                 SPA React (panel + vista pública) servida por nginx
├── docker-compose.yml        Base (producción / Dokploy)
├── docker-compose.dev.yml    Override de desarrollo (añade Mailpit, publica puertos)
├── .env.example              Todas las variables, documentadas
└── docs/                     requerimientos, flujos, estados, api, despliegue
```

## Arranque rápido (desarrollo)

Requiere Docker. Levanta con el override de desarrollo (incluye Mailpit para ver correos):

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Servicio | URL | Notas |
|----------|-----|-------|
| Frontend | http://localhost:5173 | Panel en `/admin`, consulta pública en `/consultar` |
| API      | http://localhost:4000/api | También accesible como `/api` desde el frontend |
| Mailpit  | http://localhost:8025 | Bandeja de correos de prueba |
| Postgres | localhost:5432 | Datos en volumen `postgres_data` |

Admin inicial (configurable en `.env`): **`admin@velatronix.local` / `Admin1234!`** — cámbialo
tras el primer login.

> **Arquitectura same-origin:** el navegador solo habla con el dominio del frontend; nginx
> reenvía `/api` al backend. No se hornea ninguna URL de API en el build, así que el mismo
> bundle sirve en cualquier dominio. La landing existente solo debe enlazar a `…/consultar`.

## Despliegue en producción (Dokploy)

Ver la guía completa: **[docs/despliegue.md](docs/despliegue.md)**. Resumen:

- Tipo de app en Dokploy: **Compose**, usando `docker-compose.yml` (el base, sin el `.dev.yml`).
- Variables: pega tu `.env` (ver `.env.example`); usa SMTP real y define `APP_PUBLIC_URL`.
- Dominio: apúntalo al servicio **`frontend`, puerto `80`**. Solo se expone el frontend;
  backend y postgres quedan en la red interna. Activa HTTPS.
- Al primer arranque, el backend aplica migraciones y crea el admin automáticamente.

## Desarrollo sin Docker (hot-reload)

Necesitas un PostgreSQL local y `DATABASE_URL` apuntando a él.

```bash
# Backend
cd backend && npm install
npx prisma migrate deploy && npx tsx prisma/seed.ts
npm run dev            # http://localhost:4000

# Frontend (otra terminal) — el proxy de Vite reenvía /api → :4000
cd frontend && npm install
npm run dev            # http://localhost:5173
```

## Verificación

```bash
cd backend  && npm run check     # self-checks: máquina de estados, folios, uploads
cd backend  && npx tsc --noEmit
cd frontend && npm run build
```

Flujo manual completo y criterios de aceptación: [docs/flujos.md](docs/flujos.md).

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/despliegue.md](docs/despliegue.md) | Desplegar, operar, backups, diagnóstico (Dokploy y VPS) |
| [docs/api.md](docs/api.md) | Referencia de endpoints |
| [docs/estados.md](docs/estados.md) | Estados de reparación y transiciones por rol |
| [docs/flujos.md](docs/flujos.md) | Flujos completos y checklist de aceptación |
| [docs/requerimientos.md](docs/requerimientos.md) | Alcance funcional |

## Roles y permisos

Resumen en [docs/estados.md](docs/estados.md). La autorización se valida **en el backend**
(`requireAuth` / `requireRole` + la máquina de estados); los controles de UI solo muestran u
ocultan acciones.

## Seguridad (resumen)

- Consulta pública requiere folio **y** correo; mensajes de error genéricos.
- Comprobantes se guardan fuera del árbol público y se descargan solo autenticado.
- Uploads validan tipo (PDF/JPG/PNG/WEBP) y tamaño (5 MB); se validan folio+correo antes de persistir.
- Contraseñas con bcrypt; JWT con expiración; transiciones de estado controladas por el backend.
