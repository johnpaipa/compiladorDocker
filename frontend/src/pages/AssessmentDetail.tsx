import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { errorMessage } from '../api';
import { isStaffRole, ROLE_LABELS, useAuth } from '../auth';
import { useApi } from '../useApi';
import { useAttempt, useCountdown } from '../session';
import { Badge, Countdown, PageState } from '../components/ui';
import LanguageIcon from '../components/LanguageIcon';
import { languageLabel, parseLanguages } from '../languages';
import type { Assessment, ResultsData } from '../types';

export default function AssessmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const staff = user ? isStaffRole(user.role) : false;

  const { data: assessment, error, loading, reload } = useApi<Assessment>(`/assessments/${id}`);
  // el personal solo ve vista previa, no tiene intento
  const { attempt, started, start, loading: attemptLoading } = useAttempt(staff ? null : id);
  const { remainingMs, expired } = useCountdown(attempt);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const resultsUrl = started && user ? `/assessments/${id}/results/${user.id}` : null;
  const { data: results } = useApi<ResultsData>(resultsUrl);
  const statusByQuestion = new Map(results?.questionResults.map((r) => [r.questionId, r]));

  if (loading || attemptLoading || error || !assessment || !user) {
    return (
      <main className="page">
        <PageState loading={loading || attemptLoading} error={error ?? 'Assessment no encontrado'} onRetry={reload} />
      </main>
    );
  }

  const open = staff || started;
  const totalScore = assessment.questions.reduce((sum, q) => sum + q.score, 0);

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      await start();
      reload(); // ahora vienen los enunciados
    } catch (err) {
      setStartError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  return (
    <main className="page">
      <Link to="/" className="back">← Evaluaciones</Link>

      <header className="page-header">
        <h1>{assessment.name}</h1>
        {assessment.description && <p className="lead">{assessment.description}</p>}
        <div className="chips">
          <Badge>{assessment.questions.length} pregunta{assessment.questions.length === 1 ? '' : 's'}</Badge>
          <Badge>{totalScore} pts</Badge>
          <Badge>Tiempo límite: {assessment.timeLimit} min</Badge>
          {!staff && (
            <Badge tone={!started ? 'neutral' : expired ? 'bad' : 'ok'}>
              Estado: {!started ? 'Sin iniciar' : expired ? 'Tiempo agotado' : 'En curso'}
            </Badge>
          )}
        </div>
      </header>

      {staff && (
        <div className="banner banner-info">
          <strong>Vista previa como {ROLE_LABELS[user.role].toLowerCase()}.</strong> Puedes abrir los ejercicios y ejecutar código,
          pero no se guardan envíos ni corre el cronómetro.{' '}
          <Link to={`/admin/assessments/${assessment.id}`}>Gestionar este assessment</Link>
        </div>
      )}

      {!staff && started && (
        <div className="stats stats-top">
          <div className="card stat">
            <span className="stat-value"><Countdown remainingMs={remainingMs} plain /></span>
            <span className="muted">Tiempo restante</span>
          </div>
          <div className="card stat">
            <span className="stat-value">{results?.correctCount ?? 0} / {assessment.questions.length}</span>
            <span className="muted">Preguntas correctas</span>
          </div>
          <div className="card stat">
            <span className="stat-value">{results?.totalObtainedScore ?? 0} / {totalScore} pts</span>
            <span className="muted">Puntaje acumulado</span>
          </div>
        </div>
      )}

      {!staff && !started && (
        <section className="card start-card">
          <h2>Hola, {user.name.split(' ')[0]}</h2>
          <p className="card-desc">
            Al comenzar, el cronómetro de {assessment.timeLimit} minutos empieza a correr y no se detiene. Cuando el tiempo termine,
            ya no podrás ejecutar ni enviar código.
          </p>
          {startError && <p className="form-error" role="alert">{startError}</p>}
          <div className="form-actions">
            <button className="btn" onClick={handleStart} disabled={starting || assessment.questions.length === 0}>
              {starting ? 'Iniciando…' : 'Comenzar evaluación'}
            </button>
          </div>
        </section>
      )}

      {!staff && started && expired && (
        <div className="banner banner-bad">El tiempo de la evaluación terminó. Ya no puedes ejecutar más código.</div>
      )}

      <div className="section-title">
        <h2>Preguntas</h2>
        {!staff && started && (
          <Link className="btn btn-secondary" to={`/results/${assessment.id}/${user.id}`}>
            Ver resultados
          </Link>
        )}
      </div>

      <div className="stack">
        {assessment.questions.map((q, i) => {
          const status = statusByQuestion.get(q.id);
          const body = (
            <>
              <div className="question-head">
                <span className="question-index">{i + 1}</span>
                <h3>{q.title}</h3>
                {status?.passed ? (
                  <Badge tone="ok">✓ Correcta</Badge>
                ) : status?.attempted ? (
                  <Badge tone="bad">✕ {status.obtainedScore}/{status.maxScore} pts</Badge>
                ) : started ? (
                  <Badge>Sin intentar</Badge>
                ) : null}
              </div>
              <p className="card-desc">{q.description || 'El enunciado se muestra al comenzar la evaluación.'}</p>
              <div className="chips">
                {parseLanguages(q.language).map((l) => (
                  <Badge key={l} tone="accent"><LanguageIcon id={l} size={14} />{languageLabel(l)}</Badge>
                ))}
                <Badge>{q.score} pts</Badge>
                <Badge>{q.testCaseCount ?? 0} caso(s) de prueba</Badge>
              </div>
            </>
          );
          return open ? (
            <Link key={q.id} to={`/questions/${q.id}/solve`} className="card card-link">
              {body}
            </Link>
          ) : (
            <div key={q.id} className="card card-locked" title="Comienza la evaluación para desbloquear">
              {body}
            </div>
          );
        })}
      </div>
    </main>
  );
}
