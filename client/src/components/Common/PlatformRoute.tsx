import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PLATFORM_ROLES = new Set(['MspAdmin', 'Admin', 'PIM']);

export default function PlatformRoute() {
  const { user, effectiveRole } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!effectiveRole || !PLATFORM_ROLES.has(effectiveRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
