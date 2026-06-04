import { NextFunction, Response } from 'express';
import { UserRole } from '../constants/userRoles';
import { AuthRequest } from '../types/auth';
import { ForbiddenError, UnauthorizedError } from '../utilities/httpErrors';

export function requireMspAdmin(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (req.user.role !== UserRole.MspAdmin) {
      throw new ForbiddenError('MspAdmin role required');
    }

    next();
  } catch (error) {
    next(error);
  }
}
