import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

export function networkAccessMiddleware(request: Request, response: Response, next: NextFunction): void {
  if (!config.networkRestrictionEnabled) { next(); return; }
  const address = request.ip || request.socket.remoteAddress || '';
  const allowed = config.allowedNetworks.some((network) => address === network || address.startsWith(`${network}/`));
  if (!allowed) { response.status(403).json({ message: 'Acesso disponível somente pela rede corporativa ou VPN autorizada.' }); return; }
  next();
}