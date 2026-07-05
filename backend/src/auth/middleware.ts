import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, User } from '@prisma/client';
import { env } from '../env';
import { prisma } from '../prisma';
import { HttpError } from '../http';

export interface AuthedRequest extends Request {
  user?: User;
}

export function signToken(user: Pick<User, 'id'>): string {
  return jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'No autenticado');
  const token = header.slice(7);
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
  } catch {
    throw new HttpError(401, 'Sesión inválida o expirada');
  }
  prisma.user
    .findUnique({ where: { id: String(payload.sub) } })
    .then((user) => {
      if (!user || !user.isActive) throw new HttpError(401, 'Usuario inactivo o inexistente');
      req.user = user;
      next();
    })
    .catch(next);
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    if (!roles.includes(req.user.role)) throw new HttpError(403, 'No tienes permiso para esta acción');
    next();
  };
}
