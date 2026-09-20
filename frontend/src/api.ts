import axios from 'axios';

const TOKEN_KEY = 'kata:token';

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // sin localStorage
    }
  },
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// auth.ts registra qué hacer cuando la sesión deja de valer
let onUnauthorized: () => void = () => undefined;
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.startsWith('/auth/login');
    if (axios.isAxiosError(err) && err.response?.status === 401 && !isLogin) onUnauthorized();
    return Promise.reject(err);
  },
);

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.error) return err.response.data.error;
    if (!err.response) return 'No se pudo conectar con el servidor';
  }
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado';
}

export default api;
