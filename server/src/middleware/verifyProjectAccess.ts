import { NextFunction, Response } from 'express';
import { isPlatformRole } from '../constants/userRoles';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { AuthRequest } from '../types/auth';
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '../utilities/httpErrors';

function parseProjectId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function resolveProjectId(req: AuthRequest): number | null {
  return (
    parseProjectId(req.params.projectId) ??
    parseProjectId(req.body?.projectId) ??
    parseProjectId(req.query.projectId)
  );
}

export async function verifyProjectAccess(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const projectId = resolveProjectId(req);
    if (projectId === null) {
      throw new BadRequestError('Project context required');
    }

    const exists = await ProjectRepository.existsById(projectId);
    if (!exists) {
      throw new ForbiddenError('You do not have access to this project');
    }

    if (isPlatformRole(req.user.role)) {
      req.projectId = projectId;
      next();
      return;
    }

    const hasAccess = await ProjectRepository.hasUserProjectAccess(
      req.user.userId,
      projectId
    );

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this project');
    }

    req.projectId = projectId;
    next();
  } catch (error) {
    next(error);
  }
}
