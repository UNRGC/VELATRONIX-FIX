# Debian slim en vez de alpine: trae OpenSSL, que el engine de Prisma necesita.
FROM node:20-slim

# openssl para Prisma; ca-certificates para conexiones TLS salientes (SMTP);
# curl para el healthcheck del contenedor.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias (incluye dev: tsx/prisma se usan en runtime del arranque).
# Se copia el lockfile si existe para instalaciones reproducibles.
COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY docker-entrypoint.sh ./
# Normaliza CRLF→LF por si el checkout en Windows lo alteró, y hazlo ejecutable.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 4000

# db push → seed → arranque (ver docker-entrypoint.sh)
CMD ["./docker-entrypoint.sh"]
