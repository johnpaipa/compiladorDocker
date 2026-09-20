import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api';

export interface AssessmentFormValues {
  name: string;
  description: string;
  timeLimit: number;
}

interface Props {
  initial?: AssessmentFormValues;
  submitLabel: string;
  onSubmit: (values: AssessmentFormValues) => Promise<void>;
  onCancel?: () => void;
}

export default function AssessmentForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [timeLimit, setTimeLimit] = useState(String(initial?.timeLimit ?? 60));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutes = Number(timeLimit);
  const valid = name.trim().length > 0 && Number.isInteger(minutes) && minutes > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), timeLimit: minutes });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Nombre *</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Assessment Full Stack Cloud"
          autoFocus
        />
      </label>

      <label className="field">
        <span className="field-label">Descripción</span>
        <textarea
          className="input"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="¿Qué evalúa esta prueba?"
        />
      </label>

      <label className="field field-narrow">
        <span className="field-label">Tiempo límite (minutos) *</span>
        <input
          className="input"
          type="number"
          min={1}
          step={1}
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)}
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="btn" type="submit" disabled={!valid || saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
        {onCancel && (
          <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
