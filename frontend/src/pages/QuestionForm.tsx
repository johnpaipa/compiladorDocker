import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { useApi } from '../useApi';
import { PageState } from '../components/ui';
import LanguageIcon from '../components/LanguageIcon';
import { LANGUAGES, parseLanguages } from '../languages';
import type { Question } from '../types';

interface CaseDraft {
  key: number;
  input: string;
  expectedOutput: string;
}

let nextKey = 1;
const newCase = (input = '', expectedOutput = ''): CaseDraft => ({ key: nextKey++, input, expectedOutput });

/** Crea (`/admin/assessments/:assessmentId/questions/new`) o edita (`/admin/questions/:questionId/edit`) una pregunta. */
export default function QuestionFormPage() {
  const { questionId } = useParams();
  const { data: question, error, loading, reload } = useApi<Question>(questionId ? `/questions/${questionId}` : null);

  if (questionId && (loading || error || !question)) {
    return (
      <main className="page">
        <PageState loading={loading} error={error ?? 'Pregunta no encontrada'} onRetry={reload} />
      </main>
    );
  }
  return <QuestionForm key={question?.id ?? 'new'} question={question} />;
}

function QuestionForm({ question }: { question: Question | null }) {
  const params = useParams();
  const navigate = useNavigate();
  const assessmentId = question?.assessmentId ?? Number(params.assessmentId);
  const editing = question !== null;

  const [title, setTitle] = useState(question?.title ?? '');
  const [description, setDescription] = useState(question?.description ?? '');
  const [languages, setLanguages] = useState<string[]>(question ? parseLanguages(question.language) : []);
  const [score, setScore] = useState(String(question?.score ?? 100));
  const [cases, setCases] = useState<CaseDraft[]>(
    question?.testCases?.length
      ? question.testCases.map((t) => newCase(t.input, t.expectedOutput))
      : [newCase()],
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleLanguage = (id: string) =>
    setLanguages((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));

  const updateCase = (key: number, patch: Partial<CaseDraft>) =>
    setCases((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const points = Number(score);
  const problems = [
    !title.trim() && 'Falta el título',
    !description.trim() && 'Falta la descripción',
    languages.length === 0 && 'Selecciona al menos un lenguaje',
    !(Number.isInteger(points) && points > 0) && 'El puntaje debe ser un entero positivo',
    cases.length === 0 && 'Agrega al menos un caso de prueba',
    cases.some((c) => !c.expectedOutput.trim()) && 'Cada caso necesita una salida esperada',
  ].filter(Boolean) as string[];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (problems.length > 0 || saving) return;
    setSaving(true);
    setFormError(null);
    const body = {
      title: title.trim(),
      description: description.trim(),
      // Se conserva el orden del catálogo para que sea estable
      language: LANGUAGES.filter((l) => languages.includes(l.id)).map((l) => l.id).join(','),
      score: points,
      assessmentId,
      testCases: cases.map((c) => ({ input: c.input, expectedOutput: c.expectedOutput })),
    };
    try {
      if (editing) await api.put(`/questions/${question.id}`, body);
      else await api.post('/questions', body);
      navigate(`/admin/assessments/${assessmentId}`);
    } catch (err) {
      setFormError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <main className="page">
      <Link to={`/admin/assessments/${assessmentId}`} className="back">← Volver al assessment</Link>
      <header className="page-header">
        <span className="eyebrow">Gestión de preguntas</span>
        <h1>{editing ? 'Editar pregunta' : 'Nueva pregunta'}</h1>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <section className="card form-card">
          <label className="field">
            <span className="field-label">Título *</span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Máximo de un arreglo"
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Descripción *</span>
            <textarea
              className="input"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dado un arreglo de números, retorne el valor máximo."
            />
          </label>

          <div className="form-row">
            <fieldset className="field field-grow">
              <legend className="field-label">Lenguajes permitidos *</legend>
              <div className="choice-row">
                {LANGUAGES.map((l) => (
                  <label key={l.id} className={`choice ${languages.includes(l.id) ? 'choice-on' : ''}`}>
                    <input type="checkbox" checked={languages.includes(l.id)} onChange={() => toggleLanguage(l.id)} />
                    <LanguageIcon id={l.id} size={18} />
                    {l.label}
                    {l.plus && <span className="picker-plus">Plus</span>}
                  </label>
                ))}
              </div>
              <span className="field-hint">El candidato podrá elegir entre los lenguajes marcados.</span>
            </fieldset>

            <label className="field field-narrow">
              <span className="field-label">Puntaje *</span>
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="card form-card">
          <div className="section-title tight">
            <div>
              <h2>Casos de prueba</h2>
              <p className="muted">
                La entrada se envía por stdin. La salida esperada se compara con la salida estándar (sin espacios al inicio ni al final).
              </p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setCases((p) => [...p, newCase()])}>
              + Agregar caso
            </button>
          </div>

          <div className="stack">
            {cases.map((c, i) => (
              <div key={c.key} className="case-editor">
                <span className="question-index">{i + 1}</span>
                <label className="field field-grow">
                  <span className="field-label">Entrada</span>
                  <textarea
                    className="input mono"
                    rows={2}
                    value={c.input}
                    onChange={(e) => updateCase(c.key, { input: e.target.value })}
                    placeholder="[3,5,1,8]"
                  />
                </label>
                <label className="field field-grow">
                  <span className="field-label">Salida esperada *</span>
                  <textarea
                    className="input mono"
                    rows={2}
                    value={c.expectedOutput}
                    onChange={(e) => updateCase(c.key, { expectedOutput: e.target.value })}
                    placeholder="8"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setCases((p) => p.filter((x) => x.key !== c.key))}
                  disabled={cases.length === 1}
                  aria-label={`Eliminar caso ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {formError && <p className="form-error" role="alert">{formError}</p>}
        {problems.length > 0 && <p className="muted">Para guardar: {problems.join(' · ')}.</p>}

        <div className="form-actions">
          <button className="btn" type="submit" disabled={problems.length > 0 || saving}>
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear pregunta'}
          </button>
          <Link className="btn btn-secondary" to={`/admin/assessments/${assessmentId}`}>Cancelar</Link>
        </div>
      </form>
    </main>
  );
}
