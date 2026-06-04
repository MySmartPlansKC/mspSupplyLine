import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { flushLocalViewParameters, useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return null;
  }

  if (!user) {
    flushLocalViewParameters();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
