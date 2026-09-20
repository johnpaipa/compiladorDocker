import { FaJava } from 'react-icons/fa';
import { SiNodedotjs, SiPython, SiTypescript } from 'react-icons/si';

const COLORS: Record<string, string> = {
  java: '#e76f00',
  javascript: '#5fa04e',
  python: '#4b8bbe',
  typescript: '#3178c6',
  cobol: '#0a7ea4',
};

/** COBOL no tiene logo de marca: se dibuja una placa de terminal con sus siglas. */
function CobolIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="1.5" y="3" width="21" height="18" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M1.5 8h21" stroke="currentColor" strokeWidth="1.8" />
      <text x="12" y="17.6" textAnchor="middle" fontSize="7.6" fontWeight="800" fontFamily="ui-monospace, Consolas, monospace" fill="currentColor">
        COB
      </text>
    </svg>
  );
}

/** Ícono del lenguaje con su color de marca. Mismo tamaño para todos. */
export default function LanguageIcon({ id, size = 18 }: { id: string; size?: number }) {
  const color = COLORS[id] ?? 'currentColor';
  let icon;
  switch (id) {
    case 'java':
      icon = <FaJava size={size} aria-hidden />;
      break;
    case 'javascript':
      icon = <SiNodedotjs size={size} aria-hidden />;
      break;
    case 'python':
      icon = <SiPython size={size} aria-hidden />;
      break;
    case 'typescript':
      icon = <SiTypescript size={size} aria-hidden />;
      break;
    case 'cobol':
      icon = <CobolIcon size={size} />;
      break;
    default:
      return null;
  }
  return (
    <span className="lang-icon" style={{ color, width: size, height: size }}>
      {icon}
    </span>
  );
}
