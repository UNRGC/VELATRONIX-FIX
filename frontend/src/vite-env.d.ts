/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base opcional para la API. Vacío = same-origin ("/api").
  // Se define cuando el backend vive en otro dominio.
  readonly VITE_API_BASE?: string;
  // URL pública del sitio de consulta del cliente si vive en otro dominio.
  // Vacío = origen actual del navegador.
  readonly VITE_PUBLIC_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
