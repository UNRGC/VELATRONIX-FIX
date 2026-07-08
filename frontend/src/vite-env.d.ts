/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base opcional para la API. Vacío = same-origin ("/api"). Úsalo solo si el backend
  // está en otro dominio, p.ej. "https://api.midominio.com".
  readonly VITE_API_BASE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
