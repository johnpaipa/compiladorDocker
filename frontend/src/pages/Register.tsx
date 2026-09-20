import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { errorMessage } from '../api';
import { register, useAuth } from '../auth';

export default function Register() {
  const auth = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'authenticated') return <Navigate to={from ?? '/'} replace />;

  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = name.trim() && email.trim() && password.length >= 8 && password === confirm;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header>
          <span className="eyebrow">Candidatos</span>
          <h1>Crear cuenta</h1>
          <p className="muted">Regístrate para resolver evaluaciones técnicas.</p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Nombre completo</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Correo electrónico</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="field">
            <span className="field-label">Contraseña</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <span className="field-hint">Mínimo 8 caracteres.</span>
          </label>
          <label className="field">
            <span className="field-label">Confirmar contraseña</span>
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            {mismatch && <span className="field-hint field-hint-bad">Las contraseñas no coinciden.</span>}
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="btn" type="submit" disabled={busy || !valid}>
            {busy ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-alt">
          ¿Ya tienes cuenta? <Link to="/login" state={{ from }}>Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}
