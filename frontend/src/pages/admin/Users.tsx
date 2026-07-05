import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api, apiError } from '../../lib/api';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrador', EMPLOYEE: 'Recepción', TECHNICIAN: 'Técnico' };

interface U {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function Users() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<U | null>(null);
  const { register, handleSubmit, reset } = useForm();

  const { data } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data as U[] });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });

  const toggle = useMutation({
    mutationFn: (u: U) => api.patch(`/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`),
    onSuccess: invalidate,
  });

  async function save(d: any) {
    setError('');
    try {
      if (editing) {
        const body: any = { name: d.name, email: d.email, role: d.role };
        if (d.password) body.password = d.password;
        await api.patch(`/users/${editing.id}`, body);
      } else {
        await api.post('/users', { name: d.name, email: d.email, role: d.role, password: d.password });
      }
      reset({ name: '', email: '', role: 'EMPLOYEE', password: '' });
      setEditing(null);
      invalidate();
    } catch (e) {
      setError(apiError(e));
    }
  }

  function startEdit(u: U) {
    setEditing(u);
    reset({ name: u.name, email: u.email, role: u.role, password: '' });
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 className="page-title">Usuarios</h1>
      <p className="page-sub">Administra el personal con acceso al panel</p>

      <div className="row" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: '1 1 480px' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((u) => (
                <tr key={u.id} style={{ cursor: 'default' }}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>
                    <span className={`badge tone-${u.isActive ? 'ok' : 'done'}`}>
                      <span className="led" />
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>
                        Editar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle.mutate(u)}>
                        {u.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="card card-pad" style={{ flex: '1 1 300px' }} onSubmit={handleSubmit(save)}>
          <h3 style={{ marginBottom: 14 }}>{editing ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div className="field">
            <label>Nombre</label>
            <input className="input" {...register('name', { required: true })} />
          </div>
          <div className="field">
            <label>Correo</label>
            <input className="input" type="email" {...register('email', { required: true })} />
          </div>
          <div className="field">
            <label>Rol</label>
            <select className="select" defaultValue="EMPLOYEE" {...register('role', { required: true })}>
              <option value="ADMIN">Administrador</option>
              <option value="EMPLOYEE">Recepción</option>
              <option value="TECHNICIAN">Técnico</option>
            </select>
          </div>
          <div className="field">
            <label>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
            <input className="input" type="password" {...register('password', { required: !editing, minLength: 8 })} />
          </div>
          <div className="row">
            <button className="btn btn-primary btn-sm">{editing ? 'Guardar' : 'Crear usuario'}</button>
            {editing && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditing(null);
                  reset({ name: '', email: '', role: 'EMPLOYEE', password: '' });
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
