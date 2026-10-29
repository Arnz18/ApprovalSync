import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  BookOpen,
  Clock,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ApplicationProjection } from '../../applications/types';
import { ApplicationStatus } from '../../api/types';

interface CaseHeaderProps {
  application: ApplicationProjection;
  onRefresh: () => void;
  isLoading: boolean;
}

export const CaseHeader: React.FC<CaseHeaderProps> = ({ application, onRefresh, isLoading }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/scrutiny');
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return <Badge variant="success">Approved</Badge>;
      case ApplicationStatus.REJECTED:
        return <Badge variant="error">Rejected</Badge>;
      case ApplicationStatus.DEFICIENCY_ISSUED:
        return <Badge variant="warning">Deficiency Notice Issued</Badge>;
      case ApplicationStatus.UNDER_SCRUTINY:
        return <Badge variant="primary">Under Scrutiny</Badge>;
      case ApplicationStatus.SUBMITTED:
        return <Badge variant="secondary">Submitted</Badge>;
      case ApplicationStatus.RESUBMITTED:
        return <Badge variant="warning">Resubmitted</Badge>;
      case ApplicationStatus.RECOMMENDED_FOR_EVC:
        return <Badge variant="primary">Recommended for EVC</Badge>;
      case ApplicationStatus.WITHDRAWN:
        return <Badge variant="default">Withdrawn</Badge>;
      case ApplicationStatus.DRAFT:
      default:
        return <Badge variant="default">Draft</Badge>;
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Pending formal submission';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(isoString);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        marginBottom: 'var(--space-4)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-3)' }}>
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-muted-foreground)',
          }}
        >
          <li>
            <Link to="/" style={{ color: 'var(--color-muted-foreground)', textDecoration: 'none' }}>
              Workspace
            </Link>
          </li>
          <li>
            <ChevronRight size={12} aria-hidden="true" />
          </li>
          <li>
            <Link
              to="/scrutiny"
              style={{ color: 'var(--color-muted-foreground)', textDecoration: 'none' }}
            >
              Scrutiny Queue
            </Link>
          </li>
          <li>
            <ChevronRight size={12} aria-hidden="true" />
          </li>
          <li>
            <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>
              Case {application.applicationNumber}
            </span>
          </li>
        </ol>
      </nav>

      {/* Top action row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border-subtle)',
          paddingBottom: 'var(--space-3)',
        }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBack}
          aria-label="Return to previous queue view"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Back to Scrutiny Queue</span>
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh case details"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
            <span>Refresh Case Data</span>
          </Button>
        </div>
      </div>

      {/* Main identity row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-family-mono, monospace)',
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 700,
                color: 'var(--color-primary)',
                margin: 0,
              }}
            >
              {application.applicationNumber}
            </h1>
            {getStatusBadge(application.status)}
          </div>

          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
              marginTop: 'var(--space-1)',
            }}
          >
            Regulatory Docket ID:{' '}
            <span style={{ fontFamily: 'var(--font-family-mono, monospace)' }}>
              {application.id.slice(0, 8)}...{application.id.slice(-4)}
            </span>
          </div>
        </div>

        {/* Institution Info Card */}
        <div
          style={{
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-4)',
            minWidth: 'min(100%, 260px)',
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontWeight: 600,
              color: 'var(--color-foreground)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <Building2 size={16} aria-hidden="true" style={{ color: 'var(--color-primary)' }} />
            <span>{application.institution?.name || 'Affiliated Institution'}</span>
          </div>

          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-muted-foreground)',
              marginTop: '2px',
            }}
          >
            <span>
              Registration: {application.institution?.registrationNumber || 'AICTE-REG-001'}
            </span>
            {application.institution?.state && <span> • {application.institution.state}</span>}
          </div>
        </div>
      </div>

      {/* Metadata strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-5)',
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border-subtle)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-muted-foreground)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} aria-hidden="true" />
          <span>
            Academic Year:{' '}
            <strong style={{ color: 'var(--color-foreground)' }}>{application.academicYear}</strong>
          </span>
        </span>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <BookOpen size={14} aria-hidden="true" />
          <span>
            Discipline:{' '}
            <strong style={{ color: 'var(--color-foreground)' }}>{application.programType}</strong>
          </span>
        </span>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={14} aria-hidden="true" />
          <span>
            Submitted:{' '}
            <strong style={{ color: 'var(--color-foreground)' }}>
              {formatDate(application.submittedAt || application.createdAt)}
            </strong>
          </span>
        </span>
      </div>
    </div>
  );
};
