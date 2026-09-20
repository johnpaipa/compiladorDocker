import { hashPassword } from './auth';
import { prisma } from './prismaClient';

// usuarios de demostración, solo se crean si no hay ninguno
const DEMO_USERS = [
  { name: 'Administrador', email: 'admin@kata.local', password: 'Admin123!', role: 'ADMIN' },
  { name: 'Evaluador Demo', email: 'evaluador@kata.local', password: 'Evaluador123!', role: 'EVALUATOR' },
  { name: 'Candidato Demo', email: 'candidato@kata.local', password: 'Candidato123!', role: 'CANDIDATE' },
] as const;

export async function ensureDefaultUsers() {
  if ((await prisma.user.count()) > 0) return;

  const adminEmail = (process.env.ADMIN_EMAIL ?? DEMO_USERS[0].email).toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? DEMO_USERS[0].password;

  await prisma.user.create({
    data: { name: 'Administrador', email: adminEmail, passwordHash: hashPassword(adminPassword), role: 'ADMIN' },
  });
  console.log(`Usuario administrador creado: ${adminEmail}${process.env.ADMIN_PASSWORD ? '' : ` / ${adminPassword}  (cámbiala en producción)`}`);

  if (process.env.SEED_DEMO_USERS === 'false') return;
  for (const demo of DEMO_USERS.slice(1)) {
    await prisma.user.create({
      data: { name: demo.name, email: demo.email, passwordHash: hashPassword(demo.password), role: demo.role },
    });
    console.log(`Usuario de demostración: ${demo.email} / ${demo.password}`);
  }
}
