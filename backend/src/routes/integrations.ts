import { Router, type Request, type Response, type NextFunction } from 'express';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { normalizeUsername } from '../services/authService.js';

function requireIntegrationAuth(request: Request, response: Response, next: NextFunction): void {
  const key = request.headers['x-api-key'];
  if (!config.apiKey || key !== config.apiKey) { response.status(401).json({ message: 'Integração não autenticada.' }); return; }
  next();
}

export const integrationsRouter = Router();
integrationsRouter.use(requireIntegrationAuth);
for (const resource of ['attendance', 'labels', 'bos', 'bosq', 'improvement-ideas', 'goals']) {
  integrationsRouter.post(`/${resource}`, async (request, response) => {
    const model = resource === 'improvement-ideas' ? 'improvementIdea' : resource === 'attendance' ? 'attendance' : resource === 'labels' ? 'label' : resource;
    const delegate = (prisma as unknown as Record<string, { create: Function }>)[model];
    const username = normalizeUsername(String(request.body.Usuario || request.body.username || ''));
    if (!username) { response.status(400).json({ message: 'Usuario é obrigatório.' }); return; }
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) { response.status(404).json({ message: 'Usuario não encontrado.' }); return; }
    const { Usuario: _usuario, username: _username, userId: _userId, ...payload } = request.body;
    response.status(201).json(await delegate.create({ data: { ...payload, userId: user.id } }));
  });
}