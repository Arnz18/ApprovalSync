# ApprovalSync — Shared Data Contracts & Domain Enums

> **Document Version:** 1.0.0<br>
> **Status:** APPROVED BASELINE (Milestone FND-02)<br>
> **Author:** M1 — Platform & Integration Lead<br>
> **Stakeholders:** M2 (Backend Core & Workflow), M3 (Document AI & Verification), M4 (Frontend & Experience)<br>
> **Last Updated:** 2026-10-22

---

## 1. Purpose and Governance

This document establishes the provisional baseline TypeScript data models, domain enums, and DTO interfaces shared across the ApprovalSync platform.

### Governance Rules
1. **Single Source of Truth:** Code-level type definitions are maintained in `backend/src/shared/contracts/`. Frontend (M4) and backend (M2/M3) modules import or align directly with these types.
2. **Immutability of Core Enums:** Downstream chunks may add optional metadata fields, but may not rename, remove, or change the semantics of existing enum values without an architectural amendment.
3. **Statutory vs. Illustrative Demarcation:** Contracts must explicitly differentiate statutory AICTE regulations from prototype demo rules.
4. **Provisional Integration Baseline:** The shared enum and contract definitions in this document represent an initial integration baseline (`PROVISIONAL BASELINE — AWAITING M2/M3 AGREEMENT`). M2 must validate workflow/application states and human-review dispositions against the workflow state machine implementation (`BE-06`). M3 must validate document-processing, verification, and compliance states against its processing pipeline (`DOC-01`, `DOC-02`, `DOC-05`). Relevant contract changes must be agreed upon collaboratively and updated across shared documentation and TypeScript code simultaneously.

---

## 2. Core Domain Enums & Status Lifecycles (PROVISIONAL BASELINE — AWAITING M2/M3 AGREEMENT)

### 2.1 Application Lifecycle Status (`ApplicationStatus`)
Governs the core Finite State Machine (FSM) transitions managed by M2 (`BE-06`).

| Enum Key | Meaning | Owning Role | Implementing Chunk | Status |
|---|---|---|---|---|
| `DRAFT` | Initial application composition by college. Unlocked for edits. | Institution User | `BE-04`, `FE-03` | Provisional Baseline (Awaiting M2 Agreement) |
| `SUBMITTED` | Sealed and submitted by college. Immutable pending scrutiny. | Institution User | `BE-04`, `BE-06` | Provisional Baseline (Awaiting M2 Agreement) |
| `UNDER_SCRUTINY` | Assigned to AICTE Scrutiny Officer; document AI active. | Scrutiny Officer | `BE-06`, `FE-04` | Provisional Baseline (Awaiting M2 Agreement) |
| `DEFICIENCY_ISSUED` | Deficiencies flagged by officer; returned to college for reply. | Scrutiny Officer | `BE-06`, `FE-04` | Provisional Baseline (Awaiting M2 Agreement) |
| `RESUBMITTED` | College uploaded corrective evidence; queued for re-scrutiny. | Institution User | `BE-06`, `FE-03` | Provisional Baseline (Awaiting M2 Agreement) |
| `RECOMMENDED_FOR_EVC` | Documentary scrutiny cleared; slated for Expert Visit Committee. | Scrutiny Officer | `BE-06`, `FE-06` | Provisional Baseline (Awaiting M2 Agreement) |
| `EVC_IN_PROGRESS` | On-site / video inspection underway by expert panel. | EVC Inspector | `BE-06`, `FE-06` | Provisional Baseline (Awaiting M2 Agreement) |
| `RECOMMENDED_FOR_SHC` | EVC identified discrepancies; escalated to Standing Hearing Committee. | EVC Inspector | `BE-06`, `FE-06` | Provisional Baseline (Awaiting M2 Agreement) |
| `APPROVED` | Final statutory approval granted by Competent Authority. | Bureau Head | `BE-06`, `FE-05` | Provisional Baseline (Awaiting M2 Agreement) |
| `REJECTED` | Final rejection issued following appeals. | Bureau Head | `BE-06`, `FE-05` | Provisional Baseline (Awaiting M2 Agreement) |
| `WITHDRAWN` | College formally retracted application prior to scrutiny. | Institution User | `BE-06` | Provisional Baseline (Awaiting M2 Agreement) |

### 2.2 Document Processing & AI Pipeline Status (`DocumentProcessingStatus`)
Governs document ingestion, OCR, and computer vision heuristics managed by M3 (`DOC-01`, `DOC-02`).

| Enum Key | Meaning | Owning Role | Implementing Chunk | Status |
|---|---|---|---|---|
| `UPLOADED` | Multipart binary stored on disk; MIME and magic bytes validated. | System (M3) | `DOC-01` | Provisional Baseline (Awaiting M3 Agreement) |
| `PROCESSING_OCR` | Dispatched to asynchronous BullMQ worker; OCR inference running. | System (M3) | `DOC-02` | Provisional Baseline (Awaiting M3 Agreement) |
| `OCR_EXTRACTED` | Text and tabular tokens extracted; confidence scores available. | System (M3) | `DOC-02` | Provisional Baseline (Awaiting M3 Agreement) |
| `FAILED_OCR` | Unrecoverable file corruption, password protection, or parse timeout. | System (M3) | `DOC-02` | Provisional Baseline (Awaiting M3 Agreement) |
| `MANUAL_REVIEW_REQUIRED` | Low OCR confidence ($< 0.85$) or contradictory documentary evidence. | System (M3) | `DOC-02`, `DOC-06` | Provisional Baseline (Awaiting M3 Agreement) |

### 2.3 Verification Result Categories (`VerificationStatus`)
Governs external digital signature and registry verification adapters managed by M3 (`DOC-05`).

| Enum Key | Meaning | Owning Role | Implementing Chunk | Status |
|---|---|---|---|---|
| `VERIFIED_MOCK` | Signature mathematically verified against synthetic local test key. | Mock Adapter (M3)| `DOC-05` | Provisional Baseline (Awaiting M3 Agreement) |
| `INVALID_SIGNATURE` | Cryptographic signature digest mismatch or XML modification. | Mock Adapter (M3)| `DOC-05` | Provisional Baseline (Awaiting M3 Agreement) |
| `UNTRUSTED_ISSUER` | Certificate not signed by configured test root CA. | Mock Adapter (M3)| `DOC-05` | Provisional Baseline (Awaiting M3 Agreement) |
| `SOURCE_UNAVAILABLE` | External sandbox timeout ($> 5000\text{ms}$) or simulated 500 error. | Mock Adapter (M3)| `DOC-05` | Provisional Baseline (Awaiting M3 Agreement) |
| `MANUAL_REVIEW_REQUIRED` | Missing digital signature or unsupported signature standard. | Mock Adapter (M3)| `DOC-05` | Provisional Baseline (Awaiting M3 Agreement) |

### 2.4 Compliance Finding Severity (`ComplianceSeverity`)
Classifies automated compliance suggestions and deficiency notices managed by M2/M3 (`BE-05`, `DOC-06`).

| Enum Key | Meaning | Owning Role | Implementing Chunk | Status |
|---|---|---|---|---|
| `CRITICAL_DEFICIENCY` | Statutory violation prohibiting approval (e.g. land tenure $< 30$ years). | System / Officer | `BE-05`, `DOC-06` | Provisional Baseline (Awaiting M2/M3 Agreement) |
| `ADVISORY_FLAG` | AI anomaly indicator (e.g. font alteration, unreadable stamp). | System (AI) | `DOC-04`, `DOC-06` | Provisional Baseline (Awaiting M2/M3 Agreement) |
| `COMPLIANT` | Document meets or exceeds verified regulatory parameters. | System / Officer | `BE-05`, `DOC-06` | Provisional Baseline (Awaiting M2/M3 Agreement) |
| `UNVERIFIED_POLICY` | Finding based on team-defined illustrative demo policy. | System / Officer | `BE-05`, `BE-09` | Provisional Baseline (Awaiting M2/M3 Agreement) |

### 2.5 Human Review Dispositions (`ReviewDisposition`)
Enforces the Human Sovereignty Safety Rule by recording officer actions on AI findings (`BE-06`, `FE-04`).

| Enum Key | Meaning | Owning Role | Implementing Chunk | Status |
|---|---|---|---|---|
| `PENDING_REVIEW` | Finding awaiting officer scrutiny. | Scrutiny Officer | `FE-04` | Provisional Baseline (Awaiting M2 Agreement) |
| `APPROVED_BY_OFFICER` | Officer confirmed compliance; finding dismissed. | Scrutiny Officer | `FE-04`, `BE-06` | Provisional Baseline (Awaiting M2 Agreement) |
| `DEFICIENCY_FLAGGED` | Officer accepted finding as a formal deficiency against college. | Scrutiny Officer | `FE-04`, `BE-06` | Provisional Baseline (Awaiting M2 Agreement) |
| `OVERRIDDEN_WITH_JUSTIFICATION`| Officer overrode automated finding with mandatory text rationale. | Scrutiny Officer | `FE-04`, `BE-06` | Provisional Baseline (Awaiting M2 Agreement) |

### 2.6 User Roles & Hierarchies (`UserRole`)
Governs Role-Based Access Control (RBAC) managed by M2 (`BE-03`).

| Enum Key | Meaning | Primary Permissions |
|---|---|---|
| `INSTITUTION_USER` | Authorized representative of college/trust. | Draft, upload documents, submit application, respond to deficiencies. |
| `SCRUTINY_OFFICER` | AICTE officer conducting documentary evaluation. | Review dossiers, accept/override AI flags, issue deficiency notices, recommend EVC. |
| `REGIONAL_OFFICER` | Regional Office director. | Monitor regional queues, receive Tier 1 SLA alerts, reassign stalled cases. |
| `EVC_INSPECTOR` | Expert Committee inspection chair. | Access EVC workspace, conduct ground inspection, submit EVC report. |
| `SHC_SAC_MEMBER` | Standing Hearing / Appellate Committee member. | Review appealed deficiency dossiers, enter quasi-judicial hearing orders. |
| `BUREAU_HEAD` | Central AICTE Approval Bureau Director. | Receive Tier 2 SLA escalations, grant final approval or rejection. |
| `SYSTEM_ADMIN` | Technical platform administrator. | Manage system configuration, inspect audit chain, view container health. |
| `AUDITOR` | Independent oversight / CVC auditor. | Read-only access to tamper-evident audit logs and Merkle verification. |

### 2.7 SLA Escalation Tiers (`SlaTier`)
Governs durable timer escalations managed by M2 (`BE-08`).

| Enum Key | Default Target | Action Triggered |
|---|---|---|
| `TIER_1_RO_ALERT` | $80\%$ of SLA Elapsed | Push alert to Regional Officer queue; warning banner on case. |
| `TIER_2_DIRECTOR_BREACH` | $100\%$ of SLA Elapsed | Case marked SLA_BREACHED; escalated to Bureau Head dashboard. |
| `TIER_3_COUNCIL_LOCK` | $120\%$ of SLA Elapsed (Demo Configuration) | Prototype concept: simulated case escalation / freeze pending Council review; priority audit event. Team-defined prototype escalation rule; NOT an official AICTE statutory process. |

> **Note on Prototype Escalation:** `TIER_3_COUNCIL_LOCK` and the $120\%$ threshold are team-defined prototype demo concepts designed to demonstrate administrative escalation during hackathon evaluation. They are explicitly **not** an asserted official AICTE statutory process or regulatory mandate.

---

## 3. Statutory vs. Prototype Policy Reference Catalog

> [!WARNING]
> ### Unverified Statutory Norms Notice
> The regulatory clause citations listed below (e.g. AICTE APH 2024–27 Chapter 1) are documented integration modeling references only. Because primary Council gazette/handbook text is not currently stored or independently verified in the workspace, policies `POL-STAT-01`, `POL-STAT-02`, and `POL-STAT-03` are formally designated as **`UNVERIFIED — HUMAN REVIEW REQUIRED`**.
>
> These policies **must not be treated as legally definitive or used for autonomous approval or rejection** until the authoritative source text, applicable handbook period, exact wording, and jurisdictional applicability have undergone authorized human review. Prototype policies (`POL-DEMO-01`, `POL-DEMO-02`) are explicitly distinguished as team-defined demo configurations.

| Policy ID | Policy Name | Parameter | Regulatory Reference | Category |
|---|---|---|---|---|
| `POL-STAT-01` | Land Tenure for New Institutions | Min 30 years registered lease or freehold ownership | AICTE APH 2024-27, Chapter 1, Clause 1.4.1 (Reference citation only) | **Statutory AICTE Norm (UNVERIFIED — HUMAN REVIEW REQUIRED)** |
| `POL-STAT-02` | Land Lease Continuity for EoA | Remaining lease > course duration | AICTE APH 2024-27, Chapter 1, Clause 1.4.2 (Reference citation only) | **Statutory AICTE Norm (UNVERIFIED — HUMAN REVIEW REQUIRED)** |
| `POL-STAT-03` | Barrier-Free Built-up Environment | Ramp, lift, accessible toilets mandatory | AICTE APH 2024-27, Chapter 1, Clause 1.5 (Reference citation only) | **Statutory AICTE Norm (UNVERIFIED — HUMAN REVIEW REQUIRED)** |
| `POL-DEMO-01` | Illustrative 25-Year Lease Covenant | Min 25 years unexpired lease | Derived from project brief / README Module D | **Team-Defined Illustrative Demo Policy** |
| `POL-DEMO-02` | Scrutiny Processing SLA Benchmark | 15 working days from submission | Hackathon acceleration benchmark | **Proposed Demo Target / Unverified SLA Benchmark** |

---

## 4. Shared TypeScript DTO & Interface Definitions

These interfaces are exported from `backend/src/shared/contracts/`.

### 4.1 Generic API Response Wrappers
```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;      // ISO 8601 UTC
    correlationId: string;  // UUIDv4
    pagination?: PaginationMeta;
  };
}

export interface FieldError {
  field: string;
  message: string;
  rule?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    correlationId: string;
    details?: FieldError[];
  };
}
```

### 4.2 Mock Provider Declaration
```typescript
export interface MockProviderMetadata {
  isMock: true;
  provider: string;           // e.g. "SIMULATED_DIGILOCKER_SANDBOX"
  verificationScope: string;  // e.g. "SYNTHETIC_TEST_CERTIFICATE_ONLY"
  disclaimer: string;
}
```

### 4.3 Tamper-Evident Audit Log Entry
```typescript
export interface AuditLogEntry {
  sequenceNumber: number;
  applicationId: string;
  actorId: string;
  actorRole: UserRole;
  eventType: string;          // e.g. "APPLICATION_SUBMITTED", "DEFICIENCY_ISSUED"
  payloadSnapshot: Record<string, unknown>;
  previousHash: string;       // SHA-256 hex string (64 chars)
  leafHash: string;           // SHA-256 hex of canonical payload
  currentHash: string;        // SHA-256(previousHash + leafHash + timestamp)
  timestamp: string;          // ISO 8601 UTC
}

export interface AuditVerificationResult {
  applicationId: string;
  isChainValid: boolean;
  totalBlocksVerified: number;
  brokenBlockSequence?: number;
  verifiedAt: string;
  merkleRootHash?: string;
}
```

### 4.4 Document Analysis & Evidence Link
```typescript
export interface BoundingBox {
  pageNumber: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface DocumentExtractionFinding {
  fieldKey: string;           // e.g. "leaseTenureYears", "registrationDate"
  extractedValue: string | number;
  confidenceScore: number;    // 0.0 to 1.0 (Provisional score)
  evidenceLocation: BoundingBox;
  isAdvisory: true;           // Strictly advisory finding
}
```
