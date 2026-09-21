import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { errorMessage } from '../api';
import { isStaffRole, login, useAuth } from '../auth';

// atajos solo en desarrollo; la contraseña sale de VITE_DEMO_PASSWORD
const DEMO_PASSWORD: string = import.meta.env.VITE_DEMO_PASSWORD ?? '';
const DEMO_ACCOUNTS = [
  { label: 'Evaluador', email: 'evaluador@kata.local' },
  { label: 'Candidato', email: 'candidato@kata.local' },
];

export default function Login() {
  const auth = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status === 'authenticated') {
    return <Navigate to={from ?? (isStaffRole(auth.user.role) ? '/admin' : '/')} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <header>
          <span className="eyebrow">Technical Assessment Platform</span>
          <h1>Iniciar sesión</h1>
          <p className="muted">Ingresa con tu cuenta para continuar.</p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Correo electrónico</span>
            <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Contraseña</span>
            <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="btn" type="submit" disabled={busy || !email || !password}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-alt">
          ¿Eres candidato y aún no tienes cuenta? <Link to="/register" state={{ from }}>Regístrate</Link>
        </p>

        {import.meta.env.DEV && DEMO_PASSWORD && (
          <div className="demo-box">
            <span className="muted">Cuentas de demostración (solo desarrollo)</span>
            <div className="chips">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(DEMO_PASSWORD);
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
