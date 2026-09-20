import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

interface TestCase {
  id: number;
  input: string;
  expectedOutput: string;
}

interface Question {
  id: number;
  title: string;
  description: string;
  language: string;
  score: number;
  testCases: TestCase[];
}

interface Assessment {
  id: number;
  name: string;
  description: string;
  timeLimit: number;
  questions: Question[];
}

export default function AssessmentDetail() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/assessments/${id}`)
      .then((res) => setAssessment(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Cargando...</p>;
  if (!assessment) return <p>Assessment no encontrado</p>;

  return (
    <div className="container">
      <Link to="/">← Volver</Link>
      <h1>{assessment.name}</h1>
      <p>{assessment.description}</p>
      <p className="meta">Tiempo límite: {assessment.timeLimit} minutos</p>

      <h2>Preguntas</h2>
      <div className="card-list">
        {assessment.questions.map((q) => (
          <Link key={q.id} to={`/questions/${q.id}/solve`} className="card">
            <h3>{q.title}</h3>
            <p>{q.description}</p>
            <p className="meta">
              Lenguaje: {q.language} · Puntaje: {q.score}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}