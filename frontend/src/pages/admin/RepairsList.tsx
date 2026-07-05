import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { fmtDate } from '../../lib/format';
import { DEVICE_LABELS, STATUS, RepairStatus } from '../../lib/status';
import { can, useAuth } from '../../lib/auth';

interface Row {
  id: string;
  folio: string;
  status: RepairStatus;
  deviceType: string;
  createdAt: string;
  customer: { name: string; email: string; phone?: string };
}

export function RepairsList() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ folio: '', customer: '', email: '', phone: '', status: '', deviceType: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['repairs', f],
    queryFn: async () => {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
      return (await api.get('/repairs', { params })).data as Row[];
    },
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  return (
    <div>
      <div className="row between" style={{ marginBottom: 4 }}>
        <h1 className="page-title">Reparaciones</h1>
        {can.createRepair(user?.role) && (
          <Link to="/admin/reparaciones/nueva" className="btn btn-primary">
            + Nueva reparación
          </Link>
        )}
      </div>
      <p className="page-sub">Busca y filtra los equipos en servicio</p>

      <div className="filters">
        <div className="field">
          <label>Folio</label>
          <input className="input" value={f.folio} onChange={set('folio')} placeholder="REP-…" />
        </div>
        <div className="field">
          <label>Cliente</label>
          <input className="input" value={f.customer} onChange={set('customer')} />
        </div>
        <div className="field">
          <label>Correo</label>
          <input className="input" value={f.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input className="input" value={f.phone} onChange={set('phone')} />
        </div>
        <div className="field">
          <label>Estado</label>
          <select className="select" value={f.status} onChange={set('status')}>
            <option value="">Todos</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Tipo de equipo</label>
          <select className="select" value={f.deviceType} onChange={set('deviceType')}>
            <option value="">Todos</option>
            {Object.entries(DEVICE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Equipo</th>
              <th>Estado</th>
              <th>Recibido</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                  Cargando…
                </td>
              </tr>
            )}
            {data?.map((r) => (
              <tr key={r.id} onClick={() => nav(`/admin/reparaciones/${r.id}`)}>
                <td className="mono">{r.folio}</td>
                <td>
                  {r.customer.name}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {r.customer.email}
                  </div>
                </td>
                <td>{DEVICE_LABELS[r.deviceType] ?? r.deviceType}</td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="muted">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                  No se encontraron reparaciones con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
