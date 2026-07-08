import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, apiError } from '../../lib/api';
import { StatusRail } from '../../components/StatusRail';
import { StatusBadge } from '../../components/StatusBadge';
import { fmtDate, fmtDay, fmtMoney } from '../../lib/format';
import { DEVICE_LABELS, METHOD_LABELS, PAYMENT_STATUS_LABELS, RepairStatus } from '../../lib/status';
import { Brand } from '../../components/Brand';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function Consultar() {
  const [result, setResult] = useState<any | null>(null);
  const [creds, setCreds] = useState<{ folio: string; contact: string } | null>(null);

  return (
      <div className="public-wrap">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, color: 'var(--ink)' }}>
              <Brand sub="Consulta de servicio" logoSize={44} />
          </div>
          {!result ? (
              <LookupForm
                  onFound={(data, c) => {
                      setResult(data);
                      setCreds(c);
                  }}
              />
          ) : (
              <Result
                  data={result}
                  creds={creds!}
                  onRefresh={(d) => setResult(d)}
                  onReset={() => {
                      setResult(null);
                      setCreds(null);
                  }}
              />
          )}
      </div>
  );
}

function LookupForm({ onFound }: { onFound: (data: any, creds: { folio: string; contact: string }) => void }) {
  const { register, handleSubmit } = useForm<{ folio: string; contact: string }>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(d: { folio: string; contact: string }) {
    setError('');
    setLoading(true);
    try {
      const data = (await api.post('/public/repairs/lookup', d)).data;
      onFound(data, d);
    } catch (e) {
      // Mensaje genérico: no revela si falló el folio o el dato de contacto.
      setError(apiError(e, 'No se encontró una reparación con los datos proporcionados.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="card card-pad" onSubmit={handleSubmit(submit)}>
          <h1 style={{ fontSize: 18 }}>Consulta tu equipo</h1>
          <p className="muted">Ingresa tu folio y el correo o teléfono con el que se registró la reparación.</p>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="field">
          <label>Folio</label>
          <input className="input mono" placeholder="REP-20260704-A8K3" {...register('folio', { required: true })} />
        </div>
        <div className="field">
          <label>Correo o teléfono</label>
          <input className="input" placeholder="tucorreo@ejemplo.com o tu teléfono" {...register('contact', { required: true })} />
        </div>
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Consultando…' : 'Consultar reparación'}
        </button>
      </form>
    </div>
  );
}

function Result({
  data,
  creds,
  onRefresh,
  onReset,
}: {
  data: any;
  creds: { folio: string; contact: string };
  onRefresh: (d: any) => void;
  onReset: () => void;
}) {
  const status: RepairStatus = data.status;

  return (
    <div className="stack">
      <div className="row between wrap">
        <div>
          <div className="eyebrow">Folio</div>
          <h1 className="mono" style={{ fontSize: 24 }}>
            {data.folio}
          </h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onReset}>
          Consultar otro
        </button>
      </div>

      <div className="pub-msg">{data.statusMessage}</div>

      <div className="card card-pad">
        <div className="row between" style={{ marginBottom: 16 }}>
          <span className="eyebrow">Estado</span>
          <StatusBadge status={status} />
        </div>
        <StatusRail status={status} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Tu equipo</h3>
        </div>
        <div className="card-pad">
          <dl className="dl">
            <dt>Cliente</dt>
            <dd>{data.customerName}</dd>
            <dt>Equipo</dt>
            <dd>{DEVICE_LABELS[data.device.type] ?? data.device.type}</dd>
            <dt>Marca / Modelo</dt>
            <dd>{(data.device.brand ?? '—') + ' / ' + (data.device.model ?? '—')}</dd>
            <dt>Falla reportada</dt>
            <dd>{data.reportedIssue}</dd>
            <dt>Recibido</dt>
            <dd>{fmtDay(data.receivedAt)}</dd>
          </dl>
        </div>
      </div>

      {data.diagnosis && (
        <div className="card">
          <div className="card-head">
            <h3>Diagnóstico</h3>
          </div>
          <div className="card-pad">
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 0 }}>{data.diagnosis}</p>
            {data.requiredActions && <p className="muted">{data.requiredActions}</p>}
            {data.visibleNotes && (
              <div className="alert alert-info" style={{ marginTop: 12 }}>
                {data.visibleNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {data.payment && <PaymentBlock data={data} creds={creds} onRefresh={onRefresh} />}

      {data.history?.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>Seguimiento</h3>
          </div>
          <div className="card-pad stack" style={{ gap: 10 }}>
            {data.history.map((h: any, i: number) => (
              <div key={i} style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 12 }}>
                <div className="row between wrap">
                  <strong style={{ fontSize: 13 }}>{h.statusLabel ?? h.action}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {fmtDate(h.date)}
                  </span>
                </div>
                {h.note && <div style={{ fontSize: 13 }}>{h.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentBlock({ data, creds, onRefresh }: { data: any; creds: { folio: string; contact: string }; onRefresh: (d: any) => void }) {
  const p = data.payment;
  const ins = p.instructions;
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function upload() {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('folio', creds.folio);
      fd.append('contact', creds.contact);
      fd.append('payment_request_id', p.paymentRequestId);
      fd.append('file', file);
      const res = (await api.post('/public/repairs/payment-proof', fd)).data;
      onRefresh(res);
    } catch (e) {
      setError(apiError(e, 'No se pudo subir el comprobante'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3>Pago</h3>
        <span className={`badge tone-${p.status === 'VALIDATED' ? 'ok' : p.status === 'REJECTED' ? 'alert' : 'wait'}`}>
          <span className="led" />
          {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
        </span>
      </div>
      <div className="card-pad stack">
        <div className="pay-box">
          <div className="eyebrow">Monto a pagar</div>
          <div className="amt">{fmtMoney(p.amount)}</div>
          {p.concept && <div className="muted">{p.concept}</div>}
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Métodos: {(p.allowedMethods ?? []).map((m: string) => METHOD_LABELS[m] ?? m).join(', ')}
          </div>
        </div>

        {ins && (
          <dl className="dl">
            {ins.beneficiaryName && (
              <>
                <dt>Beneficiario</dt>
                <dd>{ins.beneficiaryName}</dd>
              </>
            )}
            {ins.bankName && (
              <>
                <dt>Banco</dt>
                <dd>{ins.bankName}</dd>
              </>
            )}
            {ins.clabe && (
              <>
                <dt>CLABE</dt>
                <dd className="mono">{ins.clabe}</dd>
              </>
            )}
            {ins.accountNumber && (
              <>
                <dt>Cuenta</dt>
                <dd className="mono">{ins.accountNumber}</dd>
              </>
            )}
            {ins.cardNumber && (
              <>
                <dt>Tarjeta</dt>
                <dd className="mono">{ins.cardNumber}</dd>
              </>
            )}
            {ins.concept && (
              <>
                <dt>Concepto</dt>
                <dd>{ins.concept}</dd>
              </>
            )}
            {ins.transferInstructions && (
              <>
                <dt>Transferencia</dt>
                <dd>{ins.transferInstructions}</dd>
              </>
            )}
            {ins.depositInstructions && (
              <>
                <dt>Depósito</dt>
                <dd>{ins.depositInstructions}</dd>
              </>
            )}
            {ins.cashPaymentInstructions && (
              <>
                <dt>Efectivo</dt>
                <dd>{ins.cashPaymentInstructions}</dd>
              </>
            )}
            {ins.additionalNotes && (
              <>
                <dt>Notas</dt>
                <dd>{ins.additionalNotes}</dd>
              </>
            )}
          </dl>
        )}

        {p.proofSubmitted && (
          <div className={`alert alert-${p.proofSubmitted.status === 'REJECTED' ? 'error' : 'info'}`}>
            {p.proofSubmitted.status === 'REJECTED'
              ? `El comprobante fue revisado pero no pudo confirmarse.${p.proofSubmitted.rejectionReason ? ' Motivo: ' + p.proofSubmitted.rejectionReason : ''} Puedes enviar uno nuevo.`
              : p.status === 'VALIDATED'
                ? 'Pago confirmado. La reparación continuará conforme al diagnóstico.'
                : 'Comprobante recibido. Tu pago está pendiente de confirmación por el personal del negocio.'}
          </div>
        )}

        {data.canUploadProof && (
          <div>
            <div className="divider" />
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Adjuntar comprobante de pago
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <input
              className="input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ marginBottom: 12 }}
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 0 }}>
              PDF, JPG, PNG o WEBP. Máximo 5 MB.
            </p>
            <button className="btn btn-primary" disabled={!file || uploading} onClick={upload}>
              {uploading ? 'Enviando…' : 'Enviar comprobante'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
