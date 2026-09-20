import { Link, useParams } from 'react-router-dom';
import { isStaffRole, useAuth } from '../auth';
import { useApi } from '../useApi';
import { Badge, PageState, ProgressBar } from '../components/ui';
import LanguageIcon from '../components/LanguageIcon';
import { formatDate, formatDuration } from '../format';
import { languageLabel } from '../languages';
import type { Assessment, ResultsData, ReviewData } from '../types';

export default function Results() {
  const { assessmentId, userId } = useParams();
  const { user } = useAuth();
  const staff = user ? isStaffRole(user.role) : false;

  const { data, error, loading, reload } = useApi<ResultsData>(`/assessments/${assessmentId}/results/${userId}`);
  const { data: assessment } = useApi<Assessment>(`/assessments/${assessmentId}`);
  // el código enviado solo lo ve el personal
  const { data: review } = useApi<ReviewData>(staff ? `/assessments/${assessmentId}/review/${userId}` : null);

  const backTo = staff ? `/admin/assessments/${assessmentId}` : `/assessments/${assessmentId}`;

  if (loading || error || !data) {
    return (
      <main className="page">
        <PageState loading={loading} error={error ?? 'No se encontraron resultados'} onRetry={reload} />
        {error && <p className="state"><Link to="/">← Volver a las evaluaciones</Link></p>}
      </main>
    );
  }

  const tone = data.percentage >= 70 ? 'ok' : data.percentage >= 40 ? 'warn' : 'bad';
  const submissionsByQuestion = new Map(review?.questions.map((q) => [q.questionId, q.submissions]));

  return (
    <main className="page">
      <Link to={backTo} className="back">← {staff ? 'Volver al assessment' : 'Volver a la evaluación'}</Link>

      <header className="page-header">
        <span className="eyebrow">Resultados</span>
        <h1>{assessment?.name ?? 'Evaluación'}</h1>
        <div className="chips">
          <Badge tone="accent">Candidato: {data.candidate.name}</Badge>
          {staff && <Badge>{data.candidate.email}</Badge>}
          {assessment && <Badge>⏱ Límite {assessment.timeLimit} min</Badge>}
          <Badge>{data.totalQuestions} pregunta{data.totalQuestions === 1 ? '' : 's'}</Badge>
          {data.startedAt && <Badge>Inició {formatDate(data.startedAt)}</Badge>}
        </div>
      </header>

      <section className="card score-card">
        <div className="score-main">
          <span className={`score-value score-${tone}`}>{data.percentage}%</span>
          <span className="muted">
            {data.totalObtainedScore} de {data.totalMaxScore} puntos
          </span>
        </div>
        <ProgressBar value={data.percentage} tone={tone} />
      </section>

      <div className="stats">
        <Stat label="Correctas" value={data.correctCount} tone="ok" />
        <Stat label="Incorrectas" value={data.incorrectCount} tone="bad" />
        <Stat label="Sin responder" value={data.notAttemptedCount} />
        <Stat label="Tiempo consumido" value={formatDuration(data.timeConsumedSeconds)} />
      </div>

      <div className="section-title">
        <h2>Detalle por pregunta</h2>
      </div>
      <div className="stack">
        {data.questionResults.map((q) => {
          const status = q.passed ? 'ok' : q.attempted ? 'bad' : 'neutral';
          const submissions = submissionsByQuestion.get(q.questionId) ?? [];
          return (
            <div key={q.questionId} className={`card result-row result-${status}`}>
              <div className="result-info">
                <h3>{q.title}</h3>
                <p className="muted">
                  {q.obtainedScore} / {q.maxScore} pts
                  {staff && submissions.length > 0 && ` · ${submissions.length} envío${submissions.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <Badge tone={status}>
                {q.passed ? '✓ Correcta' : q.attempted ? '✕ Incorrecta' : 'Sin responder'}
              </Badge>
              {!staff && (
                <Link className="btn btn-secondary" to={`/questions/${q.questionId}/solve`}>
                  {q.attempted ? 'Reintentar' : 'Resolver'}
                </Link>
              )}

              {staff && submissions.length > 0 && (
                <details className="review">
                  <summary>Revisar código enviado</summary>
                  <div className="review-list">
                    {submissions.map((s, i) => (
                      <div key={s.id} className="review-item">
                        <div className="review-head">
                          <LanguageIcon id={s.language} size={16} />
                          <strong>{languageLabel(s.language)}</strong>
                          <span className="muted">{formatDate(s.createdAt)}</span>
                          <Badge tone={s.passed ? 'ok' : 'bad'}>{s.score ?? 0}/{q.maxScore} pts</Badge>
                          {i === 0 && <Badge tone="accent">Último envío (el que cuenta)</Badge>}
                        </div>
                        <pre className="review-code">{s.code}</pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="card stat">
      <span className={`stat-value ${tone ? `stat-${tone}` : ''}`}>{value}</span>
      <span className="muted">{label}</span>
    </div>
  );
}
