# ApprovalSync — Design-Taste-Led UI Overhaul & Defect Remediation Report

**Date:** October 28, 2026  
**Auditor / Architect:** Principal Product Designer, Senior React Engineer, Frontend QA Lead  
**Repository:** `c:\builds\ApprovalSync`  
**Target Branch:** `main`  
**Governing Design Skill:** `Leonxlnx/taste-skill` (`./.agents/skills/design-taste-frontend`) & `app-screens.md`  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary & Design System Foundations

ApprovalSync is an institutional accreditation and statutory compliance platform operating under AICTE Approval Process Handbook (APH) regulatory norms. An exhaustive visual and architectural audit was performed based on six defect screenshots that revealed broken layouts, text concatenations, exposed internal engineering identifiers, test-data contamination, and non-functional display preferences.

Guided by the installed anti-slop design skill (`Leonxlnx/taste-skill` v2) and its app-screens doctrine (`references/app-screens.md`), the entire frontend was overhauled. The resulting design achieves:
1. **Color on Data, Not Chrome:** Neutral, high-legibility interface chrome with intentional, semantic badges (Emerald for Approved/Online, Amber for Clarification/Deficiency, Crimson for Anomalies/Breaches, Slate for Drafts).
2. **Dense, Tabular Layout Rhythm:** Monospace numerical alignments, strictly controlled column widths, ellipsis truncation with accessible copy affordances, and zero card resting shadows or decorative gradients.
3. **Semantic Hierarchy:** Elimination of string concatenation in favor of structured definition grids (`<dl>`, `<dt>`, `<dd>`), explicit primary and secondary action footers, and accessible form controls.
4. **Active Display & Accessibility Engine:** Real, functional "High Contrast Text" (WCAG 2.2 AAA 7:1+ contrast) and "Interface Density" (Comfortable vs Compact) with synchronized DOM data attributes and persistent `localStorage` storage.
5. **Zero Engineering Artifact Leakage:** Removal of all developer test modals, raw API health probes, internal milestone badges (`Module BE-04 / FE-03`), raw database ports (`5434`), and release tags from standard institutional views.

---

## 2. Defect Analysis & Root Cause Resolutions (Six Screenshots)

### DEF-UI-01 — Institutional Identity Fields Concatenated & Poorly Formatted
- **Affected View:** Application Intake Wizard → Step 1 (Institutional Tenancy Verification).
- **Observed Defect:** `Authorized Representativedemo.institution@synthetic.approvalsync.local` and `Assigned RoleInstitution Representative` ran directly into each other without spacing. A raw database UUID was placed prominently in the visual hierarchy as `Institution Identifier70224b01-b1d2-4a63...`.
- **Root Cause:** ApprovalSync is built on Vanilla CSS. Component templates were written assuming Tailwind utility classes (`flex`, `grid`, `space-y-2`) that were absent from the stylesheet. Consequently, inline `<span>` elements collapsed without display block or flex separation. Furthermore, raw database UUIDs were treated as primary labels rather than support metadata.
- **Resolution:**
  - Implemented `.identity-summary-card`, `.identity-summary-grid`, `.identity-summary-item`, `.identity-summary-label`, and `.identity-summary-value` in `frontend/src/styles/components.css`.
  - Rebuilt `InstitutionStep.tsx` using semantic `<dl>`, `<dt>`, and `<dd>` tags.
  - Formatted three primary identity records: **Authorized Representative** (`user.name`), **Institutional Email** (`user.email`), and **Account Role** (`formatRoleName(user.role)`).
  - Relegated the internal institutional UUID to a dedicated "Support Identifier" secondary section featuring truncated monospace display (`70224b01...4a63`) and an accessible copy-to-clipboard button with visual confirmation.

### DEF-UI-02 — Developer & Test Buttons Exposed on Workspace Overview
- **Affected View:** Institutional Regulatory Workspace (`HomePage.tsx`) → Top-right action bar and KPI summary cards.
- **Observed Defect:** Top-right exposed `Test Design Modal` and `API Health Probe` development shortcuts. KPI and module cards exposed raw engineering sprint tracking badges such as `Module BE-04 / FE-03`, `Module BE-06 / FE-04`, `Module DOC-04`, and `Module BE-02 / BE-07`. The page also rendered a developer design modal.
- **Root Cause:** Milestone development scaffolding from milestones BE-01 through FE-05 was left mounted in production page components without role or environment gating.
- **Resolution:**
  - Removed `Test Design Modal` and `API Health Probe` from the workspace action bar.
  - Promoted `Application Intake` as the primary workspace action alongside direct workflow navigation.
  - Removed internal engineering chunk badges (`Module BE-xx / FE-xx`) across all 4 top KPI cards and the 4 Core Regulatory Module cards, replacing them with clear institutional capability titles.
  - Removed the developer test modal and its inert container state from `HomePage.tsx`.

### DEF-UI-03 — Internal Release Metadata & Developer Documentation in Global Footer
- **Affected View:** Global Footer (`Footer.tsx`).
- **Observed Defect:** Footer displayed `Release: FE-01 Baseline • System Health (API) • OpenAPI Docs`, leaking technical release tags and exposing public development links to ordinary institutional users.
- **Root Cause:** Initial frontend baseline (`FE-01`) hardcoded development links directly into the global footer without differentiating administrative tools from ordinary user chrome.
- **Resolution:**
  - Redesigned `Footer.tsx` into a compact, product-grade institutional footer.
  - Displays product identity (`ApprovalSync`) and a concise regulatory advisory statement under AICTE Approval Process Handbook (APH) norms.
  - Replaced internal release tags with institutional context: `Institutional Sandbox • APH 2026 Norms`.
  - Removed raw links to `/api/v1/health` and `/api/docs`.

### DEF-UI-04 — Application List Test Data Contamination & Awkward Data Density
- **Affected View:** Dashboard / Application Listing (`InstitutionDashboard.tsx`).
- **Observed Defect:** Application table displayed awkward 3-line word wrapping on long application numbers (e.g. `APP-E2E-DOC06-` / `A-` / `1793133782103`), repeated redundant timezone labels (`GMT+5:30`) on every single row, and contained records generated by automated test suites (`APP-E2E-DOC06...`, `APP-JSONB...`, `APP-AUD-CONC...`, `APP-BURST-A...`, `APP-SLA-CONC...`).
- **Root Cause (Test Contamination):** Automated E2E test suites (`backend/test/*.e2e-spec.ts` including `compliance-assist.e2e-spec.ts`, `database.integration.e2e-spec.ts`, and `int-03-performance-resilience.e2e-spec.ts`) execute against the primary development PostgreSQL database `approvalsync` because `jest-e2e.json` lacks an isolated test database configuration (`approvalsync_test`) and test suites lack database cleanup in `afterAll`.
- **Resolution (UI Table & Density):**
  - Implemented `.table-responsive-wrapper`, `.app-id-cell`, and `.app-timestamp-cell` in `components.css`.
  - Configured column widths: Application No (28%), Program & Year (22%), Status (15%), Stage SLA (15%), Created (10%), Action (10%).
  - Added ellipsis truncation to `.app-id-cell` with full text `title` tooltip and an accessible inline copy button with checkmark feedback.
  - Cleaned `formatIsoDateTime` in `frontend/src/sla/slaUtils.ts` to omit redundant `timeZoneName: 'short'`, producing clean local representations (`Oct 28, 2026, 02:13 AM`).
  - Preserved complete dataset integrity without suppressing or hiding records arbitrarily.

### DEF-UI-05 — Course List & Form Navigation Action Layout Broken
- **Affected View:** Application Intake Wizard → Step 2 (Physical Infrastructure & Institutional Metrics).
- **Observed Defect:** Proposed course entries were rendered as a raw browser bulleted list (`<ul>`/`<li>`) with delete trash icons jammed directly against the course text without spacing. Form navigation buttons (`Back to Institution`, `Continue to Documents`) lacked visual structure and spacing. The explanatory help text exposed backend implementation jargon: `standardized payloadJsonb format verified by the AICTE Scrutiny & EVC Inspection modules`.
- **Root Cause:** Like Step 1, Step 2 relied on missing utility classes, causing browser default `list-style: disc` bullets to render. Action buttons lacked a dedicated flex container with media-query responsive wrapping. The help text exposed internal database serialization details (`payloadJsonb`).
- **Resolution:**
  - Redesigned course items into clean, structured card entries (`.course-item-card`) featuring academic graduation cap icons, clear title separation, and accessible `.course-remove-btn` buttons (`aria-label="Remove course: <Name>"`).
  - Replaced `payloadJsonb` database wording with clear applicant guidance: *"All declared infrastructure parameters and proposed course intake capacities are evaluated during statutory review against current AICTE Approval Process Handbook (APH) norms."*
  - Rebuilt the form navigation footer into `.wizard-nav-footer` with secondary back action aligned left, primary continue action aligned right, and responsive stacking on mobile viewports.

### DEF-UI-06 — Platform Settings Leaking Raw Infrastructure Details & Fake Latency Probe
- **Affected View:** Platform Settings & Diagnostics (`SettingsPage.tsx`).
- **Observed Defect:** Exposed raw localhost URLs (`http://localhost:3000`), internal API gateway prefix (`/api/v1`), and raw PostgreSQL database ports (`Port 5434`) to ordinary institution users. The "Test API Connection" button hit `/api/v1/scrutiny/queue` (a role-restricted endpoint that returns 403 Forbidden for `INSTITUTION_USER`) and displayed fake random latency generated by `Math.random()`.
- **Root Cause:** Diagnostic card hardcoded internal developer ports into standard user cards and simulated API round-trip latency using client-side random calculations.
- **Resolution:**
  - Rebuilt the Environment & Infrastructure card to display honest, user-facing status indicators:
    - **Backend Service:** Available / Unavailable (Badge variant derived from real `/api/v1/health`).
    - **Data Service:** Connected / Unavailable (Badge variant derived from real `/api/v1/health/readiness`).
    - **Environment Mode:** Demonstration Sandbox (Synthetic).
    - **Last Diagnostic Check:** Verified timestamp of real network response.
  - Gated advanced technical infrastructure details (Gateway prefix, internal ports) exclusively to `SYSTEM_ADMIN`.
  - Replaced the fake ping with a genuine probe to the public `@Public()` `/api/v1/health` endpoint. Latency is measured using `performance.now()` with true loading, error, and verified latency states.

### DEF-UI-07 — Display Preferences (High Contrast & Density) Nonfunctional
- **Affected View:** Platform Settings & Diagnostics → Display & Accessibility Card.
- **Observed Defect:** "High Contrast Text" checkbox and "Interface Density" select were purely cosmetic controls backed by isolated component `useState` hooks with zero CSS implementation, zero token integration, and zero persistence.
- **Root Cause:** No global preference context existed; toggling state had no effect outside the single component scope and reset on navigation.
- **Resolution:**
  - Architected `PreferencesContext.tsx` (`usePreferences`) supporting `highContrast` (boolean) and `density` (`'comfortable' | 'compact'`).
  - Implemented persistent storage via `localStorage` keys `approvalsync_high_contrast` and `approvalsync_density`.
  - Synchronized state with `document.documentElement` attributes (`data-contrast="high|normal"`, `data-density="comfortable|compact"`) and helper classes (`.high-contrast`, `.density-compact`).
  - Added WCAG 2.2 AAA (7:1+) high-contrast tokens in `tokens.css` (pure `#000` text, solid borders, high-contrast input outlines).
  - Added density rules in `tokens.css` modifying table padding, card spacing, and component heights.

---

## 3. Design System & CSS Token Architecture

All changes strictly follow Vanilla CSS and existing token architecture:

| Token / Class | Purpose | Target Appearance |
| :--- | :--- | :--- |
| `[data-contrast='high']` | WCAG AAA 7:1+ contrast | Foreground: `#000000`, Background: `#ffffff`, 1px solid black card/input borders |
| `[data-density='compact']` | High data density | Table cells: `var(--space-1) var(--space-2)`, font-size `0.75rem`, card padding `var(--space-3)` |
| `[data-density='comfortable']` | Standard readable spacing | Table cells: `var(--space-3) var(--space-4)`, card padding `var(--space-5)` |
| `.identity-summary-grid` | Step 1 Identity Grid | 3-column responsive grid for Representative, Email, and Account Role |
| `.identity-uuid-row` | Support Identifier | Secondary sub-row with truncated monospace UUID and accessible copy control |
| `.course-item-card` | Repeatable Course Records | Distinct card rows with icon, clean title, and hover/focus-styled remove button |
| `.wizard-nav-footer` | Form Navigation Bar | Responsive flex footer with left-aligned Back and right-aligned Continue |
| `.app-id-cell` | Table Application No. | Ellipsis truncation at 13rem with hover title and inline copy affordance |
| `.app-timestamp-cell` | Table Timestamps | Tabular numbers, date/time without redundant timezone repetition |

---

## 4. Test-Data Contamination Investigation & Prevention Strategy

### 4.1 Investigation Findings
Automated test records identified in Screenshot 3:
- `APP-E2E-DOC06-A-1793133782103` → Generated by `backend/test/compliance-assist.e2e-spec.ts`
- `APP-JSONB-1793133782048` → Generated by `backend/test/database.integration.e2e-spec.ts`
- `APP-AUD-CONC-1176`, `APP-BURST-A-0573`, `APP-SLA-CONC-0252` → Generated by `backend/test/int-03-performance-resilience.e2e-spec.ts`

### 4.2 Root Cause
1. `backend/test/jest-e2e.json` lacks an isolated `DATABASE_URL` override pointing to a disposable test database (e.g. `postgresql://.../approvalsync_test`).
2. E2E test runs execute against the default development database `approvalsync`.
3. Test suites insert fixtures using timestamp-based unique application numbers to avoid collision, but omit database truncation or transaction rollbacks in `afterAll()`.

### 4.3 Safe Prevention & Remediation Path
1. **Database Isolation:** Update CI and test scripts to run E2E suites against an isolated test database (`approvalsync_test` or Docker ephemeral instance).
2. **Safe Test Teardown:** Add cleanup hooks (`afterAll`) in mutating E2E specs to remove inserted application records and associated documents.
3. **No Arbitrary Hiding:** The frontend must never suppress or filter application records based on synthetic ID patterns (`APP-E2E*`), ensuring honest state reporting and preserving legitimate demonstration fixtures.

---

## 5. Automated Quality Gates & Verification Evidence

All quality gates were executed against the updated codebase:

| Quality Gate | Command | Result |
| :--- | :--- | :--- |
| **Frontend Test Suite** | `npm run test -- --run` | **34 test files passed (100%), 270 tests passed (0 failed)** |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **0 errors (Passed)** |
| **ESLint Static Analysis** | `npm run lint` (`--max-warnings=0`) | **0 errors, 0 warnings (Passed)** |
| **Prettier Formatting** | `npm run format:check` | **All files match Prettier code style (Passed)** |
| **Production Build** | `npm run build` (`vite build`) | **Successful bundle generation in 16.07s (Passed)** |
| **Git Diff Check** | `git diff --check` | **Clean, no whitespace or merge marker issues (Passed)** |

### New Automated Regression Test Suites
1. `frontend/src/__tests__/settings-preferences.spec.tsx` (5 tests):
   - Verified High Contrast toggling sets `data-contrast="high"` and persists to `localStorage`.
   - Verified Interface Density switches to `compact` and persists to `localStorage`.
   - Verified `SettingsPage` conceals internal ports/hosts from `INSTITUTION_USER` and displays honest service statuses.
   - Verified "Test API Connection" probes `/api/v1/health` and calculates real latency without fake math.
2. `frontend/src/__tests__/intake-steps-layout.spec.tsx` (2 tests):
   - Verified `InstitutionStep` semantic identity grid prevents text concatenation and isolates UUID with copy affordance.
   - Verified `FacilitiesStep` renders structured course cards, accessible deletion, and removed `payloadJsonb` technical jargon.

---

## 6. Summary of Changed Files

- `frontend/src/context/PreferencesContext.tsx` — Global display preferences provider with DOM sync and `localStorage` persistence.
- `frontend/src/App.tsx` — Wrapped application shell in `<PreferencesProvider>`.
- `frontend/src/styles/tokens.css` — High contrast (AAA 7:1+) and interface density design tokens.
- `frontend/src/styles/components.css` — Responsive utility classes, identity summary card, course card, table cell truncation, and wizard navigation footer.
- `frontend/src/components/wizard/InstitutionStep.tsx` — Semantic `<dl>` identity summary card with copyable support identifier.
- `frontend/src/components/wizard/FacilitiesStep.tsx` — Structured course item cards, accessible remove controls, and clean regulatory guidance.
- `frontend/src/components/wizard/DocumentUploadStep.tsx` — Standardized to `.wizard-nav-footer`.
- `frontend/src/components/wizard/ReviewSubmitStep.tsx` — Standardized to `.wizard-nav-footer`.
- `frontend/src/pages/HomePage.tsx` — Removed debug buttons (`Test Design Modal`, `API Health Probe`), developer modal, and internal engineering module badges.
- `frontend/src/components/layout/Footer.tsx` — Clean institutional footer with regulatory advisory notice; removed internal release/docs links.
- `frontend/src/pages/dashboard/InstitutionDashboard.tsx` — Responsive table layout, monospace application ID cell with tooltip and copy button, and clean timestamp presentation.
- `frontend/src/sla/slaUtils.ts` — Formatted ISO date/times without redundant timezone clutter.
- `frontend/src/pages/SettingsPage.tsx` — Integrated `usePreferences`, honest health check probes, gated administrative diagnostics, and real latency probing.
- `frontend/src/__tests__/shell.spec.tsx` — Updated footer test expectations.
- `frontend/src/__tests__/settings-preferences.spec.tsx` — Added test suite for preferences and settings.
- `frontend/src/__tests__/intake-steps-layout.spec.tsx` — Added test suite for intake identity and course layouts.
