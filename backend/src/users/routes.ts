import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { requireAuth, requireRole } from '../auth/middleware';

export const usersRouter = Router();

// Administración de usuarios restringida al rol administrador.
usersRouter.use(requireAuth, requireRole(Role.ADMIN));

const roleEnum = z.nativeEnum(Role);
const publicUser = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } as const;

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'desc' } });
    res.json(users);
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: roleEnum,
});

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const email = data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, 'Ya existe un usuario con ese correo');
    }
    const user = await prisma.user.create({
      data: { name: data.name, email, role: data.role, passwordHash: await bcrypt.hash(data.password, 10) },
      select: publicUser,
    });
    res.status(201).json(user);
  })
);

usersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: publicUser });
    if (!user) throw new HttpError(404, 'Usuario no encontrado');
    res.json(user);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: roleEnum.optional(),
  password: z.string().min(8).optional(),
});

usersRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const patch: Record<string, unknown> = {};
    if (data.name) patch.name = data.name;
    if (data.email) patch.email = data.email.toLowerCase();
    if (data.role) patch.role = data.role;
    if (data.password) patch.passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: patch, select: publicUser });
    res.json(user);
  })
);

async function setActive(id: string, isActive: boolean) {
  return prisma.user.update({ where: { id }, data: { isActive }, select: publicUser });
}

usersRouter.patch('/:id/activate', asyncHandler(async (req, res) => res.json(await setActive(req.params.id, true))));
usersRouter.patch('/:id/deactivate', asyncHandler(async (req, res) => res.json(await setActive(req.params.id, false))));
