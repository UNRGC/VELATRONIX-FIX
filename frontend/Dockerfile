# ---- Build de la SPA ----
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# same-origin por defecto: no se necesita URL de API en build. Si el backend vive en otro
# dominio, se puede pasar --build-arg VITE_API_BASE=https://api.midominio.com
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build

# ---- Servir con nginx (SPA + reverse-proxy /api) ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
