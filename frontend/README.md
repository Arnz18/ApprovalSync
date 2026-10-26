# ApprovalSync — Frontend Architecture & Developer Guide

> **Milestones:**
> - **FE-01** — Frontend shell, design system, routing and API client (`COMMITTED`)
> - **FE-02** — Login, role-aware navigation and session handling (`COMMITTED`)
> - **FE-03** — Institution application wizard and document upload (`COMMITTED`)
> - **FE-04** — Scrutiny queue, case detail and evidence review (`COMMITTED`)
> - **FE-05** — Role-specific dashboards, SLA, alerts & analytics (`COMMITTED`)
> - **FE-06** — EVC scheduling, inspection and committee workspace (`COMMITTED`)
> **Lead Owner:** M4 — Frontend & Experience
> **Framework:** React 18 + TypeScript 5 + Vite 5 Single-Page Application (SPA)
> **Status:** FE-01 through FE-06 IMPLEMENTED & HARDENED (22 test suites, 177 automated tests passing)
> **Documentation:** [`docs/ui/fe-05-dashboards-sla-alerts.md`](../docs/ui/fe-05-dashboards-sla-alerts.md), [`docs/ui/frontend-integration-audit.md`](../docs/ui/frontend-integration-audit.md), [`docs/ui/backend-integration-handoff.md`](../docs/ui/backend-integration-handoff.md)

---

## 1. Overview and Architecture

ApprovalSync is an AI-powered regulatory compliance, document authentication, and decision-support platform designed for AICTE approval workflows. The frontend provides a serious, high-density, accessible institutional workspace for college representatives, scrutiny officers, regional directors, and expert inspection committee members.

### Core Architectural Decisions
- **Framework & Bundler:** React 18.3 + Vite 5.4 SPA (fast HMR, sub-second production builds).
- **Type Safety:** TypeScript 5.5 with strict compiler options (`noImplicitAny`, `noUnusedLocals`, `strictNullChecks`).
- **Routing & Route Guards:** React Router v6 with declarative `<ProtectedRoute>` guards, return-path preservation with open-redirect sanitization (`getSafeReturnUrl`), and accessible 404 not-found / 403 access-denied fallbacks.
- **Centralized Authentication & Session Model:** Implemented in `src/auth/` adhering to BE-03 contracts. Session state is modeled explicitly (`INITIALIZING`, `UNAUTHENTICATED`, `AUTHENTICATING`, `AUTHENTICATED`, `ERROR`). Session bootstrap verifies bearer tokens on application startup against `GET /api/v1/auth/me` without flashing protected content.
- **Token Handling Strategy:** Scoped to `sessionStorage` (with in-memory fallback) to restrict token exposure to the active browser tab/session, avoiding persistent `localStorage` cross-tab XSS persistence.
- **Role-Based Access Control (RBAC):** Strict presentation-layer mapping based on the frozen `UserRole` enum (`INSTITUTION_USER`, `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `EVC_INSPECTOR`, `SHC_SAC_MEMBER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`, `AUDITOR`). Navigation links and routes fail closed by default. The real backend remains the authoritative security boundary.
- **Application Intake Wizard (FE-03):** 5-step institutional workflow (`src/applications/`, `src/components/wizard/`) mapping directly to `BE-04` application intake contracts and `DOC-01` secure multipart document uploads.
- **Visual Design System:** Built following the `ui-ux-pro-max` design intelligence framework, utilizing a **Swiss Minimalism & Enterprise Gateway** visual direction with a balanced, high-trust institutional color palette, Lexend/Source Sans 3 typography, CSS custom properties, and zero raw hex values in components.
- **Centralized Typed API Client:** Native `fetch`-based client adhering to `docs/contracts/api-conventions.md`: handles `ApiResponse<T>` and `ApiErrorResponse` envelopes, automated `X-Correlation-Id` generation, dynamic bearer token injection via `apiClient.setAuthTokenProvider(getStoredToken)`, query parameter serialization, `FormData` multipart uploads without boundary overwrites, configurable timeout aborts, and network failure resilience.
- **Institutional Safety Boundary:** Enforces the Human Sovereignty principle (ADR-004): automated document validation, OCR extraction, and anomaly scores are prominently framed as advisory decision support. Prominent `SIMULATED / MOCK DATA` badges are rendered on synthetic records.

---

## 2. Directory Structure

```text
frontend/
├── index.html                   # HTML entry point with preconnected typography fonts
├── vite.config.ts               # Vite configuration with @/ alias, port 5173, /api proxy, and Vitest setup
├── tsconfig.json                # TypeScript compiler configuration (strict)
├── tsconfig.node.json           # Node configuration for build tools
├── .eslintrc.cjs                # ESLint configuration
├── .prettierrc                  # Prettier code formatting rules
├── .env.example                 # Public Vite environment template
└── src/
    ├── main.tsx                 # React application mount point
    ├── App.tsx                  # Root component wrapping BrowserRouter & AuthProvider
    ├── vite-env.d.ts            # Vite client environment typing declarations
    ├── test/
    │   └── setup.ts             # Vitest test setup (@testing-library/jest-dom, window.scrollTo mock)
    ├── auth/                    # FE-02 Authentication & RBAC Layer
    │   ├── types.ts             # AuthUser, LoginCredentials, AuthStatus, AuthInitError
    │   ├── sessionStorage.ts    # Scoped sessionStorage token management & memory fallback
    │   ├── AuthContext.tsx      # Centralized AuthProvider & session lifecycle
    │   ├── useAuth.ts           # Typed useAuth hook with safe guest fallback
    │   ├── roleRoutes.ts        # RBAC permissions matrix, role titles, and return-path sanitizer
    │   └── index.ts             # Master exports for auth layer
    ├── applications/            # FE-03 Application Intake Domain
    │   ├── types.ts             # Application & document DTOs, category requirements, wizard state model
    │   ├── validation.ts        # Syntactic & business rule validators for wizard steps
    │   └── index.ts             # Application domain exports
    ├── styles/
    │   ├── tokens.css           # Design tokens (colors, typography, spacing, radius, shadows)
    │   ├── components.css       # Reusable component styles & wizard card layouts
    │   ├── layout.css           # Application shell, header, sidebar, mobile drawer, footer
    │   └── index.css            # Global base styles, reset, and focus rings
    ├── sla/                     # FE-05 SLA Domain & Utilities
    │   ├── types.ts             # SlaTimerStatus, SlaEscalationLevel, SlaPolicyClassification, DTOs
    │   └── slaUtils.ts          # Timezone-safe countdown, SLA urgency derivation, calendar aging
    ├── api/
    │   ├── types.ts             # Shared DTO envelopes and frozen domain enums
    │   ├── client.ts            # Centralized typed ApiClient with correlation tracing & token injection
    │   ├── index.ts             # Public API layer exports
    │   └── services/
    │       ├── authService.ts   # BE-03 Auth API Service (/auth/login, /auth/me)
    │       ├── applicationsService.ts # BE-04 Application Service (CRUD, drafts, submit, doc list)
    │       ├── documentsService.ts    # DOC-01 Document Upload Service (multipart upload, get, delete)
    │       ├── scrutinyService.ts     # FE-04 / BE-05 Scrutiny Review Service
    │       ├── evcService.ts          # FE-06 / BE-06 EVC Inspection Service
    │       ├── slaService.ts          # FE-05 / BE-08 SLA Timers, Policies & Escalations Service
    │       └── healthService.ts # Health check service (/health, /liveness, /readiness)
    ├── components/
    │   ├── ui/                  # Reusable design system components
    │   ├── wizard/              # FE-03 Application Intake Wizard Components
    │   ├── scrutiny/            # FE-04 Scrutiny Review Components
    │   ├── evc/                 # FE-06 EVC Committee & Inspection Components
    │   ├── sla/                 # FE-05 SLA Timer, Modal & Escalation Components
    │   │   ├── SlaTimerBadge.tsx       # Semantic status badges (ACTIVE, WARNING, BREACHED, PAUSED)
    │   │   ├── SlaTimerCard.tsx        # SLA timer card with countdown & pause/resume triggers
    │   │   ├── PauseTimerModal.tsx     # Mandatory human justification capture modal
    │   │   ├── SlaEscalationList.tsx   # Filterable escalation table by tier & severity
    │   │   ├── SlaPolicyModal.tsx      # Configured stage policies with demo disclaimer
    │   │   └── ManualReconciliationBanner.tsx # Admin-gated manual SLA reconciliation sweep
    │   ├── dashboard/           # FE-05 Dashboard Metric & Analytics Components
    │   │   ├── DashboardMetricsOverview.tsx # KPI summary cards
    │   │   ├── ApplicationStatusChart.tsx   # Visual status progression meter
    │   │   ├── ApplicationAgingBreakdown.tsx # Application turnaround & aging buckets
    │   │   └── DerivedAlertsFeed.tsx        # Real server-derived operational alert feed
    │   └── layout/              # Application workspace shell
    ├── pages/
    │   ├── HomePage.tsx         # Primary institutional overview and interactive design sandbox
    │   ├── LoginPage.tsx        # Institutional login page with inline validation & dev helper
    │   ├── DashboardPage.tsx    # FE-05 Master Dashboard coordinator & role-aware dispatcher
    │   ├── dashboard/           # FE-05 Role-tailored dashboard views
    │   │   ├── InstitutionDashboard.tsx # Institution tenant-isolated view
    │   │   ├── ScrutinyDashboard.tsx    # Scrutiny officer queue & active SLA monitors
    │   │   ├── RegionalDashboard.tsx    # Regional officer workload & Tier 2 escalations
    │   │   ├── BureauDashboard.tsx      # Council throughput & Tier 3 escalations
    │   │   └── AuditorAdminDashboard.tsx# Admin reconciliation / Auditor read-only oversight
    │   ├── ApplicationWizardPage.tsx  # FE-03 Master application intake wizard page
    │   ├── ScrutinyQueuePage.tsx      # FE-04 Scrutiny queue page
    │   ├── CaseDetailPage.tsx         # FE-04 Case detail & document verification workspace
    │   ├── EvcQueuePage.tsx           # FE-06 EVC inspection queue page
    │   ├── EvcCaseDetailPage.tsx      # FE-06 EVC case detail & committee review workspace
    │   ├── AccessDeniedPage.tsx # HTTP 403 Forbidden state with return to workspace action
    │   ├── FeaturePlaceholderPage.tsx # Standardized placeholder explaining downstream chunks
    │   └── NotFoundPage.tsx     # 404 Not Found page
    ├── routes/
    │   ├── ProtectedRoute.tsx   # Session guard, loading state, unauthenticated redirect, and 403 guard
    │   └── AppRoutes.tsx        # Centralized route mapping
    └── __tests__/               # Frontend unit & integration test suites (22 suites, 167 tests)
        ├── sla-service.spec.ts  # SLA API endpoints, query params & error parsing tests (7 tests)
        ├── sla-utils.spec.ts    # SLA countdown, urgency & calendar aging tests (13 tests)
        ├── sla-components.spec.tsx # SLA Badges, Pause modal & timer cards tests (11 tests)
        ├── dashboard-page.spec.tsx # Role-specific dashboard views & failure isolation tests (8 tests)
        └── ...                  # FE-01, FE-02, FE-03, FE-04, FE-06 test suites (128 tests)
```

---

## 3. Authentication & Session Architecture (FE-02)

### 3.1 Authentication Flow
1. **Public Login Route (`/login`):**
   - Accessible without an active session.
   - If an authenticated user navigates to `/login`, they are immediately redirected to their designated workspace or safe return destination.
   - Enforces native email and password semantics with inline client-side validation (`required`, regex email syntax).
   - Prevents duplicate submissions with disabled submit actions and `aria-busy="true"`.
   - On rejection (HTTP 401), displays generic `"Invalid email or password."` message to eliminate account enumeration attack vectors.
   - In development mode (`import.meta.env.DEV`), provides a click-to-fill helper for synthetic seed account `demo.institution@synthetic.approvalsync.local` / `DemoPass@123`.

2. **Session Bootstrap & Verification:**
   - On application mount, `AuthProvider` inspects `sessionStorage` for an existing access token.
   - If present, invokes `GET /api/v1/auth/me` with `Authorization: Bearer <token>`.
   - While verification is pending (`status === 'INITIALIZING'`), `<ProtectedRoute>` renders an accessible institutional loading screen. **No protected content is rendered before validation completes.**
   - If `401 Unauthorized` or `403 Forbidden` is returned, the stored token is invalidated and cleared, returning to `UNAUTHENTICATED`.
   - If a transient network failure occurs (`ERR_NETWORK` / `status === 'ERROR'`), the token is retained and a recoverable connection retry screen is displayed, preventing accidental logouts due to temporary backend downtime.

3. **Client-Side Token Storage & XSS Trade-offs:**
   - Tokens are stored in browser `sessionStorage` (`TOKEN_STORAGE_KEY`), falling back to memory if storage is inaccessible.
   - **Trade-off Analysis:** Unlike `localStorage` (which persists indefinitely and is vulnerable across tabs and browser restarts), `sessionStorage` is strictly scoped to the current browser tab and lifetime.
   - Tokens are never logged, placed in query parameters, or rendered in UI text.

4. **Logout Behavior:**
   - The "Sign Out" button in `Header` triggers `logout()`.
   - Clears `sessionStorage`, resets in-memory user to `null`, sets `status = 'UNAUTHENTICATED'`, and navigates to `/login`.
   - **Backend Note:** Because BE-03 issues stateless signed JWTs and does not expose a server-side revocation list/token blacklist endpoint, client-side logout invalidates the local session. The JWT remains cryptographically signed until its natural expiration (`expiresIn`).

---

## 4. Role-Based Navigation & Permissions Matrix

All route permissions are defined centrally in `src/auth/roleRoutes.ts` against the authoritative `UserRole` enum:

| Route Path | Module Title | Permitted Roles | Default Landing Role |
|---|---|---|---|
| `/` | Workspace Overview | All authenticated roles | `SYSTEM_ADMIN`, `BUREAU_HEAD`, `SHC_SAC_MEMBER` |
| `/applications` | Application Intake & Wizard | `INSTITUTION_USER`, `SYSTEM_ADMIN` | `INSTITUTION_USER` |
| `/scrutiny` | Scrutiny Officer Review Queue | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER` |
| `/verification` | Document AI & Checks | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `EVC_INSPECTOR`, `SYSTEM_ADMIN` | — |
| `/evc` | EVC Ground Inspection | `EVC_INSPECTOR`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` | `EVC_INSPECTOR` |
| `/rules` | APH Regulatory Rules | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`, `AUDITOR` | — |
| `/audit` | Cryptographic Audit Ledger | `AUDITOR`, `BUREAU_HEAD`, `SYSTEM_ADMIN` | `AUDITOR` |
| `/settings` | Platform Settings & Health | All authenticated roles | — |

---

## 5. Institution Application Wizard & Document Upload (FE-03)

### 5.1 Architecture & Workflow Overview
Milestone **FE-03** replaces the `/applications` placeholder with the complete application intake experience, providing a 5-step wizard connected directly to the `BE-04` and `DOC-01` backend endpoints:

1. **Step 1 — Institution Affiliation & Academic Profile:**
   - Shows applicant's institutional affiliation card bound to caller's `institutionId`.
   - Inputs academic year adhering to `YYYY-YYYY` pattern (e.g., `2025-2026`).
   - Selects approved program type from the frozen `ProgramType` enum (`ENGINEERING_TECHNOLOGY`, `MANAGEMENT`, `PHARMACY`, etc.).
   - Dynamically previews the statutory document categories required under AICTE Approval Process Handbook (APH) regulations for that category.
   - On advancement, creates or updates an editable draft via `POST /api/v1/applications` or `PATCH /api/v1/applications/:id`.

2. **Step 2 — Physical Infrastructure & Metrics:**
   - Captures land acreage, built-up floor area, faculty headcounts, library holdings, and lab counts.
   - Dynamic proposed courses chip list allowing addition and removal of target programs and seat intakes.
   - Persists metrics to backend draft inside `payloadJsonb`.

3. **Step 3 — Statutory Document Uploads:**
   - Real multipart file uploads against `POST /api/v1/applications/:id/documents` via `documentsService.uploadDocument`.
   - Client-side preflight convenience checks: magic-byte file signature validation (`%PDF-`, `\xFF\xD8\xFF`, `\x89PNG`) and 15MB file size limit (`DOC-01`).
   - Distinct slot states: `idle`, `uploading`, `uploaded`, and `error` with localized retry.
   - Allows document deletion via `DELETE /api/v1/applications/:id/documents/:docId`.
   - Clearly flags missing mandatory document categories before proceeding.

4. **Step 4 — Review & Statutory Declaration:**
   - Read-only summary of all entered information across all steps.
   - Quick "Edit Section" controls to jump directly to any step to correct errors.
   - Prominent missing document warning banner if required statutory evidence is absent.
   - AICTE statutory declaration oath checkbox. Final submission is disabled until checked.

5. **Step 5 — Submission Confirmation Receipt:**
   - Dispatches `POST /api/v1/applications/:id/submit` under PostgreSQL row-level pessimistic write lock.
   - Renders official receipt displaying server-generated Application Number (`APP-YYYY-XXXXXXXX`), UUID, timestamp, and next steps roadmap.
   - Provides print receipt action (`window.print()`).

### 5.2 API Services Integration
- **`applicationsService` (`src/api/services/applicationsService.ts`):**
  - `createDraft(data)` -> `POST /api/v1/applications`
  - `updateDraft(id, data)` -> `PATCH /api/v1/applications/:id`
  - `getApplication(id)` -> `GET /api/v1/applications/:id`
  - `listApplications(params)` -> `GET /api/v1/applications`
  - `submitApplication(id)` -> `POST /api/v1/applications/:id/submit`
  - `getApplicationDocuments(id)` -> `GET /api/v1/applications/:id/documents`
- **`documentsService` (`src/api/services/documentsService.ts`):**
  - `uploadDocument(applicationId, file, documentType, description)` -> `POST /api/v1/applications/:id/documents` (Constructs multipart `FormData` without boundary overwrites)
  - `getDocument(applicationId, documentId)` -> `GET /api/v1/applications/:id/documents/:documentId`
  - `deleteDocument(applicationId, documentId)` -> `DELETE /api/v1/applications/:id/documents/:documentId`

### 5.3 Human Sovereignty Principle (ADR-004)
Uploaded documents are strictly labeled **"Uploaded & Stored (Pending Regulatory Scrutiny)"**. The interface explicitly clarifies that document upload does not constitute regulatory authenticity or approval.

### 5.4 Extending or Modifying Wizard Steps
To safely add or modify a step in the wizard:
1. Update `src/applications/types.ts` to extend `ApplicationFormData` and step constants.
2. Add step validation functions to `src/applications/validation.ts`.
3. Create a step component under `src/components/wizard/` accepting `{ data, onChange, onNext, onPrev, ... }`.
4. Register the step component and total step count in `src/pages/ApplicationWizardPage.tsx`.
5. Update `WizardStepper.tsx` step labels.
6. Add unit test coverage in `src/__tests__/application-wizard.spec.tsx`.

---

## 6. Scrutiny Review & Evidence Review Workspace (FE-04)

The Scrutiny Review Workspace (`src/scrutiny/`, `src/components/scrutiny/`, `src/pages/ScrutinyQueuePage.tsx`, `src/pages/CaseDetailPage.tsx`) provides an authorized, high-density regulatory console for AICTE evaluators.

### 6.1 Architecture & Endpoints
- **Queue Route (`/scrutiny`):** Integrates with `GET /api/v1/applications` with query filters (`status`, `search`, `sortBy`, `sortOrder`, `page`, `limit`).
- **Summary Enrichment Worker:** Visible page applications are asynchronously enriched with lightweight dossier summaries (`GET /api/v1/applications/:id/dossier-report/summary`) using bounded concurrency workers (default 3 concurrent requests). Partial summary failures do not crash the queue.
- **Case Detail Route (`/scrutiny/:applicationId`):** Loads authoritative case file via `GET /api/v1/applications/:id`, cached dossier report via `GET /api/v1/applications/:id/dossier-report`, allowed FSM transitions via `GET /api/v1/applications/:id/allowed-transitions`, and audit timeline via `GET /api/v1/applications/:id/timeline`.
- **Dossier Recalculation:** Reviewers can trigger full re-evaluation via `POST /api/v1/applications/:id/dossier-report` or `?recalculate=true`.
- **Workflow State Transitions:** State transitions are executed via `POST /api/v1/applications/:id/transitions`. Allowed transitions are dynamically discovered from the server. If `requiresComment: true` (e.g. `DEFICIENCY_ISSUED` or `REJECTED`), a mandatory justification comment is strictly validated prior to submission.
- **Document Matrix & Binary Streaming:** Document attachments are inspected in `DocumentInspectModal` showing SHA-256 checksums, duplicate status (DOC-04), tamper status (DOC-04), issuer verification status (DOC-05), and extracted OCR fields. Secure binary file downloads stream via `GET /api/v1/documents/:id/download` with automatic object URL cleanup.
- **Human Sovereignty Boundary (ADR-004):** Automated findings, OCR confidences, and anomaly scores are strictly advisory decision support under the AICTE Approval Process Handbook. Automated tools never approve or reject applications autonomously.
- **Current Backend Contract Limitation:** The `ReviewDisposition` enum exists in backend contracts, but there is no dedicated database entity or endpoint for persisting individual finding-level dispositions. Case-level actions are executed through the BE-06 workflow FSM. A contract proposal has been prepared for M1/M2.

---

## 7. EVC Ground Inspection & Committee Workspace (FE-06)

Implemented in `src/pages/EvcQueuePage.tsx`, `src/pages/EvcCaseDetailPage.tsx`, and `src/components/evc/`. Detailed specification available in [`docs/ui/evc-inspection.md`](../docs/ui/evc-inspection.md).

- **EVC Inspection Queue (`/evc`):** Queries `GET /api/v1/applications` filtering for `RECOMMENDED_FOR_EVC`, `EVC_IN_PROGRESS`, and `RECOMMENDED_FOR_SHC`. Applications are enriched asynchronously with DOC-06 compliance assist results (`GET /api/v1/applications/:id/compliance-assist`) and DOC-07 dossier summaries using bounded concurrency workers (max 3 concurrent requests).
- **Case Inspection Workspace (`/evc/:applicationId`):** 5-tab regulatory workspace for EVC Inspectors, Regional Officers, Bureau Heads, and SHC Members:
  1. **Tab 1: Infrastructure & Compliance Heuristics (DOC-06):** Displays evaluated compliance for Land, Built-up Area, Barrier-Free Access, and Fire Safety clearance, alongside EVC inspection triggers, heuristic limitations, and an evidence-linked findings matrix.
  2. **Tab 2: Inspection Checklist & Evidence Aid:** Lists statutory document attachments with cryptographic SHA-256 checksums and streaming download triggers (`documentsService.downloadDocument`), mobile photo capture / geotagging notice, and an interactive tri-state working checklist aid explicitly labeled as local draft / non-persisted.
  3. **Tab 3: Expert Scheduling & Roster Overview:** Shows workflow-bound assignment state, details the absence of centralized roster endpoints, disables unsupported schedule actions, and documents the proposed `POST /api/v1/applications/:id/evc-assignments` contract for M1/M2.
  4. **Tab 4: Committee Review & Hearing (SHC):** Displays SHC escalation provenance, unaddressed critical deficiencies from DOC-06, authorized post-hearing decisions for `BUREAU_HEAD` (`APPLICATION_APPROVED`, `APPLICATION_REJECTED`) via BE-06 FSM, and proposed committee minutes contract specification.
  5. **Tab 5: Audit Timeline (BE-06):** Chronological event log with timestamps, actor IDs, and transition justifications.
- **Human Sovereignty Safeguards (ADR-004):** Prominent legal disclaimers emphasize that automated compliance heuristics and physical inspection triggers are advisory decision support only. Statutory decisions require sovereign human officer evaluation.
- **Role-Based Permissions:** Accessible to `EVC_INSPECTOR`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, and `SHC_SAC_MEMBER`.

---

## 8. Local Development & Quality Gates

### 7.1 Installation
```bash
cd frontend
npm install
```

### 7.2 Running the Development Server
```bash
npm run dev
```
The application will be served at `http://localhost:5173`.
By default, requests to `/api` are automatically proxied to the NestJS backend at `http://localhost:3000`.

### 7.3 Quality Gates & Validation Commands
All commands run from `frontend/`:

| Check | Command | Purpose |
|---|---|---|
| **Type Check** | `npm run typecheck` | Validates TypeScript compilation with zero emitted files (`tsc --noEmit`) |
| **Linting** | `npm run lint` | Runs ESLint across all `.ts` and `.tsx` source files (`--max-warnings=0`) |
| **Formatting** | `npm run format:check` | Checks code formatting against Prettier rules |
| **Auto-Format** | `npm run format` | Auto-formats code with Prettier |
| **Unit Tests** | `npm test` | Runs Vitest across all 18 test suites (128 tests passing) |
| **Production Build** | `npm run build` | Compiles TypeScript and produces optimized production bundle in `dist/` |

---

## 9. Environment Configuration

Copy `.env.example` to `.env.local` to override local environment variables:
```bash
# Public API Base URL:
# Defaults to '/api/v1' which is proxied by Vite dev server to 'http://localhost:3000'
VITE_API_BASE_URL=/api/v1

# Request timeout in milliseconds (default: 15000)
VITE_API_TIMEOUT_MS=15000

# Environment label
VITE_APP_ENV=development
```

> [!WARNING]
> All `VITE_*` environment variables are bundled directly into the public client application bundle. **Never commit secrets, private keys, passwords, or sensitive credentials to frontend environment files.**

---

## 10. Downstream Extension Guide

When implementing downstream chunks (`FE-05` through `FE-07`):
1. **Reuse Components:** Utilize components from `@/components/ui` (`Button`, `Card`, `Badge`, `FormField`, `Alert`, `Modal`, `EmptyState`, `PageHeader`).
2. **Access Current User:** Use `const { user, logout } = useAuth()` to access safe profile projection and role.
3. **Protect New Routes:** Wrap routes in `<ProtectedRoute allowedRoles={[...]}>`.
4. **Follow Design Tokens:** Never introduce ad-hoc hex values; reference CSS variables in `tokens.css` (`var(--color-*)`, `var(--space-*)`).
5. **Respect Contract Enums:** Import domain enums directly from `@/api/types` (`ApplicationStatus`, `UserRole`, `VerificationStatus`).
6. **Preserve Human Sovereignty:** Never present automated AI indicators as final approval or rejection decisions; provide explicit officer disposition action controls with justification inputs.
