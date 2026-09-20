import { Link } from 'react-router-dom';
import { useApi } from '../useApi';
import { PageState, Badge } from '../components/ui';
import type { Assessment } from '../types';

export default function AssessmentList() {
  const { data: assessments, error, loading, reload } = useApi<Assessment[]>('/assessments');

  // Un assessment sin preguntas todavía no se puede resolver
  const available = assessments?.filter((a) => a.questions.length > 0) ?? [];
  const totalQuestions = available.reduce((sum, a) => sum + a.questions.length, 0);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow eyebrow-light">Technical Assessment Platform</span>
          <h1>Demuestra lo que sabes, escribiendo código.</h1>
          <p>
            Resuelve ejercicios de programación en Java, JavaScript y Python desde el navegador.
            Tu código se ejecuta en un entorno aislado y se califica automáticamente.
          </p>
          {assessments && (
            <div className="hero-stats">
              <div><strong>{available.length}</strong><span>evaluaciones</span></div>
              <div><strong>{totalQuestions}</strong><span>ejercicios</span></div>
              <div><strong>3</strong><span>lenguajes</span></div>
            </div>
          )}
        </div>
      </section>

      <main className="page">
        <div className="section-title first">
          <h2>Evaluaciones disponibles</h2>
        </div>

        {loading || error ? (
          <PageState loading={loading} error={error} onRetry={reload} />
        ) : available.length > 0 ? (
          <div className="grid">
            {available.map((a) => {
              const totalScore = a.questions.reduce((sum, q) => sum + q.score, 0);
              return (
                <Link key={a.id} to={`/assessments/${a.id}`} className="card card-link card-accent">
                  <h3>{a.name}</h3>
                  <p className="card-desc">{a.description || 'Sin descripción'}</p>
                  <div className="chips">
                    <Badge>{a.questions.length} pregunta{a.questions.length === 1 ? '' : 's'}</Badge>
                    <Badge>⏱ {a.timeLimit} min</Badge>
                    <Badge>{totalScore} pts</Badge>
                  </div>
                  <span className="card-cta">Ver evaluación →</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="state">
            Todavía no hay evaluaciones con preguntas.{' '}
            <Link to="/admin">Crea una desde Administración</Link>.
          </div>
        )}
      </main>
    </>
  );
}
