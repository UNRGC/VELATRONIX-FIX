import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../http';
import { env } from '../env';
import { AUTH_COOKIE_NAME, AuthedRequest, requireAuth, signToken } from './middleware';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authCookie = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: '/api',
};

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Respuesta uniforme para no revelar si existe el correo.
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Credenciales inválidas');
    }
    const token = signToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, authCookie);
    res.json({ user: publicUser(user) });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ user: publicUser(req.user!) });
  })
);

// Endpoint de compatibilidad; la sesión se invalida limpiando la cookie.
authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookie);
  res.json({ ok: true });
});

function publicUser(u: { id: string; name: string; email: string; role: string; isActive: boolean }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive };
}
