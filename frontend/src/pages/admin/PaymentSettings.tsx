import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, apiError } from '../../lib/api';

const FIELDS: { key: string; label: string; area?: boolean }[] = [
  { key: 'beneficiaryName', label: 'Beneficiario' },
  { key: 'bankName', label: 'Banco' },
  { key: 'clabe', label: 'CLABE' },
  { key: 'accountNumber', label: 'Número de cuenta' },
  { key: 'cardNumber', label: 'Número de tarjeta (opcional)' },
  { key: 'concept', label: 'Concepto sugerido' },
  { key: 'transferInstructions', label: 'Instrucciones para transferencia', area: true },
  { key: 'depositInstructions', label: 'Instrucciones para depósito', area: true },
  { key: 'cashPaymentInstructions', label: 'Instrucciones para pago en efectivo', area: true },
  { key: 'additionalNotes', label: 'Notas adicionales', area: true },
];

export function PaymentSettingsPage() {
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, reset } = useForm();

  const { data } = useQuery({ queryKey: ['payment-settings'], queryFn: async () => (await api.get('/payment-settings')).data });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  async function save(d: any) {
    setError('');
    setMsg('');
    try {
      const body = Object.fromEntries(FIELDS.map((f) => [f.key, d[f.key] ?? '']));
      await api.patch('/payment-settings', body);
      setMsg('Datos de pago actualizados. Aplican a nuevas solicitudes de pago.');
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <div>
      <h1 className="page-title">Datos de pago</h1>
      <p className="page-sub">Se muestran al cliente cuando una reparación requiere pago</p>

      {msg && <div className="alert alert-info" style={{ marginBottom: 16 }}>{msg}</div>}
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <form className="card card-pad" onSubmit={handleSubmit(save)}>
        {FIELDS.map((f) =>
          f.area ? (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <textarea className="textarea" {...register(f.key)} />
            </div>
          ) : (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              <input className="input" {...register(f.key)} />
            </div>
          )
        )}
        <button className="btn btn-primary">Guardar cambios</button>
      </form>
    </div>
  );
}
