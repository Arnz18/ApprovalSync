# ApprovalSync — FE-05: Role-Specific Dashboards, SLA, Alerts & Analytics

> - **Milestone:** FE-05
> - **Lead Owner:** M4 — Frontend & Experience
> - **Status:** IMPLEMENTED & VERIFIED (22 test suites, 167 automated frontend tests passing)
> - **Target Path:** `/dashboard`
> - **Design Framework:** `ui-ux-pro-max` (Swiss Minimalism & Enterprise Gateway)

---

## 1. Executive Summary & Product Objective

Milestone **FE-05** implements an institutional decision-support and workflow governance dashboard for the ApprovalSync platform. Built on React 18, TypeScript 5, and Vite 5, it provides distinct, role-tailored workspaces for all authorized regulatory personas:

1. **Institution Users (`INSTITUTION_USER`)**: Tenant-isolated view of their college's applications, draft resumption, action-required deficiency alerts, and active stage timers.
2. **Scrutiny Officers (`SCRUTINY_OFFICER`)**: Active queue workload, bottlenecks, aging distribution, Tier 1 SLA warnings, and direct links to the FE-04 scrutiny case review workspace.
3. **Regional Officers (`REGIONAL_OFFICER`)**: Regional workload overview, Tier 2 SLA escalations, breached timer management, and authorized pause/resume controls.
4. **Bureau Heads (`BUREAU_HEAD`)**: High-level council throughput, bottleneck analytics, Tier 3 escalations, system-wide SLA breach distribution, pause/resume controls, and policy benchmark inspections.
5. **System Administrators (`SYSTEM_ADMIN`)**: Comprehensive operational visibility, cross-system workload stats, and a **privileged manual SLA reconciliation sweep** with double-confirmation dialogs.
6. **Auditors (`AUDITOR`)**: Read-only oversight of applications, SLA timers, and historical escalations with zero mutation capabilities.
7. **EVC Inspectors & Committee Members (`EVC_INSPECTOR`, `SHC_SAC_MEMBER`)**: Contextual workload links to the FE-06 EVC workspace and relevant stage timers.

### Core Regulatory Principle: Human Sovereignty (ADR-004)
Dashboards serve strictly as **advisory decision-support software**. SLA timers, automated alerts, and breach escalations draw timely attention to stalled cases, but **never** independently approve, reject, modify compliance findings, or create statutory administrative decisions.

---

## 2. Architecture & Directory Structure

```text
frontend/src/
├── sla/
│   ├── types.ts                     # SlaTimerStatus, SlaEscalationLevel, SlaPolicyClassification, DTOs
│   └── slaUtils.ts                  # Timezone-safe countdowns, SLA urgency derivation, calendar aging
├── api/services/
│   └── slaService.ts                # Centralized service covering all 7 BE-08 SLA endpoints
├── components/
│   ├── sla/
│   │   ├── SlaTimerBadge.tsx        # Status pill (ACTIVE, WARNING, BREACHED, PAUSED, COMPLETED)
│   │   ├── SlaTimerCard.tsx         # Comprehensive timer card with live progress, metadata & actions
│   │   ├── PauseTimerModal.tsx      # Modal capturing mandatory human justification (5-500 chars)
│   │   ├── SlaEscalationList.tsx    # Filterable escalation table by tier & severity level
│   │   ├── SlaPolicyModal.tsx       # Stage SLA policy benchmarks with mandatory demo disclaimer
│   │   └── ManualReconciliationBanner.tsx # Privileged sweep trigger with confirmation dialog
│   └── dashboard/
│       ├── DashboardMetricsOverview.tsx # KPI summary stat cards with non-color cues
│       ├── ApplicationStatusChart.tsx   # Accessible visual meter of application lifecycle stages
│       ├── ApplicationAgingBreakdown.tsx # Turnaround time and application aging buckets
│       └── DerivedAlertsFeed.tsx        # Real server-derived operational alert stream
└── pages/
    ├── DashboardPage.tsx            # Primary coordinator: role resolution, parallel loading & tabs
    └── dashboard/
        ├── InstitutionDashboard.tsx # Tenant-scoped view & deficiency actions
        ├── ScrutinyDashboard.tsx    # Workload queue, critical timers & scrutiny links
        ├── RegionalDashboard.tsx    # Regional workload & Tier 2 escalations
        ├── BureauDashboard.tsx      # Council-wide throughput & Tier 3 escalations
        └── AuditorAdminDashboard.tsx# Admin reconciliation / Auditor read-only oversight
```

---

## 3. Actual Backend Endpoints Integrated (BE-08)

The frontend integrates directly with the verified BE-08 API surface via `src/api/services/slaService.ts`:

| Method | Endpoint | Description | Role Clearance |
|---|---|---|---|
| `GET` | `/api/v1/applications/:id/sla-timers` | Retrieves SLA timers for an application, with status filtering | All authenticated roles |
| `GET` | `/api/v1/applications/:id/sla-timers/active` | Retrieves the currently active timer for an application | All authenticated roles |
| `POST` | `/api/v1/applications/:id/sla-timers/pause` | Pauses active timer with mandatory justification body (`{ reason }`) | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` |
| `POST` | `/api/v1/applications/:id/sla-timers/resume` | Resumes a paused timer | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` |
| `GET` | `/api/v1/sla/policies` | Lists configured stage SLA policies and benchmarks | All authenticated roles |
| `GET` | `/api/v1/sla/escalations` | Lists recorded system-wide SLA escalations | Regulatory officers, Admin, Auditor |
| `POST` | `/api/v1/sla/reconcile` | Triggers the BullMQ/DB reconciliation fallback sweep | Strictly `SYSTEM_ADMIN` |

---

## 4. Metric Definitions, Calculation Rules & Data Limitations

### 4.1 SLA Urgency Derivation
- **Status Mapping**:
  - `PAUSED`: Timer has been paused with recorded human justification. Rendered with `Pause` icon and neutral amber styling.
  - `COMPLETED`: Application has exited the stage within SLA. Rendered with `CheckCircle2` and positive emerald styling.
  - `CANCELLED`: Stage transitioned or cancelled.
  - `BREACHED`: Backend `isBreached: true` or current system time has passed `targetDeadline`. Rendered with `AlertOctagon` and high-severity red styling.
  - `WARNING`: Backend `isWarningSent: true` or current system time has passed `warningDeadline`. Rendered with `AlertTriangle` and amber warning styling.
  - `ACTIVE`: Running normally within configured parameters.

### 4.2 Application Calendar Aging Calculation
- **Algorithm**: Derived from application `createdAt` timestamp using calendar-day boundaries:
  $$\text{Age (Days)} = \left\lfloor \frac{\text{Current Time} - \text{Created Timestamp}}{86,400,000\,\text{ms}} \right\rfloor$$
- **Aging Buckets**:
  - `0 - 7 Days`: Freshly submitted / active intake.
  - `8 - 14 Days`: Normal processing window.
  - `15 - 30 Days`: Approaching review thresholds.
  - `30+ Days`: Aging backlog / review bottleneck.

### 4.3 Data Scope & Honest Presentation
- **Pagination Transparency**: When a dataset is paginated (e.g., retrieving the first 50 applications or 20 escalations), metric cards clearly display the retrieved sample size (e.g., `Based on 50 retrieved cases`). The UI **never** pretends a partial sample represents the entire council database.
- **Derived Operational Alerts**: Alerts are honestly derived from verified server records (`isBreached`, `isWarningSent`, recorded escalations, and `DEFICIENCY_ISSUED` states). The UI does **not** fake a persisted notification inbox or simulate unread receipt tracking.

---

## 5. SLA Governance & Privileged Controls

### 5.1 Timer Pause & Resume Protocol
- **Authorized Roles**: `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`.
- **Justification Enforcement**: Pausing a timer requires a mandatory human justification reason between **5 and 500 characters** in `PauseTimerModal`. The UI displays a live character counter and enforces non-empty input.
- **Audit Logging**: The pause reason and pausing officer ID are permanently attached to the timer projection.
- **State Refresh**: Upon confirmed API response (HTTP 200/201), the frontend immediately updates local state without optimistic guesswork.

### 5.2 Privileged Manual SLA Reconciliation Sweep
- **Role Clearance**: Exclusively gated to `SYSTEM_ADMIN`. The UI strictly hides this control from all other roles.
- **Double Confirmation**: The action opens a native confirmation dialog detailing the operation:
  > *"Execute manual SLA reconciliation sweep? This triggers a system-wide evaluation of overdue timers and enqueues idempotent escalation notifications."*
- **Safety**: The reconciliation sweep **never** executes automatically on page load or component mount.
- **Execution Metrics**: On completion, displays the total evaluated timers, transitioned timers, and newly dispatched escalations.

### 5.3 Illustrative Demonstration SLA Policies
In compliance with regulatory standards, configured policies displayed in `SlaPolicyModal` bear a mandatory disclaimer banner:
> **Regulatory Disclaimer:** *Illustrative demonstration SLA policy only. AICTE statutory processing timelines are determined by the AICTE Approval Process Handbook (APH) and official gazette notifications. Automated timers provide operational tracking and do not establish binding statutory deadlines.*

### 5.4 Contract Verification & Discrepancy Reconciliation

During the FE-05 hardening and contract verification audit against BE-08 authoritative backend source code, the following items were verified and reconciled:

1. **SLA Pause/Resume Role Clearances**:
   - *Issue Investigated:* `PROJECT_STATE.md` (lines 517–518) described the endpoints as `(BUREAU_HEAD, REGIONAL_OFFICER, SYSTEM_ADMIN)`.
   - *Authoritative Backend Reality:* Both `backend/src/sla/sla.controller.ts` (lines 118–123 and 154–159) and `backend/src/sla/sla.service.ts` (lines 644–656, `assertCanManageTimers`) explicitly authorize four roles:
     - `UserRole.SCRUTINY_OFFICER`
     - `UserRole.REGIONAL_OFFICER`
     - `UserRole.BUREAU_HEAD`
     - `UserRole.SYSTEM_ADMIN`
   - *Evidence:* Backend unit tests in `backend/src/sla/sla.service.spec.ts` (lines 238 and 307) explicitly execute `service.pauseTimer` and `service.resumeTimer` with `scrutinyOfficer` and verify success.
   - *Frontend Implementation:* `frontend/src/sla/slaUtils.ts` defines `SLA_TIMER_MANAGEMENT_ROLES` and `isTimerManagementAuthorized()`. Non-managing roles (`INSTITUTION_USER`, `AUDITOR`, `EVC_INSPECTOR`, `SHC_SAC_MEMBER`) have pause and resume actions strictly hidden in the UI.

2. **Escalation Tier Enum Values**:
   - *Issue Investigated:* A descriptive summary in `PROJECT_STATE.md` (line 509) listed `(TIER_1_SCRUTINY_OFFICER, TIER_2_REGIONAL_OFFICER, TIER_3_BUREAU_HEAD)`.
   - *Authoritative Backend Reality:* The frozen database and contract enum defined in `backend/src/shared/contracts/enums.ts` (lines 93–97) and schema migrations is `SlaTier`:
     - `TIER_1_RO_ALERT = 'TIER_1_RO_ALERT'`
     - `TIER_2_DIRECTOR_BREACH = 'TIER_2_DIRECTOR_BREACH'`
     - `TIER_3_COUNCIL_LOCK = 'TIER_3_COUNCIL_LOCK'`
   - *Frontend Implementation:* `frontend/src/api/types.ts` and `frontend/src/sla/types.ts` use the exact frozen `SlaTier` enum. In `slaUtils.ts`, `formatSlaTier()` provides human-readable labels (`Tier 1 (RO Alert)`, `Tier 2 (Director Breach)`, `Tier 3 (Council Lock)`) while also gracefully handling legacy aliases and unknown future tier strings without crashing.

3. **Pause/Resume Request Payload Contract**:
   - *Authoritative Backend DTO:* `backend/src/sla/dto/pause-timer.dto.ts` requires `{ reason: string }` with `@MinLength(5)` and `@MaxLength(500)`.
   - *Frontend Implementation:* `PauseTimerModal` strictly enforces a non-empty, trimmed `reason` between 5 and 500 characters, disables submission below 5 characters, and presents a live character counter. Server 400 validation and 403 authorization failures are surfaced cleanly in contextual error alerts.

---

## 6. Resilience, Failure Isolation & Accessibility

### 6.1 Parallel Loading with Partial Failure Isolation
The primary `DashboardPage` orchestrates resilient parallel loading:
1. Applications are retrieved via `applicationsService.listApplications()`.
2. Active SLA timers are queried in parallel via `Promise.allSettled()` for retrieved cases. A failure in an individual timer query does not block the application list or dashboard rendering.
3. Escalations are retrieved in a separate request. If the escalations endpoint is unavailable or returns an error, the dashboard displays a scoped warning alert while preserving application and timer metrics.

### 6.2 Accessibility & Design System Compliance
- Follows the **Swiss Minimalism & Enterprise Gateway** design system established in `styles/tokens.css` and `styles/components.css`.
- **Contrast & Legibility**: High contrast typography (Lexend for headings, Source Sans 3 for data, JetBrains Mono for codes/timers).
- **Non-Color Cues**: Every status badge and severity indicator pairs color with a distinct Lucide icon (`Clock`, `AlertTriangle`, `AlertOctagon`, `Pause`, `CheckCircle2`, `ShieldAlert`).
- **ARIA & Keyboard Navigation**: Full keyboard tab navigation, accessible dialog focus trapping, `aria-modal="true"`, and `role="status"` on live countdowns.
- **Responsive Layout**: Fluid CSS Grid and Flexbox layouts supporting desktop (1280px+), tablet (768px - 1024px), and mobile (<768px).

---

## 7. Quality Gates & Test Verification

All frontend quality gates have been executed and verified:

| Quality Gate | Command | Result | Details |
|---|---|---|---|
| **Typecheck** | `npm run typecheck` | **PASS (0 errors)** | TypeScript 5.5 compiler in strict mode (`--noEmit`) |
| **Lint** | `npm run lint` | **PASS (0 errors, 0 warnings)** | ESLint with `--max-warnings=0` |
| **Code Style** | `npm run format:check` | **PASS (0 errors)** | Prettier format verification |
| **Production Build** | `npm run build` | **PASS (0 errors)** | Vite production bundle generated in `dist/` |
| **Full Test Suite** | `npm test` | **PASS (22/22 suites, 177/177 tests)** | 100% test pass rate across all milestones |

### Dedicated FE-05 Test Suites
1. `src/__tests__/sla-service.spec.ts` (7 tests): Covers all 7 API endpoints, URL serialization, correlation tracing, error handling, and parameter serialization.
2. `src/__tests__/sla-utils.spec.ts` (19 tests): Covers time formatting, countdown calculations, urgency derivation, calendar aging bucketing, `isTimerManagementAuthorized`, and resilient `formatSlaTier` / `formatEscalationLevel` handling.
3. `src/__tests__/sla-components.spec.tsx` (15 tests): Covers `SlaTimerBadge`, `PauseTimerModal` validation and server rejection display, `SlaTimerCard` role-based control visibility and 403 error alerts, dynamic `SlaEscalationList` filtering, and `ManualReconciliationBanner` confirmation.
4. `src/__tests__/dashboard-page.spec.tsx` (8 tests): Covers role delegation for Institution, Scrutiny, Regional, Bureau, Admin, and Auditor roles, partial failure isolation, and operational alerts feed.

---

## 8. Manual Demonstration Walkthrough

To verify the dashboard experience across personas in a live demonstration:

### Persona A: Institution User (`INSTITUTION_USER`)
1. Log in with credentials: `demo.institution@synthetic.approvalsync.local` / `DemoPass@123`.
2. Click **Dashboard** in the sidebar navigation (`/dashboard`).
3. Verify that only the institution's own applications are visible.
4. Observe the **Action Required: Deficiencies Issued** alert if applications are in `DEFICIENCY_ISSUED` status, with a direct link to resolve deficiencies.
5. Confirm that system-wide escalations and regulatory timer controls are completely hidden.

### Persona B: Scrutiny Officer (`SCRUTINY_OFFICER`)
1. Log in with a Scrutiny Officer account.
2. Navigate to `/dashboard`.
3. Observe the **Active Scrutiny Queue** workload metrics and aging distribution.
4. In the **Critical SLA Timers** section, locate an active timer in warning or breach state.
5. Click **Pause Timer**, enter a justification of at least 5 characters (e.g., `Awaiting university NOC document`), and click **Confirm Pause**.
6. Verify the timer badge updates to `PAUSED` and the reason is displayed.
7. Click **Resume Timer** to return the timer to `ACTIVE`.
8. Click **Open Scrutiny Queue** to navigate seamlessly to the FE-04 scrutiny workspace.

### Persona C: Regional Officer (`REGIONAL_OFFICER`)
1. Log in with a Regional Officer account.
2. Navigate to `/dashboard`.
3. Inspect the **Regional Workload Breakdown** and **Recorded SLA Escalations (Tier 2)**.
4. Filter escalations by severity (`BREACH` vs `WARNING`).
5. Click on an application number to inspect its case details.

### Persona D: Bureau Head (`BUREAU_HEAD`)
1. Log in with a Bureau Head account.
2. Navigate to `/dashboard`.
3. Observe council-wide throughput metrics, bottleneck status meters, and **Tier 3 Council Escalations**.
4. Click **Inspect SLA Policies & Benchmarks** in the page header.
5. Review configured stage durations and verify the presence of the mandatory **Illustrative Demonstration SLA Policy** disclaimer banner.

### Persona E: System Administrator (`SYSTEM_ADMIN`)
1. Log in with a System Administrator account.
2. Navigate to `/dashboard`.
3. Locate the amber **Privileged System Action: Manual SLA Reconciliation Sweep** banner.
4. Click **Trigger Reconciliation Sweep**.
5. Confirm the action in the prompt dialog.
6. Observe the success banner reporting evaluated timers and dispatched escalations.
