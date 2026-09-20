import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LANGUAGES } from '../languages';
import LanguageIcon from './LanguageIcon';

interface Props {
  options: string[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

// listbox propio porque un <select> no puede mostrar imágenes
export default function LanguagePicker({ options, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const items = LANGUAGES.filter((l) => options.includes(l.id));
  const current = items.find((l) => l.id === value) ?? items[0];
  const single = items.length <= 1;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const move = (delta: number) => {
    const nodes = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const at = nodes.indexOf(document.activeElement as HTMLElement);
    nodes[(at + delta + nodes.length) % nodes.length]?.focus();
  };

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Escape') { setOpen(false); rootRef.current?.querySelector('button')?.focus(); }
  };

  return (
    <div className="picker" ref={rootRef}>
      <button
        type="button"
        className="picker-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Lenguaje: ${current.label}`}
        disabled={disabled || single}
        onClick={() => setOpen((o) => !o)}
      >
        <LanguageIcon id={current.id} size={20} />
        <span>{current.label}</span>
        {!single && <span className="picker-caret" aria-hidden>▾</span>}
      </button>

      {open && (
        <ul className="picker-list" role="listbox" ref={listRef} onKeyDown={onListKey}>
          {items.map((l) => (
            <li key={l.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={l.id === current.id}
                className={`picker-option ${l.id === current.id ? 'picker-option-on' : ''}`}
                onClick={() => {
                  setOpen(false);
                  if (l.id !== current.id) onChange(l.id);
                }}
              >
                <LanguageIcon id={l.id} size={20} />
                <span>{l.label}</span>
                {l.plus && <span className="picker-plus">Plus</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
