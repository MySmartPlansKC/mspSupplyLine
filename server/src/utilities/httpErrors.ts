import { Response } from 'express';
import { isRetryableConnectionError } from './dbConnectionErrors';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

interface MysqlDuplicateEntryError {
  code?: string;
  errno?: number;
}

/** Detects MariaDB/MySQL unique-key collisions (ER_DUP_ENTRY / errno 1062). */
export function isDuplicateEntryError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as MysqlDuplicateEntryError;
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062;
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);

  if (isRetryableConnectionError(error)) {
    res.status(503).json({
      error: 'Database is temporarily unavailable. Wait a moment and try again.',
    });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
