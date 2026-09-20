import { useEffect, useState } from 'react';
import axios from 'axios';
import api, { errorMessage } from './api';

interface State<T> {
  url: string;
  data: T | null;
  error: string | null;
  errorStatus: number | null;
  errorBody: unknown;
}

export function useApi<T>(url: string | null) {
  const [state, setState] = useState<State<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    api
      .get<T>(url)
      .then((res) => !cancelled && setState({ url, data: res.data, error: null, errorStatus: null, errorBody: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({
            url,
            data: null,
            error: errorMessage(err),
            errorStatus: axios.isAxiosError(err) ? (err.response?.status ?? null) : null,
            errorBody: axios.isAxiosError(err) ? err.response?.data : null,
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  const current = state && state.url === url ? state : null;

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    errorStatus: current?.errorStatus ?? null,
    errorBody: current?.errorBody ?? null,
    loading: url !== null && current === null,
    reload: () => {
      setState(null);
      setAttempt((n) => n + 1);
    },
  };
}
