# Frontend Velatronix — Panel y consulta pública

React + TypeScript + Vite. Diseño propio ("banco de servicio / instrumento de diagnóstico")
con tokens en `src/styles/tokens.css` y componentes en `src/styles/app.css`. La identidad de
marca (logo "V" con punto de señal, wordmark **Vela**tronix) vive en `src/components/Brand.tsx`
y el favicon en `public/favicon.svg`.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo (http://localhost:5173) |
| `npm run build` | Typecheck + build de producción |
| `npm run typecheck` | Solo `tsc --noEmit` |

## Rutas

- **Pública:** `/consultar` — formulario folio+correo/teléfono y vista de resultado con riel de estados,
  datos de pago y carga de comprobante.
- **Interna:** `/admin/login`, `/admin` (dashboard), `/admin/reparaciones`,
  `/admin/reparaciones/nueva`, `/admin/reparaciones/:id`, `/admin/pagos-pendientes`,
  `/admin/usuarios`, `/admin/configuracion/pagos`.

## Configuración

Por defecto la app llama a `/api` en el **mismo origen** (`src/lib/api.ts`): en producción lo
sirve el reverse-proxy de nginx (`nginx.conf`) y en desarrollo el proxy de Vite (`vite.config.ts`).
No hace falta hornear ninguna URL de API en el build. Solo si el backend vive en otro dominio,
define `VITE_API_BASE` (p.ej. `https://api.midominio.com`).

La sesión interna usa cookie `HttpOnly` emitida por el backend. Axios envía credenciales con
`withCredentials`; `localStorage` solo se limpia para migrar sesiones antiguas. Los permisos de UI
(`src/lib/auth.tsx` → `can`) reflejan la matriz del backend, pero la autorización real se valida
en el servidor.
