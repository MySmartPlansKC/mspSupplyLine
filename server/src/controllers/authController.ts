import { Response } from 'express';
import { AuthRequest } from '../types/auth';
import { UserRepository } from '../repositories/UserRepository';
import { clearAuthCookie, setAuthCookie } from '../utilities/authCookie';
import { verifyPassword } from '../utilities/password';
import { signAccessToken } from '../utilities/jwt';
import {
  BadRequestError,
  UnauthorizedError,
  sendError,
} from '../utilities/httpErrors';

function toSessionUser(user: {
  UserID: string;
  Email: string;
  Role: string;
  ClientID: string;
  FirstName: string | null;
  LastName: string | null;
  PreferredLocale: string | null;
}) {
  return {
    userId: user.UserID,
    email: user.Email,
    role: user.Role,
    clientId: user.ClientID,
    firstName: user.FirstName,
    lastName: user.LastName,
    preferredLocale: user.PreferredLocale,
  };
}

const BLOCKED_CLIENT_STATUSES = new Set(['Suspended', 'Cancelled']);

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await UserRepository.findByEmail(email);
    if (!user || !user.IsActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordValid = await verifyPassword(password, user.PasswordHash);
    if (!passwordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accountStatus = await UserRepository.getClientAccountStatus(
      user.ClientID
    );
    if (!accountStatus) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (BLOCKED_CLIENT_STATUSES.has(accountStatus)) {
      throw new UnauthorizedError('Account is not active');
    }

    const { token, expiresAt } = signAccessToken({
      sub: user.UserID,
      email: user.Email,
      role: user.Role,
      clientId: user.ClientID,
    });

    setAuthCookie(res, token, expiresAt);

    res.json({
      token,
      expiresAt: expiresAt.toISOString(),
      user: toSessionUser(user),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function getSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    res.json({ user: req.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function logout(_req: AuthRequest, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.status(204).send();
}
