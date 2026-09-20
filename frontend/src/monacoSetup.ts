import type { Monaco } from '@monaco-editor/react';

const COBOL_KEYWORDS = [
  'IDENTIFICATION', 'DIVISION', 'PROGRAM-ID', 'ENVIRONMENT', 'DATA', 'WORKING-STORAGE', 'SECTION', 'PROCEDURE',
  'PIC', 'PICTURE', 'VALUE', 'ACCEPT', 'DISPLAY', 'MOVE', 'TO', 'ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'COMPUTE',
  'GIVING', 'FROM', 'BY', 'INTO', 'IF', 'ELSE', 'END-IF', 'PERFORM', 'UNTIL', 'VARYING', 'END-PERFORM', 'EVALUATE',
  'WHEN', 'END-EVALUATE', 'STOP', 'RUN', 'GOBACK', 'FUNCTION', 'TRIM', 'LENGTH', 'UPON', 'NOT', 'AND', 'OR',
  'EQUAL', 'GREATER', 'LESS', 'THAN', 'IS', 'FILLER', 'REDEFINES', 'OCCURS', 'TIMES', 'CALL', 'USING',
];

/** Monaco no trae COBOL: se registra un resaltado mínimo. También se silencia la validación semántica
 *  de TypeScript/JavaScript, porque Monaco no conoce los tipos de Node (`require`, `fs`) y marcaría falsos errores. */
export function setupMonaco(monaco: Monaco) {
  if (!monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'cobol')) {
    monaco.languages.register({ id: 'cobol' });
    monaco.languages.setMonarchTokensProvider('cobol', {
      ignoreCase: true,
      keywords: COBOL_KEYWORDS,
      tokenizer: {
        root: [
          [/\*>.*$/, 'comment'],
          [/"[^"]*"|'[^']*'/, 'string'],
          [/\d+(\.\d+)?/, 'number'],
          [/[A-Za-z][\w-]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        ],
      },
    } as Parameters<typeof monaco.languages.setMonarchTokensProvider>[1]);
  }

  const ts = monaco.languages.typescript;
  ts?.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true });
  ts?.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: true });
}
