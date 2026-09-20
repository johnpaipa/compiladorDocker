import { useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../useApi';
import { setCandidate, startAssessment, useCandidate, useCountdown, useStartedAt } from '../session';
import { Badge, Countdown, PageState } from '../components/ui';
import LanguageIcon from '../components/LanguageIcon';
import { languageLabel, parseLanguages } from '../languages';
import type { Assessment, ResultsData } from '../types';

export default function AssessmentDetail() {
  const { id } = useParams();
  const candidate = useCandidate();
  const startedAt = useStartedAt(id, candidate);
  const [name, setName] = useState(candidate);

  const { data: assessment, error, loading, reload } = useApi<Assessment>(`/assessments/${id}`);
  const { remainingMs, expired } = useCountdown(startedAt, assessment?.timeLimit ?? 0);

  const resultsUrl = startedAt ? `/assessments/${id}/results/${encodeURIComponent(candidate)}` : null;
  const { data: results } = useApi<ResultsData>(resultsUrl);
  const statusByQuestion = new Map(results?.questionResults.map((r) => [r.questionId, r]));

  if (loading || error || !assessment) {
    return (
      <main className="page">
        <PageState loading={loading} error={error ?? 'Assessment no encontrado'} onRetry={reload} />
      </main>
    );
  }

  const started = startedAt !== null;
  const totalScore = assessment.questions.reduce((sum, q) => sum + q.score, 0);

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCandidate(trimmed);
    startAssessment(assessment.id, trimmed);
  };

  return (
    <main className="page">
      <Link to="/" className="back">← Evaluaciones</Link>

      <header className="page-header">
        <h1>{assessment.name}</h1>
        {assessment.description && <p className="lead">{assessment.description}</p>}
        <div className="chips">
          <Badge>{assessment.questions.length} pregunta{assessment.questions.length === 1 ? "" : "s"}</Badge>
          <Badge>{totalScore} pts</Badge>
          <Badge>Tiempo límite: {assessment.timeLimit} min</Badge>
          <Badge tone={!started ? 'neutral' : expired ? 'bad' : 'ok'}>
            Estado: {!started ? 'Sin iniciar' : expired ? 'Tiempo agotado' : 'En curso'}
          </Badge>
        </div>
      </header>

      {started && (
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

      {!started ? (
        <form className="card start-card" onSubmit={handleStart}>
          <h2>Antes de empezar</h2>
          <p className="card-desc">
            El cronómetro de {assessment.timeLimit} minutos arranca al comenzar. Tu nombre identifica tus envíos.
          </p>
          <div className="field-row">
            <input
              className="input"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Tu nombre"
              autoFocus
            />
            <button className="btn" type="submit" disabled={!name.trim()}>
              Comenzar evaluación
            </button>
          </div>
        </form>
      ) : expired ? (
        <div className="banner banner-bad">
          El tiempo de la evaluación terminó. Ya no puedes ejecutar más código.
        </div>
      ) : null}

      <div className="section-title">
        <h2>Preguntas</h2>
        {started && (
          <Link className="btn btn-secondary" to={`/results/${assessment.id}/${encodeURIComponent(candidate)}`}>
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
              <p className="card-desc">{q.description}</p>
              <div className="chips">
                {parseLanguages(q.language).map((l) => (
                  <Badge key={l} tone="accent"><LanguageIcon id={l} size={14} />{languageLabel(l)}</Badge>
                ))}
                <Badge>{q.score} pts</Badge>
                <Badge>{q.testCases?.length ?? 0} caso(s) de prueba</Badge>
              </div>
            </>
          );
          return started ? (
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
