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
| FND-02 | Shared API/data contracts and repository skeleton | M1 + M2/M3/M4 contract review | FND-01 | `docs/contracts/`, skeleton only, API conventions | PLANNED |
| FND-03 | Docker, env templates, lint/test/CI baseline | M1 | FND-02 | compose, Dockerfiles, CI, `.env.example` | BLOCKED |
| BE-01 | Backend app foundation, config, health, OpenAPI | M2 | FND-03 | `backend/src/core/`, bootstrap | BLOCKED |
| BE-02 | Database schema and migrations | M2 | BE-01 | core entities, JSONB, migrations, seed framework | BLOCKED |
| BE-03 | Authentication, session/JWT and RBAC | M2 | BE-02 | `auth/`, `users/`, permissions | BLOCKED |
| BE-04 | Institution profiles and application intake | M2 | BE-03 | application CRUD, dynamic payload, attachments metadata | BLOCKED |
| BE-05 | Versioned regulatory rules and checklists | M2 | BE-04 | `rules/`, rule admin API, rule fixtures | BLOCKED |
| BE-06 | Workflow FSM and transition guards | M2 | BE-05 | `workflow/`, atomic transitions, timeline events | BLOCKED |
| BE-07 | Cryptographic audit ledger and proof verification | M2 | BE-02 | `audit/`, chain/Merkle tests and tamper demo | BLOCKED |
| BE-08 | Durable SLA timers and escalation engine | M2 | BE-06, BE-07 | `sla/`, BullMQ jobs, idempotency and notifications contract | BLOCKED |
| BE-09 | Undertakings, lease and expiry tracker | M2 | BE-05, BE-08 | `undertakings/`, configurable date rules, deficiency output contract | BLOCKED |
| DOC-01 | Secure document upload/storage and metadata | M3 | BE-02, BE-03, FND-03 | `documents/` upload pipeline and storage adapter | BLOCKED |
| DOC-02 | OCR, classification and evidence-linked extraction | M3 | DOC-01 | OCR pipeline, extracted fields, confidence and page/bounding evidence | BLOCKED |
| DOC-03 | Completeness, expiry and cross-record consistency | M3 | DOC-02, BE-05, BE-04 | validation engine, structured findings | BLOCKED |
| DOC-04 | Duplicate and tamper/anomaly indicators | M3 | DOC-01, DOC-02 | hash/perceptual duplicate and metadata/visual heuristic flags | BLOCKED |
| DOC-05 | Issuer verification adapters and source status | M3 | DOC-01, BE-02, FND-02 | provider interfaces, simulated adapter, authorized-source adapter seams | BLOCKED |
| DOC-06 | Compliance evidence and infrastructure review assist | M3 | DOC-02, DOC-03, BE-05 | documentary/infrastructure findings, inspection-needed flags | BLOCKED |
| DOC-07 | Document verification orchestration and report API | M3 | DOC-03, DOC-04, DOC-05, DOC-06 | combined evidence-linked report API | BLOCKED |
| FE-01 | Frontend shell, design system, routing and API client | M4 | FND-03, FND-02 | `frontend/` foundation | BLOCKED |
| FE-02 | Login, role-aware navigation and session handling | M4 | FE-01, BE-03 | role-based route guards and access-denied UX | BLOCKED |
| FE-03 | Institution application wizard and document upload | M4 | FE-02, BE-04, DOC-01 | draft, checklist, upload and submission UI | BLOCKED |
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

- **Current implementation status:** Repository audit accepted (`ACCEPTED_AUDIT_BASELINE`); Git baseline established (`COMMITTED` at `2d36ae7715caed01f241de6b1842b54c1e67b0c9`); project state ledger updated (`COMMITTED` at `1f13aea704eea4185205bd51274fd48b182bd947`); architecture deliverables published to `origin/main` (`COMMITTED` at `d282700fbc744f1fcb792815afe7462d79fb9681`). Actual application code has not yet been implemented.
- **Next eligible chunk:** `FND-02 — Shared API/data contracts and repository skeleton` (M1 + M2/M3/M4 contract review).
- **Next action:** Prepare and begin FND-02: author shared API/data contracts in `docs/contracts/` and create repository directory skeleton in accordance with ADR-001.
- **Eligibility & Gating:** FND-01 is `COMMITTED`. All prerequisites for FND-02 (FND-01 committed) are satisfied, so FND-02 is `PLANNED`. Downstream chunks (`FND-03`, `BE-*`, `DOC-*`, `FE-*`, `INT-*`, `DEMO-*`, `DEP-*`, `DOCS-*`) remain strictly `BLOCKED` until their specific prerequisites are committed.
- **Decisions Formalized in FND-01:** Adopted NestJS modular monolith; synchronous REST transitions with asynchronous BullMQ OCR/SLA workers; pluggable verification adapters with explicit mock declarations; human-sovereignty advisory AI policy; tamper-evident audit logging with mutation triggers and SHA-256 Merkle proof verification; and Node 20 LTS containerization.
