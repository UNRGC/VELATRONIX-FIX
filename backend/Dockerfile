FROM node:20-alpine

WORKDIR /app

# Instalar dependencias (incluye dev: tsx/prisma se usan en runtime del arranque)
COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

# Aplica migraciones, siembra admin y arranca. tsx corre TS directo (sin build previo).
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx src/server.ts"]
