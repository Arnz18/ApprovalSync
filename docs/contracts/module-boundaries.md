# ApprovalSync — Module Boundaries & Inter-Service Interface Contracts

> **Document Version:** 1.0.0<br>
> **Status:** APPROVED BASELINE (Milestone FND-02)<br>
> **Author:** M1 — Platform & Integration Lead<br>
> **Stakeholders:** M2 (Backend Core & Workflow), M3 (Document AI & Verification), M4 (Frontend & Experience)<br>
> **Last Updated:** 2026-10-22

---

## 1. Architectural Context & In-Process DI Model

ApprovalSync operates as a **NestJS Modular Monolith** (ADR-001). All domain modules reside within a single application process, communicating primarily via in-process dependency injection and event emitters, with long-running tasks dispatched asynchronously through BullMQ.

```
+---------------------------------------------------------------------------------------+
|                                NestJS Application Core                                |
|                                                                                       |
|  [ core ] (M1) <-------- Global Filters, Config, Logging, Correlation ID ----------> |
|                                                                                       |
|   +--------------------------+  In-Process   +--------------------------+             |
|   |   Workflow & State (M2)  |<------------->| Document AI & Verify (M3)|             |
|   | - Applications, Users    |   Typed DI    | - OCR, Verification Mock |             |
|   | - Rules, Audit, SLA      |               | - Compliance Assist      |             |
|   +--------------------------+               +--------------------------+             |
|                |                                          |                           |
|                | Redis Queue (BullMQ)                     | Disk Storage              |
|                v                                          v                           |
|   +--------------------------+               +--------------------------+             |
|   | Background Workers (M2)  |               | Multi-Page Storage (M3)  |             |
|   | - SLA Timers, Cron       |               | - PDF Sanitization       |             |
|   +--------------------------+               +--------------------------+             |
+---------------------------------------------------------------------------------------+
                                        ^
                                        | REST / OpenAPI / SSE (M1 Contracts)
                                        v
+---------------------------------------------------------------------------------------+
|                              Frontend Application (M4)                                |
|   - React 18 / Vite SPA, Role-based Portals, Case Detail & Audit Evidence Explorer    |
+---------------------------------------------------------------------------------------+
```

---

## 2. Interface Contracts Across Boundaries

### 2.1 Platform Core (`core`) <---> All Backend Modules (M2 / M3)
- **Primary Owner:** M1 (Platform & Integration Lead)
- **Responsibility:** Provide global configuration, structured logging, correlation tracking, centralized error handling, and OpenAPI generation.
- **Contract / Mechanism:**
  - `ConfigService`: Typed environment access.
  - `HttpExceptionFilter`: Intercepts exceptions and renders `ApiErrorResponse`.
  - `LoggingInterceptor`: Injects `correlationId` into logs and response headers.
- **Sync/Async:** Synchronous in-process lifecycle hooks.
- **Failure Semantics:** Uncaught module exceptions trigger HTTP 500 formatted with masked details.
- **Explicit Non-Responsibilities:** Core does not implement business logic, entity definitions, or route controllers for specific domains.

---

### 2.2 Workflow Engine (`workflow`) <---> Applications & Rules (M2)
- **Primary Owner:** M2 (Backend Core & Workflow)
- **Responsibility:** Execute atomic FSM transitions (`DRAFT` $\to$ `SUBMITTED` $\to$ `UNDER_SCRUTINY`, etc.), evaluate regulatory checklist eligibility, and lock application records.
- **Inbound Input:**
  ```typescript
  export interface StateTransitionRequest {
    applicationId: string;
    targetStatus: ApplicationStatus;
    actorId: string;
    actorRole: UserRole;
    justification?: string;
  }
  ```
- **Outbound Output:**
  ```typescript
  export interface StateTransitionResult {
    success: boolean;
    previousStatus: ApplicationStatus;
    currentStatus: ApplicationStatus;
    transitionedAt: string;
    auditLogId: string;
  }
  ```
- **Sync/Async:** Synchronous within an atomic PostgreSQL transaction.
- **Failure Semantics:** Throws `InvalidStateTransitionException` (`400 Bad Request`) if transition guards fail or prerequisites are unmet.
- **Explicit Non-Responsibilities:** Workflow does not parse PDF files or query external verification APIs.

---

### 2.3 Workflow (`workflow`) <---> Document Processing & AI (`documents` / `ai`) (M2 <-> M3)
- **Primary Owner:** M3 (Document AI & Verification)
- **Responsibility:** Ingest uploaded application attachments, perform asynchronous OCR extraction, flag unreadable scans, and output evidence locations.
- **Boundary Interface:**
  ```typescript
  export interface DocumentIngestionEvent {
    documentId: string;
    applicationId: string;
    documentType: string;
    storagePath: string;
  }

  export interface DocumentAnalysisReport {
    documentId: string;
    processingStatus: DocumentProcessingStatus;
    ocrConfidence: number;              // 0.0 to 1.0
    extractedFields: Record<string, string | number>;
    anomalyFlags: Array<{
      code: string;
      description: string;
      isAdvisory: true;
      boundingLocation?: BoundingBox;
    }>;
  }
  ```
- **Sync/Async:**
  - File upload and storage: **Synchronous** REST POST (`201 Created`).
  - OCR extraction: **Asynchronous** via BullMQ job queue. Workflow polls or receives completion event.
- **Failure Semantics:** If OCR fails, document is marked `FAILED_OCR` or `MANUAL_REVIEW_REQUIRED`. The workflow does not crash; instead, it surfaces a review flag to the scrutiny officer.
- **Explicit Non-Responsibilities:** M3 does not decide whether a deficiency notice is issued; that requires M2 workflow state transition following human officer action.

---

### 2.4 Workflow (`workflow`) <---> Verification Providers (`verification`) (M2 <-> M3)
- **Primary Owner:** M3 (Document AI & Verification)
- **Responsibility:** Query external data sources (or sandbox adapters) to verify digital signatures, land registration records, and institutional identity.
- **Boundary Interface:**
  ```typescript
  export interface VerificationRequest {
    documentId: string;
    applicationId: string;
    documentType: string;
    fileBufferOrUri: string;
  }

  export interface VerificationResult {
    documentId: string;
    status: VerificationStatus;
    verifiedAt: string;
    providerMetadata: MockProviderMetadata;
    certificateSubject?: string;
    rawDigest?: string;
  }

  export interface IVerificationProvider {
    readonly providerId: string;
    verifySignature(req: VerificationRequest): Promise<VerificationResult>;
    verifyLandRecord(khasraNo: string, district: string): Promise<VerificationResult>;
  }
  ```
- **Sync/Async:** Asynchronous Promise resolution with 5000ms timeout guard.
- **Failure Semantics:** On network timeout or invalid XML, provider returns `SOURCE_UNAVAILABLE` or `INVALID_SIGNATURE`. It never throws an unhandled exception to the caller.
- **Explicit Non-Responsibilities:** The mock provider does not contact genuine MeitY DigiLocker or CCA production APIs.

---

### 2.5 Business Modules (M2) <---> Audit Ledger (`audit`) (M2)
- **Primary Owner:** M2 (Backend Core & Workflow)
- **Responsibility:** Maintain the tamper-evident sequential SHA-256 audit log. Record every state transition, officer review disposition, and external verification response.
- **Boundary Interface:**
  ```typescript
  export interface AppendAuditEntryCommand {
    applicationId: string;
    actorId: string;
    actorRole: UserRole;
    eventType: string;
    payloadSnapshot: Record<string, unknown>;
  }

  export interface IAuditService {
    appendEntry(command: AppendAuditEntryCommand): Promise<AuditLogEntry>;
    verifyChain(applicationId: string): Promise<AuditVerificationResult>;
  }
  ```
- **Sync/Async:** Synchronous execution within the calling business transaction to guarantee atomic audit recording.
- **Failure Semantics:** If audit entry creation fails, the parent transaction rolls back. No state change occurs without an audit record.
- **Explicit Non-Responsibilities:** Audit does not authenticate users; it relies on validated `actorId` and `actorRole` from M2 Auth.

---

### 2.6 Workflow (`workflow`) <---> SLA Engine (`sla`) (M2)
- **Primary Owner:** M2 (Backend Core & Workflow)
- **Responsibility:** Maintain durable SLA timers for applications in `UNDER_SCRUTINY`. Trigger tier escalations and generate alert events.
- **Boundary Interface:**
  ```typescript
  export interface StartSlaTimerCommand {
    applicationId: string;
    targetDays: number;         // e.g. 15 working days (or accelerated demo minutes)
    stage: ApplicationStatus;
  }

  export interface SlaEscalationEvent {
    applicationId: string;
    elapsedPercentage: number;
    tier: SlaTier;
    escalatedAt: string;
  }
  ```
- **Sync/Async:** BullMQ delayed jobs on Redis with midnight/interval polling.
- **Failure Semantics:** Job failures retry with exponential backoff. Failed notifications are recorded in `sla_alert_failures` for review.
- **Explicit Non-Responsibilities:** SLA engine does not automatically approve or reject applications upon deadline breach; it escalates to regional/bureau dashboards.

---

### 2.7 Backend REST / OpenAPI <---> Frontend Single-Page App (M2/M3 <-> M4)
- **Primary Owner:** M1 (Contracts) / M4 (Frontend Implementation)
- **Responsibility:** Deliver responsive web UI for institutions, officers, EVC inspectors, and system administrators.
- **Boundary Interface:**
  - Transport: HTTPS / JSON REST using `/api/v1` namespace.
  - Streaming: Server-Sent Events (SSE) on `GET /api/v1/notifications/stream` for SLA warnings and async OCR completion.
  - OpenAPI Spec: Auto-generated from NestJS decorators at `/api/v1/docs-json`.
- **Contract Adherence:**
  - M4 must display `"SIMULATED / MOCK DATA"` badges whenever `meta.isMock === true` or `is_mock === true`.
  - M4 must disable state transition action buttons for automated AI flags until an authenticated officer selects a disposition.
- **Explicit Non-Responsibilities:** Frontend does not compute cryptographic hashes or perform local regulatory eligibility evaluation; all authoritative rules run on the backend.
