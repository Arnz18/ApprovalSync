import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import { PreferencesProvider } from './context/PreferencesContext';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PreferencesProvider>
            <AppRoutes />
          </PreferencesProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
