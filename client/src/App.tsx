import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/Common/ProtectedRoute';
import PlatformRoute from './components/Common/PlatformRoute';
import { useAuth } from './context/AuthContext';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import CatalogView from './views/CatalogView';
import StagingQueueView from './views/StagingQueueView';

function LoginEntry() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LoginView />;
}

/** Legacy path; preserves `state.from` for post-login redirect. */
function LoginAlias() {
  const location = useLocation();
  return <Navigate to="/" replace state={location.state} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginEntry />} />
      <Route path="/login" element={<LoginAlias />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/projects/:projectId/catalog" element={<CatalogView />} />
        <Route element={<PlatformRoute />}>
          <Route path="/projects/:projectId/staging" element={<StagingQueueView />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
