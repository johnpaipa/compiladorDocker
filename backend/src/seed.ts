import crypto from 'crypto';
import { hashPassword, passwordProblem } from './auth';
import { prisma } from './prismaClient';

const DEMO_USERS = [
  { name: 'Evaluador Demo', email: 'evaluador@kata.local', role: 'EVALUATOR' },
  { name: 'Candidato Demo', email: 'candidato@kata.local', role: 'CANDIDATE' },
] as const;

const randomPassword = () => crypto.randomBytes(12).toString('base64url');

function passwordFrom(variable: 'ADMIN_PASSWORD' | 'DEMO_PASSWORD'): { password: string; generated: boolean } {
  const value = process.env[variable];
  if (!value) return { password: randomPassword(), generated: true };
  const problem = passwordProblem(value);
  if (problem) throw new Error(`${variable}: ${problem}`);
  return { password: value, generated: false };
}

export async function ensureDefaultUsers() {
  if ((await prisma.user.count()) > 0) return;

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@kata.local').toLowerCase();
  const admin = passwordFrom('ADMIN_PASSWORD');
  await prisma.user.create({
    data: { name: 'Administrador', email: adminEmail, passwordHash: hashPassword(admin.password), role: 'ADMIN' },
  });
  console.log(
    `Usuario administrador creado: ${adminEmail}` +
      (admin.generated ? ` / ${admin.password}  (generada al azar, solo se muestra ahora; defínela con ADMIN_PASSWORD)` : '')
  );

  if (process.env.SEED_DEMO_USERS !== 'true') return;
  const demoPassword = passwordFrom('DEMO_PASSWORD');
  for (const demo of DEMO_USERS) {
    await prisma.user.create({
      data: { name: demo.name, email: demo.email, passwordHash: hashPassword(demoPassword.password), role: demo.role },
    });
    console.log(`Usuario de demostración: ${demo.email}`);
  }
  if (demoPassword.generated) {
    console.log(`Contraseña de los usuarios de demostración: ${demoPassword.password}  (generada al azar, solo se muestra ahora)`);
  }
}
