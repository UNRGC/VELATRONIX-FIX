import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken } from './api';

export type Role = 'ADMIN' | 'EMPLOYEE' | 'TECHNICIAN';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post('/auth/login', { email, password });
    setToken(r.data.token);
    setUser(r.data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
    location.href = '/admin/login';
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

// Permisos derivados del rol (espejo de la matriz del backend §17, solo para mostrar/ocultar UI).
export const can = {
  createRepair: (r?: Role) => r === 'ADMIN' || r === 'EMPLOYEE',
  editRepairData: (r?: Role) => r === 'ADMIN' || r === 'EMPLOYEE',
  diagnose: (r?: Role) => !!r, // admin, empleado, técnico
  requestPayment: (r?: Role) => !!r,
  validatePayment: (r?: Role) => r === 'ADMIN',
  manageUsers: (r?: Role) => r === 'ADMIN',
  editSettings: (r?: Role) => r === 'ADMIN',
  markInProcess: (r?: Role) => r === 'ADMIN',
  markDone: (r?: Role) => r === 'ADMIN' || r === 'TECHNICIAN',
  markReady: (r?: Role) => r === 'ADMIN',
  markReturn: (r?: Role) => r === 'ADMIN',
  markDelivered: (r?: Role) => r === 'ADMIN' || r === 'EMPLOYEE',
};
