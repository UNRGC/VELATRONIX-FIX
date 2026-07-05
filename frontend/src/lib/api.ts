import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: `${baseURL}/api` });

const TOKEN_KEY = 'rep_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    // Sesión expirada: limpiar y mandar al login (excepto en rutas públicas).
    if (error.response?.status === 401 && getToken()) {
      setToken(null);
      if (!location.pathname.startsWith('/consultar')) location.href = '/admin/login';
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
