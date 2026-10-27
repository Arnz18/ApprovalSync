import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ApplicationProjection } from '../../applications/types';
import { ApplicationStatus, AllowedTransition } from '../../scrutiny/types';
import { ComplianceAssessmentResult } from '../../evc/types';

interface EvcCaseHeaderProps {
  application: ApplicationProjection;
  compliance?: ComplianceAssessmentResult | null;
  allowedTransitions: AllowedTransition[];
  onOpenTransitionModal: (transition: AllowedTransition) => void;
  onReevaluateCompliance: () => void;
  isEvaluating: boolean;
}

export const EvcCaseHeader: React.FC<EvcCaseHeaderProps> = ({
  application,
  compliance,
  allowedTransitions,
  onOpenTransitionModal,
  onReevaluateCompliance,
  isEvaluating,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/evc');
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.RECOMMENDED_FOR_EVC:
        return <Badge variant="primary">Recommended for EVC</Badge>;
      case ApplicationStatus.EVC_IN_PROGRESS:
        return <Badge variant="info">EVC in Progress</Badge>;
      case ApplicationStatus.RECOMMENDED_FOR_SHC:
        return <Badge variant="warning">Recommended for SHC Committee</Badge>;
      case ApplicationStatus.APPROVED:
        return <Badge variant="success">Approved</Badge>;
      case ApplicationStatus.REJECTED:
        return <Badge variant="error">Rejected</Badge>;
      case ApplicationStatus.UNDER_SCRUTINY:
        return <Badge variant="secondary">Under Scrutiny</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const requiresInspection =
    compliance?.infrastructureReview?.evcInspectionRecommended ||
    compliance?.summary?.requiresPhysicalInspection;

  return (
    <div
      className="scrutiny-case-header"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        marginBottom: 'var(--space-6)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Breadcrumb */}
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
              to="/evc"
              style={{ color: 'var(--color-muted-foreground)', textDecoration: 'none' }}
            >
              EVC Inspection Queue
            </Link>
          </li>
          <li>
            <ChevronRight size={12} aria-hidden="true" />
          </li>
          <li>
            <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>
              Inspection {application.applicationNumber}
            </span>
          </li>
        </ol>
      </nav>

      {/* Top Bar: Back link, Status and Re-evaluate Action */}
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
          leftIcon={<ArrowLeft size={16} aria-hidden="true" />}
        >
          Return to EVC Queue
        </Button>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}
        >
          {getStatusBadge(application.status)}

          {requiresInspection ? (
            <Badge
              variant="warning"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <AlertTriangle size={12} aria-hidden="true" />
              On-Site EVC Inspection Triggered
            </Badge>
          ) : compliance?.summary ? (
            <Badge
              variant="success"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ShieldCheck size={12} aria-hidden="true" />
              Heuristics Clear
            </Badge>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReevaluateCompliance}
            disabled={isEvaluating}
            title="Re-run automated DOC-06 compliance rules and infrastructure checks"
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={isEvaluating ? 'animate-spin' : ''}
              style={{ marginRight: 'var(--space-1)' }}
            />
            {isEvaluating ? 'Evaluating...' : 'Re-evaluate Compliance (DOC-06)'}
          </Button>
        </div>
      </div>

      {/* Main Identity Area */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
            }}
          >
            <h1
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                margin: 0,
                color: 'var(--color-foreground)',
              }}
            >
              {application.applicationNumber}
            </h1>
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-muted-foreground)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              Ref ID: {application.id}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-2)',
              flexWrap: 'wrap',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-muted-foreground)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Building size={16} aria-hidden="true" />
              <strong style={{ color: 'var(--color-foreground)' }}>
                {application.institution?.name || 'Institution Record'}
              </strong>
            </div>

            {application.institution?.district && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <MapPin size={14} aria-hidden="true" />
                <span>
                  {application.institution.district}, {application.institution.state}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Layers size={14} aria-hidden="true" />
              <span>Program: {application.programType}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Calendar size={14} aria-hidden="true" />
              <span>Academic Year: {application.academicYear}</span>
            </div>
          </div>
        </div>

        {/* Permitted Workflow Transition Actions Toolbar (BE-06 FSM) */}
        {allowedTransitions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 'var(--space-2)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-muted-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Authorized Workflow Actions
            </div>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-2)',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {allowedTransitions.map((t) => {
                let variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' =
                  'secondary';
                if (t.toStatus === ApplicationStatus.EVC_IN_PROGRESS) variant = 'primary';
                if (t.toStatus === ApplicationStatus.RECOMMENDED_FOR_SHC) variant = 'outline';
                if (t.toStatus === ApplicationStatus.APPROVED) variant = 'primary';
                if (t.toStatus === ApplicationStatus.REJECTED) variant = 'destructive';

                return (
                  <Button
                    key={t.toStatus}
                    variant={variant}
                    size="sm"
                    onClick={() => onOpenTransitionModal(t)}
                    title={t.description}
                  >
                    {t.toStatus === ApplicationStatus.EVC_IN_PROGRESS && 'Start EVC Inspection'}
                    {t.toStatus === ApplicationStatus.RECOMMENDED_FOR_SHC &&
                      'Escalate to SHC Committee'}
                    {t.toStatus === ApplicationStatus.APPROVED && 'Grant Statutory Approval'}
                    {t.toStatus === ApplicationStatus.REJECTED && 'Issue Final Rejection'}
                    {![
                      ApplicationStatus.EVC_IN_PROGRESS,
                      ApplicationStatus.RECOMMENDED_FOR_SHC,
                      ApplicationStatus.APPROVED,
                      ApplicationStatus.REJECTED,
                    ].includes(t.toStatus) && t.eventType}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
