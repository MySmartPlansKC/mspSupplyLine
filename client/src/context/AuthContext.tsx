import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fetchWrapper, setFetchWrapperHandlers } from '../api/fetchWrapper';
import LoadingIndicator from '../components/Common/LoadingIndicator';

const TOKEN_KEY = 'sl_token';
const VIEW_MODE_KEY = 'sl_view_mode';

type ViewMode = 'admin' | 'client';
const PLATFORM_ROLES = new Set(['MspAdmin', 'Admin', 'PIM']);

export interface SessionUser {
  userId: string;
  email: string;
  role: string;
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  preferredLocale: string | null;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: SessionUser;
}

interface SessionResponse {
  user: SessionUser;
}

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  initializing: boolean;
  authenticated: boolean;
  effectiveRole: string | null;
  viewMode: ViewMode;
  canImpersonateClientView: boolean;
  setViewMode: (mode: ViewMode) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readTokenFromStorage(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function flushLocalViewParameters(): void {
  localStorage.removeItem(VIEW_MODE_KEY);
}

function safeDecodeJwtPayload(token: string): Record<string, unknown> | null {
  const pieces = token.split('.');
  if (pieces.length !== 3) return null;
  try {
    const payload = atob(pieces[1]);
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function tokenLooksExpired(token: string): boolean {
  const payload = safeDecodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}

function restoreViewModeFromStorage(): ViewMode {
  const savedMode = localStorage.getItem(VIEW_MODE_KEY);
  if (savedMode === 'client' || savedMode === 'admin') {
    return savedMode;
  }
  return 'admin';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [viewMode, setViewModeState] = useState<ViewMode>('admin');

  const canImpersonateClientView = Boolean(user && PLATFORM_ROLES.has(user.role));
  const effectiveRole =
    user && canImpersonateClientView && viewMode === 'client'
      ? 'ClientAdmin'
      : user?.role ?? null;

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      if (!canImpersonateClientView) return;
      setViewModeState(mode);
      localStorage.setItem(VIEW_MODE_KEY, mode);
    },
    [canImpersonateClientView]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    flushLocalViewParameters();
    setToken(null);
    setUser(null);
    setViewModeState('admin');
    void fetchWrapper({
      endpoint: 'auth/logout',
      method: 'POST',
      skipAuth: true,
      skipSessionDrop: true,
    }).catch(() => undefined);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetchWrapper<LoginResponse>({
      endpoint: 'auth/login',
      method: 'POST',
      skipAuth: true,
      body: { email, password },
    });

    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
    setViewModeState('admin');
    localStorage.setItem(VIEW_MODE_KEY, 'admin');
  }, []);

  useEffect(() => {
    setFetchWrapperHandlers({ onUnauthorized: logout });
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      try {
        const stored = readTokenFromStorage();
        if (!stored || tokenLooksExpired(stored)) {
          if (stored) {
            localStorage.removeItem(TOKEN_KEY);
          }
          return;
        }

        setToken(stored);
        setViewModeState(restoreViewModeFromStorage());

        const session = await fetchWrapper<SessionResponse>({
          endpoint: 'auth/me',
          skipSessionDrop: true,
        });

        if (cancelled) return;
        setUser(session.user);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setViewModeState('admin');
      } finally {
        setInitializing(false);
      }
    }

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      initializing,
      authenticated: Boolean(user),
      effectiveRole,
      viewMode,
      canImpersonateClientView,
      setViewMode,
      login,
      logout,
    }),
    [
      user,
      token,
      initializing,
      effectiveRole,
      viewMode,
      canImpersonateClientView,
      setViewMode,
      login,
      logout,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {initializing ? (
        <LoadingIndicator placement="overlay" spinnerSize="md" />
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
