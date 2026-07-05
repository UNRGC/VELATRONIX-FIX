import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, apiError, downloadProof } from '../../lib/api';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusRail } from '../../components/StatusRail';
import { fmtDate, fmtMoney } from '../../lib/format';
import { DEVICE_LABELS, METHOD_LABELS, PAYMENT_STATUS_LABELS, RepairStatus } from '../../lib/status';
import { can, useAuth, Role } from '../../lib/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Repair = any;

const DIAGNOSABLE: RepairStatus[] = ['EN_ESPERA_REVISION', 'EN_DIAGNOSTICO', 'DIAGNOSTICADO', 'EN_ESPERA_PAGO'];

export function RepairDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState('');

  const { data: repair, isLoading } = useQuery({
    queryKey: ['repair', id],
    queryFn: async () => (await api.get(`/repairs/${id}`)).data as Repair,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['repair', id] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['dashboard-counts'] });
  };

  const statusMut = useMutation({
    mutationFn: (body: { status: string; publicNote?: string; internalNote?: string }) =>
      api.patch(`/repairs/${id}/status`, body),
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError: (e) => setError(apiError(e)),
  });

  if (isLoading) return <p className="muted">Cargando…</p>;
  if (!repair) return <p className="muted">Reparación no encontrada.</p>;

  const role = user?.role;
  const status: RepairStatus = repair.status;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="row between wrap" style={{ marginBottom: 8 }}>
        <div>
          <div className="eyebrow">Folio</div>
          <h1 className="page-title mono" style={{ fontSize: 26 }}>
            {repair.folio}
          </h1>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <StatusRail status={status} />
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <ActionsBar role={role} status={status} onStatus={(s, note) => statusMut.mutate({ status: s, internalNote: note, publicNote: note })} />

      <div className="stack">
        <DataSection repair={repair} role={role} onSaved={refresh} />
        <DiagnosisSection repair={repair} role={role} editable={DIAGNOSABLE.includes(status)} onSaved={refresh} />
        <PaymentSection repair={repair} role={role} onChange={refresh} />
        <HistorySection history={repair.history ?? []} />
      </div>
    </div>
  );
}

/* ---------- Acciones por estado/rol ---------- */
function ActionsBar({
  role,
  status,
  onStatus,
}: {
  role?: Role;
  status: RepairStatus;
  onStatus: (s: string, note?: string) => void;
}) {
  const actions: { label: string; cls?: string; run: () => void }[] = [];

  if (status === 'DIAGNOSTICADO' && can.markInProcess(role))
    actions.push({ label: 'Pasar a reparación', run: () => onStatus('EN_PROCESO_REPARACION') });
  if (status === 'EN_PROCESO_REPARACION' && can.markDone(role))
    actions.push({ label: 'Marcar reparación realizada', run: () => onStatus('REPARACION_REALIZADA') });
  if (status === 'REPARACION_REALIZADA' && can.markReady(role))
    actions.push({ label: 'Marcar listo para entrega', run: () => onStatus('LISTO_PARA_ENTREGA') });
  if (['DIAGNOSTICADO', 'EN_ESPERA_PAGO', 'EN_PROCESO_REPARACION', 'EN_ESPERA_REVISION'].includes(status) && can.markReturn(role))
    actions.push({
      label: 'Devolución sin reparación',
      cls: 'btn-danger',
      run: () => {
        const motivo = window.prompt('Motivo / acuerdo de la devolución (visible al cliente):');
        if (motivo) onStatus('DEVOLUCION_SIN_REPARACION', motivo);
      },
    });
  if ((status === 'LISTO_PARA_ENTREGA' || status === 'DEVOLUCION_SIN_REPARACION') && can.markDelivered(role))
    actions.push({ label: 'Marcar entregado y cerrar', run: () => onStatus('ENTREGADO_CERRADO') });

  if (actions.length === 0) return null;
  return (
    <div className="card card-pad row wrap" style={{ marginBottom: 20, gap: 10 }}>
      <span className="eyebrow" style={{ alignSelf: 'center' }}>
        Acciones
      </span>
      {actions.map((a) => (
        <button key={a.label} className={`btn ${a.cls ?? 'btn-primary'}`} onClick={a.run}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Datos de cliente y equipo ---------- */
function DataSection({ repair, role, onSaved }: { repair: Repair; role?: Role; onSaved: () => void }) {
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: repair.customer.name,
      email: repair.customer.email,
      phone: repair.customer.phone ?? '',
      deviceBrand: repair.deviceBrand ?? '',
      deviceModel: repair.deviceModel ?? '',
      deviceSerialNumber: repair.deviceSerialNumber ?? '',
      deviceColor: repair.deviceColor ?? '',
      reportedIssue: repair.reportedIssue,
    },
  });

  async function save(d: any) {
    setError('');
    try {
      await api.patch(`/repairs/${repair.id}`, {
        customer: { name: d.name, email: d.email, phone: d.phone || undefined },
        deviceBrand: d.deviceBrand,
        deviceModel: d.deviceModel,
        deviceSerialNumber: d.deviceSerialNumber,
        deviceColor: d.deviceColor,
        reportedIssue: d.reportedIssue,
      });
      setEdit(false);
      onSaved();
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Cliente y equipo</h3>
        {can.editRepairData(role) && !edit && (
          <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>
            Editar
          </button>
        )}
      </div>
      <div className="card-pad">
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        {!edit ? (
          <dl className="dl">
            <dt>Cliente</dt>
            <dd>{repair.customer.name}</dd>
            <dt>Correo</dt>
            <dd>{repair.customer.email}</dd>
            <dt>Teléfono</dt>
            <dd>{repair.customer.phone ?? '—'}</dd>
            <dt>Equipo</dt>
            <dd>{DEVICE_LABELS[repair.deviceType] ?? repair.deviceType}</dd>
            <dt>Marca / Modelo</dt>
            <dd>
              {(repair.deviceBrand ?? '—') + ' / ' + (repair.deviceModel ?? '—')}
            </dd>
            <dt>Serie</dt>
            <dd>{repair.deviceSerialNumber ?? '—'}</dd>
            <dt>Color</dt>
            <dd>{repair.deviceColor ?? '—'}</dd>
            <dt>Accesorios</dt>
            <dd>{repair.receivedAccessories ?? '—'}</dd>
            <dt>Estado físico</dt>
            <dd>{repair.physicalCondition ?? '—'}</dd>
            <dt>Falla reportada</dt>
            <dd>{repair.reportedIssue}</dd>
            <dt>Técnico</dt>
            <dd>{repair.assignedTechnician?.name ?? 'Sin asignar'}</dd>
            <dt>Recibido</dt>
            <dd>{fmtDate(repair.receivedAt)}</dd>
          </dl>
        ) : (
          <form onSubmit={handleSubmit(save)}>
            <div className="grid-2">
              <div className="field">
                <label>Cliente</label>
                <input className="input" {...register('name')} />
              </div>
              <div className="field">
                <label>Correo</label>
                <input className="input" {...register('email')} />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input className="input" {...register('phone')} />
              </div>
              <div className="field">
                <label>Marca</label>
                <input className="input" {...register('deviceBrand')} />
              </div>
              <div className="field">
                <label>Modelo</label>
                <input className="input" {...register('deviceModel')} />
              </div>
              <div className="field">
                <label>Serie</label>
                <input className="input" {...register('deviceSerialNumber')} />
              </div>
              <div className="field">
                <label>Color</label>
                <input className="input" {...register('deviceColor')} />
              </div>
            </div>
            <div className="field">
              <label>Falla reportada</label>
              <textarea className="textarea" {...register('reportedIssue')} />
            </div>
            <div className="row">
              <button className="btn btn-primary btn-sm">Guardar</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- Diagnóstico ---------- */
function DiagnosisSection({
  repair,
  role,
  editable,
  onSaved,
}: {
  repair: Repair;
  role?: Role;
  editable: boolean;
  onSaved: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState('');
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      diagnosis: repair.diagnosis ?? '',
      requiredActions: repair.requiredActions ?? '',
      estimatedCost: repair.estimatedCost ?? '',
      customerVisibleNotes: repair.customerVisibleNotes ?? '',
      internalNotes: repair.internalNotes ?? '',
      requiresPayment: repair.requiresPayment ?? false,
      amount: '',
      concept: '',
      methods: { TRANSFER: true, DEPOSIT: true, CASH: true } as Record<string, boolean>,
    },
  });
  const requiresPayment = watch('requiresPayment');

  async function save(d: any) {
    setError('');
    try {
      const allowedMethods = Object.entries(d.methods)
        .filter(([, v]) => v)
        .map(([k]) => k);
      await api.patch(`/repairs/${repair.id}/diagnosis`, {
        diagnosis: d.diagnosis,
        requiredActions: d.requiredActions || undefined,
        estimatedCost: d.estimatedCost ? Number(d.estimatedCost) : undefined,
        customerVisibleNotes: d.customerVisibleNotes || undefined,
        internalNotes: d.internalNotes || undefined,
        requiresPayment: !!d.requiresPayment,
        amount: d.requiresPayment && d.amount ? Number(d.amount) : undefined,
        concept: d.requiresPayment ? d.concept : undefined,
        allowedMethods: d.requiresPayment ? allowedMethods : undefined,
      });
      setEdit(false);
      onSaved();
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Diagnóstico</h3>
        {can.diagnose(role) && editable && !edit && (
          <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>
            {repair.diagnosis ? 'Editar' : 'Capturar'}
          </button>
        )}
      </div>
      <div className="card-pad">
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        {!edit ? (
          repair.diagnosis ? (
            <dl className="dl">
              <dt>Diagnóstico</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{repair.diagnosis}</dd>
              <dt>Acciones requeridas</dt>
              <dd>{repair.requiredActions ?? '—'}</dd>
              <dt>Costo estimado</dt>
              <dd>{repair.estimatedCost ? fmtMoney(repair.estimatedCost) : '—'}</dd>
              <dt>Notas visibles</dt>
              <dd>{repair.customerVisibleNotes ?? '—'}</dd>
              <dt>Notas internas</dt>
              <dd className="muted">{repair.internalNotes ?? '—'}</dd>
            </dl>
          ) : (
            <p className="muted">Aún sin diagnóstico.</p>
          )
        ) : (
          <form onSubmit={handleSubmit(save)}>
            <div className="field">
              <label>Diagnóstico *</label>
              <textarea className="textarea" {...register('diagnosis', { required: true })} />
            </div>
            <div className="field">
              <label>Acciones / piezas requeridas</label>
              <textarea className="textarea" {...register('requiredActions')} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Costo estimado</label>
                <input className="input" type="number" step="0.01" {...register('estimatedCost')} />
              </div>
            </div>
            <div className="field">
              <label>Notas visibles para el cliente</label>
              <textarea className="textarea" {...register('customerVisibleNotes')} />
            </div>
            <div className="field">
              <label>Notas internas</label>
              <textarea className="textarea" {...register('internalNotes')} />
            </div>

            <label className="row" style={{ gap: 8, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" {...register('requiresPayment')} />
              <span>Requiere pago o anticipo para continuar</span>
            </label>

            {requiresPayment && (
              <div className="card" style={{ background: 'var(--surface-sunk)', marginBottom: 16 }}>
                <div className="card-pad">
                  <div className="grid-2">
                    <div className="field">
                      <label>Monto *</label>
                      <input className="input" type="number" step="0.01" {...register('amount')} />
                    </div>
                    <div className="field">
                      <label>Concepto *</label>
                      <input className="input" {...register('concept')} placeholder="Anticipo, mano de obra…" />
                    </div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Métodos permitidos</label>
                    <div className="row wrap" style={{ gap: 16 }}>
                      {Object.entries(METHOD_LABELS).map(([k, v]) => (
                        <label key={k} className="row" style={{ gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" {...register(`methods.${k}` as any)} />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="row">
              <button className="btn btn-primary btn-sm">Guardar diagnóstico</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- Pagos y comprobantes ---------- */
const ACTIVE_PR = ['PENDING', 'PROOF_RECEIVED', 'REJECTED'];
const CAN_REQUEST_FROM: RepairStatus[] = ['DIAGNOSTICADO', 'EN_DIAGNOSTICO', 'EN_PROCESO_REPARACION'];

function PaymentSection({ repair, role, onChange }: { repair: Repair; role?: Role; onChange: () => void }) {
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', concept: '', TRANSFER: true, DEPOSIT: true, CASH: true });
  const requests = repair.paymentRequests ?? [];

  const hasActive = requests.some((pr: any) => ACTIVE_PR.includes(pr.status));
  const canRequest = can.requestPayment(role) && !hasActive && CAN_REQUEST_FROM.includes(repair.status);

  async function act(url: string, body?: any) {
    setError('');
    try {
      await api.patch(url, body);
      onChange();
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function requestPayment() {
    setError('');
    const allowedMethods = (['TRANSFER', 'DEPOSIT', 'CASH'] as const).filter((m) => (form as any)[m]);
    if (!form.amount || !form.concept) return setError('Indica monto y concepto');
    try {
      await api.post(`/repairs/${repair.id}/payment-request`, {
        amount: Number(form.amount),
        concept: form.concept,
        allowedMethods,
      });
      setShowForm(false);
      setForm({ amount: '', concept: '', TRANSFER: true, DEPOSIT: true, CASH: true });
      onChange();
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function openProof(proofId: string) {
    try {
      const url = await downloadProof(proofId);
      window.open(url, '_blank');
    } catch (e) {
      setError(apiError(e, 'No se pudo abrir el comprobante'));
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Pagos</h3>
        <span className={`badge tone-${repair.paymentStatus === 'VALIDATED' ? 'ok' : repair.paymentStatus === 'REJECTED' ? 'alert' : 'wait'}`}>
          <span className="led" />
          {PAYMENT_STATUS_LABELS[repair.paymentStatus] ?? repair.paymentStatus}
        </span>
      </div>
      <div className="card-pad stack">
        {error && <div className="alert alert-error">{error}</div>}

        {canRequest && !showForm && (
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowForm(true)}>
            + Solicitar pago
          </button>
        )}
        {showForm && (
          <div className="card" style={{ background: 'var(--surface-sunk)', boxShadow: 'none' }}>
            <div className="card-pad">
              <div className="grid-2">
                <div className="field">
                  <label>Monto *</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Concepto *</label>
                  <input
                    className="input"
                    value={form.concept}
                    onChange={(e) => setForm({ ...form, concept: e.target.value })}
                    placeholder="Anticipo de piezas, resto de reparación…"
                  />
                </div>
              </div>
              <div className="field">
                <label>Métodos permitidos</label>
                <div className="row wrap" style={{ gap: 16 }}>
                  {Object.entries(METHOD_LABELS).map(([k, v]) => (
                    <label key={k} className="row" style={{ gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(form as any)[k]}
                        onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div className="row">
                <button className="btn btn-primary btn-sm" onClick={requestPayment}>
                  Crear solicitud
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {requests.length === 0 && <p className="muted">No hay solicitudes de pago.</p>}
        {requests.map((pr: any) => (
          <div key={pr.id} className="card" style={{ boxShadow: 'none' }}>
            <div className="card-pad">
              <div className="row between wrap">
                <div>
                  <strong className="mono">{fmtMoney(pr.amount)}</strong> — {pr.concept}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {(pr.allowedMethods ?? []).map((m: string) => METHOD_LABELS[m] ?? m).join(', ')}
                  </div>
                </div>
                <span className="badge tone-done">
                  <span className="led" />
                  {PAYMENT_STATUS_LABELS[pr.status]}
                </span>
              </div>

              {(pr.proofs ?? []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {pr.proofs.map((p: any) => (
                    <div key={p.id} className="row between" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openProof(p.id)}>
                        📎 {p.originalFilename}
                      </button>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {fmtDate(p.uploadedAt)} · {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {can.validatePayment(role) && (pr.status === 'PROOF_RECEIVED' || pr.status === 'PENDING') && (
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => act(`/payment-requests/${pr.id}/validate`)}>
                    {pr.status === 'PENDING' ? 'Confirmar pago (efectivo)' : 'Validar pago'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      const reason = window.prompt('Motivo del rechazo del comprobante:');
                      if (reason) act(`/payment-requests/${pr.id}/reject`, { reason });
                    }}
                  >
                    Rechazar comprobante
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Historial completo ---------- */
function HistorySection({ history }: { history: any[] }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>Historial</h3>
      </div>
      <div className="card-pad">
        {history.length === 0 && <p className="muted">Sin movimientos.</p>}
        <div className="stack" style={{ gap: 10 }}>
          {history.map((h) => (
            <div key={h.id} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
              <div className="row between wrap">
                <strong style={{ fontSize: 13 }}>{h.action}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {fmtDate(h.createdAt)}
                </span>
              </div>
              {h.publicNote && <div style={{ fontSize: 13 }}>{h.publicNote}</div>}
              {h.internalNote && <div className="muted" style={{ fontSize: 12 }}>Interno: {h.internalNote}</div>}
              <div className="muted" style={{ fontSize: 11 }}>
                {h.actorUser?.name ?? (h.actorType === 'PUBLIC_CLIENT' ? 'Cliente' : 'Sistema')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
