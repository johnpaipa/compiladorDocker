import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data?.error) return err.response.data.error;
    if (!err.response) return 'No se pudo conectar con el servidor';
  }
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado';
}

export default api;
