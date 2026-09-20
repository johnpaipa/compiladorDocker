import { useState } from 'react';
import api, { errorMessage } from '../api';
import { ROLE_LABELS, useAuth } from '../auth';
import { useApi } from '../useApi';
import UserForm from '../components/UserForm';
import { Badge, PageState } from '../components/ui';
import { formatDate } from '../format';
import type { ManagedUser, Role } from '../types';

const ROLE_TONES = { ADMIN: 'accent', EVALUATOR: 'warn', CANDIDATE: 'neutral' } as const;

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { data: users, error, loading, reload } = useApi<ManagedUser[]>('/users');
  const [mode, setMode] = useState<'closed' | 'create' | number>('closed'); // número = id en edición
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  const editing = typeof mode === 'number' ? users?.find((u) => u.id === mode) : undefined;

  const visible = (users ?? []).filter(
    (u) =>
      (roleFilter === 'ALL' || u.role === roleFilter) &&
      `${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const counts = (users ?? []).reduce<Record<Role, number>>(
    (acc, u) => ({ ...acc, [u.role]: acc[u.role] + 1 }),
    { ADMIN: 0, EVALUATOR: 0, CANDIDATE: 0 },
  );

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setActionError(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const toggleActive = (u: ManagedUser) => run(() => api.put(`/users/${u.id}`, { active: !u.active }));

  const remove = (u: ManagedUser) => {
    if (!window.confirm(`¿Eliminar a ${u.name}? Solo es posible si no tiene actividad registrada.`)) return;
    return run(() => api.delete(`/users/${u.id}`));
  };

  return (
    <main className="page page-wide">
      <header className="page-header page-header-row">
        <div>
          <span className="eyebrow">Administración</span>
          <h1>Gestión de usuarios</h1>
          <p className="lead">Crea cuentas, asigna roles y controla quién puede ingresar a la plataforma.</p>
        </div>
        {mode === 'closed' && <button className="btn" onClick={() => setMode('create')}>+ Nuevo usuario</button>}
      </header>

      {mode === 'create' && (
        <section className="card form-card">
          <h2>Nuevo usuario</h2>
          <UserForm
            submitLabel="Crear usuario"
            onCancel={() => setMode('closed')}
            onSubmit={async (v) => {
              await api.post('/users', { name: v.name, email: v.email, role: v.role, password: v.password });
              setMode('closed');
              reload();
            }}
          />
        </section>
      )}

      {editing && (
        <section className="card form-card">
          <h2>Editar a {editing.name}</h2>
          <UserForm
            key={editing.id}
            initial={editing}
            isSelf={editing.id === me?.id}
            submitLabel="Guardar cambios"
            onCancel={() => setMode('closed')}
            onSubmit={async (v) => {
              await api.put(`/users/${editing.id}`, {
                name: v.name,
                email: v.email,
                ...(editing.id === me?.id ? {} : { role: v.role, active: v.active }),
                ...(v.password ? { password: v.password } : {}),
              });
              setMode('closed');
              reload();
            }}
          />
        </section>
      )}

      {actionError && <div className="banner banner-bad">{actionError}</div>}

      <div className="toolbar">
        <input
          className="input toolbar-search"
          type="search"
          placeholder="Buscar por nombre o correo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar usuarios"
        />
        <div className="chips">
          {(['ALL', 'ADMIN', 'EVALUATOR', 'CANDIDATE'] as const).map((r) => (
            <button
              key={r}
              className={`choice choice-btn ${roleFilter === r ? 'choice-on' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'ALL' ? `Todos (${users?.length ?? 0})` : `${ROLE_LABELS[r]} (${counts[r]})`}
            </button>
          ))}
        </div>
      </div>

      {loading || error ? (
        <PageState loading={loading} error={error} onRetry={reload} />
      ) : visible.length === 0 ? (
        <div className="state">No hay usuarios que coincidan con el filtro.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id} className={u.active ? '' : 'row-off'}>
                  <td>
                    <span className="table-title">{u.name}</span>
                    {u.id === me?.id && <span className="you-tag">tú</span>}
                    <div className="muted table-sub">{u.email}</div>
                  </td>
                  <td><Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge></td>
                  <td><Badge tone={u.active ? 'ok' : 'bad'}>{u.active ? 'Activo' : 'Desactivado'}</Badge></td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td className="table-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setMode(u.id)}>Editar</button>
                    {u.id !== me?.id && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(u)}>
                          {u.active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>Eliminar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
