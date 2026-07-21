import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiError, downloadProof } from '../../lib/api';
import { fmtDate, fmtMoney } from '../../lib/format';
import { PendingProof } from '../../lib/apiTypes';

export function PendingPayments() {
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pending-proofs'],
    queryFn: async () => (await api.get('/payment-proofs', { params: { status: 'PENDING' } })).data as PendingProof[],
  });

  const mut = useMutation({
    mutationFn: ({ url, body }: { url: string; body?: object }) => api.patch(url, body),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['pending-proofs'] });
      qc.invalidateQueries({ queryKey: ['dashboard-counts'] });
    },
    onError: (e) => setError(apiError(e)),
  });

  async function open(id: string) {
    const url = await downloadProof(id);
    window.open(url, '_blank');
  }

  return (
    <div>
      <h1 className="page-title">Pagos pendientes</h1>
      <p className="page-sub">Comprobantes en espera de validación</p>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Comprobante</th>
              <th>Recibido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                  Cargando…
                </td>
              </tr>
            )}
            {data?.map((p) => (
              <tr key={p.id} style={{ cursor: 'default' }}>
                <td>
                  <Link to={`/admin/reparaciones/${p.repairId}`} className="mono">
                    {p.repair?.folio}
                  </Link>
                </td>
                <td>{p.repair?.customer?.name}</td>
                <td className="mono">{fmtMoney(p.paymentRequest?.amount)}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => open(p.id)}>
                    📎 Ver
                  </button>
                </td>
                <td className="muted">{fmtDate(p.uploadedAt)}</td>
                <td>
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => mut.mutate({ url: `/payment-requests/${p.paymentRequest.id}/validate` })}
                    >
                      Validar
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        const reason = window.prompt('Motivo del rechazo:');
                        if (reason) mut.mutate({ url: `/payment-requests/${p.paymentRequest.id}/reject`, body: { reason } });
                      }}
                    >
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                  No hay comprobantes pendientes. ✓
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
