export interface LanguageInfo {
  id: string;
  label: string;
  /** Lenguaje "plus" del reto (no obligatorio) */
  plus?: boolean;
  template: string;
}

// Deben coincidir con los lenguajes que soporta el motor de ejecución del backend.
export const LANGUAGES: LanguageInfo[] = [
  {
    id: 'java',
    label: 'Java',
    template: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Tu solución aquí\n    }\n}`,
  },
  {
    id: 'javascript',
    label: 'JavaScript (Node.js)',
    template: `// Lee la entrada desde stdin\nconst input = require('fs').readFileSync(0, 'utf-8');\n\n// Tu solución aquí\nconsole.log(input);`,
  },
  {
    id: 'python',
    label: 'Python',
    template: `import sys\n\n# Lee la entrada desde stdin\ndata = sys.stdin.read()\n\n# Tu solución aquí\nprint(data)`,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    plus: true,
    template: `import * as fs from 'fs';\n\n// Lee la entrada desde stdin\nconst input: string = fs.readFileSync(0, 'utf-8');\n\n// Tu solución aquí\nconsole.log(input);`,
  },
  {
    id: 'cobol',
    label: 'COBOL',
    plus: true,
    template: `IDENTIFICATION DIVISION.\nPROGRAM-ID. MAIN.\nDATA DIVISION.\nWORKING-STORAGE SECTION.\n01 WS-INPUT PIC X(200).\nPROCEDURE DIVISION.\n    *> Lee una línea de la entrada estándar\n    ACCEPT WS-INPUT\n    *> Tu solución aquí\n    DISPLAY FUNCTION TRIM(WS-INPUT)\n    STOP RUN.`,
  },
];

export const languageLabel = (id: string) => LANGUAGES.find((l) => l.id === id)?.label ?? id;
export const languageTemplate = (id: string) => LANGUAGES.find((l) => l.id === id)?.template ?? '';

/** La pregunta guarda sus lenguajes permitidos como "java,python". */
export const parseLanguages = (value: string) =>
  value
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
