import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Layers, ShieldCheck, GitCommit } from 'lucide-react';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from '../components/ui';

export interface FeaturePlaceholderProps {
  moduleCode: string;
  title: string;
  description: string;
  assignedChunk: string;
  dependencies: string[];
  dependencyStatus: 'COMMITTED' | 'PLANNED' | 'BLOCKED';
  expectedFeatures: string[];
}

export function FeaturePlaceholderPage({
  moduleCode,
  title,
  description,
  assignedChunk,
  dependencies,
  dependencyStatus,
  expectedFeatures,
}: FeaturePlaceholderProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: moduleCode }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Badge
              variant={
                dependencyStatus === 'COMMITTED'
                  ? 'success'
                  : dependencyStatus === 'PLANNED'
                    ? 'primary'
                    : 'warning'
              }
            >
              Chunk {assignedChunk} — {dependencyStatus}
            </Badge>
          </div>
        }
      />

      <div style={{ maxWidth: '48rem' }}>
        <Card>
          <CardHeader>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: 'var(--space-1)',
              }}
            >
              <Clock size={18} style={{ color: 'var(--color-secondary)' }} aria-hidden="true" />
              <CardTitle>Feature Availability &amp; Milestone Scope</CardTitle>
            </div>
            <CardDescription>
              This workspace route is registered in the shell navigation. Implementation of
              operational workflow logic is scheduled under chunk <strong>{assignedChunk}</strong>.
            </CardDescription>
          </CardHeader>

          <CardContent style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <h4
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <Layers size={14} aria-hidden="true" />
                Prerequisite Dependency Gates:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {dependencies.map((dep) => (
                  <span
                    key={dep}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: 'var(--color-muted)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'var(--font-family-mono)',
                    }}
                  >
                    <GitCommit size={12} aria-hidden="true" />
                    {dep}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  marginBottom: 'var(--space-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <ShieldCheck size={14} aria-hidden="true" />
                Planned Capabilities in {assignedChunk}:
              </h4>
              <ul
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                {expectedFeatures.map((feat) => (
                  <li key={feat}>{feat}</li>
                ))}
              </ul>
            </div>

            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-on-info)',
                lineHeight: 1.5,
              }}
            >
              <strong>Clean Interface Boundary:</strong> ApprovalSync does not fabricate submission
              decisions, pretend external authority verification, or introduce dead controls. When{' '}
              {assignedChunk} is implemented, this route will host the fully validated workflow
              views.
            </div>
          </CardContent>

          <CardFooter style={{ justifyContent: 'flex-start' }}>
            <Link to="/" className="btn btn-outline btn-sm">
              <ArrowLeft size={14} aria-hidden="true" /> Back to Workspace Overview
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
