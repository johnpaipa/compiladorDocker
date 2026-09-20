import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface ExecutionResult {
  stdout: string;
  stderr: string;
  success: boolean;
  timedOut: boolean;
}

interface LanguageConfig {
  image: string;
  fileName: string;
  // Comando completo a correr dentro del contenedor (puede incluir compilación)
  buildRunCommand: () => string;
}

const LANGUAGE_CONFIG: Record<string, LanguageConfig> = {
  javascript: {
    image: 'node:20-slim',
    fileName: 'solution.js',
    buildRunCommand: () => `timeout 5 node solution.js < input.txt`,
  },
  python: {
    image: 'python:3.12-slim',
    fileName: 'solution.py',
    buildRunCommand: () => `timeout 5 python solution.py < input.txt`,
  },
  java: {
    image: 'eclipse-temurin:21-jdk',
    fileName: 'Main.java', // el nombre DEBE coincidir con la clase pública
    buildRunCommand: () =>
      `javac Main.java 2> compile_error.txt && timeout 5 java Main < input.txt || (cat compile_error.txt 1>&2 && exit 1)`,
  },
};

export async function runCode(
  language: string,
  code: string,
  input: string
): Promise<ExecutionResult> {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new Error(`Lenguaje no soportado: ${language}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'submission-'));
  const codeFilePath = path.join(tempDir, config.fileName);
  const inputFilePath = path.join(tempDir, 'input.txt');

  fs.writeFileSync(codeFilePath, code);
  fs.writeFileSync(inputFilePath, input);

  const dockerVolumePath = tempDir
    .replace(/\\/g, '/')
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);

  const dockerCommand = [
    'docker run --rm',
    '--network none',
    '--memory=256m',
    '--cpus=0.5',
    `-v "${dockerVolumePath}:/app"`, // Java necesita escribir el .class, así que no puede ser :ro
    '-w /app',
    config.image,
    `sh -c "${config.buildRunCommand()}"`,
  ].join(' ');

  try {
    const { stdout, stderr } = await execAsync(dockerCommand, { timeout: 15000 });
    fs.rmSync(tempDir, { recursive: true, force: true });
    return { stdout: stdout.trim(), stderr: stderr.trim(), success: true, timedOut: false };
  } catch (error: any) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    const timedOut = error.killed || error.signal === 'SIGTERM';
    return {
      stdout: error.stdout ? error.stdout.trim() : '',
      stderr: error.stderr ? error.stderr.trim() : error.message,
      success: false,
      timedOut,
    };
  }
}