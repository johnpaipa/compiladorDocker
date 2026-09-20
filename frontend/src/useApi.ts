import { useEffect, useState } from 'react';
import api, { errorMessage } from './api';

interface State<T> {
  url: string;
  data: T | null;
  error: string | null;
}

/** GET con estados de carga/error. Pasar `null` como url desactiva la petición. */
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<State<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    api
      .get<T>(url)
      .then((res) => !cancelled && setState({ url, data: res.data, error: null }))
      .catch((err) => !cancelled && setState({ url, data: null, error: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  const current = state && state.url === url ? state : null;

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: url !== null && current === null,
    reload: () => {
      setState(null);
      setAttempt((n) => n + 1);
    },
  };
}
