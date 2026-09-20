import type { ReactNode } from 'react';
import { formatClock } from '../format';

export function PageState({
  loading,
  error,
  onRetry,
  children,
}: {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  if (loading) {
    return (
      <div className="state" role="status">
        <span className="spinner" aria-hidden />
        Cargando…
      </div>
    );
  }
  return (
    <div className="state state-error" role="alert">
      <p>{error ?? children}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

type Tone = 'neutral' | 'ok' | 'bad' | 'warn' | 'accent';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ProgressBar({ value, tone = 'accent' }: { value: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress-fill progress-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Countdown({ remainingMs, plain }: { remainingMs: number | null; plain?: boolean }) {
  if (remainingMs === null) return null;
  const expired = remainingMs === 0;
  const tone = expired ? 'bad' : remainingMs < 5 * 60_000 ? 'warn' : 'neutral';
  if (plain) {
    return <span className={`clock clock-${tone}`}>{expired ? 'Agotado' : formatClock(remainingMs)}</span>;
  }
  return (
    <span className={`countdown countdown-${tone}`} title="Tiempo restante">
      ⏱ {expired ? 'Tiempo agotado' : formatClock(remainingMs)}
    </span>
  );
}
