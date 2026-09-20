import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { PageState } from './ui';
import type { Role } from '../types';

export default function RequireAuth({ roles }: { roles?: Role[] }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading') {
    return (
      <main className="page">
        <PageState loading />
      </main>
    );
  }
  if (auth.status === 'anonymous') {
    // recuerda la página para volver, salvo que haya salido a propósito
    return <Navigate to="/login" state={auth.loggedOut ? undefined : { from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(auth.user.role)) {
    return (
      <main className="page">
        <div className="state state-error">
          <h2>Sin permisos</h2>
          <p>Tu rol no tiene acceso a esta sección.</p>
          <Link className="btn btn-secondary" to="/">Volver al inicio</Link>
        </div>
      </main>
    );
  }
  return <Outlet />;
}
