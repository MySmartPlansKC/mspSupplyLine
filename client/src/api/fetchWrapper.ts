export interface FetchWrapperOptions extends Omit<RequestInit, 'body'> {
  endpoint: string;
  body?: unknown;
  skipAuth?: boolean;
  skipSessionDrop?: boolean;
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
}

export class FetchWrapperError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'FetchWrapperError';
    this.status = status;
    this.data = data;
  }
}

type FetchWrapperHandlers = {
  onUnauthorized?: () => void;
};

let handlers: FetchWrapperHandlers = {};

const NETWORK_ERROR_MARKERS = [
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
  'ERR_NETWORK',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_RESET',
  'ERR_TIMED_OUT',
];


function buildUrl(endpoint: string): string {
  const cleaned = endpoint.replace(/^\/+/, '');
  const baseUrl = import.meta.env.VITE_BASE_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    return `/api/${cleaned}`;
  }
  return `${baseUrl}/api/${cleaned}`;
}

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().includes('application/json') ?? false;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type');
  if (isJsonContentType(contentType)) {
    return response.json();
  }
  const text = await response.text();
  return text;
}

function getErrorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object') {
    const possible = body as Record<string, unknown>;
    if (typeof possible.error === 'string') return possible.error;
    if (typeof possible.message === 'string') return possible.message;
  }
  if (typeof body === 'string' && body.trim().length > 0) {
    return body;
  }
  return `HTTP error ${status}`;
}

function getStorageToken(): string | null {
  return localStorage.getItem('sl_token');
}

function shouldLogRequest(method: string, path: string): boolean {
  if (!import.meta.env.DEV) return false;
  if (method !== 'GET') return true;
  const importantPaths = ['/api/auth', '/api/projects', '/api/health'];
  return importantPaths.some((value) => path.startsWith(value));
}

export function setFetchWrapperHandlers(next: FetchWrapperHandlers): void {
  handlers = next;
}

export async function fetchWrapper<T = unknown>({
  endpoint,
  body,
  skipAuth = false,
  skipSessionDrop = false,
  timeoutMs,
  headers,
  ...options
}: FetchWrapperOptions): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const url = buildUrl(endpoint);
  const requestHeaders = new Headers(headers ?? {});

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    requestBody = JSON.stringify(body);
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = getStorageToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  if (shouldLogRequest(method, new URL(url, window.location.origin).pathname)) {
    console.log(`[SupplyLine API] ${method} ${url}`);
  }

  const controller = new AbortController();
  const resolvedTimeoutMs = timeoutMs;
  const timeoutId =
    resolvedTimeoutMs !== undefined
      ? window.setTimeout(() => controller.abort(), resolvedTimeoutMs)
      : undefined;

  try {
    const response = await fetch(url, {
      ...options,
      method,
      headers: requestHeaders,
      body: requestBody,
      credentials: skipAuth ? 'same-origin' : 'include',
      signal: controller.signal,
    });

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const message = getErrorMessage(response.status, payload);
      if (response.status === 401 && !skipSessionDrop) {
        handlers.onUnauthorized?.();
      }
      throw new FetchWrapperError(message, response.status, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof FetchWrapperError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    const isNetworkError =
      timedOut ||
      (error instanceof TypeError &&
        NETWORK_ERROR_MARKERS.some((marker) => message.includes(marker)));

    if (isNetworkError && import.meta.env.DEV) {
      console.error('[SupplyLine API] request failed:', timedOut ? 'timeout' : message);
    }

    throw new FetchWrapperError(
      timedOut
        ? 'The server took too long to respond.'
        : isNetworkError
          ? 'Unable to reach the server. Confirm API is running.'
          : message,
      0,
      null
    );
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}
