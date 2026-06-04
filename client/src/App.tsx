import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/Common/ProtectedRoute';
import PlatformRoute from './components/Common/PlatformRoute';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import CatalogView from './views/CatalogView';
import StagingQueueView from './views/StagingQueueView';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/projects/:projectId/catalog" element={<CatalogView />} />
        <Route element={<PlatformRoute />}>
          <Route path="/projects/:projectId/staging" element={<StagingQueueView />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
