import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AdminLayout } from './components/AdminLayout';
import { Brand } from './components/Brand';
import { Consultar } from './pages/public/Consultar';
import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { RepairsList } from './pages/admin/RepairsList';
import { NewRepair } from './pages/admin/NewRepair';
import { RepairDetail } from './pages/admin/RepairDetail';
import { RepairPrint } from './pages/admin/RepairPrint';
import { PendingPayments } from './pages/admin/PendingPayments';
import { Users } from './pages/admin/Users';
import { PaymentSettingsPage } from './pages/admin/PaymentSettings';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Cargando…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function NotFound() {
  const { user } = useAuth();
  return (
    <div className="public">
      <div className="public-top" style={{ color: '#fff' }}>
        <Brand sub="Servicio" />
      </div>
      <div className="public-wrap">
        <div className="lookup-hero">
          <div className="terminal">&gt; 404</div>
          <h1>Página no encontrada</h1>
          <p className="muted">La dirección no corresponde a una sección disponible.</p>
        </div>
        <div className="card card-pad row wrap" style={{ gap: 10 }}>
          <Link className="btn btn-primary" to="/consultar">
            Consultar reparación
          </Link>
          <Link className="btn btn-ghost" to={user ? '/admin' : '/admin/login'}>
            {user ? 'Ir al panel' : 'Acceso interno'}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminNotFound() {
  return (
    <div>
      <h1 className="page-title">Página no encontrada</h1>
      <p className="page-sub">La sección solicitada no está disponible.</p>
      <div className="card card-pad row wrap" style={{ gap: 10 }}>
        <Link className="btn btn-primary" to="/admin">
          Panel
        </Link>
        <Link className="btn btn-ghost" to="/admin/reparaciones">
          Reparaciones
        </Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      {/* Vista pública */}
      <Route path="/" element={<Navigate to="/consultar" replace />} />
      <Route path="/consultar" element={<Consultar />} />

      {/* Área interna */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin/reparaciones/:id/imprimir"
        element={
          <RequireAuth>
            <RepairPrint />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="reparaciones" element={<RepairsList />} />
        <Route path="reparaciones/nueva" element={<NewRepair />} />
        <Route path="reparaciones/:id" element={<RepairDetail />} />
        <Route path="pagos-pendientes" element={<PendingPayments />} />
        <Route path="usuarios" element={<Users />} />
        <Route path="configuracion/pagos" element={<PaymentSettingsPage />} />
        <Route path="*" element={<AdminNotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
