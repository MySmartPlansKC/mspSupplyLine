import jwt, { SignOptions } from 'jsonwebtoken';
import type { JwtPayload } from '../types/auth';
import { UnauthorizedError } from './httpErrors';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function getExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? '8h';
}

export interface SignedToken {
  token: string;
  expiresAt: Date;
}

export function signAccessToken(payload: JwtPayload): SignedToken {
  const secret = getSecret();
  const expiresIn = getExpiresIn();
  const token = jwt.sign(payload, secret, {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  });

  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string' || !decoded.exp) {
    throw new Error('Failed to decode signed JWT expiration');
  }

  return {
    token,
    expiresAt: new Date(decoded.exp * 1000),
  };
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === 'string') {
      throw new UnauthorizedError();
    }

    const { sub, email, role, clientId } = decoded as JwtPayload;
    if (!sub || !email || !role || !clientId) {
      throw new UnauthorizedError();
    }

    return { sub, email, role, clientId };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError();
  }
}
