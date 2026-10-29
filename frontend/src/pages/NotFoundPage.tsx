import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { EmptyState } from '../components/ui';

export function NotFoundPage(): React.ReactElement {
  return (
    <div style={{ padding: 'var(--space-8) 0', maxWidth: '36rem', margin: '0 auto' }}>
      <EmptyState
        icon={<FileQuestion size={40} style={{ color: 'var(--color-muted-foreground)' }} />}
        title="404 — Regulatory Route Not Found"
        description="The requested page does not exist or has been relocated within the AICTE Portal workspace. Please verify the URL or return to the main dashboard."
        action={
          <Link to="/" className="btn btn-primary btn-md">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Return to Workspace Overview</span>
          </Link>
        }
      />
    </div>
  );
}
