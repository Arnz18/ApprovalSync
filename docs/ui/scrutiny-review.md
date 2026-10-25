# ApprovalSync — Scrutiny Review, Evidence Inspection & Clarification Workflow

> **Milestone:** FE-04 — Scrutiny Queue, Case Detail and Evidence Review  
> **Lead Role:** M4 — Frontend & Experience  
> **Collaborating Roles:** M2 — Backend & Integration, M3 — Document Intelligence, M1 — Contracts & Data  
> **Status:** IMPLEMENTED & VERIFIED  
> **Backend Integration:** BE-06 (Workflow Engine & State Transitions), DOC-07 (Dossier Verification Report & Summary Synthesis), BE-04 (Applications API), DOC-01 (Document Attachments)  

---

## 1. Executive Summary & Purpose

The Scrutiny Review Workspace provides an authorized, high-density, accessible interface for AICTE Scrutiny Officers, Regional Officers, and Bureau Heads to evaluate institutional regulatory applications. It implements a complete review workflow:

1. **Scrutiny Queue (`/scrutiny`):** A paginated, filterable, and searchable queue backed by `GET /api/v1/applications`, enriched with lightweight dossier summaries (`GET /api/v1/applications/:id/dossier-report/summary`) via bounded concurrency workers.
2. **Case Detail Workspace (`/scrutiny/:applicationId`):** A 4-tab inspection console providing institutional metrics, automated multi-pipeline dossier findings, document verification matrix with cryptographic checksums, and immutable chronological audit timeline.
3. **Evidence Review & Document Inspection:** Modal inspection of OCR-extracted statutory fields and page-level bounding box locations, duplicate detection indicators (DOC-04), structural anomaly codes (DOC-04), and external issuer registry verification outcomes (DOC-05).
4. **Authorized Clarification & State Transitions:** Integration with the real BE-06 workflow FSM (`POST /api/v1/applications/:id/transitions`), discovering server-permitted transitions dynamically (`GET /api/v1/applications/:id/allowed-transitions`) and enforcing mandatory justification for deficiency notices (`DEFICIENCY_ISSUED`).
5. **Human Sovereignty Compliance (ADR-004):** Prominent legal disclaimers preserving the rule that automated AI indicators, heuristic checks, and anomaly flags are decision support only, requiring sovereign human evaluation before statutory decisions are rendered.

---

## 2. Information Architecture & Navigation

```text
/scrutiny (Regulatory Scrutiny Queue)
   │
   ├── Search: Reference, Application Number, Program
   ├── Filters: Lifecycle Status, Sort Attribute, Sort Direction, Page Size
   │
   └── [Review Case Action]
         │
         ▼
/scrutiny/:applicationId (Case Detail Workspace)
   │
   ├── CaseHeader: UUID, Application No., Institutional Profile, Back Navigation
   ├── ADR-004 Human Sovereignty Legal Disclaimer Alert
   ├── Permitted Review Actions Toolbar (Dynamic Server Transitions)
   │     └── [Action Click] ➔ ReviewActionModal (Mandatory Comment Validation)
   │
   └── Section Inspection Tabs:
         ├── Tab 1: Dossier Findings & AI Synthesis (Composite Status, KPI tiles, EVC recommendation, expandable finding cards)
         ├── Tab 2: Document Verification Matrix (Attachments, Checksums, OCR Confidence, Duplicate/Issuer badges, Inspect Modal, Secure Download)
         ├── Tab 3: Application Metrics & Facilities (Land, Built-up area, Faculty, Books, Computers, Courses table)
         └── Tab 4: Case Timeline & History (Chronological audit events, actor roles, transition timestamps, justification comments)
```

---

## 3. UI/UX Skill Application (`ui-ux-pro-max`)

The interface was designed adhering to the `ui-ux-pro-max` framework:
- **Visual Direction:** **Swiss Minimalism & Enterprise Regulatory Gateway** — high density, crisp visual hierarchy, neutral surface backgrounds, subtle border dividers, and semantic state indicators.
- **Typography:** Lexend headings and Source Sans 3 body text, paired with monospace fonts for cryptographic SHA-256 checksums, case UUIDs, and rule codes.
- **Color Palette & Contrast:** Strict adherence to WCAG 2.1 AA accessibility ratios. Zero raw hex codes; all styling utilizes CSS variables (`var(--color-primary)`, `var(--color-surface)`, `var(--color-error)`, `var(--color-warning)`, `var(--color-success)`).
- **Interactive States:** Accessible focus rings, hover transitions, disabled states, accessible loading spinners, and clear ARIA labels across all filters, tables, modals, and tabs.
- **Reduced Motion:** All transitions and spinner animations respect `@media (prefers-reduced-motion: reduce)`.

---

## 4. Dossier Verification & Evidence Presentation (DOC-07 Integration)

### 4.1 Automated Synthesis Breakdown
The Dossier Findings tab synthesizes findings from multiple underlying verification pipelines:
- **Completeness & Expiry Checks (DOC-02 / DOC-03):** Flags missing mandatory certificates or certificates expiring within regulatory thresholds.
- **Cross-Record Consistency (DOC-04):** Detects discrepancies between declared institutional metrics and OCR-extracted document values (e.g., architectural blueprint built-up area vs. declared area).
- **Duplicate Detection (DOC-04):** Shows cryptographic SHA-256 matches and near-duplicate perceptual similarity warnings.
- **Document Structure & Tamper Anomalies (DOC-04):** Flags structural PDF anomalies, font inconsistencies, or metadata alterations.
- **Issuer Verification (DOC-05):** Reports verification against trusted issuer registries, explicitly labelling simulated doubles (`SIMULATED / MOCK DATA`).
- **Physical Inspection Heuristics (DOC-07):** Evaluates whether an on-site Expert Visit Committee (EVC) visit is recommended, listing specific trigger reasons.

### 4.2 Finding Cards & Evidence Linkage
Each finding card exposes:
- Severity Badge (`Critical Deficiency`, `Advisory Flag`, or `Compliant`).
- Rule Code and Regulatory Category citation.
- Clear statutory message with Expected vs. Actual value comparison.
- "Inspect Doc" shortcut navigating directly to the supporting document in the verification matrix.
- Expandable details showing document attachment UUID, field key, OCR bounding box coordinates (page number and percentage coordinates), and the ADR-004 advisory policy tag.

### 4.3 Safe Document Access & Binary Streaming
- Document downloads invoke `GET /api/v1/documents/:id/download` via `documentsService.downloadDocument`.
- Internal storage paths (`storagePath`) and private file-system details are never exposed to the client.
- The API client streams binary blobs and dynamically extracts filenames from the `Content-Disposition` response header.
- Client-generated Object URLs (`URL.createObjectURL`) are revoked immediately after the download trigger to prevent memory leaks.

---

## 5. Workflow Transitions & Clarification Protocol (BE-06 Integration)

### 5.1 Server-Discovered Transitions
The frontend discovers allowed transitions via `GET /api/v1/applications/:id/allowed-transitions`. The transition buttons displayed in the Permitted Review Actions bar are strictly driven by the backend FSM response for the caller's authenticated role.

### 5.2 Mandatory Justification Enforcement
When an officer triggers a transition requiring justification (such as `DEFICIENCY_ISSUED` or `REJECTED`):
- The `ReviewActionModal` presents the regulatory event description.
- The comment textarea is marked as required with a character counter (max 2000 chars).
- Client-side validation blocks submission if the comment is empty or whitespace-only.
- On execution, `POST /api/v1/applications/:id/transitions` is called atomically with pessimistic row locking on the server.
- Upon success, the case details, allowed transitions, and chronological timeline are re-fetched from the authoritative backend.

---

## 6. Security, Tenancy & Role Isolation

- **Role Guarding:** The scrutiny workspace (`/scrutiny`, `/scrutiny/:applicationId`) is restricted to authorized roles: `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, and `SYSTEM_ADMIN`.
- **401 Unauthorized:** Prompts a redirect to `/login` with return-path preservation.
- **403 Forbidden:** Renders an accessible Alert explaining role authorization boundaries. Cross-tenant access attempts by institutional users to other institutions' applications result in 403 Access Forbidden without disclosing case existence.
- **404 Not Found:** Renders a clean EmptyState with a "Return to Scrutiny Queue" action.

---

## 7. Current Limitations & Proposed Contract Extension

### Finding-Level Review Disposition Persistence Gap
- **Finding:** The backend contracts define the `ReviewDisposition` enum (`PENDING_REVIEW`, `APPROVED_BY_OFFICER`, `DEFICIENCY_FLAGGED`, `OVERRIDDEN_WITH_JUSTIFICATION`) in `backend/src/shared/contracts/enums.ts`.
- **Status:** However, there is no database entity, controller endpoint, or service method in the backend to persist individual finding-level annotations, acceptances, or dismissals.
- **Resolution in FE-04:** Adhering strictly to prompt instructions (Section 8), the frontend provides a complete read-only evidence review experience and executes statutory decisions at the case level via the real BE-06 workflow FSM (`POST /api/v1/applications/:id/transitions`). We do **not** invent mock persistence or fake mutation endpoints.
- **Proposal for M1 / M2:** A formal proposal is submitted to M1 (Contracts) and M2 (Backend) to introduce `POST /api/v1/applications/:id/dossier-report/findings/:findingId/disposition` with a supporting `dossier_finding_dispositions` database table.

---

## 8. Verification & Quality Gates

The FE-04 implementation was verified with comprehensive automated testing:
- `npm run typecheck` — 0 errors (`tsc --noEmit`).
- `npm run lint` — 0 warnings (`eslint --max-warnings=0`).
- `npm test` — **14 test suites, 97 unit and component tests passing (100% pass rate)**.
- Specific scrutiny test coverage:
  - `src/__tests__/scrutiny-service.spec.ts` (8 tests)
  - `src/__tests__/scrutiny-queue.spec.tsx` (7 tests)
  - `src/__tests__/case-detail.spec.tsx` (9 tests)
  - `src/__tests__/routes.spec.tsx` (7 tests)
- `npm run build` — Production bundle generated cleanly without warnings.
