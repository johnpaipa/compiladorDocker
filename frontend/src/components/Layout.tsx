import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { isStaffRole, logout, ROLE_LABELS, useAuth } from '../auth';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inAdminContent = pathname.startsWith('/admin') && !pathname.startsWith('/admin/users');

  const handleLogout = () => {
    navigate('/login', { replace: true });
    logout();
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

        {user && (
          <>
            <nav className="nav" aria-label="Principal">
              <NavLink to="/" end>Evaluaciones</NavLink>
              {isStaffRole(user.role) && (
                <NavLink to="/admin" className={inAdminContent ? 'active' : ''}>Administración</NavLink>
              )}
              {user.role === 'ADMIN' && <NavLink to="/admin/users">Usuarios</NavLink>}
            </nav>

            <div className="candidate-chip">
              <Link to="/account" className="user-link" title="Mi cuenta">
                <span className="avatar" aria-hidden>{user.name[0]?.toUpperCase()}</span>
                <span className="user-meta">
                  <span className="candidate-name">{user.name}</span>
                  <span className="user-role">{ROLE_LABELS[user.role]}</span>
                </span>
              </Link>
              <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
                <FiLogOut aria-hidden />
                <span>Salir</span>
              </button>
            </div>
          </>
        )}
      </header>
      <Outlet />
    </>
  );
}
