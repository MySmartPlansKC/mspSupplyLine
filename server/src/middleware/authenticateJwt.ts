import { NextFunction, Response } from 'express';
import { extractAuthCookieToken } from '../utilities/authCookie';
import { verifyAccessToken } from '../utilities/jwt';
import { UnauthorizedError } from '../utilities/httpErrors';
import { UserRepository } from '../repositories/UserRepository';
import { AuthRequest } from '../types/auth';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

function extractAccessToken(req: AuthRequest): string | null {
  return extractBearerToken(req.headers.authorization) ?? extractAuthCookieToken(req);
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
    const user = await UserRepository.findById(payload.sub);
    if (!user || !user.IsActive) {
      throw new UnauthorizedError();
    }

    req.user = {
      userId: user.UserID,
      email: user.Email,
      role: user.Role,
      clientId: user.ClientID,
      firstName: user.FirstName,
      lastName: user.LastName,
      preferredLocale: user.PreferredLocale,
    };

    next();
  } catch (error) {
    next(error);
  }
}
