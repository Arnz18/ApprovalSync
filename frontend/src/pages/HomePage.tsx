import React, { useState } from 'react';
import {
  FileText,
  ClipboardCheck,
  ShieldAlert,
  History,
  ArrowRight,
  Activity,
  FileCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { UserRole } from '../api/types';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Alert,
  ApplicationStatusBadge,
  VerificationStatusBadge,
  ComplianceSeverityBadge,
  SimulatedDataBadge,
} from '../components/ui';

export function HomePage(): React.ReactElement {
  const { user } = useAuth();
  const [alertDismissed, setAlertDismissed] = useState(false);
  const isInstitution = user?.role === UserRole.INSTITUTION_USER;
  const isScrutiny = user?.role === UserRole.SCRUTINY_OFFICER;
  const isRegional = user?.role === UserRole.REGIONAL_OFFICER;
  const isAdmin = user?.role === UserRole.SYSTEM_ADMIN;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Institutional Regulatory Workspace"
        description="AI-powered application validation, documentary authentication, and regulatory compliance decision support for AICTE."
        breadcrumbs={[{ label: 'Home' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {isInstitution && (
              <Link to="/applications" className="btn btn-primary btn-sm">
                <FileText size={14} aria-hidden="true" />
                <span>Application Intake Wizard</span>
              </Link>
            )}
            {isScrutiny && (
              <Link to="/scrutiny" className="btn btn-primary btn-sm">
                <ClipboardCheck size={14} aria-hidden="true" />
                <span>Scrutiny Desk</span>
              </Link>
            )}
            {isRegional && (
              <Link to="/evc" className="btn btn-primary btn-sm">
                <Activity size={14} aria-hidden="true" />
                <span>EVC Inspection Workspace</span>
              </Link>
            )}
            {isAdmin && (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                <Activity size={14} aria-hidden="true" />
                <span>Administrative Console</span>
              </Link>
            )}
            <Link to="/dashboard" className="btn btn-outline btn-sm">
              <Activity size={14} aria-hidden="true" />
              <span>Dashboards &amp; SLA</span>
            </Link>
            {isAdmin ? (
              <Link to="/audit" className="btn btn-outline btn-sm">
                <History size={14} aria-hidden="true" />
                <span>Audit Ledger</span>
              </Link>
            ) : (
              <Link to="/undertakings" className="btn btn-outline btn-sm">
                <FileCheck size={14} aria-hidden="true" />
                <span>Undertakings &amp; Leases</span>
              </Link>
            )}
          </div>
        }
      />

      {/* Regulatory Safety Advisory Banner */}
      {!alertDismissed && (
        <Alert
          variant="warning"
          title="Human Sovereignty & Regulatory Advisory Notice (ADR-004)"
          onClose={() => setAlertDismissed(true)}
        >
          The AICTE Portal operates as a decision-support platform. Automated OCR extraction,
          cross-document matching, and anomaly flags are purely advisory and never constitute
          official Council determinations. Final statutory approvals, deficiency issuances, and
          rejection orders require authorized human review roles.
        </Alert>
      )}

      {/* Metric Cards Grid */}
      <section aria-labelledby="kpi-metrics-title">
        <h2 id="kpi-metrics-title" className="sr-only">
          Platform Metrics Summary
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Card 1: Applications */}
          <Card>
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <CardDescription>Applications Dossier</CardDescription>
                <div
                  style={{
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                    padding: 'var(--space-1)',
                    borderRadius: 'var(--radius-md)',
                  }}
                  aria-hidden="true"
                >
                  <FileText size={18} />
                </div>
              </div>
              <CardTitle style={{ fontSize: '1.75rem', fontWeight: 700 }}>4 Active</CardTitle>
            </CardHeader>
            <CardContent style={{ paddingTop: '0' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-1)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <ApplicationStatusBadge status="DRAFT" />
                <ApplicationStatusBadge status="UNDER_SCRUTINY" />
                <ApplicationStatusBadge status="DEFICIENCY_ISSUED" />
              </div>
            </CardContent>
            <CardFooter
              style={{ fontSize: 'var(--font-size-xs)', justifyContent: 'space-between' }}
            >
              <span style={{ color: 'var(--color-muted-foreground)' }}>Institutional Dossier</span>
              <Link to={isInstitution ? "/applications" : "/dashboard"} style={{ fontWeight: 600 }}>
                View Details &rarr;
              </Link>
            </CardFooter>
          </Card>

          {/* Card 2: Scrutiny Queue */}
          <Card>
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <CardDescription>Scrutiny Officer Queue</CardDescription>
                <div
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    padding: 'var(--space-1)',
                    borderRadius: 'var(--radius-md)',
                  }}
                  aria-hidden="true"
                >
                  <ClipboardCheck size={18} />
                </div>
              </div>
              <CardTitle style={{ fontSize: '1.75rem', fontWeight: 700 }}>2 Pending</CardTitle>
            </CardHeader>
            <CardContent style={{ paddingTop: '0' }}>
              <p
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}
              >
                Authoritative review queue with human-in-the-loop regulatory compliance disposition.
              </p>
            </CardContent>
            <CardFooter
              style={{ fontSize: 'var(--font-size-xs)', justifyContent: 'space-between' }}
            >
              <span style={{ color: 'var(--color-muted-foreground)' }}>Regulatory Scrutiny</span>
              <Link to="/scrutiny" style={{ fontWeight: 600 }}>
                Open Queue &rarr;
              </Link>
            </CardFooter>
          </Card>

          {/* Card 3: Document Verification */}
          <Card>
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <CardDescription>Document AI &amp; Anomalies</CardDescription>
                <div
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    padding: 'var(--space-1)',
                    borderRadius: 'var(--radius-md)',
                  }}
                  aria-hidden="true"
                >
                  <ShieldAlert size={18} />
                </div>
              </div>
              <CardTitle style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                1 Advisory Flag
              </CardTitle>
            </CardHeader>
            <CardContent style={{ paddingTop: '0' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--space-1)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <ComplianceSeverityBadge severity="ADVISORY_FLAG" />
                <VerificationStatusBadge status="VERIFIED_MOCK" />
              </div>
            </CardContent>
            <CardFooter
              style={{ fontSize: 'var(--font-size-xs)', justifyContent: 'space-between' }}
            >
              <span style={{ color: 'var(--color-muted-foreground)' }}>Integrity Verification</span>
              <Link to="/verification" style={{ fontWeight: 600 }}>
                Inspect Findings &rarr;
              </Link>
            </CardFooter>
          </Card>

          {/* Card 4: Audit Ledger */}
          <Card>
            <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <CardDescription>Cryptographic Audit Ledger</CardDescription>
                <div
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: 'var(--space-1)',
                    borderRadius: 'var(--radius-md)',
                  }}
                  aria-hidden="true"
                >
                  <History size={18} />
                </div>
              </div>
              <CardTitle style={{ fontSize: '1.75rem', fontWeight: 700 }}>Chain Intact</CardTitle>
            </CardHeader>
            <CardContent style={{ paddingTop: '0' }}>
              <p
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-muted-foreground)' }}
              >
                Sequential SHA-256 hash chaining with database trigger mutation defense.
              </p>
            </CardContent>
            <CardFooter
              style={{ fontSize: 'var(--font-size-xs)', justifyContent: 'space-between' }}
            >
              <span style={{ color: 'var(--color-muted-foreground)' }}>Cryptographic Ledger</span>
              <Link to="/audit" style={{ fontWeight: 600 }}>
                Verify Proofs &rarr;
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Main Workflow Subsystems Section */}
      <section aria-labelledby="subsystems-heading">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div>
            <h2 id="subsystems-heading" style={{ fontSize: 'var(--font-size-xl)' }}>
              Core Regulatory Modules
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted-foreground)' }}>
              The portal architecture maps statutory AICTE review stages into specialized
              decision-support modules.
            </p>
          </div>
          <SimulatedDataBadge label="PROTOTYPE ARCHITECTURE" />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Module 1: Intake & Documents */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="primary">Intake &amp; Eligibility</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  Institution Portal
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                Application Intake &amp; Document Upload
              </CardTitle>
              <CardDescription>
                Dynamic category intake forms, streaming file validation (%PDF-, PNG, JPEG), and
                attachment metadata storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                <li>Draft auto-save with server-sanitized dynamic JSONB payloads</li>
                <li>Atomic submission with pessimistic row locks preventing race conditions</li>
                <li>Tenant-isolated storage adapters protecting cross-institution files</li>
              </ul>
            </CardContent>
            <CardFooter>
              {isInstitution ? (
                <Link to="/applications" className="btn btn-outline btn-sm">
                  View Intake Portal <ArrowRight size={14} />
                </Link>
              ) : (
                <Link to="/dashboard" className="btn btn-outline btn-sm">
                  View Application Overview <ArrowRight size={14} />
                </Link>
              )}
            </CardFooter>
          </Card>

          {/* Module 2: Scrutiny Queue */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="primary">Documentary Scrutiny</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  Scrutiny Officer
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                Scrutiny Queue &amp; FSM Transitions
              </CardTitle>
              <CardDescription>
                16-state deterministic FSM governing drafting, scrutiny, deficiency clarification,
                and committee escalation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                <li>Human justification comments enforced for all adverse transitions</li>
                <li>Terminal state locking on Approved, Rejected, and Withdrawn records</li>
                <li>Chronological timeline event auditing with server-verified timestamps</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/scrutiny" className="btn btn-outline btn-sm">
                Open Scrutiny Queue <ArrowRight size={14} />
              </Link>
            </CardFooter>
          </Card>

          {/* Module 3: Document AI & Verification */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="primary">Integrity &amp; Anomalies</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  Verification Engine
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                OCR Extraction &amp; Duplicate Detection
              </CardTitle>
              <CardDescription>
                Optical character recognition, bounding-box evidence tracking, 64-bit perceptual
                hashing, and PDF structural integrity checks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                <li>
                  Multi-tier duplicate detection: intra-app, same-institution, and cross-institution
                </li>
                <li>Template discrimination distinguishing standard government forms</li>
                <li>Active launch token &amp; metadata timeline inversion anomaly checks</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/verification" className="btn btn-outline btn-sm">
                Review Verification Engine <ArrowRight size={14} />
              </Link>
            </CardFooter>
          </Card>

          {/* Module 4: Rules Engine */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="primary">APH Handbook Norms</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  Regulatory Admin
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                APH Versioned Regulatory Rules
              </CardTitle>
              <CardDescription>
                Monotonic versioning, checklist templates, and deterministic date-interval
                resolution for AICTE handbook norms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                <li>Three-tier source classification: Verified, Unverified, Illustrative</li>
                <li>Overlap prevention rejecting conflicting published intervals</li>
                <li>Immutable published policies preventing retroactive policy alterations</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/rules" className="btn btn-outline btn-sm">
                Explore Rule Sets <ArrowRight size={14} />
              </Link>
            </CardFooter>
          </Card>

          {/* Module 5: Ground Inspection */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="default">Expert Visit Committee</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  EVC Inspection
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                EVC Scheduling &amp; Ground Inspection
              </CardTitle>
              <CardDescription>
                Conflict-of-interest declarations, randomized expert rosters, geo-tagged mobile
                inspection evidence, and committee reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                <li>Expert roster availability and jurisdiction assignment</li>
                <li>Time-stamped photographic evidence verification</li>
                <li>Standing Hearing Committee (SHC) escalation workflow</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/evc" className="btn btn-outline btn-sm">
                View EVC Workspace <ArrowRight size={14} />
              </Link>
            </CardFooter>
          </Card>

          {/* Module 6: Audit Proofs */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="default">Audit Ledger &amp; Proofs</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  Auditor Oversight
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                Audit Ledger &amp; Cryptographic Proofs
              </CardTitle>
              <CardDescription>
                Append-only SHA-256 event chaining with Merkle tree verification for independent
                oversight and dispute resolution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                <li>Tier 1 database trigger prohibiting UPDATE and DELETE on audit logs</li>
                <li>ON DELETE RESTRICT preserving audit records against application removal</li>
                <li>Cryptographic root verification detecting unauthorized database tampering</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/audit" className="btn btn-outline btn-sm">
                Inspect Audit Ledger <ArrowRight size={14} />
              </Link>
            </CardFooter>
          </Card>

          {/* Module 7: Role-Specific Dashboards & SLA */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="primary">SLA &amp; Operations</Badge>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  All Stakeholders
                </span>
              </div>
              <CardTitle style={{ fontSize: 'var(--font-size-base)', marginTop: 'var(--space-1)' }}>
                Role Dashboards, SLA &amp; Analytics
              </CardTitle>
              <CardDescription>
                Tailored regulatory cockpits for institutions, scrutiny officers, regional officers,
                and bureau heads with real-time SLA monitors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-muted-foreground)',
                  paddingLeft: '1.25rem',
                  lineHeight: 1.6,
                }}
              >
                <li>
                  Tenant-isolated institutional view &amp; deficiency response window countdown
                </li>
                <li>
                  Stage SLA timers with warning thresholds, breach detection, and pause controls
                </li>
                <li>
                  Three-tier escalation event history &amp; privileged database reconciliation
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/dashboard" className="btn btn-outline btn-sm">
                Open Dashboards &rarr;
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  );
}
