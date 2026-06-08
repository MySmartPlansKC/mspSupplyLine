import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/Feedback/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { DevLoadingPreviewProvider } from './context/DevLoadingPreviewContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthProvider>
          <DevLoadingPreviewProvider>
            <App />
          </DevLoadingPreviewProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
