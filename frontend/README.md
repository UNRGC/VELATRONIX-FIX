# Frontend — Panel y consulta pública

React + TypeScript + Vite. Diseño propio ("banco de servicio / instrumento de diagnóstico")
con tokens en `src/styles/tokens.css` y componentes en `src/styles/app.css`.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo (http://localhost:5173) |
| `npm run build` | Typecheck + build de producción |
| `npm run typecheck` | Solo `tsc --noEmit` |

## Rutas

- **Pública:** `/consultar` — formulario folio+correo y vista de resultado con riel de estados,
  datos de pago y carga de comprobante.
- **Interna:** `/admin/login`, `/admin` (dashboard), `/admin/reparaciones`,
  `/admin/reparaciones/nueva`, `/admin/reparaciones/:id`, `/admin/pagos-pendientes`,
  `/admin/usuarios`, `/admin/configuracion/pagos`.

## Configuración

`VITE_API_URL` (build-time) apunta al backend. En Docker se pasa como `ARG` en el Dockerfile.
El token JWT se guarda en `localStorage` y se adjunta vía interceptor de Axios (`src/lib/api.ts`).
Los permisos de UI (`src/lib/auth.tsx` → `can`) reflejan la matriz del backend, pero la
autorización real se valida en el servidor.
