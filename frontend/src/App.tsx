import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { AdminLayout } from './components/AdminLayout';
import { Consultar } from './pages/public/Consultar';
import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { RepairsList } from './pages/admin/RepairsList';
import { NewRepair } from './pages/admin/NewRepair';
import { RepairDetail } from './pages/admin/RepairDetail';
import { PendingPayments } from './pages/admin/PendingPayments';
import { Users } from './pages/admin/Users';
import { PaymentSettingsPage } from './pages/admin/PaymentSettings';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Cargando…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
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
      </Route>

      <Route path="*" element={<Navigate to="/consultar" replace />} />
    </Routes>
  );
}
