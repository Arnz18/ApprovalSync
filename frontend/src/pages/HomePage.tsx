import React, { useState } from 'react';
import {
  FileText,
  ClipboardCheck,
  ShieldAlert,
  History,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Sparkles,
  ArrowRight,
  Activity,
  FileCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Alert,
  Modal,
  FormField,
  Input,
  ApplicationStatusBadge,
  VerificationStatusBadge,
  ComplianceSeverityBadge,
  SimulatedDataBadge,
} from '../components/ui';

export function HomePage(): React.ReactElement {
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [demoInputVal, setDemoInputVal] = useState('AICTE-2026-ENGG-0042');
  const [demoInputError, setDemoInputError] = useState('');
  const [alertDismissed, setAlertDismissed] = useState(false);

  function handleValidateDemoInput() {
    if (!demoInputVal.trim()) {
      setDemoInputError('Application identifier is required.');
    } else if (!demoInputVal.startsWith('AICTE-')) {
      setDemoInputError('Must start with prefix "AICTE-"');
    } else {
      setDemoInputError('');
      setIsTestModalOpen(true);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Institutional Regulatory Workspace"
        description="AI-powered application validation, documentary authentication, and regulatory compliance decision support for AICTE."
        breadcrumbs={[{ label: 'Home' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link to="/dashboard" className="btn btn-outline btn-sm">
              <Activity size={14} aria-hidden="true" />
              <span>Dashboards &amp; SLA</span>
            </Link>
            <Link to="/undertakings" className="btn btn-outline btn-sm">
              <FileCheck size={14} aria-hidden="true" />
              <span>Undertakings &amp; Leases</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sliders size={14} />}
              onClick={() => setIsTestModalOpen(true)}
            >
              Test Design Modal
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ExternalLink size={14} />}
              onClick={() => window.open('/api/v1/health', '_blank')}
            >
              API Health Probe
            </Button>
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
          ApprovalSync operates as a decision-support platform. Automated OCR extraction,
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
              <span style={{ color: 'var(--color-muted-foreground)' }}>Module BE-04 / FE-03</span>
              <Link to="/applications" style={{ fontWeight: 600 }}>
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
                FSM transition workflow (BE-06) with pessimistic row locks and human-in-the-loop
                disposition.
              </p>
            </CardContent>
            <CardFooter
              style={{ fontSize: 'var(--font-size-xs)', justifyContent: 'space-between' }}
            >
              <span style={{ color: 'var(--color-muted-foreground)' }}>Module BE-06 / FE-04</span>
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
              <span style={{ color: 'var(--color-muted-foreground)' }}>Module DOC-04</span>
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
              <span style={{ color: 'var(--color-muted-foreground)' }}>Module BE-02 / BE-07</span>
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
              ApprovalSync architecture maps statutory AICTE review stages into specialized
              decision-support modules.
            </p>
          </div>
          <SimulatedDataBadge label="PROTOTYPE ARCHITECTURE" />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {/* Module 1: Intake & Documents */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="primary">Module FE-03 / BE-04</Badge>
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
              <Link to="/applications" className="btn btn-outline btn-sm">
                View Intake Portal <ArrowRight size={14} />
              </Link>
            </CardFooter>
          </Card>

          {/* Module 2: Scrutiny Queue */}
          <Card>
            <CardHeader>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Badge variant="primary">Module FE-04 / BE-06</Badge>
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
                <Badge variant="primary">Module DOC-01..04</Badge>
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
                <Badge variant="primary">Module BE-05</Badge>
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
                <Badge variant="default">Module FE-06</Badge>
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
                <Badge variant="default">Module BE-07 / FE-07</Badge>
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
                <Badge variant="primary">Module FE-05 / BE-08</Badge>
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

      {/* Interactive Design System Sandbox */}
      <section aria-labelledby="design-sandbox-title">
        <Card
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <CardTitle id="design-sandbox-title" style={{ fontSize: 'var(--font-size-base)' }}>
                Design System Interactive Validation
              </CardTitle>
            </div>
            <CardDescription>
              Test accessible components, live validation, status badges, and dialogs built for
              FE-01.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Form Input Test */}
              <div style={{ maxWidth: '28rem' }}>
                <FormField
                  id="test-application-input"
                  label="Application Reference Number"
                  required
                  helperText="Format: AICTE-YYYY-XXXX-NNNN"
                  error={demoInputError}
                >
                  <Input
                    value={demoInputVal}
                    onChange={(e) => {
                      setDemoInputVal(e.target.value);
                      if (demoInputError) setDemoInputError('');
                    }}
                    placeholder="e.g. AICTE-2026-ENGG-0042"
                  />
                </FormField>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button size="sm" variant="primary" onClick={handleValidateDemoInput}>
                    Validate &amp; Open Inspector
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDemoInputVal('INVALID-FORMAT');
                      setDemoInputError('Must start with prefix "AICTE-"');
                    }}
                  >
                    Simulate Error
                  </Button>
                </div>
              </div>

              {/* Status Badges Showcase */}
              <div>
                <p
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 600,
                    color: 'var(--color-muted-foreground)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Semantic Status Tokens (Color + Icon + Text):
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <ApplicationStatusBadge status="DRAFT" />
                  <ApplicationStatusBadge status="SUBMITTED" />
                  <ApplicationStatusBadge status="UNDER_SCRUTINY" />
                  <ApplicationStatusBadge status="DEFICIENCY_ISSUED" />
                  <ApplicationStatusBadge status="RECOMMENDED_FOR_EVC" />
                  <ApplicationStatusBadge status="APPROVED" />
                  <ApplicationStatusBadge status="REJECTED" />
                  <VerificationStatusBadge status="VERIFIED_MOCK" />
                  <VerificationStatusBadge status="INVALID_SIGNATURE" />
                  <ComplianceSeverityBadge severity="CRITICAL_DEFICIENCY" />
                  <ComplianceSeverityBadge severity="ADVISORY_FLAG" />
                  <SimulatedDataBadge />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Interactive Modal Dialog */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Application Inspector (Design Primitive)"
        description="This modal demonstrates the accessible dialog component with backdrop click, Esc key listener, and focus management."
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="outline" size="sm" onClick={() => setIsTestModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 size={14} />}
              onClick={() => setIsTestModalOpen(false)}
            >
              Confirm Inspection
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Alert variant="info" title="Inspect Mode Active">
            Showing component parameters for identifier <code>{demoInputVal}</code>.
          </Alert>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Status:</span>
            <ApplicationStatusBadge status="UNDER_SCRUTINY" />
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted-foreground)' }}>
            This modal is powered by the FE-01 design system. It handles keyboard Escape listeners,
            body scroll lock, focus isolation, and ARIA modal conventions.
          </p>
        </div>
      </Modal>
    </div>
  );
}
