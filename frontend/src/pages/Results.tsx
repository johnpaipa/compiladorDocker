import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function Results() {
  const { assessmentId, candidateId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/assessments/${assessmentId}/results/${candidateId}`)
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [assessmentId, candidateId]);

  if (loading) return <p>Cargando resultados...</p>;
  if (!data) return <p>No se encontraron resultados</p>;

  return (
    <div className="container">
      <Link to={`/assessments/${assessmentId}`}>← Volver al assessment</Link>
      <h1>Resultados de {candidateId}</h1>

      <div className="results-summary">
        <p><strong>Puntaje total:</strong> {data.totalObtainedScore} / {data.totalMaxScore} ({data.percentage}%)</p>
        <p><strong>Correctas:</strong> {data.correctCount}</p>
        <p><strong>Incorrectas:</strong> {data.incorrectCount}</p>
        <p><strong>Sin responder:</strong> {data.notAttemptedCount}</p>
        <p><strong>Tiempo consumido:</strong> {data.timeConsumedSeconds} segundos</p>
      </div>

      <h2>Detalle por pregunta</h2>
      <div className="card-list">
        {data.questionResults.map((q: any) => (
          <div key={q.questionId} className={`card ${q.passed ? 'pass' : q.attempted ? 'fail' : 'pending'}`}>
            <h3>{q.title}</h3>
            <p>Puntaje: {q.obtainedScore} / {q.maxScore}</p>
            <p>{q.attempted ? (q.passed ? '✅ Correcta' : '❌ Incorrecta') : '⏳ Sin responder'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}