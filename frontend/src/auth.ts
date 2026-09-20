import { useSyncExternalStore } from 'react';
import api, { setUnauthorizedHandler, tokenStorage } from './api';
import type { Role, User } from './types';

export type AuthState =
  | { status: 'loading'; user: null }
  // loggedOut: salió a propósito, no se recuerda la página para volver
  | { status: 'anonymous'; user: null; loggedOut: boolean }
  | { status: 'authenticated'; user: User };

let state: AuthState = tokenStorage.get()
  ? { status: 'loading', user: null }
  : { status: 'anonymous', user: null, loggedOut: false };
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function startSession(token: string, user: User) {
  tokenStorage.set(token);
  setState({ status: 'authenticated', user });
}

export function logout(voluntary = true) {
  tokenStorage.set(null);
  setState({ status: 'anonymous', user: null, loggedOut: voluntary });
}

export async function login(email: string, password: string): Promise<User> {
  const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
  startSession(res.data.token, res.data.user);
  return res.data.user;
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const res = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password });
  startSession(res.data.token, res.data.user);
  return res.data.user;
}

setUnauthorizedHandler(() => logout(false));

// al cargar se valida el token guardado y se refresca el usuario
if (state.status === 'loading') {
  api
    .get<{ user: User }>('/auth/me')
    .then((res) => setState({ status: 'authenticated', user: res.data.user }))
    .catch(() => logout(false));
}

export const useAuth = () => useSyncExternalStore(subscribe, () => state, () => state);

export const currentUser = () => state.user;

export const isStaffRole = (role: Role) => role === 'ADMIN' || role === 'EVALUATOR';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  EVALUATOR: 'Evaluador',
  CANDIDATE: 'Candidato',
};
