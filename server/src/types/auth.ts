import { Request } from 'express';
import type { UserRole } from '../constants/userRoles';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  clientId: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  preferredLocale: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  projectId?: number;
  file?: Express.Multer.File;
}
