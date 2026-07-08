#!/bin/sh
set -e

# Secuencia de arranque del backend en contenedor:
# 1) aplica migraciones pendientes, 2) siembra admin + settings (idempotente),
# 3) arranca la API. tsx ejecuta TypeScript directo (sin build previo).

echo "[entrypoint] Aplicando migraciones…"
npx prisma migrate deploy

echo "[entrypoint] Sembrando datos iniciales…"
npx tsx prisma/seed.ts

echo "[entrypoint] Iniciando API…"
exec npx tsx src/server.ts
