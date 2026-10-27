import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';
import { ErrorBoundary } from '../ErrorBoundary';

export function AppLayout(): React.ReactElement {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-root">
      {/* WCAG 2.2 Skip Navigation Link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Header
        onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
        isMobileNavOpen={isMobileNavOpen}
      />

      <div className="app-body">
        <Sidebar />
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

        <main id="main-content" className="app-main" tabIndex={-1}>
          <div className="app-content">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
