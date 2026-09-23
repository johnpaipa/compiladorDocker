import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useApi } from '../useApi';
import AssessmentForm from '../components/AssessmentForm';
import { Badge, PageState } from '../components/ui';
import LanguageIcon from '../components/LanguageIcon';
import { formatDate } from '../format';
import { languageLabel, parseLanguages } from '../languages';
import type { Assessment, AssignedCandidate, CandidateSummary } from '../types';

export default function AdminAssessmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: assessment, error, loading, reload } = useApi<Assessment>(`/assessments/${id}`);
  const { data: assignments, reload: reloadAssignments } = useApi<AssignedCandidate[]>(`/assessments/${id}/assignments`);
  const { data: candidates } = useApi<CandidateSummary[]>(`/assessments/${id}/candidates`);
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const [assigning, setAssigning] = useState(false);

  if (loading || error || !assessment) {
    return (
      <main className="page">
        <PageState loading={loading} error={error ?? 'Assessment no encontrado'} onRetry={reload} />
      </main>
    );
  }

  const totalScore = assessment.questions.reduce((sum, q) => sum + q.score, 0);

  const deleteQuestion = async (questionId: number, title: string) => {
    if (!window.confirm(`¿Eliminar la pregunta "${title}" y sus envíos?`)) return;
    try {
      await api.delete(`/questions/${questionId}`);
      setActionError(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const deleteAssessment = async () => {
    if (!window.confirm(`¿Eliminar "${assessment.name}" con todas sus preguntas y envíos?`)) return;
    try {
      await api.delete(`/assessments/${assessment.id}`);
      navigate('/admin');
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignEmail.trim() || assigning) return;
    setAssigning(true);
    setActionError(null);
    try {
      await api.post(`/assessments/${assessment.id}/assignments`, { email: assignEmail.trim() });
      setAssignEmail('');
      reloadAssignments();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  const unassign = async (userId: number, name: string) => {
    if (!window.confirm(`¿Quitarle a "${name}" el acceso a este assessment?`)) return;
    try {
      await api.delete(`/assessments/${assessment.id}/assignments/${userId}`);
      setActionError(null);
      reloadAssignments();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  return (
    <main className="page">
      <Link to="/admin" className="back">← Gestión de assessments</Link>

      <header className="page-header page-header-row">
        <div>
          <span className="eyebrow">Assessment</span>
          <h1>{assessment.name}</h1>
          {assessment.description && <p className="lead">{assessment.description}</p>}
          <div className="chips">
            <Badge>⏱ {assessment.timeLimit} min</Badge>
            <Badge>{assessment.questions.length} pregunta(s)</Badge>
            <Badge>{totalScore} pts</Badge>
          </div>
        </div>
        <div className="header-actions">
          <Link className="btn btn-secondary" to={`/assessments/${assessment.id}`}>Vista previa</Link>
          {!editing && <button className="btn btn-secondary" onClick={() => setEditing(true)}>Editar datos</button>}
          <button className="btn btn-danger" onClick={deleteAssessment}>Eliminar</button>
        </div>
      </header>

      {editing && (
        <section className="card form-card">
          <h2>Editar assessment</h2>
          <AssessmentForm
            initial={{ name: assessment.name, description: assessment.description ?? '', timeLimit: assessment.timeLimit }}
            submitLabel="Guardar cambios"
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              await api.put(`/assessments/${assessment.id}`, values);
              setEditing(false);
              reload();
            }}
          />
        </section>
      )}

      {actionError && <div className="banner banner-bad">{actionError}</div>}

      <div className="section-title">
        <h2>Preguntas</h2>
        <Link className="btn" to={`/admin/assessments/${assessment.id}/questions/new`}>+ Agregar pregunta</Link>
      </div>

      {assessment.questions.length === 0 ? (
        <div className="state">Este assessment aún no tiene preguntas. Agrega la primera para poder publicarlo.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Título</th>
                <th>Lenguajes permitidos</th>
                <th>Casos</th>
                <th>Puntaje</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {assessment.questions.map((q, i) => (
                <tr key={q.id}>
                  <td>{i + 1}</td>
                  <td>
                    <span className="table-title">{q.title}</span>
                    <div className="muted table-sub">{q.description}</div>
                  </td>
                  <td>
                    <div className="chips">
                      {parseLanguages(q.language).map((l) => (
                        <Badge key={l} tone="accent"><LanguageIcon id={l} size={14} />{languageLabel(l)}</Badge>
                      ))}
                    </div>
                  </td>
                  <td>{q.testCaseCount ?? q.testCases?.length ?? 0}</td>
                  <td>{q.score} pts</td>
                  <td className="table-actions">
                    <Link className="btn btn-secondary btn-sm" to={`/admin/questions/${q.id}/edit`}>Editar</Link>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteQuestion(q.id, q.title)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-title">
        <h2>Candidatos asignados</h2>
      </div>
      <p className="muted">Solo los candidatos asignados pueden ver e iniciar este assessment.</p>
      <form className="form-row" onSubmit={handleAssign}>
        <label className="field field-grow">
          <span className="field-label">Correo del candidato</span>
          <input
            className="input"
            type="email"
            value={assignEmail}
            onChange={(e) => setAssignEmail(e.target.value)}
            placeholder="candidato@correo.com"
          />
        </label>
        <button className="btn" type="submit" disabled={!assignEmail.trim() || assigning}>
          {assigning ? 'Asignando…' : 'Asignar'}
        </button>
      </form>

      {!assignments || assignments.length === 0 ? (
        <div className="state">Todavía no le has asignado este assessment a ningún candidato.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Candidato</th>
                <th>Asignado</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.userId}>
                  <td>
                    <span className="table-title">{a.name}</span>
                    <div className="muted table-sub">{a.email}</div>
                  </td>
                  <td>{formatDate(a.assignedAt)}</td>
                  <td>
                    <Badge tone={a.started ? 'ok' : 'neutral'}>{a.started ? 'Ya inició' : 'Sin iniciar'}</Badge>
                  </td>
                  <td className="table-actions">
                    <button className="btn btn-danger btn-sm" onClick={() => unassign(a.userId, a.name)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="section-title">
        <h2>Actividad de candidatos</h2>
      </div>
      {!candidates || candidates.length === 0 ? (
        <div className="state">Ningún candidato ha iniciado este assessment todavía.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Candidato</th>
                <th>Inició</th>
                <th>Envíos</th>
                <th>Última actividad</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.userId}>
                  <td>
                    <span className="table-title">{c.name}</span>
                    <div className="muted table-sub">{c.email}</div>
                  </td>
                  <td>{formatDate(c.startedAt)}</td>
                  <td>{c.submissions}</td>
                  <td>{formatDate(c.lastActivity)}</td>
                  <td className="table-actions">
                    <Link className="btn btn-secondary btn-sm" to={`/results/${assessment.id}/${c.userId}`}>
                      Resultados y código
                    </Link>
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
