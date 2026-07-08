import axios from 'axios';

// Same-origin por defecto: nginx en producción y Vite en desarrollo reenvían "/api".
// VITE_API_BASE permite separar frontend y backend en dominios distintos.
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

// Descarga autenticada como blob para abrir comprobantes en una pestaña nueva.
export async function downloadProof(id: string): Promise<string> {
  const res = await api.get(`/payment-proofs/${id}/download`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}
