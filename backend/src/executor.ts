import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  success: boolean;
  timedOut: boolean;
}

interface LanguageConfig {
  image: string;
  /** Carpeta con un Dockerfile si la imagen no es pública (se construye una sola vez). */
  dockerfileDir?: string;
  fileName: string;
  memory: string;
  /** Comando de compilación (opcional). Debe volcar sus diagnósticos en compile_error.txt. */
  compile?: string;
  /** Comando que ejecuta el programa leyendo la entrada por stdin. */
  run: string;
  /** Tiempo extra (ms) que se concede a la compilación */
  compileBudgetMs: number;
}

const runnerDir = (name: string) => path.resolve(__dirname, '../runners', name);

const LANGUAGE_CONFIG: Record<string, LanguageConfig> = {
  javascript: {
    image: 'node:20-slim',
    fileName: 'solution.js',
    memory: '256m',
    run: 'node solution.js',
    compileBudgetMs: 0,
  },
  python: {
    image: 'python:3.12-slim',
    fileName: 'solution.py',
    memory: '256m',
    run: 'python solution.py',
    compileBudgetMs: 0,
  },
  java: {
    image: 'eclipse-temurin:21-jdk',
    fileName: 'Main.java', // el nombre DEBE coincidir con la clase pública
    memory: '256m',
    compile: 'javac Main.java 2> compile_error.txt',
    run: 'java Main',
    compileBudgetMs: 20000,
  },
  typescript: {
    image: 'kata-runner-typescript',
    dockerfileDir: runnerDir('typescript'),
    fileName: 'solution.ts',
    memory: '512m', // tsc necesita más memoria que node a secas
    // tsc escribe los diagnósticos en stdout, por eso se redirige todo al archivo
    compile:
      'tsc solution.ts --target es2022 --module commonjs --moduleResolution node --skipLibCheck --typeRoots /opt/ts/node_modules/@types --types node > compile_error.txt 2>&1',
    run: 'node solution.js',
    compileBudgetMs: 40000,
  },
  cobol: {
    image: 'kata-runner-cobol',
    dockerfileDir: runnerDir('cobol'),
    fileName: 'solution.cob',
    memory: '256m',
    compile: 'cobc -x -free -o main solution.cob 2> compile_error.txt',
    run: './main',
    compileBudgetMs: 30000,
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIG);

const RUN_TIMEOUT_S = 5; // por caso de prueba
const COMPILE_TIMEOUT_S = 60;
const COMPILE_FAILED = 100; // código de salida del script cuando no compila
const MAX_OUTPUT_CHARS = 64 * 1024;

// --- Imágenes propias (TypeScript, COBOL) -------------------------------------
// Se construyen una vez con `docker build`; las peticiones concurrentes comparten la misma promesa.

const imageReady = new Map<string, Promise<void>>();

function ensureImage(config: LanguageConfig): Promise<void> {
  if (!config.dockerfileDir) return Promise.resolve(); // imagen pública: docker run la descarga sola

  let ready = imageReady.get(config.image);
  if (!ready) {
    ready = (async () => {
      try {
        await execAsync(`docker image inspect ${config.image}`);
        return;
      } catch {
        /* no existe todavía: se construye */
      }
      console.log(`Construyendo imagen ${config.image} (solo ocurre la primera vez)...`);
      await execAsync(`docker build -t ${config.image} "${config.dockerfileDir}"`, {
        timeout: 15 * 60_000,
        maxBuffer: 50 * 1024 * 1024,
      });
      console.log(`Imagen ${config.image} lista`);
    })();
    imageReady.set(config.image, ready);
    ready.catch(() => imageReady.delete(config.image)); // permite reintentar
  }
  return ready;
}

/** Precalienta las imágenes propias al arrancar para que la primera ejecución no espere el build. */
export function prepareRunners() {
  for (const [language, config] of Object.entries(LANGUAGE_CONFIG)) {
    ensureImage(config).catch((err) =>
      console.error(`No se pudo preparar el runner de ${language}: ${err.message.split('\n')[0]}`)
    );
  }
}

/**
 * Script que corre dentro del contenedor: compila UNA vez y luego ejecuta cada entrada
 * (in_N.txt) guardando salida, errores y código de salida (out_N / err_N / code_N).
 * Escribirlo como archivo evita los problemas de comillas del shell de Windows.
 */
function buildScript(config: LanguageConfig): string {
  const lines = [
    '#!/bin/sh',
    'ulimit -f 20480', // tope de ~10 MB por archivo escrito: evita llenar el disco con una salida infinita
  ];
  if (config.compile) {
    lines.push(`timeout ${COMPILE_TIMEOUT_S} ${config.compile} || { cat compile_error.txt >&2; exit ${COMPILE_FAILED}; }`);
  }
  lines.push(
    'i=0',
    'while [ -f "in_$i.txt" ]; do',
    `  timeout ${RUN_TIMEOUT_S} ${config.run} < "in_$i.txt" > "out_$i.txt" 2> "err_$i.txt"`,
    '  echo $? > "code_$i.txt"',
    '  i=$((i+1))',
    'done',
    'exit 0',
    ''
  );
  return lines.join('\n');
}

const readTrimmed = (file: string) =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8').slice(0, MAX_OUTPUT_CHARS).trim() : '';

/** Compila una vez y ejecuta el código contra todas las entradas dentro de un contenedor aislado. */
export async function runTests(
  language: string,
  code: string,
  inputs: string[]
): Promise<ExecutionResult[]> {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new Error(`Lenguaje no soportado: ${language}`);
  }
  if (inputs.length === 0) return [];

  await ensureImage(config);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'submission-'));
  fs.writeFileSync(path.join(tempDir, config.fileName), code.endsWith('\n') ? code : code + '\n');
  fs.writeFileSync(path.join(tempDir, 'run.sh'), buildScript(config));
  inputs.forEach((input, i) => fs.writeFileSync(path.join(tempDir, `in_${i}.txt`), input));

  const dockerVolumePath = tempDir
    .replace(/\\/g, '/')
    .replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);

  const containerName = `kata-${crypto.randomBytes(6).toString('hex')}`;
  const dockerCommand = [
    'docker run --rm',
    `--name ${containerName}`,
    '--network none', // sin acceso a red
    `--memory=${config.memory}`, // límite de memoria
    '--cpus=0.5', // límite de CPU
    '--pids-limit=256', // evita fork bombs
    '--security-opt no-new-privileges',
    `-v "${dockerVolumePath}:/app"`, // el compilador necesita escribir su salida, así que no puede ser :ro
    '-w /app',
    config.image,
    'sh run.sh',
  ].join(' ');

  // Presupuesto total: compilación + cada caso + margen de arranque del contenedor
  const hostTimeoutMs = config.compileBudgetMs + inputs.length * (RUN_TIMEOUT_S + 1) * 1000 + 8000;

  try {
    try {
      await execAsync(dockerCommand, { timeout: hostTimeoutMs, maxBuffer: 10 * 1024 * 1024 });
    } catch (error: any) {
      // Si el proceso de docker se mata por tiempo, el contenedor sigue vivo: se elimina explícitamente
      await execAsync(`docker rm -f ${containerName}`).catch(() => undefined);

      if (error.code === COMPILE_FAILED) {
        const stderr = (error.stderr ?? '').trim() || 'Tiempo de compilación excedido';
        return inputs.map(() => ({ stdout: '', stderr, success: false, timedOut: false }));
      }
      const timedOut = Boolean(error.killed || error.signal === 'SIGTERM');
      const stderr = timedOut ? 'Tiempo límite de ejecución excedido' : (error.stderr || error.message).trim();
      return inputs.map(() => ({ stdout: '', stderr, success: false, timedOut }));
    }

    return inputs.map((_, i) => {
      const exitCode = Number(readTrimmed(path.join(tempDir, `code_${i}.txt`)) || '-1');
      const timedOut = exitCode === 124; // código de `timeout`
      let stderr = readTrimmed(path.join(tempDir, `err_${i}.txt`));
      if (timedOut && !stderr) stderr = `Tiempo límite excedido (${RUN_TIMEOUT_S} s)`;
      if (exitCode === 137 && !stderr) stderr = 'Proceso terminado: límite de memoria excedido';
      return {
        stdout: readTrimmed(path.join(tempDir, `out_${i}.txt`)),
        stderr,
        success: exitCode === 0,
        timedOut,
      };
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
