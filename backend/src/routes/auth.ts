import { Router } from 'express';
import { prisma } from '../prismaClient';
import {
  authenticate,
  clearLoginFailures,
  hashPassword,
  loginBlocked,
  passwordProblem,
  registerLoginFailure,
  signToken,
  verifyPassword,
} from '../auth';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u: { id: number; name: string; email: string; role: string }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

// Solo crea candidatos, los otros roles los asigna un admin
router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const problem = passwordProblem(req.body.password);

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'El correo no es válido' });
    if (problem) return res.status(400).json({ error: problem });
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const user = await prisma.user.create({
      data: { name, email, passwordHash: hashPassword(req.body.password), role: 'CANDIDATE' },
    });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const key = `${req.ip}:${email}`;

    if (loginBlocked(key)) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // mismo mensaje en ambos casos para no revelar qué correos existen
    if (!user || !verifyPassword(password, user.passwordHash)) {
      registerLoginFailure(key);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    if (!user.active) return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta a un administrador.' });

    clearLoginFailures(key);
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Cambio de contraseña
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const problem = passwordProblem(newPassword);
    if (problem) return res.status(400).json({ error: problem });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !verifyPassword(String(currentPassword ?? ''), user.passwordHash)) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

export default router;
