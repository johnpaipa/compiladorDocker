import { useEffect, useState } from 'react';
import api, { errorMessage } from './api';
import type { AttemptInfo } from './types';

export interface AttemptState {
  startedAt: number | null;
  deadline: number | null;
  skewMs: number;
}

const toState = (info: AttemptInfo): AttemptState => ({
  startedAt: info.startedAt ? Date.parse(info.startedAt) : null,
  deadline: info.deadline ? Date.parse(info.deadline) : null,
  skewMs: Date.parse(info.serverNow) - Date.now(),
});

export function useAttempt(assessmentId: number | string | null | undefined) {
  const key = assessmentId ? String(assessmentId) : null;
  const [loaded, setLoaded] = useState<{ key: string; attempt: AttemptState | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    api
      .get<AttemptInfo>(`/assessments/${key}/attempt`)
      .then((res) => !cancelled && setLoaded({ key, attempt: toState(res.data), error: null }))
      .catch((err) => !cancelled && setLoaded({ key, attempt: null, error: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const current = loaded && loaded.key === key ? loaded : null;

  const start = async () => {
    if (!key) return;
    const res = await api.post<AttemptInfo>(`/assessments/${key}/start`);
    setLoaded({ key, attempt: toState(res.data), error: null });
  };

  return {
    attempt: current?.attempt ?? null,
    error: current?.error ?? null,
    loading: key !== null && current === null,
    started: Boolean(current?.attempt?.startedAt),
    start,
  };
}

export function useCountdown(attempt: AttemptState | null) {
  const [now, setNow] = useState(() => Date.now());
  const deadline = attempt?.deadline ?? null;

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (deadline === null || !attempt) return { remainingMs: null, expired: false };
  const remainingMs = Math.max(0, deadline - (now + attempt.skewMs));
  return { remainingMs, expired: remainingMs === 0 };
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
    // sin localStorage
  }
}

const draftKey = (userId: number, questionId: number, language: string) => `kata:draft:${userId}:${questionId}:${language}`;

export const loadDraft = (userId: number, questionId: number, language: string) =>
  read(draftKey(userId, questionId, language));
export const saveDraft = (userId: number, questionId: number, language: string, code: string) =>
  write(draftKey(userId, questionId, language), code);
export const clearDraft = (userId: number, questionId: number, language: string) =>
  write(draftKey(userId, questionId, language), null);
