# ApprovalSync — Frontend Integration Audit & Verification Report (FE-01 through FE-06)

> **Audit Date:** 2026-10-26
> **Auditor / Owner:** M4 — Frontend & Experience
> **Repository:** `https://github.com/Arnz18/ApprovalSync.git`
> **Branch:** `main`
> **Audit Scope:** `FE-01`, `FE-02`, `FE-03`, `FE-04`, `FE-06`
> **Blocked Downstream Chunks:** `FE-05` (Blocked by `BE-08`), `FE-07` (Blocked by `BE-09`, `BE-07`, `FE-04`)
> **Verification Status:** 18 Test Suites (128 Tests) Passing • TypeScript Strict (0 Errors) • ESLint Clean (0 Warnings) • Prettier Verified • Production Build Clean (456 kB JS / 25.5 kB CSS) • Live Backend Integration Pending

---

## 1. Executive Summary & Purpose

This audit constitutes a comprehensive, rigorous frontend integration and contract conformance review across all implemented milestones (**FE-01 through FE-06**). Its purpose is to verify that the live user interface strictly matches the frozen backend REST contracts (`docs/contracts/`), NestJS controllers (`backend/src/`), multi-tenant authentication and RBAC boundaries, and documented task acceptance criteria.

All genuine frontend defects discovered during code inspection and headless browser testing have been corrected, regression tests have been authored, and interface boundary gaps requiring M1 (Lead/Architect) or M2 (Backend) coordination have been formally documented.

**Important Scope Boundary:** This audit evaluates frontend source code, component behavior, and static contract alignment. Live end-to-end integration against a running backend daemon on port 3000 was **not exercised**, as no backend daemon was active during testing.

---

## 2. Milestone Verification & Contract Alignment Matrix

| Milestone | Scope & Responsibilities | Verified Backend Endpoints | Contract Alignment Status | Notes & Governance |
| :--- | :--- | :--- | :--- | :--- |
| **FE-01** | Application Shell, Swiss Design System, Route Guards, API Client | `GET /api/v1/health`<br>`GET /api/v1/health/liveness`<br>`GET /api/v1/health/readiness` | **ALIGNED** | Native typed `ApiClient` with correlation ID injection, error envelope unwrapping, and responsive enterprise layout. |
| **FE-02** | Authentication, Session Lifecycle, RBAC Route Filtering | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me` | **ALIGNED** | Scoped `sessionStorage` token isolation; 8-role RBAC routing matrix; open-redirect sanitization; accessible 403 / 404 views. |
| **FE-03** | Institution Intake Wizard, Multipart Uploads, Draft Auto-save | `POST /api/v1/applications`<br>`PATCH /api/v1/applications/:id`<br>`GET /api/v1/applications/:id`<br>`POST /api/v1/applications/:id/submit`<br>`POST /api/v1/applications/:id/documents`<br>`DELETE /api/v1/documents/:id` | **ALIGNED** | 5-step stepper with draft persistence, PDF binary magic byte verification, client-side quota validation, and statutory oath enforcement. |
| **FE-04** | Scrutiny Queue, Case Detail and Evidence Review | `GET /api/v1/applications`<br>`GET /api/v1/applications/:id`<br>`GET /api/v1/applications/:id/documents`<br>`GET /api/v1/documents/:id/download`<br>`GET /api/v1/applications/:id/dossier-report`<br>`POST /api/v1/applications/:id/dossier-report`<br>`GET /api/v1/applications/:id/allowed-transitions`<br>`POST /api/v1/applications/:id/transitions`<br>`GET /api/v1/applications/:id/timeline` | **ALIGNED** | ADR-004 Human Sovereignty disclaimers, simulated data badges, multi-role FSM transition modal, and mandatory justification comments. |
| **FE-06** | EVC Scheduling & Queue, Infrastructure Review, Committee Workspace | `GET /api/v1/applications` (EVC filtered)<br>`GET /api/v1/applications/:id`<br>`GET /api/v1/applications/:id/compliance-assist`<br>`POST /api/v1/applications/:id/compliance-assist/evaluate`<br>`GET /api/v1/applications/:id/allowed-transitions`<br>`POST /api/v1/applications/:id/transitions`<br>`GET /api/v1/applications/:id/timeline` | **ALIGNED** | On-site inspection checklist aid, SHC committee review, escalation provenance audit trail, and advisory heuristics safeguards. |
| **FE-05** | Role-Specific Dashboards, SLA, Alerts and Analytics | Blocked by `BE-08` (Depends on `FE-04`, `BE-08`) | **BLOCKED** | Kept in non-implemented blocked status per `PROJECT_STATE.md` dependency registry. |
| **FE-07** | Undertakings, Expiry, Reports and Audit UI | Blocked by `BE-09`, `BE-07` (Depends on `BE-09`, `BE-07`, `FE-04`) | **BLOCKED** | Kept in non-implemented blocked status per `PROJECT_STATE.md` dependency registry. |

---

## 3. Genuine Frontend Defects Discovered & Hardening Fixes

During the audit, the following edge cases and defects were identified and resolved:

### 3.1 Design System Semantic Variable Aliases (`frontend/src/styles/tokens.css`)
- **Defect:** Component styles in `ProtectedRoute.tsx`, `AccessDeniedPage.tsx`, and `Header.tsx` referenced semantic color tokens `--color-text-main`, `--color-text-muted`, `--color-danger`, and `--color-danger-bg`. These tokens were missing from `tokens.css`, causing fallback issues in high-contrast or customized browser environments.
- **Fix:** Added canonical aliases in `tokens.css` mapping:
  - `--color-text-main: var(--color-foreground);`
  - `--color-text-muted: var(--color-muted-foreground);`
  - `--color-danger: var(--color-error);`
  - `--color-danger-bg: var(--color-error-bg);`

### 3.2 Elimination of Raw Hex Colors in Auth Error UI (`ProtectedRoute.tsx`, `AccessDeniedPage.tsx`)
- **Defect:** Hardcoded raw hex colors `#fee2e2` and `#fef2f2` were used in access-denied icon containers, violating the `ui-ux-pro-max` design system requirement of zero unstyled hex values.
- **Fix:** Replaced hardcoded hex strings with `var(--color-error-bg)` and aligned danger text to `var(--color-error)`.

### 3.3 Modal Rejection Error Handling (`frontend/src/components/scrutiny/ReviewActionModal.tsx`)
- **Defect:** When executing a workflow transition (e.g., issuing a deficiency notice or granting approval), an asynchronous server error (such as HTTP 400 invalid transition or HTTP 403 role forbidden) caused an uncaught promise rejection without user feedback in the modal.
- **Fix:** Wrapped `await onSubmit(...)` in a `try/catch` block. On rejection, the error message is extracted and displayed directly inside the modal's alert banner (`validationError`), keeping the modal open so reviewers can amend their justification or retry.

### 3.4 Inflight Re-evaluation Guard & Error Banner (`frontend/src/pages/EvcCaseDetailPage.tsx`)
- **Defect:** Repeated clicks on the "Re-evaluate Compliance (DOC-06)" button triggered duplicate concurrent network requests. Furthermore, backend network errors during re-evaluation were silently logged to the console without UI feedback.
- **Fix:**
  1. Added an inflight guard: `if (!applicationId || isEvaluating) return;`
  2. Added a `complianceError` state and rendered a dismissible `<Alert variant="error">` banner.
  3. Added a `transitionSuccessMessage` state and rendered a success alert banner upon completing a state transition.

### 3.5 Navigation Button Standardization (`EvcCaseDetailPage.tsx`, `EvcCaseHeader.tsx`)
- **Defect:** "Return to EVC Queue" navigation actions used unstyled HTML `<button>` elements with inline style overrides rather than the design system `<Button>` component.
- **Fix:** Replaced both instances with `<Button variant="outline" size="sm" leftIcon={<ArrowLeft />}>Return to EVC Queue</Button>`.

### 3.6 Defensive Truncation of SHA-256 Checksums (`DocumentVerificationMatrixView.tsx`)
- **Defect:** `doc.sha256Checksum.slice(0, 10)` caused a fatal `TypeError` if `sha256Checksum` was missing or shorter than 16 characters in simulated or partially processed document records.
- **Fix:** Added a defensive condition:
  ```tsx
  {doc.sha256Checksum && doc.sha256Checksum.length >= 16
    ? `${doc.sha256Checksum.slice(0, 10)}...${doc.sha256Checksum.slice(-6)}`
    : doc.sha256Checksum || '—'}
  ```

### 3.7 Defensive Handling of Findings Array (`InfrastructureReviewView.tsx`)
- **Defect:** When `compliance.findings` was undefined in partial responses or mock objects, `.filter()` and `.length` crashed the component tree.
- **Fix:** Guarded with `const safeFindings = Array.isArray(findings) ? findings : [];` across filtering, statistics, and list rendering.

### 3.8 Document Download Object URL Resilience (`InspectionChecklistEvidenceView.tsx`, `DocumentVerificationMatrixView.tsx`)
- **Defect:** Invoking `window.URL.createObjectURL(blob)` in environments without object URL support (such as headless Node.js/JSDOM) threw unhandled exceptions.
- **Fix:** Added defensive environment checks `typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function'` before DOM anchor clicks, and registered mock implementations in `frontend/src/test/setup.ts`.

### 3.9 Double-Click Submission Guard (`ApplicationWizardPage.tsx`)
- **Defect:** Rapid multiple clicks on the final "Submit Application" button could trigger race conditions before the first submission returned.
- **Fix:** Added `if (state.isSubmitting) return;` at the entry point of `handleSubmitApplication`.

---

## 4. Test Suite & Verification Results

A dedicated hardening regression test suite was created: `frontend/src/__tests__/integration-hardening.spec.tsx`.

### Summary of Full Test Run (Vitest v2.1.9)
```text
Test Files  18 passed (18)
     Tests  128 passed (128)
  Duration  13.18s
```

### Breakdown of Test Suites:
1. `src/__tests__/api-client.spec.ts` (7 tests) — Envelope unwrapping, header tracing, network aborts
2. `src/__tests__/auth-service.spec.ts` (5 tests) — Login, me, token delegation
3. `src/__tests__/auth-context.spec.tsx` (6 tests) — Session initialization, login/logout transitions
4. `src/__tests__/role-nav.spec.tsx` (7 tests) — RBAC link filtering for all 8 roles
5. `src/__tests__/login-page.spec.tsx` (8 tests) — Accessible login form, validation, return URL redirection
6. `src/__tests__/routes.spec.tsx` (8 tests) — Protected routes, 403 access denied, 404 fallback
7. `src/__tests__/applications-service.spec.ts` (6 tests) — Application CRUD, submission, document listing
8. `src/__tests__/documents-service.spec.ts` (3 tests) — Multipart upload, blob download, delete
9. `src/__tests__/application-wizard.spec.tsx` (10 tests) — 5-step wizard, quota validation, magic bytes, submission
10. `src/__tests__/components.spec.tsx` (11 tests) — UI design system primitives (Button, Badge, Modal, etc.)
11. `src/__tests__/shell.spec.tsx` (3 tests) — Header, sidebar, mobile navigation drawer
12. `src/__tests__/scrutiny-service.spec.ts` (7 tests) — Dossier report fetching, recalculation, workflow transitions
13. `src/__tests__/scrutiny-queue.spec.tsx` (7 tests) — Scrutiny queue filtering, search, pagination, status badges
14. `src/__tests__/case-detail.spec.tsx` (9 tests) — Case header, dossier findings, document matrix, modal justification
15. `src/__tests__/evc-service.spec.ts` (7 tests) — EVC queue, compliance assist evaluation, scheduling boundary
16. `src/__tests__/evc-queue.spec.tsx` (8 tests) — EVC queue filtering, inspection trigger indicators, navigation
17. `src/__tests__/evc-case-detail.spec.tsx` (8 tests) — Infrastructure heuristics, inspection checklist aid, SHC hearing
18. `src/__tests__/integration-hardening.spec.tsx` (6 tests) — Modal rejection catch, inflight guards, transition alerts, download resilience

### Compiler, Linter & Build Verification:
- **`npm run typecheck`:** 0 errors (`tsc --noEmit` passed with strict mode enabled).
- **`npm run lint`:** 0 errors, 0 warnings (`eslint "src/**/*.{ts,tsx}" --max-warnings=0`).
- **`npm run format:check`:** All files conform to Prettier formatting standards.
- **`npm run build`:** Production bundle built successfully (`dist/index.html` 1.36 kB, `dist/assets/index.css` 25.56 kB, `dist/assets/index.js` 456.00 kB).

---

## 5. Testing Verification Levels & Live Testing Limitation

To maintain strict scientific and engineering rigor, the following testing tiers are explicitly distinguished:

| Level | Testing Tier | Method / Environment | Status | Scope & Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Frontend Unit & Component Tests** | Vitest 2.1.9 + JSDOM + React Testing Library | **PASSED** | 18 test suites, 128 tests covering route guards, rendering, download triggers, stepper validation, and modal FSM transitions. |
| **Tier 2** | **Source-Level Contract Inspection** | Static inspection of NestJS controllers (`backend/src/`) vs frontend service clients (`frontend/src/api/services/`) | **PASSED** | Verified route paths, DTO structures, `@Roles` decorators, and multi-tenant scoping. |
| **Tier 3** | **Live Backend API Integration** | HTTP requests over port 3000 (`http://localhost:3000/api/v1/health`) | **NOT EXERCISED** | Probing with `curl.exe` confirmed no backend daemon was active during testing. No live network round-trips were performed. |
| **Tier 4** | **Database-Backed End-to-End Testing** | Full stack with PostgreSQL 16 JSONB, Redis BullMQ, and Docker Compose | **NOT EXERCISED** | Database row locking, Redis SLA timers, and migration states were not evaluated in a live runtime. |

> [!WARNING]
> Because Tier 3 (Live Backend API Integration) and Tier 4 (Database E2E) were not exercised, the system is **contract-verified and unit-tested**, but **not certified as live-integrated**. Full live integration testing must take place once the backend daemon is started.

---

## 6. Actionable Backend & Capability Handoff for M1 & M2

For complete technical specifications and curl verification commands, refer to [`docs/ui/backend-integration-handoff.md`](./backend-integration-handoff.md).

### 6.1 Formal Project-Chunk Dependency Graph (Authoritative `PROJECT_STATE.md`)
The formal dependency graph defined in `PROJECT_STATE.md` governs milestone gating:
- **`BE-05`:** Versioned regulatory rules and checklists (`backend/src/rules/`) — `COMMITTED`.
- **`BE-06`:** Workflow FSM and transition guards (`backend/src/workflow/`) — `COMMITTED`.
- **`BE-07`:** Cryptographic audit ledger and proof verification (`backend/src/audit/`) — `PLANNED` (Depends on `BE-02`).
- **`BE-08`:** Durable SLA timers and escalation engine (`backend/src/sla/`) — `BLOCKED` (Depends on `BE-06`, `BE-07`).
- **`BE-09`:** Undertakings, lease and expiry tracker (`backend/src/undertakings/`) — `BLOCKED` (Depends on `BE-05`, `BE-08`).
- **`FE-05`:** Role-specific dashboards, SLA, alerts and analytics — `BLOCKED` (Depends on `FE-04`, `BE-08`).
- **`FE-07`:** Undertakings, expiry, reports and audit UI — `BLOCKED` (Depends on `BE-09`, `BE-07`, `FE-04`).

*Correction Note:* Downstream chunks `FE-05` and `FE-07` are blocked strictly by their declared dependencies (`BE-08` for `FE-05`; `BE-09` and `BE-07` for `FE-07`). They are NOT blocked by `BE-05` (which is already committed). Furthermore, finding-level clarification persistence and expert roster scheduling are unassigned interface gaps, not parts of `BE-05` or `BE-07`.

### 6.2 Backend Permission / Authorization Findings

#### Finding A — `SHC_SAC_MEMBER` Application Read Access
- **Files & Lines:** `backend/src/applications/applications.controller.ts` (lines 90–98, 129–137, 258–267)
- **Current Declaration:**
  ```typescript
  @Roles(
    UserRole.INSTITUTION_USER,
    UserRole.SCRUTINY_OFFICER,
    UserRole.REGIONAL_OFFICER,
    UserRole.BUREAU_HEAD,
    UserRole.SYSTEM_ADMIN,
    UserRole.AUDITOR,
    UserRole.EVC_INSPECTOR,
  )
  ```
- **Observed Behavior:** `UserRole.SHC_SAC_MEMBER` is omitted from `GET /applications`, `GET /applications/:id`, and `GET /applications/:id/documents`.
- **Impact:** Standing Hearing Committee (`SHC_SAC_MEMBER`) members permitted by `frontend/src/auth/roleRoutes.ts` to access committee cases receive HTTP 403 Forbidden when attempting to view institutional applications, even though they are authorized to read dossier reports (`dossier-report`) and compliance assessments (`compliance-assist`).
- **Recommendation for M2 & M1:** M2 to review with M1 whether `SHC_SAC_MEMBER` should be granted read-only access to institutional applications and document attachments, and if approved, add `UserRole.SHC_SAC_MEMBER` to the `@Roles(...)` decorators in `applications.controller.ts`.

#### Finding B — `BUREAU_HEAD` Dossier Re-evaluation Mutation Policy
- **Files & Lines:** `backend/src/verification/dossier-report.controller.ts` (lines 46–51, 87–92 vs lines 127–136)
- **Current Declaration:**
  - `GET /applications/:id/dossier-report`: Allows `INSTITUTION_USER`, `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `EVC_INSPECTOR`, `SHC_SAC_MEMBER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`, `AUDITOR`.
  - `POST /applications/:id/dossier-report` & `POST .../evaluate`: Allows only `INSTITUTION_USER`, `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `SYSTEM_ADMIN`.
- **Analysis:** Read permission on `GET` does not inherently mandate mutation permission on `POST`. Bureau Heads may be intentionally configured as supervisory reviewers rather than operational recalculation actors.
- **Recommendation for M2 & M1:** M2 and M1 should explicitly decide whether Bureau Heads require authority to trigger full multi-pipeline recalculation via `POST`. If authorized, update the decorator and controller tests; otherwise, maintain the current read-only boundary.

### 6.3 Missing Backend Capabilities & Uncontracted Interface Gaps

1. **Finding-Level Clarification/Disposition Persistence:**
   - Currently, workflow state transitions apply at the application level via `POST /api/v1/applications/:id/transitions`.
   - The backend does not yet provide endpoints or database entities to persist reviewer annotations or status changes on individual findings (`APPROVED_BY_OFFICER`, `DEFICIENCY_FLAGGED`, `OVERRIDDEN_WITH_JUSTIFICATION`).
   - *Status:* Uncontracted feature seam. M1/M2 to define a contract when individual finding disposition persistence is scheduled.
2. **Committee Hearing Minutes & Expert Scheduling Persistence:**
   - In `FE-06`, the Inspection Checklist operates as a local session aid, and the Expert Scheduling tab displays workflow-bound state.
   - The backend currently lacks a centralized expert roster table, conflict-of-interest declarations API, and committee hearing minutes persistence endpoint.
   - *Status:* Uncontracted feature seam. M1/M2 to define dedicated scheduling contracts if persistent committee management is required.

### 6.4 Frontend Functionality That Remains Intentionally Read-Only

1. **Inspection Checklist & Evidence Aid (`FE-06`):**
   - The interactive tri-state inspection checklist in `InspectionChecklistEvidenceView.tsx` operates in local component state as a session aid for visiting experts, explicitly labeled as local draft / non-persisted.
2. **Expert Scheduling & Roster Overview (`FE-06`):**
   - Renders current application assignment state, disables mutation triggers, and displays explicit notices explaining that expert assignment is managed externally.
3. **ADR-004 Human Sovereignty Compliance:**
   - All AI/automated heuristic findings, deficiency recommendations, and OCR scores remain prominently displayed as advisory inputs, ensuring statutory determinations stay with authorized officers.

---

## 7. Verification Status & Recommended Next Steps (Live Integration Pending)

The frontend workspace for ApprovalSync (`FE-01` through `FE-06`) is **contract-verified, hardened, and unit-tested**.

### Next Actions:
1. **M1 / M2 Action:** Review Findings A and B in [`docs/ui/backend-integration-handoff.md`](./backend-integration-handoff.md) and establish policy on `SHC_SAC_MEMBER` and `BUREAU_HEAD` permissions.
2. **Backend Spin-Up:** Launch the NestJS backend and PostgreSQL database to exercise Tier 3 (Live Backend API Integration).
3. **Gating Discipline:** Do NOT start downstream frontend milestones `FE-05` (blocked by `BE-08`) or `FE-07` (blocked by `BE-09`, `BE-07`) until their prerequisite backend modules are committed.
