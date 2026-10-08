import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { config } from '../config.js';
import type { AuthUser } from '../types.js';
import { signToken } from '../middleware/auth.js';

export const normalizeUsuario = (value: unknown): string => {
  if (value == null) return '';
  const usuario = String(value).trim().replace(/^(\d+)\.0+$/, '$1');
  return usuario.toUpperCase();
};
export const normalizeUsername = (username: string): string => normalizeUsuario(username).toLowerCase();
export const publicUser = (user: { id: string; username: string; name: string; role: string; area: string | null; jobTitle: string | null; shift: string | null; active: boolean; mustChangePassword: boolean; coordinatorId: string | null; }) => ({
  id: user.id, username: user.username, name: user.name, role: user.role, area: user.area, jobTitle: user.jobTitle, shift: user.shift, active: user.active, mustChangePassword: user.mustChangePassword, coordinatorId: user.coordinatorId,
});

export async function authenticate(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username: normalizeUsername(username) } });
  if (!user) throw new Error('Usuário ou senha inválidos.');
  if (!user.active) throw new Error('Usuário inativo. Procure sua coordenação.');
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new Error('Usuário ou senha inválidos.');
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  const authUser: AuthUser = { id: user.id, username: user.username, name: user.name, role: user.role as AuthUser['role'], area: user.area, mustChangePassword: user.mustChangePassword, coordinatorId: user.coordinatorId };
  return { token: signToken(authUser), user: publicUser(user) };
}

export async function hashDefaultPassword(): Promise<string> { return bcrypt.hash(config.defaultTempPassword, 12); }
export async function hashPassword(password: string): Promise<string> { return bcrypt.hash(password, 12); }

export function validateNewPassword(password: unknown, confirmation: unknown): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'A nova senha deve ter pelo menos 8 caracteres.';
  if (password !== confirmation) return 'A confirmação da senha não confere.';
  return null;
}