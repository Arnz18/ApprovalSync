# ApprovalSync — EVC Scheduling, Inspection & Committee Workspace

> **Milestone:** FE-06 — EVC Scheduling, Inspection and Committee Workspace<br>
> **Lead Role:** M4 — Frontend & Experience<br>
> **Collaborating Roles:** M2 — Backend & Integration, M3 — Document Intelligence, M1 — Contracts & Data<br>
> **Status:** IMPLEMENTED & COMMITTED<br>
> **Backend Integration:** BE-06 (Workflow Engine & State Transitions), DOC-06 (Compliance Assist & Infrastructure Sanity Heuristics), BE-04 (Applications API), DOC-01 (Document Attachments & Streaming Download)

---

## 1. Executive Summary & Purpose

The **EVC Scheduling, Inspection & Committee Workspace** provides an authorized, high-density, accessible interface for AICTE Expert Visit Committee (EVC) Inspectors, Regional Officers, Bureau Heads, and Standing Hearing Committee (SHC/SAC) Members. It enables officers to identify applications recommended for on-site physical inspection, review automated infrastructure sanity heuristics, inspect statutory document attachments, operate an interactive working checklist aid, review committee hearing escalations, and execute authorized state transitions under the regulatory framework of the AICTE Approval Process Handbook (APH).

The feature spans two primary routes:
1. **EVC Queue (`/evc`):** A paginated, filterable, and searchable inspection queue backed by `GET /api/v1/applications` (filtering by `RECOMMENDED_FOR_EVC`, `EVC_IN_PROGRESS`, `RECOMMENDED_FOR_SHC`), enriched with real-time DOC-06 compliance assist results (`GET /api/v1/applications/:id/compliance-assist`) and DOC-07 dossier summaries via bounded-concurrency background workers.
2. **Case Inspection Workspace (`/evc/:applicationId`):** A 5-tab inspection console providing institutional metadata, ADR-004 advisory disclaimers, on-demand compliance re-evaluation, interactive working checklist tools, read-only scheduling details, committee hearing review, and authorized workflow FSM transitions.

---

## 2. Information Architecture & Navigation

```text
/evc (EVC & Committee Inspection Queue)
   │
   ├── Search: Reference, Application Number, Institution Name
   ├── Filters: Lifecycle Status (ALL, RECOMMENDED_FOR_EVC, EVC_IN_PROGRESS, RECOMMENDED_FOR_SHC), Sort Order, Limit
   ├── Summary Enrichment: Bounded Concurrency Worker (limit=3) for DOC-06 Compliance & DOC-07 Dossiers
   │
   └── [Inspect Case Action]
         │
         ▼
/evc/:applicationId (Case Inspection Workspace)
   │
   ├── EvcCaseHeader: Identity, Institution Metadata, ADR-004 Badges, Re-evaluate Trigger
   ├── Permitted Workflow Actions Toolbar (Dynamic Server Transitions via BE-06)
   │     └── [Action Click] ➔ ReviewActionModal (Mandatory Comment Validation)
   │
   └── Section Inspection Tabs:
         ├── Tab 1: Infrastructure & Compliance Heuristics (DOC-06)
         │     ├── Summary Metrics (Rules Evaluated, Critical Deficiencies, Advisory Flags, Compliant Count)
         │     ├── Physical Infrastructure Sanity Card (Land, Built-up Area, Barrier-Free, Fire Safety)
         │     ├── Inspection Trigger Reasons & Heuristic Limitations Badges
         │     └── Evidence-Linked Findings Matrix with Severity Filter Chips
         │
         ├── Tab 2: Inspection Checklist & Evidence Aid
         │     ├── Statutory Document Attachments Matrix (SHA-256 Checksums, Type, Secure Binary Download)
         │     ├── Ground Inspection Photo & Geotagging Operational Notice
         │     └── Interactive Working Inspection Checklist Aid (Tri-State Toggle, Scratchpad, Non-Persisted Callout)
         │
         ├── Tab 3: Expert Scheduling & Roster Overview
         │     ├── Current Workflow Stage, Planned Mode, Jurisdiction, Target Window
         │     ├── Operational Contract Boundary Callout (Disabled Scheduling Action)
         │     └── Proposed Backend Contract Extension (POST /api/v1/applications/:id/evc-assignments)
         │
         ├── Tab 4: Committee Review & Hearing (SHC)
         │     ├── SHC Hearing Status Banner & Escalation Provenance Audit
         │     ├── Critical Discrepancies Summary (DOC-06 Automated Findings)
         │     ├── Authorized Bureau Head Post-Hearing Decision Buttons (APPROVED / REJECTED)
         │     └── Proposed Committee Minutes Contract Specification
         │
         └── Tab 5: Audit Timeline (BE-06)
               └── Chronological Transition History, Actor Roles, Timestamps, Justification Comments
```

---

## 3. UI/UX Skill Application (`ui-ux-pro-max`)

The interface was constructed adhering strictly to the `ui-ux-pro-max` design intelligence framework:
- **Visual Direction:** **Swiss Minimalism & Enterprise Regulatory Gateway** — high information density, clear visual hierarchy, neutral surfaces (`--color-surface`, `--color-surface-subtle`), crisp border dividers (`--color-border`), and semantic badges.
- **Typography:** Lexend headings and Source Sans 3 body text, paired with monospace fonts for cryptographic SHA-256 checksums, application numbers, UUIDs, and rule codes.
- **Color Palette & Contrast:** Strict adherence to WCAG 2.1 AA accessibility ratios. Zero raw hex codes; all styling utilizes semantic CSS custom properties (`var(--color-primary)`, `var(--color-surface)`, `var(--color-error)`, `var(--color-warning)`, `var(--color-success)`).
- **Interactive States:** Accessible focus rings (`:focus-visible`), smooth hover transitions, clear disabled states, accessible loading spinners, and descriptive ARIA labels across all filters, tables, modals, and tabs.
- **Responsive Layout:** Adaptive multi-column grid layouts collapsing to single-column streams on viewports under 768px, ensuring complete usability for officers inspecting applications on mobile or tablet devices during field visits.
- **Reduced Motion:** All transitions, transforms, and spinner animations respect `@media (prefers-reduced-motion: reduce)`.

---

## 4. Key Subsystems & Workflows

### 4.1 EVC Queue & Bounded Concurrency Enrichment (`/evc`)
- **API Integration:** Queries `GET /api/v1/applications` with query parameters (`status`, `search`, `sortBy`, `sortOrder`, `page`, `limit`).
- **Bounded Concurrency Enrichment:** Applications displayed in the active page are asynchronously enriched with DOC-06 compliance assist assessments (`GET /api/v1/applications/:id/compliance-assist`) and DOC-07 dossier summaries. Concurrency is strictly bounded (`CONCURRENCY_LIMIT = 3`) to prevent request flooding.
- **Graceful Failure Isolation:** If a summary enrichment request fails for a specific application, the table item gracefully displays an error badge without breaking the remaining queue rows.
- **Quick Status Filters:** Reviewers can filter between All Relevant, Recommended for EVC, EVC In Progress, and Recommended for SHC with a single click.

### 4.2 Infrastructure & Compliance Heuristics (Tab 1)
- **DOC-06 Heuristics Display:** Presents evaluated compliance metrics for Land Area, Built-up Area, Barrier-Free Access, and Fire Safety Clearance.
- **Inspection Triggers & Limitations:** Clearly renders specific reasons why physical verification was triggered (e.g. built-up area deficiency, fire NOC expiry) alongside heuristic limitations (e.g. lack of satellite geo-boundary verification).
- **Findings Matrix:** Displays each finding with finding code, rule code, category, recommended action, and linked statutory evidence. Filterable by `ALL`, `CRITICAL_DEFICIENCY`, and `ADVISORY_FLAG`.

### 4.3 Inspection Checklist & Evidence Aid (Tab 2)
- **Statutory Document Downloads:** Streams binary document files via `documentsService.downloadDocument(documentId)` using native object URLs and automatic cleanup.
- **Working Inspection Checklist Aid:** An interactive checklist covering Boundary & Land Verification, Built-up Area Sanity, Laboratory Infrastructure, Barrier-Free Features, and Fire Safety Equipment.
- **Tri-State Verification Toggle:** Supports `PENDING`, `VERIFIED_SATISFACTORY`, and `DEFICIENCY_NOTED` status per item with local scratchpad notes.
- **Strict Non-Persistence Marking:** As required by Section 7 of the specification, the checklist is explicitly labeled as a local working aid with no mock persistence, preventing any false confirmation of server sync.
- **Photo Evidence Notice:** Displays operational guidance regarding mobile inspection photo capture, tamper detection, and GPS timestamp verification, referencing the upcoming DOC-08 integration.

### 4.4 Expert Scheduling & Roster Overview (Tab 3)
- **Honest Operational Boundary:** The backend does not yet provide dedicated expert roster or calendar scheduling endpoints. The workspace displays current workflow-bound assignment state and disables scheduling triggers.
- **Formal Contract Specification:** Renders the proposed `POST /api/v1/applications/:id/evc-assignments` request/response DTO specification for backend teams (M1/M2).

### 4.5 Committee Review & Hearing (Tab 4)
- **Escalation Provenance:** Tracks the application's audit history leading to Standing Hearing Committee (SHC) escalation.
- **Critical Discrepancies Summary:** Synthesizes unaddressed critical deficiencies from DOC-06 compliance evaluation.
- **Authorized Post-Hearing Decisions:** For users with `BUREAU_HEAD` role, provides direct execution buttons for final approval (`APPLICATION_APPROVED`) or rejection (`APPLICATION_REJECTED`) backed by BE-06 FSM state transitions.
- **Committee Minutes Contract Proposal:** Documents the proposed endpoint for recording formal committee minutes and member signatures.

### 4.6 Audit Timeline & State Transitions (Tab 5)
- **BE-06 FSM Integration:** Queries server for allowed transitions via `GET /api/v1/applications/:id/allowed-transitions`.
- **Review Action Modal:** Validates mandatory justification comments for sensitive transitions (`EVC_INSPECTION_STARTED`, `RECOMMENDED_FOR_SHC`, `APPLICATION_APPROVED`, `APPLICATION_REJECTED`).
- **Timeline Visualization:** Renders chronological audit log events from `GET /api/v1/applications/:id/timeline`.

---

## 5. Human Sovereignty Safeguards (ADR-004)

Under AICTE regulatory doctrine, automated tools provide decision support and cannot autonomously approve, reject, or penalize institutions. The FE-06 implementation enforces this through:
1. **Advisory Signal Badges:** All DOC-06 compliance summaries and automated inspection recommendations are explicitly tagged with `ADVISORY / DECISION SUPPORT ONLY`.
2. **Prominent Legal Banner:** Every case workspace displays an unmissable alert: *"Under AICTE Approval Process Handbook (APH) regulations and ADR-004, automated compliance heuristics and physical inspection triggers are advisory decision support only. Statutory approval, deficiency issuance, or rejection decisions require sovereign human officer evaluation."*
3. **Mandatory Human Justification:** Server transitions executed by officers enforce typed justification comments recorded in the immutable audit log.

---

## 6. Proposed Backend Contract Extensions for M1/M2

To transition from the current workflow-bound state to centralized scheduling and multi-evidence verification, the frontend defines three formal contract proposals:

### 6.1 EVC Expert Assignment Contract
```http
POST /api/v1/applications/:id/evc-assignments
Content-Type: application/json

{
  "expertIds": ["exp-001", "exp-002"],
  "inspectionDate": "2026-11-15T09:00:00Z",
  "inspectionMode": "PHYSICAL_ON_SITE",
  "leadInspectorId": "exp-001",
  "termsOfReference": "Verify physical built-up area and barrier-free ramp accessibility"
}
```

### 6.2 Inspection Photo Evidence Contract (DOC-08)
```http
POST /api/v1/applications/:id/evc-inspections/evidence
Content-Type: multipart/form-data

- file: <binary JPEG/PNG>
- checklistItemCode: "INFRA_BARRIER_FREE_01"
- latitude: 18.5204
- longitude: 73.8567
- capturedAt: "2026-11-15T11:20:00Z"
- caption: "Ramp at main academic entrance with handrail"
```

### 6.3 Committee Recommendation Contract
```http
POST /api/v1/applications/:id/committee-recommendations
Content-Type: application/json

{
  "committeeType": "SHC",
  "hearingDate": "2026-11-20T14:00:00Z",
  "meetingMinutes": "Institution representatives presented revised municipal sanction plans...",
  "unanimous": true,
  "signatories": ["officer-001", "officer-002"]
}
```

---

## 7. Automated Test Coverage & Quality Gates

The FE-06 implementation is backed by comprehensive unit, integration, and component tests:

| Test File | Tests | Focus Area |
|---|---|---|
| `src/__tests__/evc-service.spec.ts` | 8 | API service layer, bounded concurrency enrichment, error handling |
| `src/__tests__/evc-queue.spec.tsx` | 8 | Queue rendering, search, status filtering, ADR-004 banner, navigation |
| `src/__tests__/evc-case-detail.spec.tsx` | 8 | Workspace tabs, heuristics, checklist aid, scheduling boundary, transitions |
| **All Frontend Suites** | **122 (17 files)** | Complete regression suite (100% passing) |

### Quality Gate Verification
- `npm run typecheck`: **0 errors** (`tsc --noEmit`)
- `npm run lint`: **0 warnings, 0 errors** (`eslint --max-warnings=0`)
- `npm run format:check`: **All matched files use Prettier code style**
- `npm test -- --run`: **17 test files passed, 122 tests passed**
- `npm run build`: **Production bundle compiled successfully**
