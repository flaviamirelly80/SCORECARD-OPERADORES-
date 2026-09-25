import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AuthRequest, AuthUser, UserRole } from '../types.js';

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword }, config.jwtSecret, { expiresIn: '8h' });
}

export function requireAuth(request: AuthRequest, response: Response, next: NextFunction): void {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) { response.status(401).json({ message: 'Autenticação necessária.' }); return; }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    request.user = { id: String(payload.sub), username: String(payload.username), name: '', role: payload.role as UserRole, mustChangePassword: payload.mustChangePassword === true };
    next();
  } catch { response.status(401).json({ message: 'Sessão inválida ou expirada.' }); }
}

export function requirePasswordChanged(request: AuthRequest, response: Response, next: NextFunction): void {
  if (request.user?.mustChangePassword) { response.status(403).json({ message: 'Altere sua senha antes de acessar o portal.', mustChangePassword: true }); return; }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (request: AuthRequest, response: Response, next: NextFunction): void => {
    if (!request.user || !roles.includes(request.user.role)) { response.status(403).json({ message: 'Acesso não permitido.' }); return; }
    next();
  };
