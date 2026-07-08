#!/bin/sh
set -e

# Secuencia de arranque del backend en contenedor:
# 1) sincroniza el schema con la base (sin historial de migraciones: proyecto
#    aún no lanzado, no hay datos reales que proteger), 2) siembra admin +
#    settings (idempotente), 3) arranca la API. tsx ejecuta TypeScript directo.

echo "[entrypoint] Sincronizando schema…"
npx prisma db push --skip-generate

echo "[entrypoint] Sembrando datos iniciales…"
npx tsx prisma/seed.ts

echo "[entrypoint] Iniciando API…"
exec npx tsx src/server.ts
