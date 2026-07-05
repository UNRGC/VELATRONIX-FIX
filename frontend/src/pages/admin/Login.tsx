import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';

interface Form {
  email: string;
  password: string;
}

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<Form>();

  if (user) return <Navigate to="/admin" replace />;

  async function onSubmit(data: Form) {
    setError('');
    try {
      await login(data.email, data.password);
      nav('/admin');
    } catch (e) {
      setError(apiError(e, 'No se pudo iniciar sesión'));
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="brand" style={{ border: 'none', textAlign: 'center', marginBottom: 8 }}>
          <div className="mark" style={{ color: 'var(--ink)', fontSize: 22 }}>
            Taller de Reparaciones
          </div>
          <div className="sub">Panel de servicio</div>
        </div>
        <form className="card card-pad" onSubmit={handleSubmit(onSubmit)}>
          <h1 className="page-title" style={{ fontSize: 18, marginBottom: 18 }}>
            Iniciar sesión
          </h1>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="field">
            <label>Correo</label>
            <input className="input" type="email" autoFocus {...register('email', { required: true })} />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input className="input" type="password" {...register('password', { required: true })} />
          </div>
          <button className="btn btn-primary btn-block" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
