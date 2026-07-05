import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { fmtDate } from '../../lib/format';
import { RepairStatus } from '../../lib/status';

interface RecentRepair {
  id: string;
  folio: string;
  status: RepairStatus;
  createdAt: string;
  customer: { name: string };
}

export function Dashboard() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  if (isLoading) return <p className="muted">Cargando…</p>;
  const c = data.counts;

  return (
    <div>
      <h1 className="page-title">Panel</h1>
      <p className="page-sub">Resumen operativo del taller</p>

      <div className="stat-grid">
        <Link to="/admin/pagos-pendientes" className="stat hot" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="n">{c.pendingValidation}</div>
          <div className="l">Pagos por validar</div>
        </Link>
        <div className="stat">
          <div className="n">{c.newProofs}</div>
          <div className="l">Comprobantes nuevos</div>
        </div>
        <div className="stat">
          <div className="n">{c.waitingReview}</div>
          <div className="l">En espera de revisión</div>
        </div>
        <div className="stat">
          <div className="n">{c.readyForPickup}</div>
          <div className="l">Listos para entrega</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Reparaciones recientes</h3>
          <Link to="/admin/reparaciones" className="eyebrow">
            Ver todas ↗
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Recibido</th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((r: RecentRepair) => (
              <tr key={r.id} onClick={() => nav(`/admin/reparaciones/${r.id}`)}>
                <td className="mono">{r.folio}</td>
                <td>{r.customer.name}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="muted">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {data.recent.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                  Aún no hay reparaciones. Crea la primera desde “Nueva reparación”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
