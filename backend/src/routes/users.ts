import { Router } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../prismaClient';
import { hashPassword, passwordProblem } from '../auth';

const router = Router();

const ROLES: Role[] = ['ADMIN', 'EVALUATOR', 'CANDIDATE'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const select = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

async function otherActiveAdmins(exceptId: number) {
  return prisma.user.count({ where: { role: 'ADMIN', active: true, id: { not: exceptId } } });
}

router.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ select, orderBy: [{ role: 'asc' }, { name: 'asc' }] });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = String(req.body.name ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const role = req.body.role as Role;
    const problem = passwordProblem(req.body.password);

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'El correo no es válido' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol no válido' });
    if (problem) return res.status(400).json({ error: problem });
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    }

    const user = await prisma.user.create({
      data: { name, email, role, passwordHash: hashPassword(req.body.password) },
      select,
    });
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    const data: { name?: string; email?: string; role?: Role; active?: boolean; passwordHash?: string } = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
      data.name = name;
    }
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'El correo no es válido' });
      const clash = await prisma.user.findUnique({ where: { email } });
      if (clash && clash.id !== id) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
      data.email = email;
    }
    if (req.body.role !== undefined) {
      if (!ROLES.includes(req.body.role)) return res.status(400).json({ error: 'Rol no válido' });
      data.role = req.body.role;
    }
    if (req.body.active !== undefined) data.active = Boolean(req.body.active);
    if (req.body.password) {
      const problem = passwordProblem(req.body.password);
      if (problem) return res.status(400).json({ error: problem });
      data.passwordHash = hashPassword(req.body.password);
    }

    // no dejar el sistema sin admins
    const losesAdmin = target.role === 'ADMIN' && (data.role !== undefined && data.role !== 'ADMIN' || data.active === false);
    if (losesAdmin) {
      if (id === req.user!.id) {
        return res.status(400).json({ error: 'No puedes quitarte tu propio rol de administrador ni desactivar tu cuenta' });
      }
      if ((await otherActiveAdmins(id)) === 0) {
        return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
      }
    }

    const user = await prisma.user.update({ where: { id }, data, select });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
  }
});

// Con actividad registrada solo se desactiva
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user!.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    const activity =
      (await prisma.submission.count({ where: { userId: id } })) + (await prisma.attempt.count({ where: { userId: id } }));
    if (activity > 0) {
      return res.status(409).json({ error: 'El usuario ya tiene actividad registrada. Desactívalo en lugar de eliminarlo.' });
    }
    if (target.role === 'ADMIN' && target.active && (await otherActiveAdmins(id)) === 0) {
      return res.status(400).json({ error: 'Debe quedar al menos un administrador activo' });
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el usuario' });
  }
});

export default router;
