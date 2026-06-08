import { NextFunction, Response } from 'express';
import { isPlatformRole } from '../constants/userRoles';
import { AuthRequest } from '../types/auth';
import { ForbiddenError, UnauthorizedError } from '../utilities/httpErrors';

export function requirePlatformRole(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!isPlatformRole(req.user.role)) {
      throw new ForbiddenError('Platform role required');
    }

    next();
  } catch (error) {
    next(error);
  }
}
