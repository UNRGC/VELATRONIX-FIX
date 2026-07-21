import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { DEVICE_LABELS } from '../../lib/status';
import { Brand } from '../../components/Brand';
import { AdminRepair } from '../../lib/apiTypes';

type Repair = AdminRepair;

// Vista independiente para impresión del comprobante de recepción.
export function RepairPrint() {
  const { id } = useParams();

  const { data: repair, isLoading } = useQuery({
    queryKey: ['repair', id],
    queryFn: async () => (await api.get(`/repairs/${id}`)).data as Repair,
  });

  if (isLoading) return <p style={{ padding: 24 }}>Cargando…</p>;
  if (!repair) return <p style={{ padding: 24 }}>Reparación no encontrada.</p>;

  // URL pública de consulta: VITE_PUBLIC_URL si el sitio del cliente vive en otro dominio;
  // si no, el origen actual (correcto por despliegue: demo, producción, etc.).
  const consultUrl = `${import.meta.env.VITE_PUBLIC_URL ?? window.location.origin}/consultar`;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <style>{`@media print { .no-print { display: none; } }`}</style>

      <div className="no-print row between" style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => window.close()}>
          Cerrar
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          Imprimir (Ctrl+P)
        </button>
      </div>

      <div className="row between" style={{ marginBottom: 14 }}>
        <Brand sub="Comprobante de recepción" />
        <div style={{ textAlign: 'right' }}>
          <div className="eyebrow">Folio</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
            {repair.folio}
          </div>
        </div>
      </div>

      <div
        style={{
          height: 3,
          borderRadius: 2,
          marginBottom: 22,
          background: 'linear-gradient(90deg, var(--brand-green-bright), var(--brand-green) 45%, var(--brand-blue))',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      />

      <div className="card">
        <div className="card-head">
          <h3>Cliente</h3>
        </div>
        <div className="card-pad">
          <dl className="dl">
            <dt>Nombre</dt>
            <dd>{repair.customer.name}</dd>
            <dt>Correo</dt>
            <dd>{repair.customer.email ?? '—'}</dd>
            <dt>Teléfono</dt>
            <dd>{repair.customer.phone ?? '—'}</dd>
          </dl>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Equipo</h3>
        </div>
        <div className="card-pad">
          <dl className="dl">
            <dt>Tipo</dt>
            <dd>{DEVICE_LABELS[repair.deviceType] ?? repair.deviceType}</dd>
            <dt>Marca / Modelo</dt>
            <dd>{(repair.deviceBrand ?? '—') + ' / ' + (repair.deviceModel ?? '—')}</dd>
            <dt>Serie</dt>
            <dd>{repair.deviceSerialNumber ?? '—'}</dd>
            <dt>Color</dt>
            <dd>{repair.deviceColor ?? '—'}</dd>
            <dt>Accesorios recibidos</dt>
            <dd>{repair.receivedAccessories ?? '—'}</dd>
            <dt>Estado físico</dt>
            <dd>{repair.physicalCondition ?? '—'}</dd>
            <dt>Falla reportada</dt>
            <dd>{repair.reportedIssue}</dd>
            <dt>Técnico asignado</dt>
            <dd>{repair.assignedTechnician?.name ?? 'Sin asignar'}</dd>
            <dt>Recibido</dt>
            <dd>{fmtDate(repair.receivedAt)}</dd>
          </dl>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 20 }}>
        Conserva este comprobante. Da seguimiento a tu reparación con el folio y tu correo o teléfono en:
        <br />
        <strong>{consultUrl}</strong>
      </p>
    </div>
  );
}
