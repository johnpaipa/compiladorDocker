import { Link, useParams } from 'react-router-dom';
import { useApi } from '../useApi';
import { Badge, PageState, ProgressBar } from '../components/ui';
import { formatDuration } from '../format';
import type { Assessment, ResultsData } from '../types';

export default function Results() {
  const { assessmentId, candidateId = '' } = useParams();
  const { data, error, loading, reload } = useApi<ResultsData>(
    `/assessments/${assessmentId}/results/${encodeURIComponent(candidateId)}`,
  );

  const { data: assessment } = useApi<Assessment>(`/assessments/${assessmentId}`);

  if (loading || error || !data) {
    return (
      <main className="page">
        <PageState loading={loading} error={error ?? 'No se encontraron resultados'} onRetry={reload} />
      </main>
    );
  }

  const tone = data.percentage >= 70 ? 'ok' : data.percentage >= 40 ? 'warn' : 'bad';

  return (
    <main className="page">
      <Link to={`/assessments/${assessmentId}`} className="back">← Volver a la evaluación</Link>

      <header className="page-header">
        <span className="eyebrow">Resultados</span>
        <h1>{assessment?.name ?? 'Evaluación'}</h1>
        <div className="chips">
          <Badge tone="accent">Candidato: {candidateId}</Badge>
          {assessment && <Badge>⏱ Límite {assessment.timeLimit} min</Badge>}
          <Badge>{data.totalQuestions} pregunta{data.totalQuestions === 1 ? '' : 's'}</Badge>
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
          return (
            <div key={q.questionId} className={`card result-row result-${status}`}>
              <div className="result-info">
                <h3>{q.title}</h3>
                <p className="muted">
                  {q.obtainedScore} / {q.maxScore} pts
                </p>
              </div>
              <Badge tone={status}>
                {q.passed ? '✓ Correcta' : q.attempted ? '✕ Incorrecta' : 'Sin responder'}
              </Badge>
              <Link className="btn btn-secondary" to={`/questions/${q.questionId}/solve`}>
                {q.attempted ? 'Reintentar' : 'Resolver'}
              </Link>
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
