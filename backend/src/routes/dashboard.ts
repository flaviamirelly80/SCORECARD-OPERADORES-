import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, requirePasswordChanged, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../types.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/me/dashboard', requirePasswordChanged, async (request: AuthRequest, response) => {
  const userId = request.user!.id;
  const [user, attendance, labels, bos, bosq, ideas, goals] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, name: true, role: true, jobTitle: true, area: true, shift: true, mustChangePassword: true } }),
    prisma.attendance.findMany({ where: { userId }, orderBy: { date: 'desc' } }), prisma.label.findMany({ where: { userId }, orderBy: { date: 'desc' } }), prisma.bos.findMany({ where: { userId }, orderBy: { date: 'desc' } }), prisma.bosq.findMany({ where: { userId }, orderBy: { date: 'desc' } }), prisma.improvementIdea.findMany({ where: { userId }, orderBy: { date: 'desc' } }), prisma.goal.findMany({ where: { userId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
  ]);
  response.json({ profile: user, attendance, labels, bos, bosq, ideas, goals });
});

dashboardRouter.get('/team/dashboard', requirePasswordChanged, requireRole('coordinator'), async (request: AuthRequest, response) => {
  const operators = await prisma.user.findMany({ where: { coordinatorId: request.user!.id, role: 'operator' }, select: { id: true, username: true, name: true, jobTitle: true, area: true, shift: true, active: true, attendance: true, labels: true, bos: true, bosq: true, improvementIdeas: true, goals: true }, orderBy: { name: 'asc' } });
  response.json({ coordinatorId: request.user!.id, operators });
});