import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { setCandidate, useCandidate } from '../session';

export default function Layout() {
  const candidate = useCandidate();
  const navigate = useNavigate();

  const switchCandidate = () => {
    setCandidate('');
    navigate('/');
  };

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden>{'</>'}</span>
          <span className="brand-text">
            Kata
            <small>Technical Assessment Platform</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>Evaluaciones</NavLink>
          <NavLink to="/admin">Administración</NavLink>
        </nav>

        {candidate && (
          <div className="candidate-chip">
            <span className="avatar" aria-hidden>{candidate[0].toUpperCase()}</span>
            <span className="candidate-name">{candidate}</span>
            <button className="link-btn" onClick={switchCandidate}>
              Cambiar
            </button>
          </div>
        )}
      </header>
      <Outlet />
    </>
  );
}
