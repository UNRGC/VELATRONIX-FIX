import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api se reenvía al backend local (mismo origen que en producción).
// VITE_DEV_API_TARGET permite cambiar el destino (por defecto localhost:4000).
const devApiTarget = process.env.VITE_DEV_API_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: devApiTarget, changeOrigin: true },
    },
  },
});
