# ApprovalSync — FE-07: Undertakings, Expiry Tracking, Reports & Cryptographic Audit UI

> - **Milestone:** FE-07
> - **Lead Owner:** M4 — Frontend & Experience
> - **Status:** IMPLEMENTED & VERIFIED (30 test suites, 251 automated frontend tests passing)
> - **Target Paths:** `/undertakings`, `/audit`, `/scrutiny/:id` (integrated tabs)
> - **Dependencies:** BE-09 (Undertakings & Leases), BE-07 (Cryptographic Audit Ledger), FE-04 (Case Scrutiny)
> - **Design Framework:** `ui-ux-pro-max` (Enterprise Gateway & Institutional Ledger)

---

## 1. Executive Summary & Product Objective

Milestone **FE-07** delivers an enterprise-grade regulatory compliance workspace for institutional undertakings, land lease tenure tracking, lifecycle validity reconciliation, formula-injection-resistant reports, and mathematically verifiable cryptographic audit trails.

Designed specifically for AICTE regulatory decision-support under Smart India Hackathon requirements, the interface answers critical governance questions with full accountability:
1. **Institutional Covenant Visibility**: Which registered land lease deeds, building stability certificates, fire safety NOCs, faculty affidavits, and statutory undertakings exist across applicant institutions?
2. **Lifecycle State Awareness**: Which instruments are active, expiring soon, renewal due, expired, superseded, or terminated?
3. **Action Clearances**: What operations can the current role view, draft, edit, submit, review, renew, or export under strict RBAC?
4. **Historical Provenance**: What happened to an instrument across its lifecycle lineage, from draft intake to superseding renewal?
5. **Cryptographic Accountability**: How can an authorized compliance officer or independent auditor mathematically verify sequential SHA-256 event chaining, canonical RFC 8785 payload hashing, and RFC 6962 Merkle inclusion proofs?
6. **Data Honesty & Scope**: Which metrics reflect confirmed backend database records versus client-side report exports or illustrative demonstration policies?

### Mandatory Governance Directive: ADR-004 Human Sovereignty
In strict adherence to **ADR-004**, expiry dates, lease tenure alerts, and cryptographic verification results serve strictly as **factual operational signals**. Expiry or a failed verification flag triggers expedited human regulatory review. It **never** automatically revokes institutional approval, rejects an application, or replaces an authorized statutory decision by AICTE officers.

---

## 2. Architecture & File Structure

```text
frontend/src/
├── undertakings/
│   ├── types.ts                     # UndertakingType, UndertakingStatus, UndertakingReviewStatus, DTOs
│   ├── undertakingUtils.ts          # UTC date parsers, days remaining calculations, CSV formula sanitizer
│   └── index.ts                     # Barrel export
├── audit/
│   ├── types.ts                     # AuditLogProjection, AuditCheckpoint, MerkleProof, StandaloneProof DTOs
│   ├── auditUtils.ts                # Hash truncation, event formatters, cryptographic scope disclaimer
│   └── index.ts                     # Barrel export
├── api/services/
│   ├── undertakingsService.ts       # Centralized service covering all 10 BE-09 undertaking endpoints
│   └── auditService.ts              # Centralized service covering all 5 BE-07 audit endpoints
├── components/
│   ├── undertakings/
│   │   ├── UndertakingStatusBadge.tsx # Semantic lifecycle & review status badges with distinct icons
│   │   ├── UndertakingTable.tsx       # Paginated undertaking table with tenure remaining & action triggers
│   │   ├── CreateUndertakingModal.tsx # Form validation, type selection, and draft creation
│   │   ├── ReviewUndertakingModal.tsx # Regulatory disposition recording with mandatory justification
│   │   ├── RenewUndertakingModal.tsx  # Cycle-safe renewal supersession (ADR-004 lineage preserving)
│   │   ├── UndertakingHistoryModal.tsx # Chronological lifecycle and review event timeline
│   │   ├── ReconcileUndertakingsModal.tsx # Privileged manual expiry reconciliation sweep dialog
│   │   └── UndertakingDetailModal.tsx # Deep inspection modal with tenure metadata & action clearing
│   └── audit/
│       ├── AuditChainVerificationBadge.tsx # Real-time sequential SHA-256 hash chain verifier badge
│       ├── AuditHistoryTable.tsx      # Chronological audit log table with canonical payload expander
│       ├── MerkleProofModal.tsx       # Interactive RFC 6962 Merkle tree inclusion path inspector
│       └── StandaloneProofVerifierModal.tsx # Mathematical proof verifier without DB dependency
├── pages/
│   ├── UndertakingsPage.tsx         # Primary undertakings & leases workspace (/undertakings)
│   ├── AuditLedgerPage.tsx          # Cryptographic audit ledger & Merkle proofs workspace (/audit)
│   └── CaseDetailPage.tsx          # Scrutiny detail workspace embedding Undertakings & Audit tabs
└── __tests__/
    ├── undertakings-utils.spec.ts   # 21 unit tests (dates, labels, formula defense)
    ├── undertakings-service.spec.ts # 10 unit tests (BE-09 API contracts & query serialization)
    ├── undertakings-components.spec.tsx # 14 component tests (badges, modals, forms, sweeps)
    ├── undertakings-page.spec.tsx   # 6 integration tests (KPIs, role gating, filters, search)
    ├── audit-utils.spec.ts          # 7 unit tests (hash formatters, CSV export defense)
    ├── audit-service.spec.ts        # 5 unit tests (BE-07 API contracts & verification endpoints)
    ├── audit-components.spec.tsx    # 7 component tests (chain verification, proofs, standalones)
    └── audit-page.spec.tsx          # 4 integration tests (checkpoint card, verifier triggers)
```

---

## 3. Authoritative Backend Integration Matrix

### 3.1 Undertakings & Leases (BE-09)
The frontend integrates with all 10 verified BE-09 endpoints via `src/api/services/undertakingsService.ts`:

| Method | Endpoint | Description | Permitted Roles |
|---|---|---|---|
| `POST` | `/api/v1/undertakings` | Registers institution undertaking/lease (initial `DRAFT`) | `INSTITUTION_USER`, `REGIONAL_OFFICER`, `SYSTEM_ADMIN` |
| `GET` | `/api/v1/undertakings` | Paginated listing with filtering by type, status, review status, appId | All authenticated roles (tenant-filtered for institutions) |
| `GET` | `/api/v1/undertakings/:id` | Detailed instrument metadata, tenure, and review status | All authenticated roles |
| `PATCH` | `/api/v1/undertakings/:id` | Modifies permitted mutable fields on editable/draft records | `INSTITUTION_USER`, `REGIONAL_OFFICER`, `SYSTEM_ADMIN` |
| `POST` | `/api/v1/undertakings/:id/submit` | Submits draft instrument for regulatory officer review | `INSTITUTION_USER`, `REGIONAL_OFFICER`, `SYSTEM_ADMIN` |
| `POST` | `/api/v1/undertakings/:id/review` | Records review finding (`VERIFIED`, `DEFICIENT`, `REJECTED`) | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` |
| `POST` | `/api/v1/undertakings/:id/renew` | Creates successor renewal record and supersedes prior record | `INSTITUTION_USER`, `REGIONAL_OFFICER`, `SYSTEM_ADMIN` |
| `GET` | `/api/v1/undertakings/:id/history` | Chronological audit and mutation history of specific instrument | All authenticated roles |
| `GET` | `/api/v1/applications/:id/undertakings` | Retrieves undertakings associated with specific AICTE application | All authenticated roles |
| `POST` | `/api/v1/undertakings/reconcile` | Executes UTC calendar expiry & status reconciliation sweep | `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` |

### 3.2 Cryptographic Audit Ledger & Merkle Proofs (BE-07)
The frontend integrates with all 5 verified BE-07 audit endpoints via `src/api/services/auditService.ts`:

| Method | Endpoint | Description | Permitted Roles (Backend Decorators) |
|---|---|---|---|
| `GET` | `/api/v1/applications/:id/audit-logs` | Paginated application audit event ledger sorted chronologically | All 8 roles (tenant-isolated for `INSTITUTION_USER`) |
| `GET` | `/api/v1/applications/:id/audit-logs/verify` | Executes sequential SHA-256 chain verification from genesis | All 8 roles |
| `GET` | `/api/v1/applications/:id/audit-logs/checkpoint` | Retrieves active cryptographic checkpoint snapshot & Merkle root | All 8 roles |
| `GET` | `/api/v1/applications/:id/audit-logs/:sequenceNumber/proof` | Retrieves RFC 6962 Merkle inclusion proof for specific block | All 8 roles |
| `POST` | `/api/v1/audit/verify-proof` | Standalone mathematical verification of proof steps to root | All 8 roles |

> **Role Authorization Note**: In `backend/src/audit/audit.controller.ts`, all 5 endpoints are decorated with `@Roles(INSTITUTION_USER, SCRUTINY_OFFICER, REGIONAL_OFFICER, EVC_INSPECTOR, SHC_SAC_MEMBER, BUREAU_HEAD, SYSTEM_ADMIN, AUDITOR)`. For `INSTITUTION_USER`, `AuditService.assertApplicationAccess()` enforces strict tenant isolation against `application.institutionId`. In the frontend UI, contextual audit history is displayed in `CaseDetailPage` to officers scrutinizing an application, while the top-level `/audit` ledger explorer route in `roleRoutes.ts` is surfaced in navigation to oversight roles (`AUDITOR`, `BUREAU_HEAD`, `SYSTEM_ADMIN`).

### 3.3 API Contract Audit & Verification Findings (FE-07 Audit)

1. **Review Dispositions (BE-09 Contract Audit)**:
   - **Contract Fact**: `backend/src/undertakings/enums/undertaking-review-status.enum.ts` defines `UndertakingReviewStatus`: `PENDING_REVIEW`, `VERIFIED`, `DEFICIENT`, `REJECTED`.
   - **Validation Enforcement**: `backend/src/undertakings/dto/review-undertaking.dto.ts` applies `@IsEnum(UndertakingReviewStatus)` and `@MinLength(5) @MaxLength(2000)` to `reviewNotes`. Submitting `VERIFIED_CONCURRENT` or `CLARIFICATION_REQUESTED` is rejected with HTTP 400 Bad Request by the NestJS `ValidationPipe`.
   - **Frontend UI Mapping**: `ReviewUndertakingModal` maps descriptive UI options directly to the supported enums:
     - *"VERIFIED — Concurrent Compliance Corroborated"* $\rightarrow$ `UndertakingReviewStatus.VERIFIED`
     - *"DEFICIENT — Clarification / Rectification Notice"* $\rightarrow$ `UndertakingReviewStatus.DEFICIENT`
     - *"REJECTED — Non-Compliant / Revoked"* $\rightarrow$ `UndertakingReviewStatus.REJECTED`
   - **Mandatory Human Review**: Validation prevents submission if `reviewNotes` is under 5 characters. Automated status reconciliation signals never overwrite officer determinations.

2. **Merkle Proof Lookup Identifier (BE-07 Contract Audit)**:
   - **Contract Fact**: `backend/src/audit/audit.controller.ts` line 140 explicitly exposes `@Get('applications/:id/audit-logs/:sequenceNumber/proof')` with parameter `sequenceNumber`.
   - **Service Implementation**: `backend/src/audit/audit.service.ts` line 341-343 locates the target leaf via `logs.findIndex((log) => log.sequenceNumber.toString() === targetSeqStr)`.
   - **Identifier Alignment**: The backend expects a block sequence number (e.g. `1`, `2`), **not** a log record UUID. Passing a log UUID results in HTTP 404 NotFound. The frontend implementation (`auditService.getMerkleProof`, `AuditHistoryTable`, `MerkleProofModal`) correctly passes `log.sequenceNumber`.

---

## 4. Status Semantics & Date Handling

### 4.1 Authoritative Lifecycle States (`UndertakingStatus`)
- **`DRAFT`**: Initially authored instrument. Fully editable by institution. Not yet locked for regulatory review.
- **`SUBMITTED`**: Locked by applicant and submitted to AICTE scrutiny officers. Awaiting review.
- **`ACTIVE`**: Legally in-force covenant verified by regulatory scrutiny.
- **`EXPIRING_SOON`**: Active covenant approaching expiry within configured `renewalLeadDays` (e.g. 180 days for 30-year land leases, 60 days for municipal fire NOCs).
- **`RENEWAL_DUE`**: Threshold reached where formal renewal documentation must be lodged.
- **`EXPIRED`**: Instrument past its `expiryDate`. Flags urgent regulatory review under ADR-004 without automated revocation.
- **`SUPERSEDED`**: Replaced by an authorized successor renewal record via `POST /renew`. Retains permanent immutable audit lineage.
- **`TERMINATED`**: Revoked or cancelled covenant.

### 4.2 Authoritative Review States (`UndertakingReviewStatus`)
- **`UNVERIFIED`**: Initial state before regulatory inspection.
- **`PENDING_REVIEW`**: Queued for scrutiny officer review.
- **`VERIFIED`**: Regulatory compliance corroborated against government sub-registrar records or municipal bodies.
- **`DEFICIENT`**: Clarification or defect notice issued back to applicant.
- **`REJECTED`**: Defective, non-compliant, or forged instrument rejected by regulatory officer.

### 4.3 Deterministic UTC Calendar Logic
- All tenure calculations use pure UTC boundaries (`Date.UTC(y, m - 1, d)`) to prevent localized off-by-one errors across timezones.
- Formula:
  $$\text{Days Remaining} = \left\lfloor \frac{\text{Expiry Date (UTC)} - \text{Current Date (UTC)}}{86,400,000\,\text{ms}} \right\rfloor$$
- Configured `renewalLeadDays` is sourced strictly from the backend record projection and never assumed as a hardcoded frontend constant.

---

## 5. Workspaces & Workflows

### 5.1 Undertakings & Leases Workspace (`/undertakings`)
- **KPI Summary Cards**: Real-time breakdown of server-retrieved records:
  - *Active (In Force)* (Emerald)
  - *Expiring Soon* (Amber)
  - *Renewal Due* (Orange)
  - *Pending Review* (Blue)
  - *Expired / Scrutiny Needed* (Red)
- **High-Density Table**:
  - Displays instrument title, statutory classification, document/deed number, issuing authority, counterparty lessor, tenure countdown, lifecycle status, and review disposition.
  - Action clearance buttons: `Inspect`, `Submit Draft`, `Review`, `Renew`.
- **Search & Multi-Filter Bar**:
  - Full-text search over title, deed number, authority, and counterparty.
  - Granular dropdown filters for `Lifecycle Status`, `Review Disposition`, and `Undertaking Type`.
- **Privileged Expiry Reconciliation Sweep**:
  - Gated to `REGIONAL_OFFICER`, `BUREAU_HEAD`, and `SYSTEM_ADMIN`.
  - Double-confirmation modal detailing UTC calendar sweep semantics.
  - Executes `POST /api/v1/undertakings/reconcile` and displays scanned, transitioned, active, and expired count breakdowns.
  - **Never** triggers automatically on page load or timer.

### 5.2 Create, Review & Renewal Modals
- **`CreateUndertakingModal`**:
  - Validates required title, commencement date, expiry date, and renewal lead time.
  - Supports AICTE statutory categories: Land Lease, Building Lease, APH Affidavit, Fire Safety NOC, Structural Stability, Land Use Conversion (CLU), Equipment Safety.
- **`ReviewUndertakingModal`**:
  - Exposes authorized dispositions: `VERIFIED`, `DEFICIENT`, `REJECTED`.
  - Requires mandatory human justification notes (minimum 5 characters).
  - Allows concurrent lifecycle promotion to `ACTIVE` upon positive verification.
- **`RenewUndertakingModal`**:
  - Implements cycle-safe renewal supersession.
  - Preserves prior record in `SUPERSEDED` status while creating a successor record with `supersedesId` pointing to the predecessor.
  - Pre-populates commencement date from previous expiry date.
  - Displays explicit **ADR-004 Renewal Lineage Rule** banner.

### 5.3 Undertaking Lifecycle History (`UndertakingHistoryModal`)
- Fetches chronological mutation history from `GET /api/v1/undertakings/:id/history`.
- Displays action name (`CREATED`, `SUBMITTED`, `REVIEWED`, `RENEWED`), actor ID, actor role, before/after statuses, and recorded change reasons.

---

## 6. Cryptographic Audit Ledger & Verification UI (`/audit`)

### 6.1 Audit Ledger Architecture
- Standalone route `/audit` restricted via RBAC to `AUDITOR`, `BUREAU_HEAD`, and `SYSTEM_ADMIN`.
- Integrated as an contextual audit tab within `CaseDetailPage` for scrutiny officers and applicants inspecting their active application.
- Supports switching between application cases via UUID selector.

### 6.2 Sequential SHA-256 Hash Chain Verification
- **Endpoint**: `GET /api/v1/applications/:id/audit-logs/verify`
- Evaluates sequential hash continuity from block #1 genesis to the chain head:
  $$H_i = \text{SHA-256}(H_{i-1} \parallel \text{canonical}(P_i))$$
- **Badge Indicator**:
  - *Valid*: Green badge `Sequential Chain Intact & Valid`, displaying verified block count and timestamp.
  - *Broken*: Amber/Red alert `Chain Broken at Sequence #K`, flagging sequence discontinuity or payload hash mismatch.
  - *Manual Trigger*: Provides explicit `Re-Verify Chain` button. Never marks chain verified simply because HTTP 200 was received.

### 6.3 Merkle Checkpoint Snapshot
- **Endpoint**: `GET /api/v1/applications/:id/audit-logs/checkpoint`
- Renders active chain head hash, total anchored blocks, algorithm (`SHA-256`), and computed RFC 6962 Merkle Root.

### 6.4 RFC 6962 Merkle Inclusion Proofs
- **Inspection Modal (`MerkleProofModal`)**:
  - Fetches inclusion proof for specific block sequence from `GET /audit-logs/:seq/proof`.
  - Displays leaf index, total leaves, leaf hash, expected Merkle root, and step-by-step path siblings with position (`LEFT` / `RIGHT`).
  - Provides a one-click action to execute upward mathematical verification.
- **Standalone Mathematical Verifier (`StandaloneProofVerifierModal`)**:
  - Form accepting arbitrary 64-character hex leaf hash, expected root, and sibling proof path steps.
  - Submits to `POST /api/v1/audit/verify-proof`.
  - Enables independent auditors to verify proof math without querying live application database tables.

### 6.5 Cryptographic Assurance Scope & Threat Model
Both `/audit` and `CaseDetailPage` prominently feature the **Cryptographic Assurance Scope & Threat Model** directive:
> **Cryptographic Scope Notice:** *Local cryptographic verification validates sequential block hash continuity (SHA-256 chained hashing) and canonical RFC 6962 Merkle inclusion proofs. Successful verification mathematically proves tamper-evidence within the recorded application ledger. It does not certify external factual truth or replace an external trust anchor (e.g. public transparency log / timestamping authority) against privileged database rewriting.*

---

## 7. Reports & Spreadsheet Formula-Injection Defense

### 7.1 Client-Side Export Engine
- Sourced from authoritative server data loaded in client state.
- Clearly states export scope in generated headers (`scope: Retrieved Dataset (Page 1 of 1)`).
- Does not pretend a paginated single-page query represents the entire multi-tenant database.

### 7.2 Formula-Injection Protection (`escapeCsvCell`)
To neutralize CSV formula injection attacks (CSV Injection / Formula Injection) in Excel, LibreOffice, and Google Sheets, `escapeCsvCell()` evaluates all string values:
- Characters checked: `=`, `+`, `-`, `@`, `\t` (0x09), `\r` (0x0D).
- If a cell begins with any of these trigger characters, it is safely neutralized by prepending an apostrophe (`'`) and enclosing the entire value in escaped double quotes (`"`):
  - `=1+1` $\rightarrow$ `"'=1+1"`
  - `+cmd|/C calc` $\rightarrow$ `"'"+cmd|/C calc"`
  - `-SUM(A1:B10)` $\rightarrow$ `"'-SUM(A1:B10)"`
  - `@HYPERLINK(...)` $\rightarrow$ `"'@HYPERLINK(...)"`
- Commas, newlines, and nested quotes are sanitized per RFC 4180.
- Automatic resource cleanup ensures temporary browser blob URLs (`URL.createObjectURL`) are promptly revoked.

---

## 8. Role-Based Access Control (RBAC) Matrix

| Persona | View Undertakings | Create / Submit Draft | Regulatory Review | Renew Instrument | Reconcile Expiry | View Audit Ledger | Verify Hash Chain |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **`INSTITUTION_USER`** | Tenant Own Only | Yes | No | Yes (Own) | No | Own App Only | No |
| **`SCRUTINY_OFFICER`** | All Assigned | No | Yes | No | No | Case Tab | Yes |
| **`REGIONAL_OFFICER`** | Regional / All | Yes | Yes | Yes | Yes | Case Tab | Yes |
| **`BUREAU_HEAD`** | Council-wide | No | Yes | No | Yes | Dedicated `/audit` | Yes |
| **`SYSTEM_ADMIN`** | System-wide | Yes | Yes | Yes | Yes | Dedicated `/audit` | Yes |
| **`AUDITOR`** | Read-Only | No | No | No | No | Dedicated `/audit` | Yes (Read-Only) |
| **`EVC_INSPECTOR`** | Contextual | No | No | No | No | Case Tab | No |

---

## 9. Automated Verification & Quality Gates

All quality gates passed with zero warnings, zero lint errors, and zero regressions across the codebase:

```text
1. Full Frontend Test Suite:
   Command: npm test
   Result: 30 test files passed (100%), 251 tests passed (100%), 0 failed.

2. TypeScript Typecheck:
   Command: npm run typecheck (tsc --noEmit)
   Result: 0 errors.

3. ESLint:
   Command: npm run lint (eslint "src/**/*.{ts,tsx}" --max-warnings=0)
   Result: 0 errors, 0 warnings.

4. Prettier Code Style Check:
   Command: npm run format:check (prettier --check "src/**/*.{ts,tsx,css,html}")
   Result: All 140 matched files use Prettier code style.

5. Production Bundle Build:
   Command: npm run build (tsc --noEmit && vite build)
   Result: Built dist/ bundle in 5.16s without errors.

6. Git Hygiene Check:
   Command: git diff --check
   Result: Clean whitespace, no merge conflicts or trailing markers.
```

---

## 10. Manual Evaluator Demonstration Walkthrough

To demonstrate FE-07 capabilities during hackathon evaluations using synthetic demo data:

### Step 1: Institutional Covenant Management (`INSTITUTION_USER`)
1. Log in as `institution.user@synthetic.approvalsync.local` (password: `TestUser@123`).
2. Navigate to sidebar $\rightarrow$ **Undertakings & Leases**.
3. Verify KPI cards display counts for Active, Expiring Soon, and Pending Review instruments.
4. Click **Register Instrument**. Select `Registered Land Lease Deed`, enter Title `30-Year Registered Land Lease Deed`, deed number `KA-DEED-2024-99881`, issuing authority `Sub-Registrar Office, Bangalore South`, counterparty `State Industrial Development Corp`.
5. Click **Save & Create Instrument**. Verify the record appears in `DRAFT` status.
6. Click **Submit** on the newly created draft. Confirm submission. Verify status transitions to `SUBMITTED` / `Pending Review`.
7. Click **Export CSV** and open the file to verify safe formula-neutralized CSV headers.

### Step 2: Regulatory Review & Verification (`SCRUTINY_OFFICER`)
1. Switch to user `scrutiny.officer@synthetic.approvalsync.local`.
2. Navigate to **Undertakings & Leases**.
3. Locate the `SUBMITTED` instrument. Click **Review**.
4. In `ReviewUndertakingModal`, select disposition `VERIFIED — Concurrent Compliance Corroborated`.
5. Enter justification notes: *"Verified stamped deed against revenue registry records. 30-year lease covenant satisfies AICTE APH Chapter 1 land norms."*
6. Click **Record Regulatory Review**. Verify the record updates to `ACTIVE` and `Verified (Concurrent)`.
7. Click **Inspect** to review complete tenure countdown and click **Audit History** to observe recorded timeline events.

### Step 3: Cycle-Safe Superseding Renewal (`INSTITUTION_USER` or `REGIONAL_OFFICER`)
1. On an `ACTIVE` or `EXPIRING_SOON` instrument, click **Renew**.
2. Review the ADR-004 renewal lineage explanation banner.
3. Keep extended dates (+30 years) and enter renewal registration number `KA-SUPP-LEASE-2054-001`.
4. Click **Execute Superseding Renewal**.
5. Observe that the prior record transitions to `SUPERSEDED`, while a successor active record is linked.

### Step 4: Privileged Expiry Reconciliation Sweep (`SYSTEM_ADMIN`)
1. Switch to `admin@synthetic.approvalsync.local`.
2. Navigate to **Undertakings & Leases**. Notice the privileged **Reconciliation Sweep** button in the header.
3. Click **Reconciliation Sweep**. Review the evaluation terms dialog and click **Confirm & Execute Sweep**.
4. Verify the returned results breakdown: Scanned records, status transitions, active count, and demo disclaimer.

### Step 5: Cryptographic Audit Ledger & Proof Verification (`AUDITOR`)
1. Switch to `auditor@synthetic.approvalsync.local`.
2. Navigate to sidebar $\rightarrow$ **Audit Ledger & Proofs** (`/audit`).
3. Enter application UUID `a0000000-0000-0000-0000-000000000001` and click **Inspect Ledger**.
4. Review the **Active Ledger Checkpoint** card showing Head Hash, total blocks, and Merkle root.
5. In the **Cryptographic Audit Chain Continuity** badge, click **Re-Verify Chain**. Observe the verified sequential block count and green intact status.
6. In the audit event table, click **Payload** to inspect canonical RFC 8785 JSON snapshots.
7. Click **Proof** on block #1. In `MerkleProofModal`, observe the sibling hashes and click **Verify Proof Math Standalone** to witness upward mathematical confirmation.
8. Click **Standalone Proof Verifier** in the page header to test independent hash computation without database queries.
9. Verify the **Cryptographic Assurance Scope & Threat Model** disclaimer is clearly articulated at the bottom of the page.
