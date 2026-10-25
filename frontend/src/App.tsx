import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth';
import { AppRoutes } from './routes/AppRoutes';

export default function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
