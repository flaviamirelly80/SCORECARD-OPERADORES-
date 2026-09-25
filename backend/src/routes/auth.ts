import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { authenticate, hashPassword, publicUser, validateNewPassword } from '../services/authService.js';
import type { AuthRequest } from '../types.js';

export const authRouter = Router();

authRouter.post('/login', async (request, response) => {
  try { response.json(await authenticate(String(request.body.username || ''), String(request.body.password || ''))); }
  catch (error) { response.status(401).json({ message: error instanceof Error ? error.message : 'Falha no login.' }); }
});

authRouter.post('/change-password', requireAuth, async (request: AuthRequest, response) => {
  const { currentPassword, password, confirmation } = request.body as Record<string, unknown>;
  const error = validateNewPassword(password, confirmation);
  if (error) { response.status(400).json({ message: error }); return; }
  const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
  if (!user) { response.status(404).json({ message: 'Usuário não encontrado.' }); return; }
  if (!user.mustChangePassword && (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.passwordHash)))) { response.status(400).json({ message: 'Senha atual inválida.' }); return; }
  const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password as string), mustChangePassword: false } });
  response.json({ user: publicUser(updated) });
});