/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base opcional para la API. Vacío = same-origin ("/api").
  // Se define cuando el backend vive en otro dominio.
  readonly VITE_API_BASE?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
