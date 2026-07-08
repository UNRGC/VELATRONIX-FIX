import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { can, useAuth } from '../lib/auth';
import { Brand } from './Brand';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrador', EMPLOYEE: 'Recepción', TECHNICIAN: 'Técnico' };

export function AdminLayout() {
  const { user, logout } = useAuth();

  // Contadores para insignias del nav (pagos pendientes, notificaciones).
  const { data } = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: async () => (await api.get('/dashboard')).data,
    refetchInterval: 30000,
  });
  const counts = data?.counts ?? {};

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brand">
          <Brand sub="Panel de servicio" />
        </div>

        <NavLink to="/admin" end className="nav-item">
          Panel
        </NavLink>
        <NavLink to="/admin/reparaciones" className="nav-item">
          Reparaciones
        </NavLink>
        {can.createRepair(user?.role) && (
          <NavLink to="/admin/reparaciones/nueva" className="nav-item">
            Nueva reparación
          </NavLink>
        )}
        {can.validatePayment(user?.role) && (
          <NavLink to="/admin/pagos-pendientes" className="nav-item">
            Pagos pendientes
            {counts.pendingValidation ? <span className="count">{counts.pendingValidation}</span> : null}
          </NavLink>
        )}
        {can.manageUsers(user?.role) && (
          <NavLink to="/admin/usuarios" className="nav-item">
            Usuarios
          </NavLink>
        )}
        {can.editSettings(user?.role) && (
          <NavLink to="/admin/configuracion/pagos" className="nav-item">
            Datos de pago
          </NavLink>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <a href="/consultar" target="_blank" rel="noreferrer" className="eyebrow">
            Ver consulta pública ↗
          </a>
          <div className="user">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600 }}>{user?.name}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Salir
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
