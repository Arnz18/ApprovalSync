import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Sidebar } from './Sidebar';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps): React.ReactElement | null {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="mobile-nav-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="mobile-nav-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="header-logo-icon" style={{ width: '1.75rem', height: '1.75rem' }}>
              <ShieldCheck size={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
              ApprovalSync
            </span>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close menu"
            style={{ padding: '4px' }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Sidebar onNavClick={onClose} />
        </div>
      </div>
    </div>
  );
}
