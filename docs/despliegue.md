# Despliegue y mantenimiento

Guía para desplegar, operar y mantener **Velatronix**. Dirigida a quien administre el
servidor, no a un usuario final.

## Arquitectura de contenedores

```
                    ┌─────────────────────────────────────────┐
   Internet ─────▶  │  frontend (nginx)                        │
   (un dominio)     │   • sirve la SPA (React)                 │
                    │   • /api/*  ──reverse-proxy──▶ backend   │
                    └───────────────┬─────────────────────────┘
                                    │ red interna de Docker
                    ┌───────────────▼───────────┐   ┌──────────────────┐
                    │  backend (Express + tsx)  │──▶│ postgres (16)    │
                    │   • sincroniza schema y    │   │  vol postgres_data│
                    │     siembra al arrancar    │   └──────────────────┘
                    │   • guarda comprobantes en │
                    │     vol uploaded_files      │
                    └────────────────────────────┘
```

Punto clave: **el navegador solo habla con un origen** (el dominio del frontend). nginx sirve
la SPA y reenvía `/api` al backend por la red interna. Por eso **no hay que hornear ninguna URL
de API en el build** y el mismo bundle funciona en cualquier dominio.

- `frontend/nginx.conf` — SPA + `location /api/ → http://backend:4000`.
- `frontend/src/lib/api.ts` — el cliente llama a `/api` (same-origin) por defecto.

## Volúmenes persistentes (¡no borrar!)

| Volumen | Contenido | Si se pierde |
|---------|-----------|--------------|
| `postgres_data` | Toda la base de datos | Se pierden reparaciones, usuarios, historial |
| `uploaded_files` | Comprobantes de pago subidos | Se pierden los archivos adjuntos |

## Variables de entorno

Todas se documentan en [`.env.example`](../.env.example). Las **requeridas** (sin valor por
defecto seguro): `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, y
`DATABASE_URL` coherente con el usuario/clave/BD de Postgres. Genera el `JWT_SECRET` con
`openssl rand -hex 32`.

`APP_PUBLIC_URL` debe apuntar al dominio público de la app. `CORS_ORIGINS` define la allowlist
del backend cuando el frontend y la API no comparten exactamente el mismo origen; acepta varios
orígenes separados por coma.

---

## Opción A — Despliegue en Dokploy (recomendado)

Dokploy es la vía prevista. Usa **Docker Compose** como tipo de aplicación.

1. **Crear la aplicación**
   - En Dokploy: *Create Application → Compose*.
   - Conecta este repositorio (o sube el código). Rama a desplegar: la que uses en producción.
   - Compose file: `docker-compose.yml` (el base; **no** incluyas el `.dev.yml` en producción).

2. **Variables de entorno**
   - Pega en *Environment* el contenido de tu `.env` (basado en `.env.example`).
   - `APP_PUBLIC_URL` = la URL pública que asignes (p.ej. `https://reparaciones.tudominio.com`).
   - `CORS_ORIGINS` = el/los orígenes permitidos. En despliegue same-origin normalmente coincide con `APP_PUBLIC_URL`.
   - Usa un `SMTP_*` real (Mailpit es solo para desarrollo).

3. **Dominio y proxy**
   - En *Domains*, asigna el dominio al **servicio `frontend`, puerto `80`**.
   - Dokploy (Traefik) termina TLS y enruta el tráfico al contenedor. El frontend ya reenvía
     `/api` internamente, así que **solo se publica el frontend**; backend y postgres quedan
     en la red interna.
   - Activa HTTPS (Let's Encrypt) desde Dokploy.

4. **Desplegar**
   - *Deploy*. En el primer arranque el backend sincroniza el schema (`prisma db push`) y crea el admin.
   - Verifica el healthcheck del backend (Dokploy lo muestra) y entra a `https://tu-dominio/consultar`.

5. **Persistencia**
   - Los volúmenes `postgres_data` y `uploaded_files` los gestiona Docker; Dokploy los conserva
     entre despliegues. Inclúyelos en tu política de backups (ver abajo).

> Nota: el compose base publica también `FRONTEND_PORT:80` como conveniencia. Con Dokploy no es
> necesario (enruta por dominio); puedes ignorar ese puerto o quitar el bloque `ports` del
> servicio `frontend` si prefieres exponer solo vía Traefik.

---

## Opción B — VPS con Docker Compose (sin Dokploy)

```bash
git clone <repo> && cd VELATRONIX-FIX
cp .env.example .env
nano .env                     # define contraseñas, JWT_SECRET, SMTP real, APP_PUBLIC_URL, CORS_ORIGINS
docker compose up -d --build  # usa solo el compose base
```

El frontend queda en `http://SERVIDOR:8080` (o el `FRONTEND_PORT` que definas). Pon un
reverse-proxy con TLS (Caddy, nginx, Traefik) delante apuntando a ese puerto si quieres HTTPS
y un dominio.

---

## Desarrollo local

Levanta todo con el override de desarrollo (añade Mailpit y publica puertos):

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Servicio | URL |
|----------|-----|
| Frontend (SPA + API) | http://localhost:5173 |
| API directa | http://localhost:4000/api |
| Mailpit (correos) | http://localhost:8025 |
| Postgres | localhost:5432 |

Sin Docker (hot-reload): necesitas un Postgres local y `DATABASE_URL` apuntando a él.

```bash
# Terminal 1 — backend
cd backend && npm install
npx prisma db push && npx tsx prisma/seed.ts
npm run dev                     # http://localhost:4000

# Terminal 2 — frontend
cd frontend && npm install
npm run dev                     # http://localhost:5173  (proxy /api → :4000)
```

---

## Operación

### Actualizar a una nueva versión
```bash
git pull
docker compose up -d --build    # Dokploy: pulsar Deploy
```
Los cambios de schema se sincronizan solos al arrancar el backend (`prisma db push`).

### Backups
```bash
# Base de datos
docker compose exec postgres pg_dump -U velatronix velatronix > backup_$(date +%F).sql

# Comprobantes (contenido del volumen)
docker run --rm -v velatronix-fix_uploaded_files:/data -v "$PWD":/out alpine \
  tar czf /out/uploads_$(date +%F).tar.gz -C /data .
```
Restaurar BD: `docker compose exec -T postgres psql -U velatronix velatronix < backup.sql`.
(El nombre real del volumen puede llevar el prefijo del proyecto; míralo con `docker volume ls`.)

### Logs y estado
```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

### Cambios de esquema (al desarrollar)
Edita `backend/prisma/schema.prisma` y listo — no hay migraciones que generar ni commitear.
El siguiente `docker compose up` (o Deploy en Dokploy) sincroniza la base automáticamente
(`prisma db push`) al arrancar el backend.

> Este flujo (sin historial de migraciones) es válido mientras el proyecto no tenga datos reales
> en producción: `db push` puede perder datos en cambios destructivos (ej. borrar una columna con
> información) y no deja rastro de qué cambió ni cuándo. Una vez haya reparaciones/clientes reales
> que proteger, conviene pasar a migraciones versionadas (`prisma migrate dev` /
> `prisma migrate deploy`) para poder revisar y revertir cada cambio de schema con seguridad.

---

## Diagnóstico de problemas

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `Could not parse schema engine response… Unexpected token 'E'` | Imagen sin OpenSSL (Prisma) | Ya resuelto: el backend usa `node:20-slim` con `openssl`. Reconstruye: `docker compose up --build backend` |
| El frontend carga pero la API da 404/timeout | nginx no alcanza al backend | Verifica que el servicio se llame `backend` y exponga 4000; revisa `frontend/nginx.conf` |
| No llegan correos | SMTP mal configurado | Revisa `SMTP_*`; en dev usa Mailpit; consulta la tabla `EmailLog` |
| Comprobante rechazado por tamaño | Body > límite | Sube `MAX_UPLOAD_SIZE_MB` y `client_max_body_size` en `nginx.conf` |
| `define POSTGRES_PASSWORD` al levantar | Falta variable requerida | Define las variables del `.env` (Compose las valida) |
| El admin no puede entrar | Seed no corrió o clave cambiada | Revisa logs del backend al arranque; el admin se crea solo si no existe |

## Seguridad en producción (checklist)

- [ ] `JWT_SECRET` largo y aleatorio; `ADMIN_PASSWORD` largo, único y definido antes del primer arranque.
- [ ] `POSTGRES_PASSWORD` fuerte; Postgres **sin** puerto publicado (el base no lo publica).
- [ ] TLS/HTTPS activo en el proxy (Dokploy/Traefik o el reverse-proxy del VPS).
- [ ] `SMTP_*` de un proveedor real; `APP_PUBLIC_URL` y `CORS_ORIGINS` con dominios https correctos.
- [ ] Backups periódicos de `postgres_data` y `uploaded_files`.
- [ ] Los comprobantes se sirven solo para `ADMIN`/`EMPLOYEE` autenticados (`/api/payment-proofs/:id/download`) y viven
      en un volumen fuera del árbol público — no cambiar esa ruta a una carpeta servida por nginx.
