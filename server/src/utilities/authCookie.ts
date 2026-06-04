import { Request, Response } from 'express';

export const AUTH_COOKIE_NAME = 'sl_token';

function maxAgeSeconds(expiresAt: Date): number {
  const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return Math.max(seconds, 0);
}

export function extractAuthCookieToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const segment of header.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed.startsWith(`${AUTH_COOKIE_NAME}=`)) continue;
    const raw = trimmed.slice(AUTH_COOKIE_NAME.length + 1);
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return null;
}

export function setAuthCookie(res: Response, token: string, expiresAt: Date): void {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds(expiresAt)}`,
  ];
  if (secure) {
    parts.push('Secure');
  }
  res.append('Set-Cookie', parts.join('; '));
}

export function clearAuthCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) {
    parts.push('Secure');
  }
  res.append('Set-Cookie', parts.join('; '));
}
