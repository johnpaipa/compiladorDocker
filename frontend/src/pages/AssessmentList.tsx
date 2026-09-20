import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

interface Assessment {
  id: number;
  name: string;
  description: string;
  timeLimit: number;
  questions: { id: number }[];
}

export default function AssessmentList() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assessments')
      .then((res) => setAssessments(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando assessments...</p>;

  return (
    <div className="container">
      <h1>Evaluaciones Técnicas</h1>
      <div className="card-list">
        {assessments.map((a) => (
          <Link key={a.id} to={`/assessments/${a.id}`} className="card">
            <h2>{a.name}</h2>
            <p>{a.description}</p>
            <p className="meta">
              {a.questions.length} pregunta(s) · {a.timeLimit} min
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}