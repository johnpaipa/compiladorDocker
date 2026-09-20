import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useApi } from '../useApi';
import AssessmentForm from '../components/AssessmentForm';
import { Badge, PageState } from '../components/ui';
import type { Assessment } from '../types';

export default function AdminAssessments() {
  const navigate = useNavigate();
  const { data: assessments, error, loading, reload } = useApi<Assessment[]>('/assessments');
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (a: Assessment) => {
    if (!window.confirm(`¿Eliminar "${a.name}" con sus ${a.questions.length} pregunta(s) y todos los envíos? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/assessments/${a.id}`);
      setActionError(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  return (
    <main className="page">
      <header className="page-header page-header-row">
        <div>
          <span className="eyebrow">Administración</span>
          <h1>Gestión de assessments</h1>
          <p className="lead">Crea evaluaciones técnicas, define su tiempo límite y administra sus preguntas.</p>
        </div>
        {!creating && (
          <button className="btn" onClick={() => setCreating(true)}>+ Nuevo assessment</button>
        )}
      </header>

      {creating && (
        <section className="card form-card">
          <h2>Nuevo assessment</h2>
          <AssessmentForm
            submitLabel="Crear y agregar preguntas"
            onCancel={() => setCreating(false)}
            onSubmit={async (values) => {
              const res = await api.post<Assessment>('/assessments', values);
              navigate(`/admin/assessments/${res.data.id}`);
            }}
          />
        </section>
      )}

      {actionError && <div className="banner banner-bad">{actionError}</div>}

      {loading || error ? (
        <PageState loading={loading} error={error} onRetry={reload} />
      ) : assessments && assessments.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tiempo límite</th>
                <th>Preguntas</th>
                <th>Puntaje total</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/admin/assessments/${a.id}`} className="table-title">{a.name}</Link>
                    {a.description && <div className="muted table-sub">{a.description}</div>}
                  </td>
                  <td>{a.timeLimit} min</td>
                  <td>
                    <Badge tone={a.questions.length === 0 ? 'warn' : 'neutral'}>
                      {a.questions.length === 0 ? 'Sin preguntas' : a.questions.length}
                    </Badge>
                  </td>
                  <td>{a.questions.reduce((sum, q) => sum + q.score, 0)} pts</td>
                  <td className="table-actions">
                    <Link className="btn btn-secondary btn-sm" to={`/admin/assessments/${a.id}`}>Gestionar</Link>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="state">Aún no hay assessments. Crea el primero con «Nuevo assessment».</div>
      )}
    </main>
  );
}
