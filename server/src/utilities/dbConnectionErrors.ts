/** MariaDB / mysql2 errors that usually mean a stale or dropped connection. */
const RETRYABLE_CONNECTION_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_QUIT',
]);

export function isRetryableConnectionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { code?: string; fatal?: boolean };
  if (candidate.code && RETRYABLE_CONNECTION_CODES.has(candidate.code)) {
    return true;
  }

  return candidate.fatal === true;
}

export async function withConnectionRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isRetryableConnectionError(error)) {
      throw error;
    }
    return operation();
  }
}
