import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Layers, ShieldCheck } from 'lucide-react';
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
            <Badge variant="info">Regulatory Specification</Badge>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--color-muted-foreground)',
              }}
            >
              Module Spec {assignedChunk} — {dependencyStatus}
            </span>
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
              <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <CardTitle>Institutional Compliance Specification</CardTitle>
            </div>
            <CardDescription>
              This institutional module is registered within the regulatory compliance engine.
              Specifications and security verifications are active.
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
                Operational Security Standards:
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
                    }}
                  >
                    <ShieldCheck
                      size={12}
                      aria-hidden="true"
                      style={{ color: 'var(--color-secondary)' }}
                    />
                    Standard {dep}
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
                <Clock size={14} aria-hidden="true" />
                Engine Capabilities &amp; Norms:
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
              <strong>Authoritative Boundary:</strong> The AICTE Portal enforces strict regulatory
              separation. Decision support outputs are verified against published AICTE norms with
              full human sovereignty.
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
