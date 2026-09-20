import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Editor, { type OnMount } from '@monaco-editor/react';
import api, { errorMessage } from '../api';
import { isStaffRole, useAuth } from '../auth';
import { useApi } from '../useApi';
import { clearDraft, loadDraft, saveDraft, useAttempt, useCountdown, type AttemptState } from '../session';
import { Badge, Countdown, PageState, ProgressBar } from '../components/ui';
import LanguageIcon from '../components/LanguageIcon';
import LanguagePicker from '../components/LanguagePicker';
import { setupMonaco } from '../monacoSetup';
import { languageLabel, languageTemplate, parseLanguages } from '../languages';
import { diagnose, type Diagnostic } from '../diagnostics';
import type { Assessment, CaseResult, Question, SubmissionResponse, User } from '../types';

export default function CodeEditor() {
  const { questionId } = useParams();
  const { user } = useAuth();
  const staff = user ? isStaffRole(user.role) : false;

  const { data: question, error, errorStatus, errorBody, loading, reload } = useApi<Question>(`/questions/${questionId}`);
  const { data: assessment } = useApi<Assessment>(question ? `/assessments/${question.assessmentId}` : null);
  const { attempt, started, loading: attemptLoading } = useAttempt(staff || !question ? null : question.assessmentId);

  // 403 con assessmentId: el candidato aún no comenzó
  const lockedAssessmentId = (errorBody as { assessmentId?: number } | null)?.assessmentId;
  if (errorStatus === 403 && lockedAssessmentId) {
    return <Navigate to={`/assessments/${lockedAssessmentId}`} replace />;
  }

  if (loading || error || !question || !user) {
    return (
      <main className="page">
        <PageState loading={loading} error={error ?? 'Pregunta no encontrada'} onRetry={reload} />
        {error && <p className="state"><Link to="/">← Volver a las evaluaciones</Link></p>}
      </main>
    );
  }
  if (!assessment || attemptLoading) {
    return (
      <main className="page">
        <PageState loading />
      </main>
    );
  }
  if (!staff && !started) {
    return <Navigate to={`/assessments/${question.assessmentId}`} replace />;
  }

  return (
    <Workspace
      key={`${user.id}:${question.id}`}
      question={question}
      assessment={assessment}
      user={user}
      staff={staff}
      attempt={attempt}
    />
  );
}

interface WorkspaceProps {
  question: Question;
  assessment: Assessment;
  user: User;
  staff: boolean;
  attempt: AttemptState | null;
}

type RunMode = 'run' | 'submit';

function Workspace({ question, assessment, user, staff, attempt }: WorkspaceProps) {
  const allowed = parseLanguages(question.language);
  const [language, setLanguage] = useState(allowed[0]!);
  const [code, setCode] = useState(() => loadDraft(user.id, question.id, allowed[0]!) ?? languageTemplate(allowed[0]!));
  const [running, setRunning] = useState<RunMode | null>(null);
  const [output, setOutput] = useState<SubmissionResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const { remainingMs, expired } = useCountdown(attempt);

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const index = assessment.questions.findIndex((q) => q.id === question.id);
  const prev = assessment.questions[index - 1];
  const next = assessment.questions[index + 1];
  const example = question.testCases?.[0];
  const resultsPath = `/results/${assessment.id}/${user.id}`;
  const backPath = `/assessments/${assessment.id}`;

  // diagnóstico del primer caso con stderr
  const diagnostic = output
    ? diagnose(language, output.results.find((r) => r.stderr)?.stderr ?? '')
    : null;

  const setMarkers = (diag: Diagnostic | null) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;
    const line = diag?.line && diag.line <= model.getLineCount() ? diag.line : null;
    monaco.editor.setModelMarkers(
      model,
      'kata',
      line && diag
        ? [{
            severity: monaco.MarkerSeverity.Error,
            message: diag.message,
            startLineNumber: line,
            endLineNumber: line,
            startColumn: 1,
            endColumn: model.getLineMaxColumn(line),
          }]
        : [],
    );
  };

  const handleRun = async (mode: RunMode) => {
    if (running || expired) return;
    setRunning(mode);
    setOutput(null);
    setRunError(null);
    setMarkers(null);
    try {
      const res = await api.post<SubmissionResponse>('/submissions', {
        questionId: question.id,
        code,
        language,
        save: mode === 'submit',
      });
      setOutput(res.data);
      setMarkers(diagnose(language, res.data.results.find((r) => r.stderr)?.stderr ?? ''));
    } catch (err) {
      setRunError(errorMessage(err));
    } finally {
      setRunning(null);
    }
  };

  // Ctrl/Cmd+Enter usa siempre la última versión de handleRun
  const runRef = useRef(handleRun);
  useEffect(() => {
    runRef.current = handleRun;
  });

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current('run'));
  };

  const handleChange = (value: string | undefined) => {
    const updated = value ?? '';
    setCode(updated);
    saveDraft(user.id, question.id, language, updated);
    setMarkers(null);
  };

  const handleLanguageChange = (id: string) => {
    setLanguage(id);
    setCode(loadDraft(user.id, question.id, id) ?? languageTemplate(id));
    setOutput(null);
    setRunError(null);
    setMarkers(null);
  };

  const handleReset = () => {
    if (!window.confirm('¿Restablecer el código a la plantilla inicial? Perderás tu borrador.')) return;
    clearDraft(user.id, question.id, language);
    setCode(languageTemplate(language));
    setOutput(null);
    setMarkers(null);
  };

  return (
    <main className="page page-wide">
      <div className="workspace-bar">
        <Link to={backPath} className="back">← {assessment.name}</Link>
        <div className="workspace-bar-right">
          <span className="muted">Pregunta {index + 1} de {assessment.questions.length}</span>
          {staff ? <Badge tone="warn">Vista previa</Badge> : <Countdown remainingMs={remainingMs} />}
        </div>
      </div>

      {expired && (
        <div className="banner banner-bad">
          El tiempo terminó: ya no se puede ejecutar código. <Link to={resultsPath}>Ver resultados</Link>
        </div>
      )}

      <div className="workspace">
        <section className="panel statement">
          <div className="chips">
            {allowed.map((l) => (
              <Badge key={l} tone="accent"><LanguageIcon id={l} size={14} />{languageLabel(l)}</Badge>
            ))}
            <Badge>{question.score} pts</Badge>
          </div>
          <h1>{question.title}</h1>
          <p className="prose">{question.description}</p>

          {example && (
            <>
              <h2 className="panel-title">Ejemplo</h2>
              <div className="io">
                <div>
                  <span className="io-label">Entrada</span>
                  <pre>{example.input || '(vacía)'}</pre>
                </div>
                <div>
                  <span className="io-label">Salida esperada</span>
                  <pre>{example.expectedOutput}</pre>
                </div>
              </div>
            </>
          )}
          {!staff && (question.testCaseCount ?? 0) > 1 && (
            <p className="muted">Tu solución también se evaluará con {(question.testCaseCount ?? 1) - 1} caso(s) oculto(s).</p>
          )}

          <nav className="question-nav" aria-label="Navegación entre preguntas">
            {prev ? <Link className="btn btn-secondary" to={`/questions/${prev.id}/solve`}>← Anterior</Link> : <span />}
            {next ? <Link className="btn btn-secondary" to={`/questions/${next.id}/solve`}>Siguiente →</Link> : <span />}
          </nav>
        </section>

        <section className="editor-column">
          <div className="editor-toolbar">
            <div className="lang-select">
              <span className="muted">Lenguaje</span>
              <LanguagePicker options={allowed} value={language} onChange={handleLanguageChange} disabled={running !== null} />
            </div>
            <button className="link-btn" onClick={handleReset} disabled={running !== null}>
              Restablecer plantilla
            </button>
          </div>

          <div className="editor-frame">
            <Editor
              height="440px"
              language={language}
              path={`${question.id}.${language}`}
              value={code}
              onChange={handleChange}
              beforeMount={setupMonaco}
              onMount={handleMount}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true }}
              loading={<div className="state">Cargando editor…</div>}
            />
          </div>

          <div className="editor-actions">
            <button className="btn btn-secondary" onClick={() => handleRun('run')} disabled={running !== null || expired}>
              {running === 'run' ? 'Ejecutando…' : '▶ Ejecutar'}
            </button>
            {!staff && (
              <button className="btn" onClick={() => handleRun('submit')} disabled={running !== null || expired}>
                {running === 'submit' ? 'Enviando…' : 'Enviar respuesta'}
              </button>
            )}
            {!staff && <Link className="btn btn-secondary push-right" to={resultsPath}>Ver resultados</Link>}
          </div>
          <p className="hint">
            {staff ? (
              <>Vista previa: puedes ejecutar el código con todos los casos de prueba, pero no se guardan envíos. </>
            ) : (
              <><b>Ejecutar</b> prueba tu código sin guardarlo · <b>Enviar respuesta</b> lo califica y guarda · </>
            )}
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> ejecuta · tu borrador se guarda solo.
          </p>

          <Console running={running} output={output} error={runError} diagnostic={diagnostic} />
        </section>
      </div>
    </main>
  );
}

interface ConsoleProps {
  running: RunMode | null;
  output: SubmissionResponse | null;
  error: string | null;
  diagnostic: Diagnostic | null;
}

function Console({ running, output, error, diagnostic }: ConsoleProps) {
  if (running) {
    return (
      <div className="console" role="status">
        <span className="spinner" aria-hidden /> Compilando y ejecutando los casos de prueba en un contenedor aislado…
      </div>
    );
  }
  if (error) return <div className="banner banner-bad">{error}</div>;
  if (!output) return null;

  const { passedCount, totalCases, scorePercentage, score, maxScore } = output.summary;
  const allPassed = totalCases > 0 && passedCount === totalCases;
  const failed = totalCases - passedCount;
  const compileError = diagnostic?.kind === 'compile' ? diagnostic : null;

  return (
    <div className="console">
      <div className={`compile ${compileError ? 'compile-bad' : 'compile-ok'}`}>
        {compileError ? (
          <>
            <strong>Error de compilación</strong>
            <span>{compileError.line ? `Línea ${compileError.line}: ` : ''}{compileError.message}</span>
          </>
        ) : (
          <strong>✓ Compilación exitosa</strong>
        )}
      </div>

      {!compileError && diagnostic && (
        <div className="compile compile-warn">
          <strong>Error de ejecución</strong>
          <span>{diagnostic.line ? `Línea ${diagnostic.line}: ` : ''}{diagnostic.message}</span>
        </div>
      )}

      <div className="console-head">
        <h2>Casos de prueba</h2>
        <Badge tone={allPassed ? 'ok' : 'bad'}>
          {totalCases} ejecutado{totalCases === 1 ? '' : 's'} · {passedCount} exitoso{passedCount === 1 ? '' : 's'} · {failed} fallido{failed === 1 ? '' : 's'}
        </Badge>
        <span className="muted">Resultado: <b>{scorePercentage}%</b> ({score}/{maxScore} pts)</span>
      </div>
      <ProgressBar value={scorePercentage} tone={allPassed ? 'ok' : scorePercentage > 0 ? 'warn' : 'bad'} />

      <div className="cases">
        {output.results.map((r, i) => (
          <CaseCard key={r.testCaseId} index={i + 1} result={r} />
        ))}
      </div>

      {output.saved && <p className="saved-note">✓ Respuesta enviada y guardada. Puedes reenviar para mejorar tu puntaje.</p>}
    </div>
  );
}

function CaseCard({ index, result: r }: { index: number; result: CaseResult }) {
  // caso oculto: solo se muestra si pasó
  if (r.hidden) {
    return (
      <div className={`case case-hidden ${r.passed ? 'case-pass' : 'case-fail'}`}>
        <div className="case-summary">
          <span className="case-mark" aria-hidden>{r.passed ? '✓' : '✕'}</span>
          Caso {index} <span className="muted">(oculto)</span>
          <span className="muted case-verdict">{r.passed ? 'Correcto' : 'Incorrecto'}</span>
          {r.timedOut && <Badge tone="warn">Tiempo excedido</Badge>}
        </div>
      </div>
    );
  }

  return (
    <details className={`case ${r.passed ? 'case-pass' : 'case-fail'}`} open={!r.passed}>
      <summary>
        <span className="case-mark" aria-hidden>{r.passed ? '✓' : '✕'}</span>
        Caso {index}
        {r.timedOut && <Badge tone="warn">Tiempo excedido</Badge>}
      </summary>
      <div className="case-body">
        <div className="io io-3">
          <div>
            <span className="io-label">Entrada</span>
            <pre>{r.input || '(vacía)'}</pre>
          </div>
          <div>
            <span className="io-label">Esperado</span>
            <pre>{r.expected}</pre>
          </div>
          <div>
            <span className="io-label">Obtenido</span>
            <pre>{r.actualOutput || '(sin salida)'}</pre>
          </div>
        </div>
        {r.stderr && <pre className="stderr">{r.stderr}</pre>}
      </div>
    </details>
  );
}
