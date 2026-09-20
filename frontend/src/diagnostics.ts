export interface Diagnostic {
  kind: 'compile' | 'runtime';
  line: number | null;
  message: string;
}

const first = (re: RegExp, text: string) => re.exec(text);

/**
 * Interpreta el stderr de una ejecución para mostrarlo como en un IDE:
 * error de compilación / sintaxis o error de ejecución, con su línea.
 */
export function diagnose(language: string, stderr: string): Diagnostic | null {
  if (!stderr.trim()) return null;

  if (language === 'java') {
    const compile = first(/Main\.java:(\d+): error: ([^\n]+)/, stderr);
    if (compile) return { kind: 'compile', line: Number(compile[1]), message: compile[2] };
    const runtime = first(/^(?:Exception in thread "main" )?([\w.]+(?:Exception|Error)[^\n]*)/m, stderr);
    const at = first(/\(Main\.java:(\d+)\)/, stderr);
    if (runtime) return { kind: 'runtime', line: at ? Number(at[1]) : null, message: runtime[1] };
  }

  if (language === 'python') {
    const lines = [...stderr.matchAll(/File "[^"]*solution\.py", line (\d+)/g)];
    const line = lines.length ? Number(lines[lines.length - 1][1]) : null;
    const err = first(/^(\w*(?:Error|Exception)[^\n]*)$/m, stderr);
    if (err) {
      const isSyntax = /^(SyntaxError|IndentationError|TabError)/.test(err[1]);
      return { kind: isSyntax ? 'compile' : 'runtime', line, message: err[1] };
    }
  }

  if (language === 'typescript') {
    // tsc: solution.ts(5,7): error TS2304: Cannot find name 'x'.
    const compile = first(/solution\.ts\((\d+),\d+\): error (TS\d+: [^\n]+)/, stderr);
    if (compile) return { kind: 'compile', line: Number(compile[1]), message: compile[2] };
  }

  if (language === 'cobol') {
    // cobc: solution.cob:6: error: 'FOO' is not defined
    const compile = first(/solution\.cob:(\d+): error: ([^\n]+)/, stderr);
    if (compile) return { kind: 'compile', line: Number(compile[1]), message: compile[2] };
  }

  if (language === 'javascript' || language === 'typescript') {
    const line = first(/solution\.js:(\d+)/, stderr);
    const err = first(/^(\w*(?:Error)[^\n]*)$/m, stderr);
    if (err) {
      return {
        kind: err[1].startsWith('SyntaxError') ? 'compile' : 'runtime',
        line: line ? Number(line[1]) : null,
        message: err[1],
      };
    }
  }

  return { kind: 'runtime', line: null, message: stderr.trim().split('\n')[0] };
}
