import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import { hashDefaultPassword, hashPassword, normalizeUsername, publicUser, validateNewPassword } from '../services/authService.js';
import type { AuthRequest } from '../types.js';

export const usersRouter = Router();
usersRouter.use(requireAuth, requirePasswordChanged, requireRole('coordinator'));

usersRouter.get('/', async (request: AuthRequest, response) => {
  const where = request.user!.role === 'coordinator' ? { OR: [{ id: request.user!.id }, { coordinatorId: request.user!.id }] } : {};
  const users = await prisma.user.findMany({ where, orderBy: { name: 'asc' } });
  response.json(users.map(publicUser));
});
usersRouter.get('/:id', async (request: AuthRequest, response) => {
  const user = await prisma.user.findFirst({ where: { id: request.params.id, OR: [{ id: request.user!.id }, { coordinatorId: request.user!.id }] } });
  if (!user) { response.status(404).json({ message: 'Usuário não encontrado.' }); return; }
  response.json(publicUser(user));
});
usersRouter.post('/', async (request: AuthRequest, response) => {
  const body = request.body as Record<string, string | boolean | null | undefined>;
  const username = normalizeUsername(String(body.username || ''));
  if (!username || !body.name || !['operator', 'coordinator'].includes(String(body.role))) { response.status(400).json({ message: 'username, name e role são obrigatórios.' }); return; }
  const coordinatorId = String(body.coordinatorId || request.user!.id);
  if (String(body.role) === 'operator') {
    const coordinator = await prisma.user.findFirst({ where: { id: coordinatorId, role: 'coordinator', active: true }, select: { id: true } });
    if (!coordinator) { response.status(400).json({ message: 'Coordenador responsável inválido.' }); return; }
  }
  const user = await prisma.user.create({ data: { username, name: String(body.name), role: String(body.role), jobTitle: body.jobTitle ? String(body.jobTitle) : null, area: body.area ? String(body.area) : null, shift: body.shift ? String(body.shift) : null, coordinatorId: String(body.role) === 'operator' ? coordinatorId : null, active: body.active !== false, passwordHash: await hashDefaultPassword(), mustChangePassword: true } });
  response.status(201).json(publicUser(user));
});
usersRouter.put('/:id', async (request: AuthRequest, response) => {
  const existing = await prisma.user.findFirst({ where: { id: request.params.id, OR: [{ id: request.user!.id }, { coordinatorId: request.user!.id }] } });
  if (!existing) { response.status(404).json({ message: 'Usuário não encontrado.' }); return; }
  const body = request.body as Record<string, unknown>;
  const user = await prisma.user.update({ where: { id: existing.id }, data: { name: body.name === undefined ? undefined : String(body.name), jobTitle: body.jobTitle === undefined ? undefined : String(body.jobTitle), area: body.area === undefined ? undefined : String(body.area), shift: body.shift === undefined ? undefined : String(body.shift), active: body.active === undefined ? undefined : Boolean(body.active) } });
  response.json(publicUser(user));
});
usersRouter.post('/:id/reset-password', async (request: AuthRequest, response) => {
  const existing = await prisma.user.findFirst({ where: { id: request.params.id, coordinatorId: request.user!.id } });
  if (!existing) { response.status(404).json({ message: 'Operador não encontrado na sua equipe.' }); return; }
  await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: await hashDefaultPassword(), mustChangePassword: true } });
  response.status(204).send();
});