import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { AuthedRequest, requireAuth, signToken } from './middleware';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Mismo mensaje para email inexistente o password incorrecta.
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Credenciales inválidas');
    }
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ user: publicUser(req.user!) });
  })
);

// Logout es del lado del cliente (borra el token). Endpoint por compatibilidad.
authRouter.post('/logout', (_req, res) => res.json({ ok: true }));

function publicUser(u: { id: string; name: string; email: string; role: string; isActive: boolean }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive };
}
