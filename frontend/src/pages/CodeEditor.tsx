import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../api';

interface Question {
  id: number;
  title: string;
  description: string;
  language: string;
  score: number;
  assessmentId: number;
}

const LANGUAGE_TEMPLATES: Record<string, string> = {
  javascript: `// Lee la entrada desde stdin\nconst input = require('fs').readFileSync(0, 'utf-8');\n\n// Tu solución aquí\nconsole.log(input);`,
  python: `import sys\n\n# Lee la entrada desde stdin\ndata = sys.stdin.read()\n\n# Tu solución aquí\nprint(data)`,
  java: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Tu solución aquí\n    }\n}`,
};

export default function CodeEditor() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [code, setCode] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<any>(null);

  useEffect(() => {
    api.get(`/questions/${questionId}`).then((res) => {
      setQuestion(res.data);
      setCode(LANGUAGE_TEMPLATES[res.data.language] || '');
    });
  }, [questionId]);

  const handleRun = async () => {
    if (!candidateId.trim()) {
      alert('Ingresa tu nombre antes de ejecutar');
      return;
    }
    setRunning(true);
    setOutput(null);
    try {
      const res = await api.post('/submissions', {
        candidateId,
        questionId: Number(questionId),
        code,
        language: question?.language,
      });
      setOutput(res.data);
    } catch (err: any) {
      setOutput({ error: err.response?.data?.error || 'Error al ejecutar' });
    } finally {
      setRunning(false);
    }
  };

  if (!question) return <p>Cargando...</p>;

  return (
    <div className="container editor-layout">
      <div className="editor-header">
        <h1>{question.title}</h1>
        <p>{question.description}</p>
        <input
          type="text"
          placeholder="Tu nombre"
          value={candidateId}
          onChange={(e) => setCandidateId(e.target.value)}
          className="candidate-input"
        />
      </div>

      <Editor
        height="400px"
        language={question.language === 'javascript' ? 'javascript' : question.language}
        value={code}
        onChange={(value) => setCode(value || '')}
        theme="vs-dark"
      />

      <div className="editor-actions">
        <button onClick={handleRun} disabled={running}>
          {running ? 'Ejecutando...' : 'Ejecutar código'}
        </button>
        {question && (
          <button
            className="secondary"
            onClick={() => navigate(`/results/${question.assessmentId}/${candidateId}`)}
            disabled={!candidateId.trim()}
          >
            Ver resultados del assessment
          </button>
        )}
      </div>

      {output && (
        <div className="console">
          <h3>Consola de Resultados</h3>
          {output.error ? (
            <p className="error">Error: {output.error}</p>
          ) : (
            <>
              <p>
                {output.summary.passedCount} de {output.summary.totalCases} casos exitosos ·
                Puntaje: {output.summary.scorePercentage}%
              </p>
              {output.results.map((r: any, i: number) => (
                <div key={i} className={`test-result ${r.passed ? 'pass' : 'fail'}`}>
                  <p><strong>Caso {i + 1}:</strong> {r.passed ? 'Exitoso' : 'Fallido'}</p>
                  <p>Input: {r.input}</p>
                  <p>Esperado: {r.expected} | Obtenido: {r.actualOutput}</p>
                  {r.stderr && <pre className="stderr">{r.stderr}</pre>}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}