import { useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { flushLocalViewParameters, useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  const sessionLandingHandled = useRef(false);

  if (!user) {
    sessionLandingHandled.current = false;
    flushLocalViewParameters();
    return <Navigate to="/" replace />;
  }

  if (!sessionLandingHandled.current) {
    sessionLandingHandled.current = true;
    if (location.pathname !== '/dashboard') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}
