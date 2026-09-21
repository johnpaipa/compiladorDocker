import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import path from 'path';

const execAsync = promisify(exec);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  success: boolean;
  timedOut: boolean;
  compileError: boolean;
}

interface LanguageConfig {
  image: string;
  dockerfileDir?: string;
  fileName: string;
  memory: string;
  compile?: string;
  run: string;
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
    fileName: 'Main.java', 
    memory: '256m',
    compile: 'javac Main.java',
    run: 'java Main',
    compileBudgetMs: 20000,
  },
  typescript: {
    image: 'kata-runner-typescript',
    dockerfileDir: runnerDir('typescript'),
    fileName: 'solution.ts',
    memory: '512m', // tsc necesita más memoria
    compile:
      'tsc solution.ts --target es2022 --module commonjs --moduleResolution node --skipLibCheck --typeRoots /opt/ts/node_modules/@types --types node',
    run: 'node solution.js',
    compileBudgetMs: 40000,
  },
  cobol: {
    image: 'kata-runner-cobol',
    dockerfileDir: runnerDir('cobol'),
    fileName: 'solution.cob',
    memory: '256m',
    compile: 'cobc -x -free -o main solution.cob',
    run: './main',
    compileBudgetMs: 30000,
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIG);

const RUN_TIMEOUT_S = 5;
const COMPILE_TIMEOUT_S = 60;
const KILL_GRACE_S = 1; 
const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_HOST_OUTPUT_BYTES = 10 * 1024 * 1024;

const MAX_CONCURRENT = Number(process.env.EXEC_CONCURRENCY) || 3;
const MAX_QUEUED = Number(process.env.EXEC_QUEUE) || 20;

export class BusyError extends Error {
  constructor() {
    super('El servidor está ocupado ejecutando otras evaluaciones, intenta de nuevo en unos segundos');
  }
}

let running = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running < MAX_CONCURRENT) {
    running++;
  } else {
    if (waiting.length >= MAX_QUEUED) throw new BusyError();
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  try {
    return await task();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}

const imageReady = new Map<string, Promise<void>>();

function ensureImage(config: LanguageConfig): Promise<void> {
  if (!config.dockerfileDir) return Promise.resolve();

  let ready = imageReady.get(config.image);
  if (!ready) {
    ready = (async () => {
      try {
        await execAsync(`docker image inspect ${config.image}`);
        return;
      } catch {
        // no existe, se construye
      }
      console.log(`Construyendo imagen ${config.image} (solo ocurre la primera vez)...`);
      await execAsync(`docker build -t ${config.image} "${config.dockerfileDir}"`, {
        timeout: 15 * 60_000,
        maxBuffer: 50 * 1024 * 1024,
      });
      console.log(`Imagen ${config.image} lista`);
    })();
    imageReady.set(config.image, ready);
    ready.catch(() => imageReady.delete(config.image));
  }
  return ready;
}

export function prepareRunners() {
  for (const [language, config] of Object.entries(LANGUAGE_CONFIG)) {
    ensureImage(config).catch((err) =>
      console.error(`No se pudo preparar el runner de ${language}: ${err.message.split('\n')[0]}`)
    );
  }
}


function buildScript(config: LanguageConfig): string {
  const lines = [
    'ulimit -f 20480', 
    'DROP="setpriv --reuid=65534 --regid=65534 --clear-groups --no-new-privs"',
    'killall() { for pass in 1 2 3; do for p in /proc/[0-9]*; do p=${p#/proc/}; [ "$p" = "$$" ] || kill -9 "$p" 2>/dev/null; done; done; }',
    'IFS= read -r SRC',
    `printf '%s' "$SRC" | base64 -d > /work/${config.fileName}`,
    'n=0',
    'while IFS= read -r line; do',
    `  printf '%s' "$line" | base64 -d > "/private/in_$n.txt"`,
    '  n=$((n+1))',
    'done',
    'cd /work',
  ];
  if (config.compile) {
    lines.push(
      `$DROP timeout -k ${KILL_GRACE_S} ${COMPILE_TIMEOUT_S} ${config.compile} > /private/compile.txt 2>&1`,
      'rc=$?',
      'if [ $rc -ne 0 ]; then',
      '  killall',
      `  echo "COMPILE $rc $(head -c ${MAX_OUTPUT_BYTES} /private/compile.txt | base64 -w0)"`,
      '  exit 0',
      'fi'
    );
  }
  lines.push(
    'i=0',
    'while [ "$i" -lt "$n" ]; do',
    '  t0=$(date +%s)',
    `  $DROP timeout -k ${KILL_GRACE_S} ${RUN_TIMEOUT_S} ${config.run} < "/private/in_$i.txt" > "/private/out_$i.txt" 2> "/private/err_$i.txt"`,
    '  code=$?',
    '  elapsed=$(( $(date +%s) - t0 ))',
    '  killall', 
    `  echo "CASE $i $code $elapsed $(head -c ${MAX_OUTPUT_BYTES} "/private/out_$i.txt" | base64 -w0) $(head -c ${MAX_OUTPUT_BYTES} "/private/err_$i.txt" | base64 -w0)"`,
    '  i=$((i+1))',
    'done',
    'exit 0',
    ''
  );
  return lines.join('\n');
}

interface DockerRun {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
}


function runDocker(args: string[], input: string, timeoutMs: number): Promise<DockerRun> {
  return new Promise((resolve) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_HOST_OUTPUT_BYTES) stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_HOST_OUTPUT_BYTES) stderr += chunk;
    });
    child.stdin.on('error', () => undefined);
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, code: null, timedOut: false });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut });
    });
    child.stdin.end(input);
  });
}

const b64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const fromB64 = (text: string | undefined) => Buffer.from(text ?? '', 'base64').toString('utf8').trim();

function parseOutput(stdout: string, count: number, docker: DockerRun): ExecutionResult[] {
  const lines = stdout.split('\n');

  const compile = lines.find((l) => l.startsWith('COMPILE '));
  if (compile) {
    const [, rc, output] = compile.split(' ');
    const stderr = fromB64(output) || (rc === '124' || rc === '137' ? 'Tiempo de compilación excedido' : 'Error de compilación');
    return Array.from({ length: count }, () => ({ stdout: '', stderr, success: false, timedOut: false, compileError: true }));
  }

  const cases = new Map<number, string[]>();
  for (const line of lines) {
    if (!line.startsWith('CASE ')) continue;
    const fields = line.split(' ');
    cases.set(Number(fields[1]), fields);
  }

  return Array.from({ length: count }, (_, i): ExecutionResult => {
    const fields = cases.get(i);
    if (!fields) {
      const stderr = docker.timedOut
        ? 'Tiempo límite de ejecución excedido'
        : docker.code === 137
          ? 'Proceso terminado: límite de memoria excedido'
          : docker.stderr.trim() || 'La ejecución terminó de forma inesperada';
      return { stdout: '', stderr, success: false, timedOut: docker.timedOut, compileError: false };
    }
    const exitCode = Number(fields[2]);
    const elapsed = Number(fields[3]);
    const timedOut = exitCode === 124 || (exitCode === 137 && elapsed >= RUN_TIMEOUT_S);
    let stderr = fromB64(fields[5]);
    if (timedOut && !stderr) stderr = `Tiempo límite excedido (${RUN_TIMEOUT_S} s)`;
    if (exitCode === 137 && !timedOut && !stderr) stderr = 'Proceso terminado: límite de memoria excedido';
    return { stdout: fromB64(fields[4]), stderr, success: exitCode === 0, timedOut, compileError: false };
  });
}

async function execute(config: LanguageConfig, code: string, inputs: string[]): Promise<ExecutionResult[]> {
  const containerName = `kata-${crypto.randomBytes(6).toString('hex')}`;
  const args = [
    'run', '--rm', '-i',
    '--name', containerName,
    '--network', 'none',
    `--memory=${config.memory}`,
    `--memory-swap=${config.memory}`, 
    '--cpus=0.5',
    '--pids-limit=256', // evita fork bombs
    '--ulimit', 'nofile=1024:1024',
    '--security-opt', 'no-new-privileges',
    '--cap-drop', 'ALL', '--cap-add', 'SETUID', '--cap-add', 'SETGID', '--cap-add', 'KILL',
    '--read-only',
    '--tmpfs', '/tmp:rw,exec,nosuid,mode=1777,size=64m',
    '--tmpfs', '/work:rw,exec,nosuid,mode=1777,size=64m', 
    '--tmpfs', '/private:rw,noexec,nosuid,mode=0700,size=32m',
    config.image,
    'sh', '-c', buildScript(config),
  ];
  const payload = [code.endsWith('\n') ? code : code + '\n', ...inputs].map(b64).join('\n') + '\n';

  // compilación + un margen por cada caso
  const hostTimeoutMs = config.compileBudgetMs + inputs.length * (RUN_TIMEOUT_S + KILL_GRACE_S + 1) * 1000 + 8000;

  const docker = await runDocker(args, payload, hostTimeoutMs);
  if (docker.timedOut || (docker.code !== 0 && docker.code !== null)) {
    await execAsync(`docker rm -f ${containerName}`).catch(() => undefined);
  }
  return parseOutput(docker.stdout, inputs.length, docker);
}

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
  return withSlot(() => execute(config, code, inputs));
}
