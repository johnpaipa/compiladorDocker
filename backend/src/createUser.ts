import readline from 'readline';
import { parseArgs } from 'util';
import type { Role } from '@prisma/client';
import { hashPassword, passwordProblem } from './auth';
import { prisma } from './prismaClient';

const ROLES: Role[] = ['ADMIN', 'EVALUATOR', 'CANDIDATE'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function askPassword(): Promise<string> {
  const prompt = 'Contraseña: ';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  if (process.stdin.isTTY) {
    const rlOut = rl as unknown as { _writeToOutput: (text: string) => void };
    const write = rlOut._writeToOutput.bind(rl);
    rlOut._writeToOutput = (text) => {
      if (text.startsWith(prompt)) write(text);
    };
  }
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      if (process.stdin.isTTY) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' } } });

  const email = (values.email ?? '').trim().toLowerCase();
  const role = (values.role ?? '').toUpperCase() as Role;
  if (!EMAIL_RE.test(email) || !ROLES.includes(role)) {
    console.error('Uso: npm run create-user -- --email correo@dominio.com --role ADMIN|EVALUATOR|CANDIDATE [--name "Nombre"]');
    process.exitCode = 1;
    return;
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    console.error(`Ya existe un usuario con el correo ${email}`);
    process.exitCode = 1;
    return;
  }

  const password = await askPassword();
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    process.exitCode = 1;
    return;
  }

  const name = values.name?.trim() || email.split('@')[0]!;
  await prisma.user.create({ data: { name, email, role, passwordHash: hashPassword(password) } });
  console.log(`Usuario creado: ${email} (${role})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
