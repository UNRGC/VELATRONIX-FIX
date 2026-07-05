import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api';
import { DEVICE_LABELS } from '../../lib/status';
import { useAuth } from '../../lib/auth';

interface Form {
  name: string;
  email: string;
  phone?: string;
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerialNumber?: string;
  deviceColor?: string;
  receivedAccessories?: string;
  physicalCondition?: string;
  reportedIssue: string;
  assignedTechnicianId?: string;
  internalNotes?: string;
}

export function NewRepair() {
  const { user } = useAuth();
  const { register, handleSubmit, reset, formState } = useForm<Form>({ defaultValues: { deviceType: 'PC' } });
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ id: string; folio: string } | null>(null);

  // Solo el admin puede listar usuarios; recepción asigna técnico después si aplica.
  const { data: techs } = useQuery({
    queryKey: ['technicians'],
    enabled: user?.role === 'ADMIN',
    queryFn: async () => {
      const users = (await api.get('/users')).data as { id: string; name: string; role: string; isActive: boolean }[];
      return users.filter((u) => u.role === 'TECHNICIAN' && u.isActive);
    },
  });

  async function onSubmit(d: Form) {
    setError('');
    try {
      const body = {
        customer: { name: d.name, email: d.email, phone: d.phone || undefined },
        deviceType: d.deviceType,
        deviceBrand: d.deviceBrand || undefined,
        deviceModel: d.deviceModel || undefined,
        deviceSerialNumber: d.deviceSerialNumber || undefined,
        deviceColor: d.deviceColor || undefined,
        receivedAccessories: d.receivedAccessories || undefined,
        physicalCondition: d.physicalCondition || undefined,
        reportedIssue: d.reportedIssue,
        assignedTechnicianId: d.assignedTechnicianId || undefined,
        internalNotes: d.internalNotes || undefined,
      };
      const repair = (await api.post('/repairs', body)).data;
      setCreated({ id: repair.id, folio: repair.folio });
      reset({ deviceType: 'PC' });
    } catch (e) {
      setError(apiError(e, 'No se pudo crear la reparación'));
    }
  }

  if (created) {
    return (
      <div style={{ maxWidth: 520 }}>
        <h1 className="page-title">Reparación registrada</h1>
        <p className="page-sub">Se generó el folio y se envió un correo al cliente.</p>
        <div className="card card-pad" style={{ textAlign: 'center' }}>
          <div className="eyebrow">Folio generado</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, margin: '10px 0 6px' }}>
            {created.folio}
          </div>
          <p className="muted">El cliente puede consultar con este folio y su correo.</p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link to={`/admin/reparaciones/${created.id}`} className="btn btn-primary">
              Abrir reparación
            </Link>
            <button className="btn btn-ghost" onClick={() => setCreated(null)}>
              Registrar otra
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="page-title">Nueva reparación</h1>
      <p className="page-sub">Registra el cliente y el equipo recibido</p>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="stack">
        <div className="card">
          <div className="card-head">
            <h3>Cliente</h3>
          </div>
          <div className="card-pad">
            <div className="grid-2">
              <div className="field">
                <label>Nombre *</label>
                <input className="input" {...register('name', { required: true })} />
              </div>
              <div className="field">
                <label>Correo *</label>
                <input className="input" type="email" {...register('email', { required: true })} />
              </div>
            </div>
            <div className="field" style={{ maxWidth: 260 }}>
              <label>Teléfono</label>
              <input className="input" {...register('phone')} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Equipo</h3>
          </div>
          <div className="card-pad">
            <div className="grid-2">
              <div className="field">
                <label>Tipo de equipo *</label>
                <select className="select" {...register('deviceType', { required: true })}>
                  {Object.entries(DEVICE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
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
                <label>Número de serie</label>
                <input className="input" {...register('deviceSerialNumber')} />
              </div>
              <div className="field">
                <label>Color</label>
                <input className="input" {...register('deviceColor')} />
              </div>
              <div className="field">
                <label>Accesorios recibidos</label>
                <input className="input" {...register('receivedAccessories')} placeholder="Cargador, funda…" />
              </div>
            </div>
            <div className="field">
              <label>Estado físico</label>
              <input className="input" {...register('physicalCondition')} placeholder="Rayones, golpes visibles…" />
            </div>
            <div className="field">
              <label>Falla reportada *</label>
              <textarea className="textarea" {...register('reportedIssue', { required: true })} />
            </div>
            {user?.role === 'ADMIN' && (
              <div className="field" style={{ maxWidth: 320 }}>
                <label>Técnico asignado</label>
                <select className="select" {...register('assignedTechnicianId')}>
                  <option value="">Sin asignar</option>
                  {techs?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Notas internas iniciales</label>
              <textarea className="textarea" {...register('internalNotes')} />
            </div>
          </div>
        </div>

        <div>
          <button className="btn btn-primary" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Guardando…' : 'Registrar y generar folio'}
          </button>
        </div>
      </form>
    </div>
  );
}
