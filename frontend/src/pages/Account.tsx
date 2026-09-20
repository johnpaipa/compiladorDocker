import { useState, type FormEvent } from 'react';
import api, { errorMessage } from '../api';
import { ROLE_LABELS, useAuth } from '../auth';
import { Badge } from '../components/ui';

export default function Account() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return null;

  const valid = current && next.length >= 8 && next === confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.put('/auth/password', { currentPassword: current, newPassword: next });
      setMessage({ ok: true, text: 'Contraseña actualizada.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <header className="page-header">
        <span className="eyebrow">Mi cuenta</span>
        <h1>{user.name}</h1>
        <div className="chips">
          <Badge tone="accent">{ROLE_LABELS[user.role]}</Badge>
          <Badge>{user.email}</Badge>
        </div>
      </header>

      <form className="card form-card" onSubmit={handleSubmit}>
        <h2>Cambiar contraseña</h2>
        <label className="field field-narrow">
          <span className="field-label">Contraseña actual</span>
          <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </label>
        <label className="field field-narrow">
          <span className="field-label">Nueva contraseña</span>
          <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          <span className="field-hint">Mínimo 8 caracteres.</span>
        </label>
        <label className="field field-narrow">
          <span className="field-label">Confirmar nueva contraseña</span>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </label>

        {message && <p className={message.ok ? 'saved-note' : 'form-error'} role="alert">{message.text}</p>}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={!valid || busy}>
            {busy ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </main>
  );
}
