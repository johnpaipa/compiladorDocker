import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from './prismaClient';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (password.length > 128) return 'La contraseña es demasiado larga';
  return null;
}

const MIN_SECRET_LENGTH = 32;
const GENERATE_HINT = 'genera uno con: openssl rand -hex 48';

// se lee al primer uso porque dotenv carga después de los imports
let secret: string | undefined;
function getSecret(): string {
  if (!secret) {
    const configured = process.env.JWT_SECRET;
    if (configured) {
      if (configured.length < MIN_SECRET_LENGTH || /cambia/i.test(configured)) {
        throw new Error(`JWT_SECRET es demasiado corto (mínimo ${MIN_SECRET_LENGTH}) o es el valor de ejemplo; ${GENERATE_HINT}`);
      }
      secret = configured;
    } else {
      if (process.env.NODE_ENV === 'production') throw new Error(`JWT_SECRET es obligatorio en producción; ${GENERATE_HINT}`);
      // sin JWT_SECRET las sesiones se pierden al reiniciar
      secret = crypto.randomBytes(48).toString('hex');
      console.warn('JWT_SECRET no está definido, se usa uno temporal (las sesiones se pierden al reiniciar)');
    }
  }
  return secret;
}

export const checkJwtSecret = () => void getSecret();

const TOKEN_TTL = '8h';

export const signToken = (user: AuthUser) => jwt.sign({ sub: String(user.id) }, getSecret(), { expiresIn: TOKEN_TTL });

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Debes iniciar sesión' });

  try {
    const payload = jwt.verify(token, getSecret()) as jwt.JwtPayload;
    // se consulta la base para que bajas y cambios de rol apliquen al instante
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } });
    if (!user || !user.active) return res.status(401).json({ error: 'Sesión no válida' });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada o no válida' });
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };

export const requireStaff = requireRole('ADMIN', 'EVALUATOR');
export const isStaff = (user: AuthUser) => user.role === 'ADMIN' || user.role === 'EVALUATOR';

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60_000;

export function loginBlocked(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function registerLoginFailure(key: string) {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < Date.now()) attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else entry.count++;
}

export const clearLoginFailures = (key: string) => attempts.delete(key);
