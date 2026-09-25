import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePasswordChanged } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

const resources = {
  attendance: 'attendance', labels: 'label', bos: 'bos', bosq: 'bosq', 'improvement-ideas': 'improvementIdea', goals: 'goal',
} as const;
type ResourceName = keyof typeof resources;

async function isAllowed(user: AuthRequest['user'], targetId: string): Promise<boolean> {
  if (!user) return false;
  if (user.id === targetId) return true;
  if (user.role !== 'coordinator') return false;
  return Boolean(await prisma.user.findFirst({ where: { id: targetId, coordinatorId: user.id, role: 'operator' }, select: { id: true } }));
}

export const dataRouter = Router();
dataRouter.use(requireAuth, requirePasswordChanged);

for (const [path, model] of Object.entries(resources) as [ResourceName, string][]) {
  dataRouter.get(`/${path}`, async (request: AuthRequest, response) => {
    const userId = request.query.userId ? String(request.query.userId) : request.user!.id;
    if (!(await isAllowed(request.user, userId))) { response.status(403).json({ message: 'Você só pode consultar seus próprios dados ou de operadores da sua equipe.' }); return; }
    const delegate = (prisma as unknown as Record<string, { findMany: Function }>)[model];
    const rows = await delegate.findMany({ where: { userId }, orderBy: { date: 'desc' } });
    response.json(rows);
  });
  dataRouter.post(`/${path}`, async (request: AuthRequest, response) => {
    const data = { ...request.body, userId: request.user!.role === 'coordinator' && request.body.userId ? String(request.body.userId) : request.user!.id };
    if (!(await isAllowed(request.user, data.userId))) { response.status(403).json({ message: 'O recurso não pertence à sua equipe.' }); return; }
    const delegate = (prisma as unknown as Record<string, { create: Function }>)[model];
    response.status(201).json(await delegate.create({ data }));
  });
}