import axios from 'axios';

// Por defecto same-origin: el frontend llama a "/api" y nginx (prod) o el proxy de
// Vite (dev) lo reenvía al backend. Así funciona en cualquier dominio sin recompilar.
// VITE_API_BASE permite apuntar a otro host si el backend vive en un dominio aparte.
const base = import.meta.env.VITE_API_BASE ?? '';

export const api = axios.create({ baseURL: `${base}/api`, withCredentials: true });

const TOKEN_KEY = 'rep_token';

export function getToken(): string | null {
  return null;
}
export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // Sesión expirada: limpiar y mandar al login (excepto en rutas públicas).
    if (error.response?.status === 401) {
      setToken(null);
      if (!location.pathname.startsWith('/consultar') && location.pathname !== '/admin/login') location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Extrae el mensaje de error del backend de forma segura.
export function apiError(err: unknown, fallback = 'Ocurrió un error'): string {
  if (axios.isAxiosError(err)) return err.response?.data?.error || fallback;
  return fallback;
}

// URL absoluta de descarga (para abrir comprobante en nueva pestaña — requiere token en header,
// por eso se descarga vía fetch con blob).
export async function downloadProof(id: string): Promise<string> {
  const res = await api.get(`/payment-proofs/${id}/download`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}
