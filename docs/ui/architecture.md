# ApprovalSync — Frontend Architecture & Extension Guide

> **Document Version:** 1.0.0
> **Milestone:** FE-01 (Frontend shell, design system, routing and API client)
> **Lead Owner:** M4 — Frontend & Experience
> **Scope:** `frontend/` source, tests, and API integration boundaries

---

## 1. Architectural Foundation

ApprovalSync Frontend is architected as an institutional-grade React 18 Single-Page Application (SPA) bundled via Vite. It establishes the global application shell, reusable design system, routing tree, and typed API transport layer upon which subsequent M4 feature chunks build.

```
┌─────────────────────────────────────────────────────────────┐
│                 ApprovalSync Workspace Shell                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Header (Brand, Prototype Indicator, Live Health Status) │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌──────────────────┬──────────────────────────────────────┐ │
│ │ Sidebar Nav      │ Main Content View (React Router v6)  │ │
│ │ - Workspace      │ ┌──────────────────────────────────┐ │ │
│ │ - Applications   │ │ / (Workspace Overview)           │ │ │
│ │ - Scrutiny Queue │ │ /applications (FE-03 Intake)     │ │ │
│ │ - Verification   │ │ /scrutiny (FE-04 Review)         │ │ │
│ │ - Ground EVC     │ │ /verification (DOC-04 AI Checks) │ │ │
│ │ - APH Rules      │ │ /rules (BE-05 Policy Checklists) │ │ │
│ │ - Audit Ledger   │ │ /audit (BE-07 Merkle Proofs)     │ │ │
│ │ - Settings       │ │ /settings (Platform Diagnostics) │ │ │
│ │                  │ │ /* (404 Not Found Fallback)      │ │ │
│ │                  │ └──────────────────────────────────┘ │ │
│ └──────────────────┴──────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Footer (Regulatory Disclaimers, API Health Probe Links) │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │
               ┌───────────────┴───────────────┐
               │   Centralized Typed ApiClient │
               │   - /api/v1 namespace         │
               │   - ApiResponse<T> parsing    │
               │   - X-Correlation-Id tracing  │
               │   - Typed ApiClientError      │
               └───────────────────────────────┘
```

---

## 2. Workspace Shell & Responsive Navigation

The application workspace shell is composed of isolated, reusable layout primitives in `frontend/src/components/layout/`:

1. **`Header`**:
   - Institutional identity: ApprovalSync shield insignia and "AICTE Regulatory Compliance & Verification" descriptor.
   - Status indicators:
     - Real-time backend probe: queries `GET /api/v1/health` on mount, displaying `"API Online"` (green) or `"API Standby"` (neutral).
     - Prominent `SIMULATED / MOCK DATA` badge enforcing statutory demarcation.
   - User identity pill displaying active institutional context (`Demo Institution | Applicant / Reviewer`).
   - Accessible hamburger toggle button (`aria-expanded`, `aria-label`) for mobile screens.
2. **`Sidebar`**:
   - Categorized navigation hierarchy: **Workspace**, **Regulatory Review**, and **Governance & Audit**.
   - Active route styling: utilizes React Router `NavLink` with visual indicator (`border-left` accent and background tint).
   - Module badges: indicates downstream chunk responsibility (e.g., `FE-03`, `FE-04`, `BE-05`).
   - Sandbox disclaimer footer: reinforces human review requirements.
3. **`MobileNav`**:
   - Slide-out drawer on viewports $< 1024\text{px}$.
   - Full keyboard accessibility: dismisses on `Escape` key, closes on backdrop click, locks body scroll during activation.
4. **`Footer`**:
   - Regulatory notice: states clearly that automated OCR, extraction, and anomaly scores are advisory decision support only.
   - Direct links to `/api/v1/health` and `/api/docs`.

---

## 3. Routing Strategy & Milestone Placeholders

Routes are declared in `frontend/src/routes/AppRoutes.tsx` using React Router v6:

- **Initial Route (`/`)**: Comprehensive workspace overview with active KPIs, core module directory, and interactive design system inspector.
- **Feature Placeholders**: For routes belonging to downstream milestones (`/applications`, `/scrutiny`, `/verification`, `/evc`, `/rules`, `/audit`), the shell renders `FeaturePlaceholderPage`:
  - Outlines the assigned chunk ID (e.g. `FE-03`, `FE-04`).
  - Lists prerequisite dependency gates from `PROJECT_STATE.md`.
  - Describes the planned capabilities of the upcoming milestone.
  - Explains the clean interface boundary without mock backend calls or fake submission confirmations.
- **Catch-All 404 Route (`/*`)**: Renders `NotFoundPage` with institutional styling and safe navigation back to root.

---

## 4. Centralized Typed API Client

The API layer in `frontend/src/api/` enforces strict compliance with `docs/contracts/api-conventions.md`:

### 4.1 Transport Specification
- **Base URL:** Configured via `VITE_API_BASE_URL` (defaults to `/api/v1` matching the Vite proxy).
- **Request Tracing:** Generates an RFC4122 v4 UUID if none is provided, propagating `X-Correlation-Id` on all HTTP headers.
- **JSON Serialization:** Transparently handles JSON requests and parses `ApiResponse<T>` envelopes.
- **Multipart Uploads (`FormData`):** Explicitly preserves boundary generation by avoiding manual `Content-Type` header overrides.
- **Query Parameter Handling:** Safely converts query objects into standard `URLSearchParams`, omitting undefined, null, or blank values.
- **Timeout Protection:** Configurable timeout (default 15s) using `AbortController`.
- **Typed Error Normalization:** Unpacks `ApiErrorResponse` into `ApiClientError`, exposing:
  - `code`: machine-readable error code (e.g., `ERR_VALIDATION_FAILED`, `ERR_UNAUTHORIZED`).
  - `statusCode`: HTTP status code (400, 401, 403, 404, 500).
  - `details`: field-level validation errors (`FieldError[]`).
  - `correlationId`: tracking identifier from response body or header.
  - `isNetworkError`: boolean flag set when the server is unreachable.

---

## 5. Downstream Milestone Extension Guide

This foundation is designed to allow subsequent M4 chunks to implement their operational views without altering the global shell or design tokens:

### 5.1 `FE-02` — Login, Role-Aware Navigation and Session Handling
- Add `AuthContext` or state hook reading JWT tokens from `POST /api/v1/auth/login`.
- Attach token getter to `ApiClientConfig.getAuthToken`.
- Wrap routes in `ProtectedRoute` and `RolesGuard` matching `UserRole` enums from `@/api/types`.

### 5.2 `FE-03` — Institution Application Wizard and Document Upload
- Replace placeholder at `/applications` with multi-step intake wizard.
- Utilize `FormField`, `Input`, `Select`, `Button` from `@/components/ui`.
- Use `apiClient.upload()` for streaming file upload to `/api/v1/applications/:id/documents`.

### 5.3 `FE-04` — Scrutiny Queue, Case Detail and Evidence Review
- Replace placeholder at `/scrutiny` with officer queue and dossier review views.
- Render `ApplicationStatusBadge`, `ComplianceSeverityBadge`, and extracted OCR bounding boxes.
- Implement officer disposition action buttons (`APPROVED_BY_OFFICER`, `DEFICIENCY_FLAGGED`, `OVERRIDDEN_WITH_JUSTIFICATION`).

### 5.4 `FE-05` — Role-Specific Dashboards, SLA, Alerts and Analytics
- Implement role-differentiated views for Institution, Scrutiny Officer, Regional Director, and Bureau Head.
- Utilize `Card`, `Badge`, and semantic SLA tier alerts (`SlaTier`).

### 5.5 `FE-06` — EVC Scheduling, Inspection and Committee Workspace
- Replace placeholder at `/evc` with expert scheduling and on-site evidence review interfaces.

### 5.6 `FE-07` — Undertakings, Expiry, Reports and Audit UI
- Replace placeholder at `/audit` with Merkle tree proof inspector and chronological timeline.
