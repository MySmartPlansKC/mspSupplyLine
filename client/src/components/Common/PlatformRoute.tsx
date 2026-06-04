import { Navigate, Outlet } from 'react-router-dom';
import { flushLocalViewParameters, useAuth } from '../../context/AuthContext';

const PLATFORM_ROLES = new Set(['MspAdmin', 'Admin', 'PIM']);

export default function PlatformRoute() {
  const { user, effectiveRole, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  if (!user) {
    flushLocalViewParameters();
    return <Navigate to="/login" replace />;
  }

  if (!effectiveRole || !PLATFORM_ROLES.has(effectiveRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
