# ApprovalSync — Project State & Agent Operating Contract

> **Purpose:** This is the live source of truth for implementation status, ownership, dependencies, file boundaries, and the next permitted task. Every Antigravity session must read this file and the relevant task prompt supplied by the project coordinator in chat before touching code.
>
> **Project:** ApprovalSync — AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification for AICTE (SIH).
> **Primary branch:** `main` (shared). **Team size:** 4.
> **Initial state:** Planning baseline only. No implementation is claimed complete. All chunks start `PLANNED` or `BLOCKED` until evidence says otherwise.

## 1. Product goal and non-negotiable boundaries

Build an SIH-demonstrable, secure, explainable decision-support platform for AICTE approval-related workflows. It must validate application data and documents, compare records, flag anomalies, facilitate authorized-source verification, assist documentary/infrastructure compliance review, route cases through configurable workflows, surface role-specific dashboards, track deadlines and undertakings, and retain an auditable history.

**It is not an AICTE production integration unless written authorization and real credentials are supplied.** Use synthetic/anonymized data and clearly labelled simulated provider adapters for the hackathon. Never scrape or bypass restricted portals. No secrets in Git. No real Aadhaar/PAN or unnecessary personal data in demo fixtures.

AI-generated flags are advisory, never proof of forgery. AI must not autonomously reject an application, issue an approval, determine misconduct, or replace required scrutiny/inspection/hearing. Final statutory decisions stay with authorized human roles. Every finding should link to evidence, rule/version, confidence/limitations, and reviewer disposition.

## 2. Authority and source-of-truth hierarchy

1. The supplied AICTE problem statement and applicable, verified AICTE Approval Process Handbook/regulations/instructions govern regulatory behavior.
2. `AICTE Workflow Automation Prototype Plan.pdf` supplies architectural ideas: configurable application routing; finite-state workflow; PostgreSQL JSONB; tamper-evident audit/Merkle proof; durable SLA escalation; EVC scheduling/evidence; time-bound undertakings and lease validity; authorized DigiLocker/API Setu-style verification; role-based dashboards; human-in-the-loop.
3. `ApprovalSync` implementation plan (`IMPLEMENTATION_PLAN.md` and task prompts summarize its intended modules) is a technical proposal, not legal authority. Verify all regulatory thresholds and current provider APIs before encoding them. Store policy values as versioned configuration, not hard-coded assumptions.
4. This `PROJECT_STATE.md` controls what may be implemented now and who owns files/status.
5. Existing repository conventions take precedence where compatible; audit before scaffolding. Do not assume the repository is empty.

If sources conflict or a regulatory rule cannot be confirmed, create a documented question/configuration placeholder and stop short of presenting it as law.

## 3. Team ownership (replace labels with names)

| Member | Primary ownership | Exclusive top-level file/directory ownership |
|---|---|---|
| **M1 — Platform & Integration** | repo audit, architecture contracts, Docker/CI, security baseline, integration, deployment, docs | `.github/`, `infra/`, `deploy/`, `docs/`, root compose files, root README, `PROJECT_STATE.md`, integration/e2e tests |
| **M2 — Backend Core & Workflow** | NestJS app, auth/RBAC, applications, database, workflow FSM, rules engine, audit, SLA, undertakings | `backend/src/core/`, `backend/src/auth/`, `backend/src/users/`, `backend/src/applications/`, `backend/src/workflow/`, `backend/src/rules/`, `backend/src/audit/`, `backend/src/sla/`, `backend/src/undertakings/`, backend migrations and unit tests for these modules |
| **M3 — Document AI & Verification** | upload/storage abstractions, OCR/extraction, classification, consistency, anomaly indicators, provider verification adapters, infrastructure evidence analysis | `backend/src/documents/`, `backend/src/verification/`, `backend/src/compliance/`, `backend/src/providers/`, `backend/src/ai/`, their module tests and isolated fixtures under `backend/test/fixtures/documents/` |
| **M4 — Frontend & Experience** | web app, design system, role dashboards, application wizard, reviewer queues, document evidence views, EVC/committee screens, notifications and reports UI | `frontend/`, frontend tests, `docs/ui/` |

**Ownership is by path, not by feature.** A member must not edit another member’s exclusive paths. If an interface change is needed, write a proposed contract into `docs/contracts/` (M1 owns that directory), notify the owner, and wait for contract approval before changing implementation. `backend/src/shared/contracts/` is frozen after chunk FND-02; changes require a dedicated contract-change chunk.

## 4. Status lifecycle

- `PLANNED` — not started; eligible to begin only when all dependencies are `COMMITTED` or satisfied by an explicitly permitted audit-baseline state (`ACCEPTED_AUDIT_BASELINE`), or chunk has no dependencies.
- `BLOCKED` — one or more dependencies are not `COMMITTED` or satisfied by an explicitly permitted audit-baseline state; do not start.
- `IN_PROGRESS` — implementation underway by assigned owner.
- `IMPLEMENTED` — code is written; agent has not independently verified it.
- `AWAITING_REVIEW` — tests run and report submitted; independent review pending.
- `FAILED_REVIEW` — reviewer found defects; fix before verification/commit.
- `VERIFIED` — independently reviewed against acceptance criteria.
- `COMMITTED` — verified work committed to shared `main`; record commit SHA.
- `ACCEPTED_AUDIT_BASELINE` — audit-only findings accepted; not a claim that code is complete.

**Only an independent reviewer may mark `VERIFIED`.** Coding agents may set `IMPLEMENTED` or `AWAITING_REVIEW`, never `VERIFIED` or `COMMITTED` unless a human explicitly confirms the commit exists. Do not infer status from files merely existing.

## 5. Shared-main collaboration protocol (conflicts minimized, not magically impossible)

All four people use `main`, so conflicts cannot be mathematically guaranteed absent. This plan minimizes them through exclusive path ownership, small chunks, frozen interfaces, and serialized commits.

Before work:
1. `git status --short`; if there are unexpected changes, stop and report them.
2. `git fetch origin && git pull --rebase origin main`.
3. Read this file; verify the chunk is `PLANNED`, all dependencies are `COMMITTED`, and no other chunk owns the same paths.
4. Change only files in your ownership boundary and chunk scope. Never use `git reset --hard`, `git clean -fd`, force push, blanket checkout, or blind `git add .`.
5. Run the tests specified in the chunk prompt and relevant regression tests.
6. Update only your chunk row and its evidence section in `PROJECT_STATE.md`. Because this file is shared, serialize state-file edits: pull/rebase immediately before editing and coordinate one state update at a time.
7. Report files added/changed/deleted, commands run and exact results, known gaps, and screenshots/demo steps if UI work.

Before committing:
- `git diff --check`, inspect `git diff`, run tests, `git pull --rebase origin main`.
- Stage explicit paths only. Commit with `feat(<chunk-id>): <short description>` or `fix(<chunk-id>): ...`.
- Push normally. Never force push. If rebase conflict is semantically ambiguous, stop and ask; preserve all teammates’ changes.
- A task is `COMMITTED` only after a real commit exists on `origin/main` and SHA is recorded.
- Do not start downstream chunks until dependency status is `COMMITTED`.

## 6. Technology and implementation policy

Proposed default stack from the supplied plan: **NestJS 10 / TypeScript 5.3 / Node.js 20 LTS**, PostgreSQL 16 with JSONB, Redis 7 + BullMQ for durable background jobs, React + TypeScript frontend, Docker Compose for local demo. Adapt only if the existing repository already has a viable stack; record the decision in FND-01 before implementation. Prefer a modular monolith for a hackathon over deploying many independent microservices; modules may have clean boundaries and async jobs without unnecessary distributed complexity.

Suggested supporting libraries: ORM/migrations selected by the existing repo (TypeORM or Prisma, not both); OpenAPI/Swagger; class-validator; a maintained password hashing library; JWT/session implementation; OCR adapter (Tesseract or pluggable provider); PDF/text extraction; image processing; XMLDSig verification only for supported, authorized signed XML; object storage abstraction (local dev volume, production object storage adapter); Playwright for UI/e2e; Jest/Supertest or existing equivalent.

Use typed contracts, DTO validation, centralized errors, structured logs, request IDs, pagination, rate limits, secure upload limits, MIME/signature checks, malware-scanning adapter seam, secrets from environment, encrypted transport, least-privilege RBAC, secure cookie/token handling, and retention/deletion policy. Never claim production compliance/certification without evidence.

## 7. Product scope checklist

- Application intake and category-specific dynamic forms; draft/save/submit; multiple simultaneous request categories routed using the most stringent configured workflow.
- Institutional profile and prior-record comparison using only seeded demo data or authorized adapters.
- Versioned APH/rule configuration and category-based checklists with effective dates, source references, reviewer/publisher controls and tests.
- Document upload, safe storage, classification, OCR/extraction, field-level evidence locations, required-document/completeness/expiry checks, cross-document and institutional-record consistency.
- Anomaly indicators: visual alteration heuristics, duplicate/hash/perceptual similarity, metadata anomalies, mismatched identifiers/dates. Treat as review flags, not verdicts.
- Verification adapters and status model: `VERIFIED`, `MISMATCH_DETECTED`, `EXPIRED`, `PENDING`, `SOURCE_UNAVAILABLE`, `MANUAL_REVIEW_REQUIRED`, `NOT_SUPPORTED`. Include source, timestamp, reference, comparison summary and evidence. Mock/simulated adapters visibly marked.
- Compliance assistant for certificates, floor plans, images/videos and infrastructure metrics; flag missing/contradictory evidence and potential inspection needs. Computer vision only where feasible and explainable; no claim that a photo proves physical compliance.
- Workflow finite-state machine for draft, submission, scrutiny, deficiency/clarification, re-scrutiny, EVC queue/scheduling/inspection/report, SHC/SAC where configured, decision pending, approved/rejected/withdrawn/closed; transition guards and role authorization.
- EVC scheduling with expertise, availability, jurisdiction, randomization/fairness and conflict-of-interest declarations; synthetic expert roster; geo-tag/time evidence; human approval of assignment.
- Append-only event audit with canonical payload, SHA-256 chain and Merkle root/proof verification; tamper-evidence, not a claim that a DB-only hash is impossible to rewrite without an external trust anchor.
- Durable SLA timers, configurable pre-warning/breach thresholds, idempotent escalation, pause/resume policy where authorized, dashboard and notification events; no invented statutory timelines.
- Undertakings/conditional approvals, lease/document expiry tracker, reminders and evidence submission; thresholds are configurable and explicitly labelled demo policy until verified.
- Role-specific dashboards: institution user, scrutiny officer, regional officer, EVC inspector/chair, SHC/SAC member, bureau/director/admin/auditor. Show queue, status, ageing/SLA, evidence, unresolved flags, source failures, workload and audit history according to permissions.
- Alerts/notifications, case timeline, reviewer annotations/dispositions, evidence-linked deficiency report PDF/export, search/filter, accessible responsive UI.
- Security, privacy, audit, data retention, backup/restore, observability, error states, empty/loading states, API docs, CI, Docker, deployment guide, seed/demo script, evaluation metrics.
- Evaluation harness: extraction/field accuracy on labelled synthetic data, validation precision/recall, anomaly precision/recall, source-verification success/fallback, response time, queue ageing, and manual-review effort proxy. Publish limitations and dataset sizes; do not fabricate scores.

## 8. Chunk registry

**Dependency rule:** only start when every dependency is `COMMITTED` or satisfied by an explicitly permitted audit-baseline state (`ACCEPTED_AUDIT_BASELINE`). `PLANNED` means eligible only if dependencies are committed or accepted as baseline; otherwise mark `BLOCKED`. Parallel chunks are permitted only when their dependencies are committed and file ownership does not overlap. Statuses below are initial planning statuses, not implementation claims.

| ID | Chunk | Owner | Dependencies | Exclusive scope / output | Initial status |
|---|---|---|---|---|---|
| FND-00 | Repository audit and project baseline | M1 | — | audit report, state, existing stack/risks | ACCEPTED_AUDIT_BASELINE |
| FND-GIT-00 | Initialize repository and establish initial baseline | M1 | FND-00 | `.git`, `.gitignore`, initial commit on main | COMMITTED |
| FND-01 | Architecture, threat model and demo scope decision | M1 | FND-00, FND-GIT-00 | `docs/architecture/`, decisions, threat model | COMMITTED |
| FND-02 | Shared API/data contracts and repository skeleton | M1 + M2/M3/M4 contract review | FND-01 | `docs/contracts/`, skeleton only, API conventions | COMMITTED |
| FND-03 | Docker, env templates, lint/test/CI baseline | M1 | FND-02 | compose, Dockerfiles, CI, `.env.example` | COMMITTED |
| BE-01 | Backend app foundation, config, health, OpenAPI | M2 | FND-03 | `backend/src/core/`, bootstrap | COMMITTED |

| BE-02 | Database schema and migrations | M2 | BE-01 | core entities, JSONB, migrations, seed framework | COMMITTED |
| BE-03 | Authentication, session/JWT and RBAC | M2 | BE-02 | `auth/`, `users/`, permissions | COMMITTED |
| BE-04 | Institution profiles and application intake | M2 | BE-03 | application CRUD, dynamic payload, attachments metadata | COMMITTED |
| BE-05 | Versioned regulatory rules and checklists | M2 | BE-04 | `rules/`, rule admin API, rule fixtures | COMMITTED |
| BE-06 | Workflow FSM and transition guards | M2 | BE-05 | `workflow/`, atomic transitions, timeline events | COMMITTED |

| BE-07 | Cryptographic audit ledger and proof verification | M2 | BE-02 | `audit/`, chain/Merkle tests and tamper demo | PLANNED |
| BE-08 | Durable SLA timers and escalation engine | M2 | BE-06, BE-07 | `sla/`, BullMQ jobs, idempotency and notifications contract | BLOCKED |
| BE-09 | Undertakings, lease and expiry tracker | M2 | BE-05, BE-08 | `undertakings/`, configurable date rules, deficiency output contract | BLOCKED |
| DOC-01 | Secure document upload/storage and metadata | M3 | BE-02, BE-03, FND-03 | `documents/` upload pipeline and storage adapter | COMMITTED |
| DOC-02 | OCR, classification and evidence-linked extraction | M3 | DOC-01 | OCR pipeline, extracted fields, confidence and page/bounding evidence | COMMITTED |
| DOC-03 | Completeness, expiry and cross-record consistency | M3 | DOC-02, BE-05, BE-04 | validation engine, structured findings | COMMITTED |
| DOC-04 | Duplicate and tamper/anomaly indicators | M3 | DOC-01, DOC-02 | hash/perceptual duplicate and metadata/visual heuristic flags | COMMITTED |
| DOC-05 | Issuer verification adapters and source status | M3 | DOC-01, BE-02, FND-02 | provider interfaces, simulated adapter, authorized-source adapter seams | PLANNED |
| DOC-06 | Compliance evidence and infrastructure review assist | M3 | DOC-02, DOC-03, BE-05 | documentary/infrastructure findings, inspection-needed flags | PLANNED |
| DOC-07 | Document verification orchestration and report API | M3 | DOC-03, DOC-04, DOC-05, DOC-06 | combined evidence-linked report API | BLOCKED |
| FE-01 | Frontend shell, design system, routing and API client | M4 | FND-03, FND-02 | `frontend/` foundation | COMMITTED |
| FE-02 | Login, role-aware navigation and session handling | M4 | FE-01, BE-03 | role-based route guards and access-denied UX | COMMITTED |
| FE-03 | Institution application wizard and document upload | M4 | FE-02, BE-04, DOC-01 | draft, checklist, upload and submission UI | PLANNED |
| FE-04 | Scrutiny queue, case detail and evidence review | M4 | FE-02, BE-06, DOC-07 | review UI, finding disposition, clarification loop | BLOCKED |
| FE-05 | Role-specific dashboards, SLA, alerts and analytics | M4 | FE-04, BE-08 | institution/officer/regional/bureau dashboards | BLOCKED |
| FE-06 | EVC scheduling, inspection and committee workspace | M4 | BE-06, DOC-06 | expert scheduling/evidence/recommendations/committee review UI | BLOCKED |
| FE-07 | Undertakings, expiry, reports and audit UI | M4 | BE-09, BE-07, FE-04 | reminders, downloadable reports, traceable timeline | BLOCKED |
| INT-01 | Cross-module integration and API contract conformance | M1 | BE-04, BE-05, BE-06, BE-07, BE-08, BE-09, DOC-07, FE-03, FE-04 | integration fixes in owner-approved paths | BLOCKED |
| INT-02 | Security, privacy and authorization review | M1 | INT-01 | threat-driven tests, upload/security/RBAC review | BLOCKED |
| INT-03 | Full test suite, performance smoke and evaluation harness | M1 | INT-02 | e2e, metrics, labelled benchmark report | BLOCKED |
| DEMO-01 | Seeded end-to-end evaluator demo and scenario scripts | M1 | INT-03 | reproducible demo data/script and evidence | BLOCKED |
| DEP-01 | Production-style container hardening and deployment config | M1 | DEMO-01 | production compose/container/security settings | BLOCKED |
| DEP-02 | Deploy prototype to chosen host and verify live system | M1 | DEP-01 | deployment runbook, health checks, rollback and live URL if credentials exist | BLOCKED |
| DOCS-01 | Final documentation, architecture diagrams and handoff | M1 | DEP-02 | final README, operator guide, known limitations | BLOCKED |

**Parallelization & Gating:** Explicitly permitted `ACCEPTED_AUDIT_BASELINE` prerequisites satisfy audit-only dependencies (such as FND-00 for FND-01), while all code-producing dependencies must be `COMMITTED`. After FND-03 is committed, BE-01 and FE-01 may proceed in parallel. DOC-01 may begin after BE-02 + BE-03 + FND-03. Backend document modules remain serial by their dependencies. UI chunks are serial within M4. Integration/deployment work remains gated. Do not parallelize edits to shared root config or shared contracts.

### Baseline evidence log

- **FND-00 (ACCEPTED_AUDIT_BASELINE):**
  - Thorough repository audit conducted and submitted by M1.
  - Initial workspace state verified: 3 Markdown documents present (`README.md`, `PROJECT_STATE.md`, `IMPLEMENTATION_PLAN.md`), zero application code/scaffolding, no `.git` directory.
  - Remote repository verified: `https://github.com/Arnz18/ApprovalSync.git` was accessible and completely empty (0 refs/commits).
  - Identified follow-up items: architectural divergence (microservices in README vs. modular monolith in PROJECT_STATE to be resolved in FND-01), sample/mock credential strings in documentation, and Node version pinning in Docker.
  - Verified no application code was created during audit.
  - Reviewed and accepted by human reviewer as project audit baseline.
- **FND-GIT-00 (COMMITTED):**
  - Initialized Git on branch `main` with remote `origin` pointing to `https://github.com/Arnz18/ApprovalSync.git`.
  - Created conservative root `.gitignore` (protecting `.env`, dependencies, build artifacts, OS/editor files while allowing `.env.example`).
  - Staged and committed initial documentation baseline with message: `chore: establish ApprovalSync project baseline`.
  - Published to `origin/main` via normal non-force push.
  - Commit SHA: `2d36ae7715caed01f241de6b1842b54c1e67b0c9`.
  - Verification: Local `main` SHA and remote `origin/main` SHA match exactly (`2d36ae7715caed01f241de6b1842b54c1e67b0c9`).
- **FND-STATE-00 (COMMITTED):**
  - Reconciled PROJECT_STATE.md with the actual repository baseline and audit outcome.
  - Aligned lifecycle definitions and parallelization rules: audit-only prerequisites satisfied by `ACCEPTED_AUDIT_BASELINE`, code-producing dependencies strictly gated on `COMMITTED`.
  - Removed `AGENT_PROMPTS.md` dependencies, corrected duplicate chunk ID to `DOCS-01`, and verified clean diff.
- **FND-01 (COMMITTED):**
  - Authored comprehensive architectural decision specification (`docs/architecture/architecture-decision.md`): resolved monolith vs. microservices conflict in favor of NestJS modular monolith, detailed 13 domain modules and ownership seams, and documented ADR-001 through ADR-006.
  - Authored STRIDE-based threat model (`docs/architecture/threat-model.md`): identified 8 critical assets, 6 trust boundaries, 18 detailed threat scenarios with planned control limitations and verification tests, the 7 non-negotiable safety rules, and phased controls roadmap.
  - Authored hackathon demonstration scope (`docs/architecture/demo-scope.md`): defined 5 personas, 7-step evaluator golden path, MoSCoW scope classification de-risked with concrete fallbacks for optional enhancements, 5 synthetic test scenarios, verified APH regulatory assumptions, observable success criteria, and timed 8-minute demo script.
  - Completed FND-01-REVIEW-02, FND-01-REVIEW-03, & FND-01-REVIEW-04 corrections:
    1. Traced 25-year lease covenant directly to team-authored `README.md` (Module D, lines 281-294); classified strictly as a `TEAM-DEFINED ILLUSTRATIVE DEMO POLICY` with no statutory basis in AICTE APH 2024-27.
    2. Verified statutory APH 2024-27 norms (Clause 1.4.1 for 30-year lease for new institutions; Clause 1.4.2 remaining live lease > course duration for EoA).
    3. Re-classified the 15-working-day scrutiny SLA from an unsupported official claim to a `PROPOSED DEMO TARGET / UNVERIFIED AS OFFICIAL STATUTORY SLA`.
    4. Formalized the 6-point Minimum Viable Demonstration (MVD) core and established simplification strategies for the 5 additional subsystems (BullMQ dual-mode fallback, lightweight XMLDSig mock adapter, sequential SHA-256 block chaining, single-tier accelerated SLA indicator, and tabular key-value extraction display).
    5. Replaced unqualified WORM/immutability and 'mathematical proof' claims with technically accurate tamper-evident audit logging: a sequential SHA-256 hash chain detects modifications relative to previously trusted hashes/checkpoints, cannot by itself prevent a privileged DBA from rewriting records and recomputing the chain, and requires an independent external trust anchor for DBA-level protection.
    6. Clarified synthetic XMLDSig and mock-provider semantics (verification against local test certificate, not official CCA root trust or genuine institutional authenticity; mandatory mock response tagging).
    7. Re-framed threat model mitigations as planned controls with explicit limitations (e.g. magic byte limits, DTO validation vs. prompt injection, provisional 0.85 OCR heuristic, full tenant scoping across all routes).
  - Delivered and published in Commit A (`d282700fbc744f1fcb792815afe7462d79fb9681`): `docs(arch): finalize architecture, threat model, and demo scope (FND-01)`.
  - Published paths across FND-01 deliverables (4):
    1. `docs/architecture/architecture-decision.md`
    2. `docs/architecture/threat-model.md`
    3. `docs/architecture/demo-scope.md`
    4. `PROJECT_STATE.md`
  - Push verified: Local `main` and remote `origin/main` match at `d282700fbc744f1fcb792815afe7462d79fb9681`. Status updated to `COMMITTED` (independent human verification required before `VERIFIED`).
- **FND-02 (COMMITTED):**
  - Authored shared API conventions specification (`docs/contracts/api-conventions.md`): defined `/api/v1` namespace, standard `ApiResponse<T>` and `ApiErrorResponse` envelope structures, standard error codes catalog, defensive DTO validation defaults, ISO 8601 UTC timestamps, UUIDv4 identifiers, pagination parameters, authentication/tenant boundary headers, `X-Idempotency-Key` specification, and asynchronous BullMQ job acceptance protocol (`202 Accepted`).
  - Authored shared data contracts and domain enums (`docs/contracts/data-contracts.md`): established initial integration enums (`ApplicationStatus`, `DocumentProcessingStatus`, `VerificationStatus`, `ComplianceSeverity`, `ReviewDisposition`, `UserRole`, `SlaTier`), statutory vs. illustrative demo policy categorization, and core TypeScript DTO interfaces.
  - Authored inter-module boundaries specification (`docs/contracts/module-boundaries.md`): documented formal in-process DI contracts, input/output schemas, error semantics, sync vs. async boundaries, and non-responsibilities for Core, Workflow, Documents, AI, Verification, SLA, Audit, and Frontend.
  - Established NestJS 10 + TypeScript 5.3 backend modular monolith skeleton (`backend/`):
    - Configured application entry point (`backend/src/main.ts`) with global `/api/v1` prefix, defensive `ValidationPipe`, centralized `HttpExceptionFilter`, `LoggingInterceptor` with `X-Correlation-Id` tracking, and `TransformInterceptor`.
    - Implemented typed configuration service and environment validator (`backend/src/config/`).
    - Implemented global `CoreModule` (`backend/src/core/`) providing standard exception formatting and structured logging.
    - Implemented system health check endpoint (`GET /api/v1/health`) in `HealthModule` (`backend/src/health/`).
    - Implemented shared TypeScript contracts and enums in `backend/src/shared/contracts/`.
    - Documented clean extension seams for M2/M3 domain modules in `backend/src/modules/README.md`.
    - Configured unit and end-to-end testing harness (`backend/src/health/health.controller.spec.ts` and `backend/test/app.e2e-spec.ts`).
  - Established frontend boundary specification for M4 in `frontend/README.md` (React 18 + Vite SPA; zero UI generated).
  - Created environment template (`.env.example`) with safe, placeholder-only configuration.
  - Authored developer setup and local execution guide (`docs/DEVELOPER_SETUP.md`).
  - Completed FND-02-R1 independent audit and applied FND-02-R2 corrections:
    1. Addressed DEF-01: Formally designated `POL-STAT-01`, `POL-STAT-02`, and `POL-STAT-03` as `UNVERIFIED — HUMAN REVIEW REQUIRED` in `docs/contracts/data-contracts.md` due to absence of primary Council gazette/handbook text in workspace.
    2. Addressed DEF-02: Designated shared domain enums as `PROVISIONAL BASELINE — AWAITING M2/M3 AGREEMENT` in `docs/contracts/data-contracts.md`, establishing that M2 will validate workflow/application states and M3 will validate document-processing states.
    3. Addressed DEF-03: Formally qualified `SlaTier.TIER_3_COUNCIL_LOCK` in both `data-contracts.md` and `backend/src/shared/contracts/enums.ts` as a team-defined prototype escalation concept rather than an asserted official AICTE statutory process.
    4. Recorded DEF-04 deferred validation improvement: Validation errors are currently parsed from string messages in `HttpExceptionFilter`; M2 should consider implementing a structured `ValidationPipe.exceptionFactory` producing reliable field-level error mappings during `BE-01`.
  - Validation commands executed and verified:
    - `npm run build`: TypeScript compilation succeeded (0 errors).
    - `npm test -- --runInBand`: Health controller unit tests passed (1 passed, 1 total).
    - `npm run test:e2e -- --runInBand`: Application e2e tests passed (2 passed, 2 total; verified `GET /api/v1/health` returns 200 OK with `ApiResponse` envelope, and 404 returns `ApiErrorResponse` envelope).
  - Commit SHA: `dd0a89aa807c5f943b57a6482fd4cebd4ba1bd3b` (committed and published to `origin/main`; state ledger baseline `641646906e1a465d0be634f01bfb348c7f870009`). Status updated to `COMMITTED` (independent human verification required before `VERIFIED`).
- **FND-03 (COMMITTED):**
  - Authored root Docker Compose baseline (`compose.yaml`): configured official `postgres:16-alpine` service, named volume `approvalsync_postgres_data` for persistent local storage, `pg_isready` container health check, `127.0.0.1:${DB_PORT:-5432}:5432` secure local binding, and environment variable fallbacks for local development.
  - Documented architectural decisions on conditional services:
    - **Redis 7 Omission:** Omitted from FND-03 because BullMQ queue workers and caching are scheduled for `BE-08` and `DOC-02`. Premature addition was avoided to ensure all infrastructure is actively utilized by application code.
    - **Backend Containerization:** Host-based NestJS development workflow was selected (`npm run start:dev`) with PostgreSQL running in Compose. The backend currently has no database driver or migration setup (scheduled for `BE-01` and `BE-02`), avoiding container hot-reload latency on Windows.
  - Standardized environment configuration and validation:
    - Updated `.env.example` with documented database variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`), local development fallbacks, and explicit warnings that production environments reject default demo credentials.
    - Updated `backend/src/config/configuration.ts` with typed `DatabaseConfig` factory, ensuring production environments never fall back to `postgres_dev_password`.
    - Updated `backend/src/config/config.validation.ts` to validate `DB_PORT` range (1–65535) and enforce that production (`NODE_ENV === 'production'`) strictly rejects default (`postgres_dev_password`) or missing passwords.
    - Added unit test suite `backend/src/config/config.validation.spec.ts` validating port ranges, environment modes, and production credential boundary enforcement.
  - Configured backend quality gates in `backend/`:
    - Installed `eslint@^8.57.0`, `prettier@^3.2.5`, `@typescript-eslint/parser@^6.21.0`, `@typescript-eslint/eslint-plugin@^6.21.0`, `eslint-config-prettier@^9.1.0`, and `eslint-plugin-prettier@^5.1.3`.
    - Created `backend/.eslintrc.js` and `backend/.prettierrc`.
    - Added `format`, `format:check`, and `lint` scripts to `backend/package.json`. Formatted existing codebase with 0 errors.
  - Established minimal GitHub Actions CI workflow (`.github/workflows/ci.yml`):
    - Configured triggers on push and pull requests targeting `main`.
    - Configured minimum permissions (`contents: read`).
    - Upgraded actions to `@v5` (`actions/checkout@v5`, `actions/setup-node@v5`) ensuring native compatibility with the Node 24 action execution runtime (addressing GitHub's September 2026 removal of the Node 20 action runner runtime).
    - Configured application target to active/maintenance Node.js 22 LTS with npm caching keyed to `backend/package-lock.json`.
    - Configured reproducible workflow execution: `npm ci`, `npm run format:check`, `npm run lint`, `npm run build`, `npm test -- --runInBand`, and `npm run test:e2e -- --runInBand`.
  - Updated developer setup guide (`docs/DEVELOPER_SETUP.md`): documented Node 22 LTS requirement, Docker Compose commands, container health inspection, persistent volume management, data deletion warning (`docker compose down -v`), quality gate execution, component status boundaries, and troubleshooting.
  - Validation commands executed and verified:
    - `docker compose config`: Validated compose specification (exit code 0).
    - `docker compose up -d`: Started PostgreSQL 16 container and created persistent volume (exit code 0).
    - `docker compose ps`: Verified `approvalsync-postgres` reached `healthy` status on `127.0.0.1:5432` (exit code 0).
    - `docker compose exec postgres pg_isready`: Verified database accepting connections (exit code 0).
    - `docker compose down`: Verified clean container teardown while preserving `approvalsync_postgres_data` volume (exit code 0).
    - `npm ci`: Executed clean reproducible install in `backend/` (exit code 0; 733 packages installed).
    - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
    - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
    - `npm run build`: TypeScript compilation succeeded (exit code 0).
    - `npm test -- --runInBand`: Unit test suites passed (2/2 suites, 7/7 tests passed; exit code 0).
    - `npm run test:e2e -- --runInBand`: Application e2e tests passed (1/1 suite, 2/2 tests passed; exit code 0).
  - Commit SHA: `80814532e5893aacae73c99164566c1fe58146f2` (committed and published to `origin/main`). Status updated to `COMMITTED` (independent human verification required before `VERIFIED`).
- **BE-01 (COMMITTED):**
  - Validated and typed configuration (`backend/src/config/`): validated PORT (1-65535), NODE_ENV, LOG_LEVEL, and DB_PORT ranges; enforced production safeguards requiring strong, non-empty DB_PASSWORD rejecting development placeholder `postgres_dev_password`, DB_HOST, DB_NAME, and DB_USER; ensured zero secret leakage in validation errors.
  - Implemented request correlation and structured logging (`backend/src/core/middleware/`, `backend/src/core/interceptors/`): `CorrelationMiddleware` accepts and sanitizes client-supplied `X-Correlation-Id` or generates a UUIDv4, preventing CR/LF header and log injection; returns `X-Correlation-Id` header on all responses; `LoggingInterceptor` sanitizes URLs and methods while preserving privacy (no request bodies, authorization headers, or tokens logged).
  - Implemented structured DTO validation and centralized error handling (`backend/src/core/pipes/`, `backend/src/core/filters/`): `ValidationPipe` exception factory extracts machine-readable field paths (`parent.child`), constraint rules, and messages into `FieldError[]` without fragile regex string parsing; `HttpExceptionFilter` formats all exceptions to `ApiErrorResponse`, maps status codes to standard catalog error codes, catches unhandled exceptions safely as 500 without leaking stack traces or internal environment details, and guarantees `X-Correlation-Id` is present in both headers and payload.
  - Implemented health, liveness, and readiness checks (`backend/src/health/`): `GET /api/v1/health` provides backwards-compatible overall status; `GET /api/v1/health/liveness` provides container process probe; `GET /api/v1/health/readiness` truthfully reports readiness state (`config: healthy`, `database: unconfigured` pending BE-02 without premature or mock database connection).
  - Implemented OpenAPI / Swagger 3.0 specification (`backend/src/core/swagger/`): documents `/api/v1/health`, `/api/v1/health/liveness`, and `/api/v1/health/readiness` with DTO schemas and standard envelopes; served on non-colliding UI routes (`/api/docs` and `/api/v1/docs`) and JSON schema (`/api/docs-json`); automatically disabled in production (`NODE_ENV === 'production'`) unless explicitly permitted.
  - Lifecycle reliability (`backend/src/main.ts`): graceful shutdown hooks enabled (`app.enableShutdownHooks()`), global prefix `/api/v1` applied exactly once, bootstrap exceptions caught cleanly with fatal error logger.
  - Quality gates and test results verified:
    - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
    - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
    - `npm run build`: NestJS TypeScript compilation succeeded (exit code 0).
    - `npm test -- --runInBand`: 6/6 test suites passed, 43/43 unit tests passed (exit code 0).
    - `npm run test:e2e -- --runInBand`: 1/1 test suite passed, 14/14 e2e tests passed (exit code 0).
    - Total tests: 57 tests passing across unit and e2e suites.
  - Commit SHA: `5006350440c69738d7059c0d80cb9f2eb7eca4ca` (committed and published to `origin/main`). Status updated to `COMMITTED` (independent human verification required before `VERIFIED`).
- **BE-02 (COMMITTED):**
  - Owner: M2 (Backend Core & Workflow).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Delivered:
    - Resolved database persistence stack to TypeORM (`typeorm@0.3.31`, `@nestjs/typeorm@10.0.2`, `pg@8.23.1`) matching NestJS modular monolith architecture.
    - Implemented 6 core TypeORM persistence entities under `backend/src/database/entities/`: `Institution`, `User` (`passwordHash` excluded by default with `select: false`), `Application` (with JSONB `payloadJsonb` and GIN index), `Document`, `AuditLog` (with `sequenceNumber` bigserial, actor details, payload snapshot, SHA-256 hash chain, and `onDelete: 'RESTRICT'`), and `SlaTimer`.
    - Implemented reversible, ordered migration `1729640000000-InitialCoreSchema.ts` provisioning 4 custom PostgreSQL enums (`user_role_enum`, `application_status_enum`, `document_processing_status_enum`, `sla_tier_enum`), all 6 core relational tables with foreign keys and unique constraints (eliminating redundant duplicate indexes), GIN index on `applications.payload_jsonb`, and tamper-evident trigger `trg_audit_logs_no_mutation` blocking `UPDATE` and `DELETE` on `audit_logs` (Tier 1 mutation defense).
    - Resolved audit log deletion contradiction: configured `fk_audit_logs_application` with `ON DELETE RESTRICT` (instead of `CASCADE`), preserving audit ledger history against application deletion and preventing silent audit log loss.
    - Implemented idempotent development seed framework (`SeedService`, `run-seed.ts`) with synthetic, clearly labeled records (`DEMO-INST-2026-001`, `demo.institution@synthetic.approvalsync.local`, `APP-2026-DEMO-001/002`; no real identities, personal data, or production secrets). Repeated execution verified 100% idempotent (subsequent runs skip existing records safely).
    - Integrated real PostgreSQL readiness probe in `HealthService.getReadiness()` querying `SELECT 1` on TypeORM `DataSource`. Correctly returns HTTP 200 ready when connected, HTTP 503 unhealthy when disconnected/uninitialized, and HTTP 503 unconfigured when unprovided, without leaking database credentials or internal SQL errors. Liveness probe remains independent of database state.
    - Hardened production credential safeguards in `validateConfig`: strictly rejects default passwords (`postgres_dev_password` and `postgres`) and missing/empty passwords when `NODE_ENV=production`.
    - Added dedicated database integration test suite (`test/database.integration.e2e-spec.ts`) validating connection pooling, foreign keys, unique constraints, cascade deletion on applications without audit logs, parent application deletion rejection when audit logs exist (`ON DELETE RESTRICT`), JSONB queries, trigger immutability, and seed idempotence against real PostgreSQL.
  - Quality gates verified:
    - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
    - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
    - `npm run build`: NestJS TypeScript compilation succeeded (exit code 0).
    - `npm test`: 6/6 test suites passed, 47/47 unit tests passed (exit code 0).
    - `npm run test:e2e`: 2/2 test suites passed, 24/24 integration and e2e tests passed (exit code 0).
    - Total tests: 71 tests passing across unit, e2e, and real database integration suites.
  - Commit SHA: `885519d530a4376eb8a5adf6b938ea5533a56c3d` (committed and published to `origin/main`).
- **BE-03 — Authentication, session/JWT and RBAC (COMMITTED):**
  - Owner: M2 (Backend Core & Workflow).
  - Status: `COMMITTED` (implementation accepted by project lead and published to `origin/main`).
  - Feature Commit SHA: `7da903530a231e029be8383f344a10c70e575062`.
  - Feature Commit Message: `feat(BE-03): implement authentication, JWT validation, users, and RBAC`.
  - Push Verification: Pushed to `origin/main` (non-force push verified against remote tracking ref).
  - Review & Acceptance Evidence: Implementation, security-review evidence, and acceptance gate corrections authorized by project lead for publication (without claim of independent test re-execution or live source inspection by project lead).
  - Delivered & Hardened:
    - Installed maintained authentication dependencies: `@nestjs/jwt@^10.2.0`, `bcrypt@^5.1.1`, and `@types/bcrypt@^5.0.2`.
    - Extended configuration with `JwtConfig` (`secret`, `expiresIn`, `issuer`, `audience`), enforcing strict production validation: rejects missing, empty, default development placeholders, or secrets shorter than 32 characters when `NODE_ENV === 'production'`.
    - Created typed JWT and principal interfaces under `backend/src/auth/interfaces/` (`JwtPayload`, `AuthUserPrincipal`, `AuthUserProjection`).
    - Implemented reusable authorization decorators under `backend/src/auth/decorators/`: `@Public()` (marks public unauthenticated routes in deny-by-default environment), `@Roles(...roles)` (declares required `UserRole` metadata), and `@CurrentUser(prop?)` (param decorator extracting verified principal).
    - Implemented deny-by-default `JwtAuthGuard`: validates Bearer tokens via `JwtService.verifyAsync` using HMAC-SHA256 with explicit algorithm ('HS256'), issuer, and audience verification; rejects expired, malformed, or tampered tokens with HTTP 401 `ERR_UNAUTHORIZED`; revalidates account state and active status against PostgreSQL via `UsersService.findById`, immediately rejecting missing or deactivated accounts (`isActive: false`) with HTTP 401 `ERR_UNAUTHORIZED`; dynamically derives current role and institutional tenant scope directly from persisted database state rather than trusting stale JWT claims; preserves backward-compatible developer identity stubs (`X-Dev-User-Id`, `X-Dev-User-Role`) strictly restricted to non-production environments; attaches verified, fresh principal to `request.user`.
    - Implemented centralized `RolesGuard`: enforces `@Roles(...)` metadata; allows access if route is public or has no role requirements; rejects unauthenticated principals and users lacking the required role with HTTP 403 `ERR_FORBIDDEN` and message `'Access denied: insufficient permissions for this resource.'`.
    - Registered `JwtAuthGuard` and `RolesGuard` globally via `APP_GUARD` in `AppModule`, ensuring 100% deny-by-default route security across all current and future domain modules.
    - Implemented `UsersModule` (`UsersService`, `UsersController`):
      - `UsersService.findByEmailForAuth`: explicitly selects hidden `passwordHash` column for authentication verification only.
      - `UsersService.findSafeUserById`: returns safe user projection without `passwordHash`.
      - `UsersService.createUser`: hashes password via `bcrypt.hash(password, 10)` with asynchronous salt generation.
      - `UsersController.getUserById`: protected with `@Roles(UserRole.INSTITUTION_USER, UserRole.SCRUTINY_OFFICER, UserRole.REGIONAL_OFFICER, UserRole.BUREAU_HEAD, UserRole.SYSTEM_ADMIN)`; denies non-authorized roles (e.g. `AUDITOR`, `EVC_INSPECTOR`) with 403; enforces institutional tenant isolation (Threat Model THR-06 IDOR protection); hardened against user enumeration: `INSTITUTION_USER` querying nonexistent or external UUIDs uniformly receives HTTP 403 `ERR_FORBIDDEN`.
    - Implemented `AuthModule` (`AuthService`, `AuthController`):
      - `POST /api/v1/auth/login`: validates `LoginDto` (`email`, `password`); normalizes and trims email; executes constant-time password verification via synthetic `DUMMY_BCRYPT_HASH` when account is missing, inactive, or unconfigured, ensuring nonexistent/inactive accounts take an indistinguishable asynchronous bcrypt comparison time; provides uniform rejection with HTTP 401 `ERR_UNAUTHORIZED` (`'Invalid email or password.'`), completely preventing account enumeration; returns signed JWT and safe user projection without `passwordHash`.
      - `GET /api/v1/auth/me`: protected endpoint returning authenticated user profile projection; revalidates active account state against PostgreSQL (`findSafeUserById`), rejecting deactivated users with HTTP 401 `ERR_UNAUTHORIZED`.
    - Documented architectural boundaries & limitations:
      - Stale authorization resolved: `JwtAuthGuard` verifies current persisted account state and derives fresh role/institution scope on every protected request, completely eliminating stale-claims vulnerability across all protected routes without requiring Redis or refresh-token infrastructure.
      - Rate limiting boundary: No application-level throttling currently protects `POST /api/v1/auth/login`; deployment requires gateway/proxy rate limiting or future throttling chunk.
    - Updated synthetic development seed records in `seed.data.ts` and `seed.service.ts`:
      - Populated valid synthetic bcrypt hashes for demo password `DemoPass@123`.
      - Added synthetic inactive account `demo.inactive@synthetic.approvalsync.local` to verify disabled account rejection.
      - Seed remains 100% idempotent (11 skipped on re-run).
    - Comprehensive test coverage verified:
      - Unit tests: 83 tests passing across 11 suites (including constant-time dummy compare, RBAC guards, tenant isolation, and guard-level DB revalidation of active status and fresh role/tenant scope).
      - E2E & DB tests: 50 tests passing across 3 suites (10 database integration, 14 app e2e, 26 auth e2e testing login, JWT verification, RBAC rejections, immediate deactivation rejection on protected routes, immediate role demotion denial, and dynamic tenant reassignment).
  - Quality gates verified:
    - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
    - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
    - `npm run build`: NestJS TypeScript compilation succeeded (exit code 0).
    - `npm test -- --runInBand`: 11/11 test suites passed, 83/83 unit tests passed (exit code 0).
    - `npm run test:e2e -- --runInBand`: 3/3 test suites passed, 50/50 integration and e2e tests passed (exit code 0).
    - Total tests: 133 tests passing across unit, e2e, and PostgreSQL integration suites.
  - Commit SHA: `7da903530a231e029be8383f344a10c70e575062` (committed and published to `origin/main`).
- **BE-04 — Institution profiles and application intake (COMMITTED):**
  - Owner: M2 (Backend Core & Workflow).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Delivered & Hardened:
    - Implemented `InstitutionsModule` (`backend/src/institutions/`):
      - `GET /api/v1/institutions/my-profile`: retrieves authenticated institution profile with `INSTITUTION_USER` role guard.
      - `PATCH /api/v1/institutions/my-profile`: updates editable profile fields (`name`, `institutionType`, `state`, `district`, `pincode`, `address`) for caller's institution; non-whitelisted/protected fields (`id`, `registrationNumber`) rejected with HTTP 400 `ERR_VALIDATION_FAILED`.
      - `GET /api/v1/institutions/:id`: allows `INSTITUTION_USER` to view own institution; strictly rejects cross-tenant and nonexistent IDs with uniform HTTP 403 `ERR_FORBIDDEN` preventing institution ID enumeration; permits broader read access for authorized regulatory roles (`SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`, `AUDITOR`, `EVC_INSPECTOR`).
      - `PATCH /api/v1/institutions/:id`: allows `INSTITUTION_USER` (own institution only) and `SYSTEM_ADMIN` to update editable fields; rejects regulatory review roles with HTTP 403 `ERR_FORBIDDEN`; strictly preserves immutable server-managed fields (`id`, `registrationNumber`, `createdAt`, `updatedAt`).
    - Implemented `ApplicationsModule` (`backend/src/applications/`):
      - `POST /api/v1/applications`: creates draft application bound to caller's `institutionId` with server-generated collision-resistant `applicationNumber` (`APP-YYYY-XXXXXXXX`); validates envelope via `CreateApplicationDto`; sanitizes `payloadJsonb` against reserved server keys (`status`, `institutionId`, `applicationNumber`, `id`, `submittedAt`); rejects non-`INSTITUTION_USER` with HTTP 403.
      - `GET /api/v1/applications`: lists applications with safe pagination (`page >= 1`, `1 <= limit <= 100`), allowlisted sorting (`sortBy: createdAt, updatedAt, applicationNumber, academicYear, submittedAt, status`, `sortOrder: ASC, DESC`), and status/search filters; strictly scopes queries to caller's `institutionId` for `INSTITUTION_USER`; allows cross-institutional queries and optional `institutionId` filtering for regulatory/admin roles.
      - `GET /api/v1/applications/:id`: retrieves application details; enforces strict tenant isolation for `INSTITUTION_USER` (cross-tenant and nonexistent IDs uniformly return HTTP 403 `ERR_FORBIDDEN` preventing IDOR and ID enumeration); allows regulatory roles to view applications across institutions.
      - `PATCH /api/v1/applications/:id`: partially updates editable draft applications for `INSTITUTION_USER`; strictly blocks updates if application is not in `DRAFT` status (HTTP 400 `ERR_BAD_REQUEST`); blocks cross-tenant edits with HTTP 403.
      - `POST /api/v1/applications/:id/submit`: transitions application from `DRAFT` to `SUBMITTED` and stamps `submittedAt` inside an atomic database transaction (`dataSource.transaction`) with a row-level pessimistic write lock (`pessimistic_write`) to prevent concurrent double-submission race conditions; blocks submission if not in `DRAFT` status (HTTP 400); blocks cross-tenant submissions with HTTP 403.
      - `GET /api/v1/applications/:id/documents`: retrieves document attachment metadata for an application with tenant verification, strictly adhering to the document metadata boundary: excludes `storagePath` and internal storage details, aligning with the frozen `DocumentMetadata` contract (`fileSizeBytes: number`, `sha256Checksum`, `uploadedAt`).
    - Security & contract corrections applied:
      - Confirmed absence of `AICTE_ADMIN` in frozen `UserRole` enum; aligned all controllers with valid frozen roles (`SYSTEM_ADMIN`, `SCRUTINY_OFFICER`, etc.).
      - Defensively validated `sortBy`, `sortOrder`, `page`, and `limit` prior to query builder allocation.
      - Implemented pessimistic write lock on application submission transaction without nullable outer joins to comply with PostgreSQL `FOR UPDATE` constraints.
      - Added regression test suites for protected field mutation, payload sanitization, query parameter limits, real PostgreSQL concurrent submissions, and document metadata privacy.
    - Database schema & migrations:
      - 100% satisfied by existing `institutions`, `applications`, and `documents` tables provisioned in BE-02; zero migrations required.
    - Test coverage verified:
      - Unit tests: 132 tests passing across 15 suites (49 unit tests covering `InstitutionsService`, `InstitutionsController`, `ApplicationsService`, `ApplicationsController`).
      - E2E tests: 91 tests passing across 4 suites (41 e2e tests in `applications.e2e-spec.ts` testing auth, tenant isolation, IDOR defense, anti-enumeration, DTO validation, draft mutations, atomic submission with pessimistic lock concurrency, and document metadata boundaries against real PostgreSQL 16).
      - Total test suite: 223 tests passing across unit and PostgreSQL 16 integration/e2e suites (0 failures, 0 skipped).
    - Quality gates verified:
      - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
      - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
      - `npm run build`: NestJS TypeScript compilation succeeded (exit code 0).
      - `npm test -- --runInBand`: 15/15 test suites passed, 132/132 unit tests passed (exit code 0).
      - `npm run test:e2e --% --runInBand`: 4/4 test suites passed, 91/91 integration and e2e tests passed (exit code 0).
      - `git diff --check`: Passed with zero whitespace warnings (exit code 0).
  - Commit SHA: `6c488625169d0852eff7716dc67c3ac5d6c059da` (committed and published to `origin/main`). Status updated to `COMMITTED` (independent human verification required before `VERIFIED`).

  - BE-05 (COMMITTED):
    - Module path: `backend/src/rules/`
    - Scope implemented:
      - Domain model & entities: `RuleSet`, `RuleVersion`, `RegulatoryRule`, `ChecklistTemplate`, `ChecklistItem` with normalized relationships, monotonic version numbering (`versionNumber: number`), explicit lifecycle states (`DRAFT`, `PUBLISHED`, `RETIRED`), three-tier source classification (`VERIFIED_REGULATORY`, `UNVERIFIED_HUMAN_REVIEW_REQUIRED`, `ILLUSTRATIVE_DEMO`), compliance severity (`MANDATORY`, `HIGH`, `MEDIUM`, `LOW`, `INFO`), item types (`DOCUMENT`, `FIELD_VALUE`, `DECLARATION`, `FACILITY_INSPECTION`), display ordering, and JSONB rule parameters.
      - Database schema & migrations:
        - Added reversible TypeORM migration `backend/src/database/migrations/1729720000000-CreateRulesAndChecklists.ts` provisioning 5 tables (`rule_sets`, `rule_versions`, `regulatory_rules`, `checklist_templates`, `checklist_items`) with foreign keys (`ON DELETE CASCADE` from versions to rules/templates for clean draft management, while parent rule set deletions are restricted when published versions exist), compound unique indexes (`UQ_rule_versions_set_version` on `[rule_set_id, version_number]`), and index on `[application_category, lifecycle_status, effective_from, effective_to]`.
        - Verified migration execution and rollback idempotency (`npm run migration:run` -> `npm run migration:revert` -> `npm run migration:run`).
      - Service & business logic (`RulesService`):
        - Rule set management: creation and listing with category filtering and pagination.
        - Version drafting: monotonically increments version numbers per rule set; prevents creation when an unfinalized draft already exists.
        - Content drafting: adding rules and checklist templates/items to draft versions; updating draft rules; deleting draft rules.
        - Publication invariants & validation: atomic transaction via `dataSource.transaction` that enforces: (1) status must be `DRAFT`; (2) version must have at least one rule; (3) `effectiveTo` must be strictly after `effectiveFrom`; (4) rules classified as `VERIFIED_REGULATORY` must have non-empty `sourceTitle` and `clauseReference`; (5) rejection of publication if date interval `[effectiveFrom, effectiveTo)` overlaps with any existing `PUBLISHED` version in the same rule set (`ERR_CONCURRENCY_CONFLICT`).
        - Immutability enforcement: published or retired versions reject any metadata modification, rule addition, rule update, rule deletion, template creation, or checklist item creation (HTTP 400 `ERR_BAD_REQUEST`).
        - Retirement: safe retirement of published versions without rewriting history; draft versions can be retired/cancelled without affecting published policy.
        - Applicable-version resolution: deterministic resolution query (`resolveApplicableVersion`) for a given `applicationCategory` and evaluation date `YYYY-MM-DD`; strictly queries `PUBLISHED` versions where `effectiveFrom <= evaluationDate < effectiveTo`; deterministic tie-breaking by descending `versionNumber`; returns 404 `ERR_RESOURCE_NOT_FOUND` if no version matches.
      - REST API & Controller (`RulesController`):
        - Endpoints registered under `/api/v1/rules`:
          - `POST /api/v1/rules/sets`: create rule set (`SYSTEM_ADMIN` only).
          - `GET /api/v1/rules/sets`: list rule sets with pagination and category filter (all authenticated roles).
          - `GET /api/v1/rules/applicable`: resolve applicable published version and checklist for category and evaluation date (all authenticated roles).
          - `GET /api/v1/rules/sets/:id`: get rule set details with versions (all authenticated roles; non-admins filtered to published/retired versions).
          - `POST /api/v1/rules/sets/:id/versions`: create draft version (`SYSTEM_ADMIN` only).
          - `GET /api/v1/rules/versions/:versionId`: get version details with rules and checklists (all authenticated roles; non-admins blocked from draft versions with HTTP 403 `ERR_FORBIDDEN`).
          - `PATCH /api/v1/rules/versions/:versionId`: update draft version metadata (`SYSTEM_ADMIN` only).
          - `POST /api/v1/rules/versions/:versionId/rules`: add rule to draft version (`SYSTEM_ADMIN` only).
          - `PATCH /api/v1/rules/versions/:versionId/rules/:ruleId`: update rule in draft version (`SYSTEM_ADMIN` only).
          - `DELETE /api/v1/rules/versions/:versionId/rules/:ruleId`: remove rule from draft version (`SYSTEM_ADMIN` only).
          - `POST /api/v1/rules/versions/:versionId/checklists`: create checklist template and items in draft version (`SYSTEM_ADMIN` only).
          - `POST /api/v1/rules/versions/:versionId/publish`: publish draft version atomically (`SYSTEM_ADMIN` only).
          - `POST /api/v1/rules/versions/:versionId/retire`: retire published version (`SYSTEM_ADMIN` only).
        - Documented with OpenAPI/Swagger decorators and standardized response/error envelopes.
      - Seed data:
        - Synthetic, clearly labeled illustrative seed fixtures in `seed.data.ts` and `seed.service.ts` modeling AICTE Approval Process Handbook (APH) 2024-25 norms for `ENGINEERING_TECHNOLOGY` (`ENGINEERING_TECH_APH_2024_25` with 4 rules and 1 checklist template containing 4 items).
        - Explicit source classification `ILLUSTRATIVE_DEMO` with clear notes stating simulated values for SIH prototype.
        - Fully idempotent seed execution verified (30 existing records detected and skipped cleanly on re-runs).
    - Test coverage verified:
      - Unit tests: 160 tests passing across 17 suites (28 new unit tests in `rules.service.spec.ts` and `rules.controller.spec.ts` covering validation, monotonic numbering, draft immutability, atomic publication, overlap prevention, applicable resolution, and RBAC).
      - E2E tests: 119 tests passing across 5 suites (28 new e2e tests in `rules.e2e-spec.ts` exercising full HTTP REST API against live PostgreSQL 16: admin creation, drafting, publication validation, overlap rejection, post-publication immutability, applicable resolution, and RBAC enforcement).
      - Total test suite: 279 tests passing across unit and PostgreSQL 16 integration/e2e suites (0 failures, 0 skipped).
    - Quality gates verified:
      - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
      - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
      - `npm run build`: NestJS TypeScript compilation succeeded (exit code 0).
      - `npm test -- --runInBand`: 17/17 test suites passed, 160/160 unit tests passed (exit code 0).
      - `npm run test:e2e --% --runInBand`: 5/5 test suites passed, 119/119 integration and e2e tests passed (exit code 0).
      - `git diff --check`: Passed with zero whitespace warnings (exit code 0).
  - Commit SHA: `948615f7ce168c4c0f4ec45f7664518b2433447c` (committed and published to `origin/main`). Status updated to `COMMITTED` (independent human verification required before `VERIFIED`).
- `BE-06 — Workflow FSM and transition guards` (M2):
    - Implementation summary:
      - Deterministic Workflow Finite-State Machine:
        - Built strictly upon frozen `ApplicationStatus` and `UserRole` contracts without modifying frozen shared types.
        - Implemented `WORKFLOW_TRANSITIONS` matrix with 16 explicit permitted transitions covering drafting, submission, scrutiny, deficiency clarification, resubmission, EVC queueing, EVC progress, EVC report submission, SHC/SAC escalation, regional/bureau approval, rejection, and institution withdrawal.
        - Enforced terminal state locks on `APPROVED`, `REJECTED`, and `WITHDRAWN`, preventing any further status modification.
        - Enforced mandatory human justification comments for sensitive or adverse transitions (`DEFICIENCY_ISSUED`, `RECOMMENDED_FOR_SHC`, `REJECTED`, `WITHDRAWN`).
        - Enforced human-in-the-loop principle: AI document findings and anomaly flags do not trigger automatic statutory decisions; final statutory determinations require verified human reviewer roles (`BUREAU_HEAD`, `REGIONAL_OFFICER`).
      - Atomicity & Concurrency Control:
        - Transitions executed within TypeORM transactions (`dataSource.transaction`) using PostgreSQL pessimistic write row locks (`pessimistic_write` / `SELECT ... FOR UPDATE`).
        - Concurrent competing requests serialize cleanly; the serialized follower reads the updated state, validates against the updated FSM preconditions, and rejects invalid transitions without race conditions.
        - Integrated BE-04 application submission (`submitDraftApplication`) with `workflowService.recordTimelineEventInTransaction` inside the existing submission transaction, ensuring exactly one timeline event is committed atomically with the status change.
      - Relational Workflow Timeline Events:
        - Created migration `1729800000000-CreateWorkflowTimelineEvents.ts` creating table `workflow_timeline_events` with composite index `(application_id, created_at ASC)` and foreign key with `ON DELETE RESTRICT` to protect event history against cascading deletion.
        - Persisted structured timeline records containing `fromStatus`, `toStatus`, `eventType`, `actorId`, `actorRole`, `actorEmail`, `comment`, `metadataJsonb`, and `createdAt`.
        - Fully protected actor identities and timestamps by deriving them exclusively from the server-validated JWT principal and database timestamp.
      - Service & Controller Endpoints:
        - `POST /api/v1/applications/:id/transitions`: Execute state transition with atomic timeline event recording.
        - `GET /api/v1/applications/:id/timeline`: Paginated chronological timeline retrieval for authorized principals.
        - `GET /api/v1/applications/:id/allowed-transitions`: Contextual discovery of valid next transitions for the caller's verified role and application state.
        - Enforced institutional tenant isolation: `INSTITUTION_USER` callers are strictly restricted to their own applications, while cross-tenant attempts return `404 ERR_RESOURCE_NOT_FOUND` to prevent identifier enumeration.
        - Enforced RBAC using `RolesGuard` and verified database user status using `JwtAuthGuard`.
    - Test coverage verified:
      - Unit tests: 189 tests passing across 20 suites (29 new unit tests in `workflow-fsm.spec.ts`, `workflow.service.spec.ts`, and `workflow.controller.spec.ts` covering transition matrix validity, terminal states, comment requirements, role authorization, tenant scoping, anti-enumeration, and transactional execution).
      - E2E tests: 146 tests passing across 6 suites (27 new e2e tests in `workflow.e2e-spec.ts` exercising complete 10-step application lifecycle, auth guards, tenant isolation, anti-enumeration, invalid transitions, terminal locks, timeline retrieval, PostgreSQL 16 concurrent conflicting transitions with pessimistic locking, and concurrent submission races).
      - Total test suite: 335 tests passing across unit and PostgreSQL 16 integration/e2e suites (0 failures, 0 skipped).
    - Quality gates verified:
      - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
      - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
      - `npm run build`: NestJS TypeScript compilation succeeded (exit code 0).
      - `npm test -- --runInBand`: 20/20 test suites passed, 189/189 unit tests passed (exit code 0).
      - `npx jest --config ./test/jest-e2e.json --runInBand`: 6/6 test suites passed, 146/146 integration and e2e tests passed on PostgreSQL 16 (exit code 0).
      - `git diff --check`: Passed with zero whitespace warnings (exit code 0).
    - GitHub Actions CI verification:
      - Phase A CI Repair Commit SHA: `65000667aeceb0fc11a84f33d7350aa1eb2f86f3` (verified green in GitHub Actions run `40086521309`).
      - BE-06 Feature Commit SHA: `dfb16972d3ca40f5b9d3b846e9df18c5e69b5fd2` (verified green in GitHub Actions run `40088510672`, all 12 job steps succeeded). Status updated to `COMMITTED` (independent human verification required before `VERIFIED`).
- **DOC-01 — Secure document upload/storage and metadata (COMMITTED):**
  - Owner: M3 (Document AI & Verification).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Feature Commits:
    - `892dbf87808caf0ce7ad98db4d86786a0bb126a7`: `feat(documents): add file binary signature and security validation`
    - `b8798699099f2365ae25c1056f851f26b6bc17b8`: `feat(documents): add private storage and malware scanning adapters`
    - `73f7457df148cb13baef415fced09ccec97546e8`: `feat(documents): add documents service and controller with tenant isolation`
    - `2d98bf986b311404b27ae223a48b6c8819004517`: `test(documents): add PostgreSQL-backed document intake and storage E2E tests`
  - Delivered:
    - File validation & security checks (`FileValidatorService`): streaming magic byte signature inspection for PDF (`%PDF-`), JPEG (`\xFF\xD8\xFF`), and PNG (`\x89PNG\r\n\x1a\n`); size limits (PDF $\le 10\text{MB}$, images $\le 5\text{MB}$); path traversal defense rejecting `..`, directory separators, and null bytes; SHA-256 cryptographic checksum calculation over raw file bytes.
    - Private storage adapter abstraction (`LocalStorageAdapter` implementing `IStorageAdapter` via `STORAGE_ADAPTER_TOKEN`): private isolated filesystem storage outside web root; path containment validation; secure streaming read/write/delete.
    - Pluggable malware scanner interface (`MalwareScannerAdapter` implementing `IMalwareScanner` via `MALWARE_SCANNER_TOKEN`): fail-closed security policy when configured; EICAR signature detection; graceful unconfigured logging.
    - Document intake service & controller (`DocumentsService`, `DocumentsController`): endpoints `POST /api/v1/applications/:id/documents` (multipart upload with file signature validation), `GET /api/v1/documents/:id` (metadata with tenant isolation), `GET /api/v1/documents/:id/download` (streamed private file download with `Content-Disposition: attachment`), `DELETE /api/v1/documents/:id` (soft-delete with storage cleanup); tenant isolation protecting cross-institution access with HTTP 403 / 404 anti-enumeration.
  - Quality gates verified:
    - Unit tests: 23 unit tests passing in `documents.service.spec.ts`, `file-validator.service.spec.ts`, `local-storage.adapter.spec.ts`, `malware-scanner.adapter.spec.ts`.
    - E2E tests: 27 PostgreSQL 16 E2E tests passing in `documents.e2e-spec.ts`.
- **DOC-02 — OCR, classification and evidence-linked extraction (COMMITTED):**
  - Owner: M3 (Document AI & Verification).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Feature Commits:
    - `fbbea41faa2f194dd15974122bcf6e16c1520c45`: `feat(ai): add document OCR provider interface and adapters`
    - `6996987dba509b39fe2b2f948d3f6eedb2a68fd3`: `feat(ai): add document classification and structured field extraction`
    - `0ca348a78c7ce68b0dc34be7b9558660aed17512`: `feat(ai): add document processing service and analysis endpoints`
    - `53a63a38b899513b4f17fe96401e113146463431`: `test(ai): add PostgreSQL-backed document AI pipeline E2E tests`
  - Delivered:
    - Pluggable OCR adapter layer (`IOcrProvider` via `OCR_PROVIDER_TOKEN`): `DeterministicOcrAdapter` for test fixtures; adapter seams for `TesseractOcrAdapter` (local CLI fallback) and `GoogleDocAiAdapter` (cloud enterprise OCR); graceful reporting when unconfigured.
    - Rule-based & keyword-weighted document classification (`DocumentClassificationService`): classifies 8 statutory categories (`LAND_TITLE_DEED`, `LAND_USE_CERTIFICATE`, `BUILDING_PLAN_APPROVAL`, `FIRE_SAFETY_CERTIFICATE`, `SOCIETY_TRUST_REGISTRATION`, `OCCUPANCY_CERTIFICATE`, `AFFIDAVIT_COMPLIANCE`, `UNKNOWN_OTHER`) with confidence scores.
    - Evidence-linked structured field extraction (`FieldExtractionService`): extracts statutory fields (deed numbers, registration dates, land areas, survey numbers, issuing authorities) with normalized values, confidence scores, and page/bounding box evidence locations (`BoundingBox`: `pageNumber`, `xMin`, `yMin`, `xMax`, `yMax`).
    - AI document processor & analysis endpoints (`AiDocumentProcessorService`, `AiController`): `POST /api/v1/documents/:id/process-ai`, `GET /api/v1/documents/:id/analysis-report`; updates `DocumentProcessingStatus` (`OCR_EXTRACTED`, `MANUAL_REVIEW_REQUIRED`) and persists analysis JSONB.
  - Quality gates verified:
    - Unit tests: 27 unit tests passing across `ai.controller.spec.ts`, `ai-document-processor.service.spec.ts`, `document-classification.service.spec.ts`, `field-extraction.service.spec.ts`, `deterministic-ocr.adapter.spec.ts`.
    - E2E tests: 12 PostgreSQL 16 E2E tests passing in `ai-document-processing.e2e-spec.ts`.
- **DOC-03 — Completeness, expiry and cross-record consistency (COMMITTED):**
  - Owner: M3 (Document AI & Verification).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Feature Commits:
    - `cf1868e3cd59bd1a17c443752d4b9043a2bc612c`: `feat(verification): define document completeness and field validation rules`
    - `a24d5e8d199c9a31f63c8d6dce466ad67c0a1fee`: `feat(verification): implement document expiry and date validity engine`
    - `6f00eb5e6d1e1bb738d3183a5cd66f82200074c0`: `feat(verification): add cross-record consistency matching and validation orchestrator`
    - `3fcd962364a464208a04c24790098b96ae2eca4f`: `test(verification): add PostgreSQL-backed document validation E2E tests`
  - Delivered:
    - Mandatory document completeness engine (`DocumentCompletenessService`): checks uploaded attachments against applicable regulatory rules (`BE-05`), identifies missing mandatory documents, satisfies compliant submissions, and generates structured `ValidationFinding` findings.
    - Extracted field completeness validation (`FieldCompletenessService`): validates presence and format of required extracted fields per document category.
    - Expiry & date validity engine (`DocumentExpiryService`): configurable evaluation date provider (`DateProviderService` via `DATE_PROVIDER_TOKEN`); identifies expired certificates, future dates, and pre-warning windows (30/60/90 days).
    - Cross-record consistency matching (`CrossRecordConsistencyService`): cross-checks land area across deed and building plan; verifies survey numbers and registration numbers; matches institution name across documents with fuzzy Levenshtein and token overlap; checks tenure duration against AICTE APH norms (30-year lease / ownership).
    - Validation orchestrator & report API (`ValidationOrchestratorService`, `VerificationController`): `POST /api/v1/applications/:id/validate-documents`, `GET /api/v1/applications/:id/validation-report`; calculates overall validation status (`COMPLIANT`, `DEFICIENT`, `REQUIRES_REVIEW`); human sovereignty adherence (`isAdvisory: true` on all findings per ADR-004).
  - Quality gates verified:
    - Unit tests: 42 unit tests passing across `document-completeness.service.spec.ts`, `field-completeness.service.spec.ts`, `document-expiry.service.spec.ts`, `cross-record-consistency.service.spec.ts`, `validation-orchestrator.service.spec.ts`.
    - E2E tests: 9 PostgreSQL 16 E2E tests passing in `document-validation.e2e-spec.ts`.
- **DOC-04 — Duplicate and tamper/anomaly indicators (COMMITTED):**
  - Owner: M3 (Document AI & Verification).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Feature Commits:
    - `6a7eeed9116f428d2d9e3c213d344b43b13650d9`: `feat(verification): detect exact and near-duplicate document submissions`
    - `03d3f3a58857777cb18833422b917a2b8c6c68cb`: `feat(verification): add document structural integrity and anomaly indicators`
    - `4c7d0ba1a155f92a15a6f70d0091bb102e44aa22`: `feat(verification): integrate duplicate detection and anomaly checks into verification API`
    - `b30d1e6d9d5b682c59a08fff3e2060b71374ea6c`: `test(verification): add PostgreSQL-backed duplicate and anomaly detection E2E tests`
  - Delivered:
    - Exact duplicate detection (`DocumentDuplicateDetectionService`): reuses existing SHA-256 checksums from `Document` entity; streams from `IStorageAdapter` if missing; categorizes into intra-application duplicate (`CRITICAL_DEFICIENCY`), inter-application duplicate within same institution (`ADVISORY_FLAG`), and cross-institution collision with tenant privacy redaction (hides foreign institution IDs/names from applicants, preserves supervisory audit trail for officers).
    - Near-duplicate & template discrimination (`NearDuplicateDetectionService`): 64-bit hex perceptual hash Hamming distance comparison (distance $\le 10$); hybrid text token Jaccard similarity and character 3-gram shingles (threshold $0.85$); statutory identifier key-field matching; boilerplate template discrimination distinguishing shared government forms from duplicates.
    - Document structural integrity & anomaly indicators (`DocumentIntegrityService`): validates PDF `%PDF-` header and `%%EOF` trailer; scans for active executable launch content (`/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFiles`); checks metadata timeline inversion (`ModDate` < `CreationDate`); inspects image editing software markers (Photoshop, GIMP, Canva); verifies digital signature trust seam (honest `SOURCE_UNAVAILABLE` reporting when unconfigured); checks extraction anomalies (date inversion, low confidence).
    - API endpoints & composite integration (`VerificationController`, `ValidationOrchestratorService`): `POST /api/v1/applications/:id/check-duplicates`, `POST /api/v1/documents/:id/check-integrity`, `GET /api/v1/documents/:id/integrity`; aggregates duplicate and anomaly findings into composite application validation report; human sovereignty compliance (`isAdvisory: true`).
  - Quality gates verified:
    - Unit tests: 29 unit tests passing across `document-duplicate-detection.service.spec.ts`, `near-duplicate-detection.service.spec.ts`, `document-integrity.service.spec.ts`, `verification.controller.spec.ts`.
    - E2E tests: 12 PostgreSQL 16 E2E tests passing in `duplicate-and-anomaly.e2e-spec.ts`.
    - Total test suite: 39 unit test suites (352 tests) and 10 PostgreSQL E2E test suites (203 tests) passing cleanly.
- **FE-01 — Frontend shell, design system, routing and API client (COMMITTED):**
  - Owner: M4 (Frontend & Experience).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Feature Commits:
    - `3f3d3ea`: `feat(FE-01): establish frontend foundation and application entry`
    - `7b34919`: `feat(FE-01): add design tokens and reusable UI components`
    - `43568b1`: `feat(FE-01): implement responsive application shell and routes`
    - `6d476ce`: `feat(FE-01): add typed API client and environment configuration`
    - `5fdf8b9`: `test(FE-01): cover routing, API errors, and frontend states`
    - `a463e0a`: `docs(FE-01): document UI system and frontend development`
  - Delivered:
    - Frontend foundation (`frontend/`): React 18.3 + TypeScript 5.5 + Vite 5.4 SPA with path aliases (`@/`), strict compilation rules, dev server on port 5173 with proxy for `/api` -> `http://localhost:3000`, and zero-secret environment template `.env.example`.
    - Design tokens & system (`styles/tokens.css`, `styles/components.css`, `styles/layout.css`, `styles/index.css`): implemented `ui-ux-pro-max` design intelligence utilizing Swiss Minimalism & Enterprise Gateway visual direction (density 7/10 for institutional workflow, motion 3/10 respecting `prefers-reduced-motion`, deep trust navy `#1E3A5F`, royal blue `#2563EB`, slate background `#F8FAFC`, card `#FFFFFF`, contrast ratios exceeding 7:1, and visible `:focus-visible` focus rings).
    - Reusable UI component library (`components/ui/`): `Button` (loading spinner, variants, icons), `Badge` (semantic variants, domain mappings for `ApplicationStatus`, `VerificationStatus`, `ComplianceSeverity`, and mandatory contract `SimulatedDataBadge`), `Card` (compound card layout), `FormField` (accessible `htmlFor`, `aria-invalid`, `aria-describedby` helper/error associations), `Alert` (`role="alert"`), `Loading` (Spinner & Skeleton), `EmptyState`, `PageHeader` (breadcrumbs, action slots), and `Modal` (focus trapping, Esc dismissal).
    - Workspace layout shell (`components/layout/`): `Header` (institutional branding, live backend health check displaying `API Online` / `API Standby`, prototype indicator, mobile hamburger), `Sidebar` (categorized navigation with active route indicator and milestone badges), `MobileNav` (responsive drawer), and `Footer` (regulatory decision-support disclaimers, OpenAPI and health API links).
    - Routes & views (`pages/`, `routes/`): `HomePage` with active institutional KPI cards, core module navigator, and interactive design validation sandbox; `FeaturePlaceholderPage` providing clear milestone gating for downstream chunks (`/applications`, `/scrutiny`, `/verification`, `/evc`, `/rules`, `/audit`, `/settings`) without dead buttons or fabricated submissions; and custom 404 `NotFoundPage`.
    - Centralized typed API client (`api/`): `ApiClient` supporting `/api/v1` base URL, `ApiResponse<T>` / `ApiErrorResponse` envelope parsing, auto-generated RFC4122 v4 UUID `X-Correlation-Id` header propagation, query parameter formatting, `FormData` multipart uploads without boundary overwrites, `AbortController` timeout aborts, and typed `ApiClientError` extraction; integrated with backend health endpoints via `HealthService` (`/health`, `/health/liveness`, `/health/readiness`).
    - Comprehensive test coverage (`src/__tests__/`): 4 test files, 26 unit tests passing across API client, routing, UI components, and shell layout.
    - Architecture & design documentation: updated `frontend/README.md`, authored `docs/ui/design-system.md` and `docs/ui/architecture.md`.
  - Quality gates verified:
    - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
    - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
    - `npm run typecheck`: TypeScript compilation passed with zero errors (`tsc --noEmit`).
    - `npm test`: 4/4 test files passed, 26/26 unit tests passed (exit code 0).
    - `npm run build`: Production build succeeded in 2.21s with zero errors.
- **FE-02 — Login, role-aware navigation and session handling (COMMITTED):**
  - Owner: M4 (Frontend & Experience).
  - Status: `COMMITTED` (reviewed and authorized by project lead; committed and published to `origin/main`).
  - Feature Commits:
    - `13e3d28`: `feat(FE-02): add authentication types and API service`
    - `84c04e5`: `feat(FE-02): add centralized session and auth state`
    - `7eaad6b`: `feat(FE-02): implement login page and form validation`
    - `7f3989a`: `feat(FE-02): protect routes and handle access denied`
    - `06afa06`: `feat(FE-02): implement role-aware navigation and logout`
    - `0559f9a`: `test(FE-02): cover session lifecycle and route authorization`
    - `1300d44`: `docs(FE-02): document authentication and access model`
    - `74940b3`: `style(FE-02): apply prettier code style across auth modules and tests`
  - Delivered:
    - Centralized authentication architecture (`frontend/src/auth/`): `AuthProvider`, `AuthContext`, `useAuth`, `sessionStorage`, `roleRoutes`. Modeled discrete session states (`INITIALIZING`, `UNAUTHENTICATED`, `AUTHENTICATING`, `AUTHENTICATED`, `ERROR`).
    - Real BE-03 API client integration (`frontend/src/api/services/authService.ts`): endpoints `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. Integrated dynamic Bearer token injection into `ApiClient` with explicit suppression on public requests (`authToken: null`).
    - Institutional login experience (`frontend/src/pages/LoginPage.tsx`): Swiss Minimalism card design following `ui-ux-pro-max`, inline field validation (required inputs, email regex), accessible labels and error announcements (`role="alert"`), password visibility toggle, pending submission state (`aria-busy="true"`), uniform generic rejection message on 401 (`"Invalid email or password."`) preventing account enumeration, recoverable network error handling, and development-only click-to-fill demo helper (`demo.institution@synthetic.approvalsync.local` / `DemoPass@123`).
    - Scoped session storage (`frontend/src/auth/sessionStorage.ts`): bearer tokens stored in browser `sessionStorage` with memory fallback, avoiding persistent `localStorage` XSS persistence across sessions; token hygiene preventing exposure in URLs, logs, or UI text.
    - Protected route guards (`frontend/src/routes/ProtectedRoute.tsx`): zero content flash during session verification (`Spinner`), automatic redirect to `/login` preserving local return destination, and open-redirect sanitization (`getSafeReturnUrl`).
    - Role-based access control & 403 UX (`frontend/src/pages/AccessDeniedPage.tsx`): distinct HTTP 403 Forbidden state for unauthorized roles, displaying current identity, required clearance, and return-to-workspace action without logging the user out.
    - Role-aware navigation (`frontend/src/components/layout/Header.tsx`, `Sidebar.tsx`, `MobileNav.tsx`): replaced static persona with authenticated user profile and formatted role badge; added functional Sign Out button executing client-side session cleanup; filtered navigation items against `UserRole` enum (`INSTITUTION_USER`, `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `EVC_INSPECTOR`, `SHC_SAC_MEMBER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`, `AUDITOR`).
    - Comprehensive automated test coverage: added 28 new tests (54 total across 8 test suites) covering API service, session bootstrap, storage cleanup, login form validation, error banners, RBAC matrix, open-redirect prevention, and route protection.
    - Documentation: updated `frontend/README.md` and created `docs/ui/authentication-and-access.md`.
  - Quality gates verified:
    - `npm run format:check`: Passed cleanly with zero style violations (exit code 0).
    - `npm run lint`: Passed with 0 errors and 0 warnings (exit code 0).
    - `npm run typecheck`: TypeScript compilation passed with zero errors (`tsc --noEmit`).
    - `npm test`: 8/8 test files passed, 54/54 unit & integration tests passed (exit code 0).
    - `npm run build`: Production build succeeded in 1.48s with zero errors.

## 9. Definition of done for every code chunk

- Acceptance criteria in the chunk-specific prompt satisfied.
- Unit/integration tests added for behavior and negative cases.
- Lint, type-check and relevant test commands pass; report exact counts and failures.
- No secrets, real sensitive records, dead buttons, fake success states, hidden mock integrations, or unexplained AI decisions.
- API/UI errors and permission-denied paths are handled.
- Evidence and rule references are traceable where applicable.
- `PROJECT_STATE.md` updated with status, changed paths, tests, limitations, and commit SHA if actually committed.
- Agent report contains: chunk ID, status proposed, files changed, commands/results, screenshots/demo steps, outstanding issues, and explicit statement of what is simulated.
- Independent reviewer verifies before status can become `VERIFIED`; commit only after review.

## 10. Current work / next action

- **Current implementation status:** Repository audit accepted (`ACCEPTED_AUDIT_BASELINE`); Git baseline established (`COMMITTED` at `2d36ae7715caed01f241de6b1842b54c1e67b0c9`); project state ledger updated (`COMMITTED` at `1f13aea704eea4185205bd51274fd48b182bd947`); architecture deliverables published to `origin/main` (`COMMITTED` at `d282700fbc744f1fcb792815afe7462d79fb9681` / `ec25be6157ba8fe65a2e3c979675ca3177576d84`); shared API/data contracts and repository skeleton published to `origin/main` (`COMMITTED` at `dd0a89aa807c5f943b57a6482fd4cebd4ba1bd3b` / `641646906e1a465d0be634f01bfb348c7f870009`); Docker Compose baseline, quality gates, and CI workflow published to `origin/main` (`COMMITTED` at `80814532e5893aacae73c99164566c1fe58146f2`); backend application foundation, configuration validation, health checks, and OpenAPI published (`COMMITTED` at `5006350440c69738d7059c0d80cb9f2eb7eca4ca`); database schema, migrations, seed framework, and real database readiness published to `origin/main` (`COMMITTED` at `885519d530a4376eb8a5adf6b938ea5533a56c3d`); authentication, JWT issuance, password hashing, RBAC guards, and user tenancy published to `origin/main` (`COMMITTED` at `7da903530a231e029be8383f344a10c70e575062`); institution profiles, application intake, draft updates, atomic submission, and tenant isolation published to `origin/main` (`COMMITTED` at `6c488625169d0852eff7716dc67c3ac5d6c059da`); versioned regulatory rules, checklists, publication validation, overlap prevention, immutability, and applicable resolution published to `origin/main` (`COMMITTED` at `948615f7ce168c4c0f4ec45f7664518b2433447c`); CI repair and workflow test reliability published to `origin/main` (`COMMITTED` at `65000667aeceb0fc11a84f33d7350aa1eb2f86f3`); workflow FSM, transition guards, pessimistic write concurrency locking, and atomic timeline event persistence published to `origin/main` (`COMMITTED` at `dfb16972d3ca40f5b9d3b846e9df18c5e69b5fd2`); secure document upload, private storage abstraction, and access control published to `origin/main` (`COMMITTED` at `2d98bf986b311404b27ae223a48b6c8819004517`); OCR adapter pipeline, document classification, and evidence-linked field extraction published to `origin/main` (`COMMITTED` at `53a63a38b899513b4f17fe96401e113146463431`); document completeness, expiry/date validity, cross-record consistency, and validation orchestrator published to `origin/main` (`COMMITTED` at `3fcd962364a464208a04c24790098b96ae2eca4f`); document duplicate detection, near-duplicate similarity, template discrimination, structural integrity, and anomaly indicators published to `origin/main` (`COMMITTED` at `b30d1e6d9d5b682c59a08fff3e2060b71374ea6c`); frontend shell, design system, routing and API client published to `origin/main` (`COMMITTED` at `41f8ee953c71d16b686418630ade470d64557daf`); and login, role-aware navigation and session handling implemented (`COMMITTED`). Cryptographic audit ledger (BE-07) and external provider verification adapters (DOC-05) have not yet been implemented.
- **Current chunk:** `FE-02 — Login, role-aware navigation and session handling` (`COMMITTED`). Feature published, all 54 frontend unit and integration tests passing, production build verified, and state ledger finalized.
- **Next action:** Assignment and implementation of newly unblocked eligible chunks:
  - `BE-07` (Cryptographic audit ledger and proof verification, M2)
  - `DOC-05` (Issuer verification adapters and source status, M3)
  - `DOC-06` (Compliance evidence and infrastructure review assist, M3)
  - `FE-03` (Institution application wizard and document upload, M4)
- **Eligibility & Gating:**
  - `BE-02` is `COMMITTED` (commit `885519d530a4376eb8a5adf6b938ea5533a56c3d`).
  - `BE-03` is `COMMITTED` (commit `7da903530a231e029be8383f344a10c70e575062`).
  - `BE-04` is `COMMITTED` (commit `6c488625169d0852eff7716dc67c3ac5d6c059da`).
  - `BE-05` is `COMMITTED` (commit `948615f7ce168c4c0f4ec45f7664518b2433447c`).
  - `BE-06` is `COMMITTED` (commit `dfb16972d3ca40f5b9d3b846e9df18c5e69b5fd2`).
  - `BE-07` is `PLANNED` (dependency `BE-02` is `COMMITTED`; eligible for M2 assignment).
  - `BE-08` remains `BLOCKED` (requires both `BE-06` and `BE-07` to be `COMMITTED`; `BE-07` is currently `PLANNED`).
  - `DOC-01` is `COMMITTED` (commit `2d98bf986b311404b27ae223a48b6c8819004517`).
  - `DOC-02` is `COMMITTED` (commit `53a63a38b899513b4f17fe96401e113146463431`).
  - `DOC-03` is `COMMITTED` (commit `3fcd962364a464208a04c24790098b96ae2eca4f`).
  - `DOC-04` is `COMMITTED` (commit `b30d1e6d9d5b682c59a08fff3e2060b71374ea6c`).
  - `DOC-05` is `PLANNED` (all dependencies `DOC-01`, `BE-02`, and `FND-02` are `COMMITTED`; eligible for M3 assignment).
  - `DOC-06` is `PLANNED` (all dependencies `DOC-02`, `DOC-03`, and `BE-05` are `COMMITTED`; eligible for M3 assignment).
  - `DOC-07` remains `BLOCKED` (requires `DOC-03`, `DOC-04`, `DOC-05`, and `DOC-06` to be `COMMITTED`; `DOC-05` and `DOC-06` are currently `PLANNED`).
  - `FE-01` is `COMMITTED` (all dependencies `FND-02` and `FND-03` are satisfied).
  - `FE-02` is `COMMITTED` (all dependencies `FE-01` and `BE-03` are satisfied).
  - `FE-03` is `PLANNED` (all dependencies `FE-02`, `BE-04`, and `DOC-01` are `COMMITTED`; eligible for M4 assignment).
  - All subsequent downstream chunks (`BE-08`, `BE-09`, `DOC-07`, `FE-04` through `FE-07`, `INT-01` through `DOCS-01`) remain strictly `BLOCKED` until their respective dependencies are satisfied and committed.
- **Decisions Formalized in FND-01 through DOC-04 & FE-01/FE-02:** Adopted NestJS modular monolith; established `/api/v1` namespace; standardized `ApiResponse<T>` / `ApiErrorResponse` envelopes with `X-Correlation-Id`; frozen domain enums; established PostgreSQL 16 Docker Compose baseline with persistent volume; configured ESLint + Prettier quality gates; established GitHub Actions CI pipeline with live PostgreSQL service container, health checks, automated migrations, and seeds; enforced strict configuration validation with production credential guards; implemented structured field-level DTO validation; implemented truthful liveness/readiness health probes; established OpenAPI 3.0 documentation at `/api/docs` and `/api/docs-json`; adopted TypeORM with PostgreSQL 16; provisioned core relational schema with GIN index on application JSONB; enforced audit log immutability via database trigger; configured audit log foreign key with `ON DELETE RESTRICT` to protect audit history against application deletion; established idempotent synthetic development seed framework; adopted bcrypt password hashing with salt factor 10; implemented deny-by-default JWT authentication and RBAC guards; enforced uniform rejection on invalid/inactive login to prevent account enumeration; enforced institutional tenant isolation preventing IDOR cross-tenant access; generated collision-resistant server-controlled application numbers (`APP-YYYY-XXXXXXXX`); enforced server-side sanitization of dynamic JSONB payloads against reserved server properties; enforced draft-only mutation rules preventing post-submission tampering; implemented atomic draft-to-submitted status transitions in database transactions; established strict document attachment metadata boundary without premature storage or OCR leakage; implemented normalized versioned regulatory rules and checklist schema with monotonic version numbers, explicit lifecycle states (`DRAFT`, `PUBLISHED`, `RETIRED`), and three-tier source classifications (`VERIFIED_REGULATORY`, `UNVERIFIED_HUMAN_REVIEW_REQUIRED`, `ILLUSTRATIVE_DEMO`); enforced atomic transactional publication with validation rejecting empty rules, inverted date ranges, missing mandatory source citations for verified rules, and overlapping effective-date intervals for published versions in the same rule set; enforced strict immutability preventing modification or deletion of published/retired policy versions; implemented deterministic applicable-version resolution for specified categories and explicit evaluation dates (`YYYY-MM-DD`); centralized RBAC restricting rule administration/publishing/retiring to `SYSTEM_ADMIN` while providing authenticated read and applicable-resolution access across all roles; established idempotent synthetic seed fixtures for AICTE Approval Process Handbook (APH) 2024-25 illustrative rules and checklist templates; implemented deterministic workflow finite-state machine (FSM) adhering to frozen `ApplicationStatus` and `UserRole` enums across all configured lifecycle stages; enforced terminal state locks on `APPROVED`, `REJECTED`, and `WITHDRAWN`; mandated human justification comments on deficiency, hearing recommendation, rejection, and withdrawal transitions; enforced human-in-the-loop statutory decision policy (AI flags and findings provide decision support without automated approvals/rejections); enforced concurrency-safe transitions via TypeORM transactions and PostgreSQL `pessimistic_write` row locking (`SELECT ... FOR UPDATE`); provisioned relational `workflow_timeline_events` persistence with composite index `(application_id, created_at ASC)` and foreign key `ON DELETE RESTRICT`; derived actor identity, email, role, and event timestamps exclusively from server-verified JWT claims and database clock; unified BE-04 application submission with transactional timeline event creation; exposed protected workflow transition, timeline, and allowed-transition discovery endpoints under `/api/v1/applications/:id`; implemented streaming magic byte inspection for document validation and path containment; established private local storage adapter with safe streaming download; established malware scanning interface with fail-closed security boundary; implemented pluggable OCR adapter architecture supporting deterministic local fixtures, CLI fallback, and cloud document AI; established keyword-weighted document classification across 8 statutory categories; implemented evidence-linked structured field extraction with bounding box locations; established mandatory document completeness validation linked to versioned regulatory rules; implemented configurable date provider and certificate expiry evaluation; implemented cross-record consistency matching between land deed, building plan, and institutional profile; implemented exact SHA-256 duplicate detection distinguishing intra-app, same-institution, and cross-institution scopes; enforced tenant privacy redaction on cross-tenant duplicate matches for applicant users; implemented 64-bit perceptual hash Hamming distance comparison and text token Jaccard similarity for near-duplicate detection; implemented template discrimination to protect standardized government forms from false duplicate accusations; implemented PDF structural checks, active executable token scanning, metadata timeline inversion detection, image editing tool markers inspection, and honest PKI trust seam reporting; established React 18 + Vite 5 + TypeScript SPA frontend foundation; implemented Swiss Minimalism design tokens with institutional density 7/10 and subtle motion 3/10; established reusable accessible UI component system; established responsive application workspace shell with live health probe; implemented centralized typed API client with correlation tracing and error normalization; established centralized authentication architecture with AuthProvider and useAuth; implemented scoped sessionStorage token storage with memory fallback; implemented protected route guard with zero content flash and open-redirect sanitization; implemented role-based access control and 403 Access Denied UX; implemented role-aware navigation and dynamic shell header with client-side logout; and verified comprehensive frontend test suite with 54 passing tests.
