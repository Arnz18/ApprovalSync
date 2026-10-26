# ApprovalSync — Backend Integration & Authorization Handoff

> **Prepared By:** M4 — Frontend & Experience  
> **Target Audience:** M1 (Platform & Integration) and M2 (Backend Core & Workflow)  
> **Date:** 2026-10-26  
> **Repository:** `https://github.com/Arnz18/ApprovalSync.git`  
> **Branch:** `main`  
> **Companion Document:** [`docs/ui/frontend-integration-audit.md`](./frontend-integration-audit.md)  
> **Purpose:** Document confirmed authorization discrepancies, separate formal project-chunk dependencies from uncontracted capabilities, and provide an actionable roadmap for live backend pairing.

---

## 1. Executive Summary

During the frontend integration audit across milestones `FE-01` through `FE-06`, the frontend codebase was verified against the frozen contracts and real NestJS backend source code in `backend/src/`. All 18 frontend test suites (128 automated tests) pass with strict TypeScript compilation and clean ESLint checks.

However, because no backend daemon was active on port 3000 during testing, **live end-to-end HTTP integration was not exercised**. The frontend is currently **contract-verified at the source and unit test level**, with live API validation pending backend deployment.

This document outlines:
1. **Two specific backend role authorization findings** (`Finding A` and `Finding B`) that require an explicit policy decision and code review by M2 and M1.
2. **Clarification of the formal dependency graph**, explicitly decoupling missing backend features from formal chunk scopes.
3. **Identification of uncontracted feature seams** (finding-level persistence and expert roster scheduling).
4. **An actionable runbook** for live backend integration testing.

---

## 2. Backend Permission & Authorization Findings

### Finding A — `SHC_SAC_MEMBER` Application Read Access Omission

- **Target File:** `backend/src/applications/applications.controller.ts`
- **Target Endpoints:**
  1. `GET /api/v1/applications` (lines 90–98) — List applications
  2. `GET /api/v1/applications/:id` (lines 129–137) — Get application details
  3. `GET /api/v1/applications/:id/documents` (lines 258–267) — List application documents

#### Current Source Code State
```typescript
@Get()
@Roles(
  UserRole.INSTITUTION_USER,
  UserRole.SCRUTINY_OFFICER,
  UserRole.REGIONAL_OFFICER,
  UserRole.BUREAU_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.AUDITOR,
  UserRole.EVC_INSPECTOR,
)
async getApplications(...) { ... }
```

#### Problem Analysis
- In `backend/src/shared/contracts/enums.ts`, `UserRole.SHC_SAC_MEMBER` is defined as one of the 8 canonical roles.
- Standing Hearing Committee (`SHC_SAC_MEMBER`) members **are authorized** to retrieve:
  - Dossier reports: `GET /api/v1/applications/:id/dossier-report` (`DossierReportController`, line 132)
  - Validation reports: `GET /api/v1/applications/:id/validation-report` (`VerificationController`, line 100)
  - Compliance assist: `GET /api/v1/applications/:id/compliance-assist` (`ComplianceController`, line 128)
- However, `SHC_SAC_MEMBER` **is omitted** from `@Roles(...)` on `GET /applications`, `GET /applications/:id`, and `GET /applications/:id/documents`.
- **Observed Behavior:** When an `SHC_SAC_MEMBER` logs in and navigates to the EVC/Committee workspace (`/evc`), the frontend requests `GET /api/v1/applications` and `GET /api/v1/applications/:id`. The backend NestJS `RolesGuard` rejects the request with **HTTP 403 Forbidden**.

#### Actionable Recommendation for M2 & M1
- **Recommendation:** Coordinate with M1 to confirm intended access. If Standing Hearing Committee members are meant to inspect application records escalated to them, add `UserRole.SHC_SAC_MEMBER` to the `@Roles(...)` decorator across all three read routes in `applications.controller.ts` and update the controller spec (`applications.controller.spec.ts`).
- **Proposed Patch (for M2):**
  ```diff
  --- a/backend/src/applications/applications.controller.ts
  +++ b/backend/src/applications/applications.controller.ts
  @@ -96,6 +96,7 @@ export class ApplicationsController {
       UserRole.SYSTEM_ADMIN,
       UserRole.AUDITOR,
       UserRole.EVC_INSPECTOR,
  +    UserRole.SHC_SAC_MEMBER,
     )
  ```

---

### Finding B — `BUREAU_HEAD` Dossier Evaluation Mutation Policy

- **Target File:** `backend/src/verification/dossier-report.controller.ts`
- **Target Endpoints:**
  1. `POST /api/v1/applications/:id/dossier-report` (lines 46–51) — Execute multi-pipeline dossier evaluation
  2. `POST /api/v1/applications/:id/dossier-report/evaluate` (lines 87–92) — Evaluation action alias
  3. `GET /api/v1/applications/:id/dossier-report` (lines 127–136) — Retrieve dossier verification report

#### Current Source Code State
```typescript
// Mutation Route (POST)
@Post('applications/:id/dossier-report')
@Roles(
  UserRole.INSTITUTION_USER,
  UserRole.SCRUTINY_OFFICER,
  UserRole.REGIONAL_OFFICER,
  UserRole.SYSTEM_ADMIN,
)

// Read Route (GET)
@Get('applications/:id/dossier-report')
@Roles(
  UserRole.INSTITUTION_USER,
  UserRole.SCRUTINY_OFFICER,
  UserRole.REGIONAL_OFFICER,
  UserRole.EVC_INSPECTOR,
  UserRole.SHC_SAC_MEMBER,
  UserRole.BUREAU_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.AUDITOR,
)
```

#### Problem Analysis
- `BUREAU_HEAD` has read access (`GET`), but is omitted from evaluation mutation (`POST`).
- **Engineering Principle:** Read permission does not imply write/mutation permission. Multi-pipeline dossier recalculation (OCR matching, duplicate checks, issuer verification, compliance rules) is computationally expensive.
- **Architectural Question:** Should Bureau Heads be authorized to trigger fresh evaluation runs, or is their role strictly executive/supervisory (consuming existing cached reports while Scrutiny Officers and Regional Officers trigger evaluations)?

#### Actionable Recommendation for M2 & M1
- **Recommendation:** M2 and M1 must determine the formal policy:
  - *Option 1 (Supervisory Read-Only):* Maintain current behavior. `BUREAU_HEAD` reads cached reports; the frontend will continue to render the dossier report in read-only mode for Bureau Heads.
  - *Option 2 (Full Mutation Authority):* If Bureau Heads should have the authority to trigger re-evaluations during final decision review, add `UserRole.BUREAU_HEAD` to `@Roles(...)` on the `POST` endpoints in `dossier-report.controller.ts`.

---

## 3. Formal Project-Chunk Dependencies vs Uncontracted Features

To avoid confusion during downstream milestone planning, the formal project dependency graph must be strictly distinguished from uncontracted capabilities:

### 3.1 Formal Project-Chunk Dependency Graph (`PROJECT_STATE.md`)

```
+-------------------------------------------------------------------------------------------------+
|                                  Formal Chunk Dependency Graph                                  |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   BE-04 (Intake) --------> BE-05 (Rules & Checklists) --------> BE-06 (Workflow FSM)           |
|                                [COMMITTED]                          [COMMITTED]                 |
|                                                                          |                      |
|   BE-02 (Database) ------> BE-07 (Audit Ledger) -----------------+       |                      |
|                                [PLANNED]                         |       |                      |
|                                                                  v       v                      |
|                                                              BE-08 (SLA Timers)                 |
|                                                                  [BLOCKED]                      |
|                                                                  |       |                      |
|                                  +-------------------------------+       |                      |
|                                  |                                       v                      |
|                                  v                               BE-09 (Undertakings & Expiry)  |
|                         FE-05 (Dashboards & SLA)                         [BLOCKED]              |
|                               [BLOCKED]                                  |                      |
|                                                                          v                      |
|                                                              FE-07 (Undertakings & Audit UI)    |
|                                                                          [BLOCKED]              |
+-------------------------------------------------------------------------------------------------+
```

- **`BE-05` (Rules & Checklists):** Strictly covers `backend/src/rules/` and rule admin fixtures. It is already `COMMITTED` and does **not** include finding-level clarification persistence.
- **`BE-07` (Audit Ledger):** Strictly covers `backend/src/audit/`, RFC 6962 chained audit blocks, and Merkle tree verification. It is `PLANNED` and does **not** include expert roster scheduling or photo evidence uploads.
- **`BE-08` (SLA Timers):** Depends on `BE-06` and `BE-07`. It is `BLOCKED` awaiting `BE-07`.
- **`BE-09` (Undertakings & Expiry):** Depends on `BE-05` and `BE-08`. It is `BLOCKED`.
- **`FE-05` (Role Dashboards, SLA, Alerts):** Depends on `FE-04` and `BE-08`. It is `BLOCKED` awaiting `BE-08`.
- **`FE-07` (Undertakings, Expiry, Reports & Audit UI):** Depends on `BE-09`, `BE-07`, and `FE-04`. It is `BLOCKED`.

### 3.2 Uncontracted Capability Gaps (Requires M1/M2 Contract Specification)

The following capabilities surfaced during UI review but are currently **unassigned to any formal chunk in `PROJECT_STATE.md`**:

#### 1. Finding-Level Clarification & Reviewer Annotation Persistence
- **Context:** In `FE-04` (Scrutiny) and `FE-06` (EVC), officers inspect individual evidence-linked findings from `dossier-report` and `compliance-assist`.
- **Current State:** Workflow transitions apply solely to the overall application via `POST /api/v1/applications/:id/transitions`.
- **Gap:** There is no database entity or REST endpoint to store per-finding dispositions (`APPROVED_BY_OFFICER`, `DEFICIENCY_FLAGGED`, `OVERRIDDEN_WITH_JUSTIFICATION`) or reviewer commentary on individual findings.
- **Action for M1/M2:** If finding-level dispositions are required for demo, M1 must define a contract in `docs/contracts/` (e.g., `POST /api/v1/applications/:id/findings/:findingId/disposition`) and M2 should implement persistence.

#### 2. EVC Expert Roster Management & Hearing Minutes
- **Context:** In `FE-06`, the Inspection Checklist operates as an in-memory session aid for visiting officers, and the Expert Scheduling tab displays workflow-bound status.
- **Current State:** The backend lacks an expert roster database, conflict-of-interest declarations API, and committee hearing minutes persistence.
- **Gap:** These features do not belong to `BE-07` (which is cryptographic audit hashing). They represent uncontracted backend capabilities.
- **Action for M1/M2:** If persistent committee scheduling or photo uploads are desired, M1 should specify a dedicated contract (e.g., `docs/contracts/evc-scheduling.md`).

---

## 4. Frontend Functionality Intentionally Read-Only / Session-Local

To prevent misunderstandings during evaluation, M4 confirms that the following frontend features are intentionally read-only or session-local:

1. **Inspection Checklist & Evidence Aid (`FE-06`):**
   - The interactive tri-state checklist in `InspectionChecklistEvidenceView.tsx` operates in local component state as a session aid for visiting inspectors on-site. It displays a prominent disclaimer: *"Local session draft — not persisted to server."*
2. **Expert Scheduling & Roster Overview (`FE-06`):**
   - Renders current workflow-bound assignment state. Mutation buttons are disabled with explanatory text noting that expert assignments are managed via council workflow.
3. **ADR-004 Human Sovereignty Framing:**
   - All compliance assist findings, OCR validation scores, and inspection triggers display prominent informational banners stating that automated heuristics are advisory inputs only. Statutory decisions require human review.

---

## 5. Live Backend Integration Runbook for M1 & M2

When the backend environment is spun up, follow this verification checklist to validate frontend-backend integration:

### Step 1: Start Backend Services
```bash
# Start PostgreSQL & Redis
docker-compose up -d postgres redis

# Run database migrations & seed data
cd backend
npm run migration:run
npm run seed:demo

# Start NestJS backend (runs on port 3000)
npm run start:dev
```

### Step 2: Verify Backend Health
```bash
curl -s http://localhost:3000/api/v1/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}
```

### Step 3: Test Key Contract Endpoints via curl

#### Authentication
```bash
# Authenticate as Scrutiny Officer
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"scrutiny.officer@aicte-india.org","password":"Password123!"}'
# Save returned token: export TOKEN="<jwt>"
```

#### Application Listing & Details
```bash
curl -s http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:3000/api/v1/applications/<app-id> \
  -H "Authorization: Bearer $TOKEN"
```

#### Workflow FSM & Transitions
```bash
curl -s http://localhost:3000/api/v1/applications/<app-id>/allowed-transitions \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:3000/api/v1/applications/<app-id>/timeline \
  -H "Authorization: Bearer $TOKEN"
```

#### Dossier Verification & Compliance Assist
```bash
curl -s http://localhost:3000/api/v1/applications/<app-id>/dossier-report \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:3000/api/v1/applications/<app-id>/compliance-assist \
  -H "Authorization: Bearer $TOKEN"
```

### Step 4: Run Frontend Against Live Backend
```bash
cd frontend
npm run dev
# Browser opens at http://localhost:5173 with Vite proxying /api to http://localhost:3000
```
- Log in with test credentials across all 8 roles.
- Verify that `SHC_SAC_MEMBER` receives valid data at `/evc` once Finding A is addressed.
- Exercise document downloads and workflow state transitions end-to-end.
