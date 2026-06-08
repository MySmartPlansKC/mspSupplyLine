import { NextFunction, Response } from 'express';
import { normalizeUserRole } from '../constants/userRoles';
import { extractAuthCookieToken } from '../utilities/authCookie';
import { verifyAccessToken } from '../utilities/jwt';
import { UnauthorizedError } from '../utilities/httpErrors';
import { AuthRequest, AuthenticatedUser, JwtPayload } from '../types/auth';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function extractAccessToken(req: AuthRequest): string | null {
  return extractBearerToken(req.headers.authorization) ?? extractAuthCookieToken(req);
}

function userFromJwtPayload(payload: JwtPayload): AuthenticatedUser | null {
  const role = normalizeUserRole(payload.role);
  if (!role) {
    return null;
  }

  return {
    userId: payload.sub,
    email: payload.email,
    role,
    clientId: payload.clientId,
    firstName: null,
    lastName: null,
    preferredLocale: null,
  };
}

export async function authenticateJwt(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      throw new UnauthorizedError();
    }

    const payload = verifyAccessToken(token);
    const user = userFromJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedError();
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
