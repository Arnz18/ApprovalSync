import React from 'react';
import { Clock, MessageSquare, ArrowRight, User } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Loading';
import { EmptyState } from '../ui/EmptyState';
import { WorkflowTimelineEvent } from '../../scrutiny/types';
import { ApplicationStatus } from '../../api/types';
import { formatRoleName } from '../../auth/roleRoutes';

interface CaseTimelineViewProps {
  events: WorkflowTimelineEvent[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export const CaseTimelineView: React.FC<CaseTimelineViewProps> = ({ events, isLoading }) => {
  if (isLoading && events.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
        <Spinner size="md" label="Loading chronological case audit timeline..." />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={40} />}
        title="No Timeline Events Recorded"
        description="This application has not undergone any workflow transitions yet."
      />
    );
  }

  const getNodeVariantClass = (toStatus: ApplicationStatus) => {
    switch (toStatus) {
      case ApplicationStatus.APPROVED:
        return 'is-approved';
      case ApplicationStatus.REJECTED:
        return 'is-rejected';
      case ApplicationStatus.DEFICIENCY_ISSUED:
        return 'is-deficiency';
      default:
        return '';
    }
  };

  const formatEventDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formatEventType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="case-timeline" role="region" aria-label="Workflow timeline audit history">
      {events.map((event) => {
        const nodeClass = getNodeVariantClass(event.toStatus);
        return (
          <div key={event.id} className="case-timeline-item">
            <div className={`case-timeline-node ${nodeClass}`} aria-hidden="true" />
            <div className="case-timeline-content">
              {/* Event Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: 'var(--color-foreground)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    {formatEventType(event.eventType)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Badge variant="default" style={{ fontSize: '11px' }}>
                      {event.fromStatus}
                    </Badge>
                    <ArrowRight
                      size={12}
                      aria-hidden="true"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    />
                    <Badge variant="primary" style={{ fontSize: '11px' }}>
                      {event.toStatus}
                    </Badge>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Clock size={12} aria-hidden="true" />
                  <time dateTime={event.createdAt}>{formatEventDate(event.createdAt)}</time>
                </div>
              </div>

              {/* Actor & Role */}
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: event.comment ? 'var(--space-2)' : '0',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} aria-hidden="true" />
                  <span>{formatRoleName(event.actorRole)}</span>
                </span>
                {event.correlationId && (
                  <span
                    style={{
                      fontFamily: 'var(--font-family-mono, monospace)',
                      fontSize: '11px',
                      color: 'var(--color-muted-foreground)',
                    }}
                  >
                    CID: {event.correlationId.slice(0, 8)}
                  </span>
                )}
              </div>

              {/* Comment / Justification */}
              {event.comment && (
                <div
                  style={{
                    marginTop: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: 'var(--color-background)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--color-primary)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-foreground)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                  }}
                >
                  <MessageSquare
                    size={14}
                    aria-hidden="true"
                    style={{
                      color: 'var(--color-muted-foreground)',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                      Officer Justification / Notice:
                    </span>
                    <span>{event.comment}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
