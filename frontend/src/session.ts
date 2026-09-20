import { useEffect, useState, useSyncExternalStore } from 'react';

// Estado del candidato guardado en localStorage: nombre, hora de inicio por
// assessment y borradores de código. Los listeners mantienen sincronizados
// todos los componentes que lo leen.

const CANDIDATE_KEY = 'kata:candidate';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* localStorage no disponible: la app sigue funcionando sin persistencia */
  }
}

// --- Candidato ---------------------------------------------------------------

export function setCandidate(name: string) {
  write(CANDIDATE_KEY, name.trim() || null);
  notify();
}

export function useCandidate(): string {
  return useSyncExternalStore(
    subscribe,
    () => read(CANDIDATE_KEY) ?? '',
    () => '',
  );
}

// --- Inicio del assessment y temporizador -------------------------------------

const startKey = (assessmentId: number | string, candidate: string) =>
  `kata:start:${assessmentId}:${candidate}`;

export function startAssessment(assessmentId: number | string, candidate: string) {
  if (read(startKey(assessmentId, candidate)) === null) {
    write(startKey(assessmentId, candidate), String(Date.now()));
  }
  notify();
}

export function useStartedAt(assessmentId: number | string | undefined, candidate: string): number | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => (assessmentId && candidate ? read(startKey(assessmentId, candidate)) : null),
    () => null,
  );
  return raw ? Number(raw) : null;
}

export function useCountdown(startedAt: number | null, limitMinutes: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (startedAt === null) return { remainingMs: null, expired: false };
  const remainingMs = Math.max(0, startedAt + limitMinutes * 60_000 - now);
  return { remainingMs, expired: remainingMs === 0 };
}

// --- Borradores de código (uno por pregunta y lenguaje) ---------------------------

const draftKey = (candidate: string, questionId: number, language: string) =>
  `kata:draft:${candidate}:${questionId}:${language}`;

export const loadDraft = (candidate: string, questionId: number, language: string) =>
  read(draftKey(candidate, questionId, language));
export const saveDraft = (candidate: string, questionId: number, language: string, code: string) =>
  write(draftKey(candidate, questionId, language), code);
export const clearDraft = (candidate: string, questionId: number, language: string) =>
  write(draftKey(candidate, questionId, language), null);
