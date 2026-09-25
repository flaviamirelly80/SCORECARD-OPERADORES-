export type UserRole = 'operator' | 'coordinator';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  area?: string | null;
  mustChangePassword: boolean;
  coordinatorId?: string | null;
}

export interface AuthRequest extends Express.Request {
  user?: AuthUser;
}
