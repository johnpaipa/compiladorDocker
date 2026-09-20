import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api';
import { ROLE_LABELS } from '../auth';
import type { ManagedUser, Role } from '../types';

export interface UserFormValues {
  name: string;
  email: string;
  role: Role;
  active: boolean;
  // vacía al editar = no cambiarla
  password: string;
}

interface Props {
  initial?: ManagedUser;
  // su propia cuenta: sin cambio de rol ni baja
  isSelf?: boolean;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => Promise<void>;
  onCancel: () => void;
}

const ROLES: Role[] = ['ADMIN', 'EVALUATOR', 'CANDIDATE'];

const ROLE_HINTS: Record<Role, string> = {
  ADMIN: 'Gestiona usuarios, assessments y preguntas, y ve todos los resultados.',
  EVALUATOR: 'Crea assessments y preguntas, y revisa resultados y código de los candidatos.',
  CANDIDATE: 'Resuelve evaluaciones y consulta sus propios resultados.',
};

export default function UserForm({ initial, isSelf, submitLabel, onSubmit, onCancel }: Props) {
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [role, setRole] = useState<Role>(initial?.role ?? 'CANDIDATE');
  const [active, setActive] = useState(initial?.active ?? true);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordOk = editing ? password === '' || password.length >= 8 : password.length >= 8;
  const valid = name.trim() !== '' && email.trim() !== '' && passwordOk;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), role, active, password });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label className="field field-grow">
          <span className="field-label">Nombre *</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <label className="field field-grow">
          <span className="field-label">Correo electrónico *</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      </div>

      <div className="form-row">
        <fieldset className="field field-grow" disabled={isSelf}>
          <legend className="field-label">Rol *</legend>
          <div className="choice-row">
            {ROLES.map((r) => (
              <label key={r} className={`choice ${role === r ? 'choice-on' : ''}`}>
                <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
          <span className="field-hint">{isSelf ? 'No puedes cambiar tu propio rol.' : ROLE_HINTS[role]}</span>
        </fieldset>

        <label className="field field-grow">
          <span className="field-label">{editing ? 'Nueva contraseña' : 'Contraseña *'}</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={editing ? 'Dejar en blanco para no cambiarla' : ''}
          />
          <span className={`field-hint ${password && !passwordOk ? 'field-hint-bad' : ''}`}>Mínimo 8 caracteres.</span>
        </label>
      </div>

      {editing && (
        <label className={`choice choice-inline ${active ? 'choice-on' : ''}`}>
          <input type="checkbox" checked={active} disabled={isSelf} onChange={(e) => setActive(e.target.checked)} />
          Cuenta activa
          <span className="field-hint">{isSelf ? '(no puedes desactivarte)' : 'Si se desactiva, el usuario no podrá iniciar sesión.'}</span>
        </label>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={!valid || saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
