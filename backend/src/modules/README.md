# Backend Modules Architecture & Extension Seams

> **Milestone:** FND-02  
> **Architecture Pattern:** NestJS Modular Monolith (ADR-001)  
> **Status:** EXTENSION SEAMS ESTABLISHED

This directory documents the planned domain modules and their respective owners according to `PROJECT_STATE.md` and `docs/architecture/architecture-decision.md`.

---

## 1. Module Ownership Matrix

| Module Directory | Primary Owner | Implementing Chunk | Description |
|---|---|---|---|
| `auth/` | M2 | `BE-03` | Authentication, JWT issuing, bcrypt password hashing, session guards. |
| `users/` | M2 | `BE-03` | User entities, institution affiliation, regional office mapping, RBAC decorators. |
| `applications/` | M2 | `BE-04` | Application CRUD, intake envelope, dynamic APH JSONB payload with GIN indexing. |
| `rules/` | M2 | `BE-05` | Regulatory rules engine, APH versioning (APH 2024-27 fixtures), checklist validation. |
| `workflow/` | M2 | `BE-06` | Finite State Machine (FSM), state transition matrix, transition guards, timeline events. |
| `audit/` | M2 | `BE-07` | Tamper-evident sequential SHA-256 audit ledger, RFC 8785 canonicalizer, Merkle tree verifier. |
| `sla/` | M2 | `BE-08` | Durable SLA deadline timers, BullMQ delayed workers, escalation event dispatcher. |
| `undertakings/` | M2 | `BE-09` | Statutory lease validator (30-year deed norm vs. 25-year demo policy), expiry tracker. |
| `documents/` | M3 | `DOC-01` | Multi-page PDF upload pipeline, magic bytes validation, disk/S3 storage adapter. |
| `ai/` | M3 | `DOC-02` | Asynchronous BullMQ OCR pipeline, text/token extraction, provisional confidence scores. |
| `verification/` | M3 | `DOC-05` | External verification adapters, mock DigiLocker sandbox gateway, XMLDSig verifier. |
| `compliance/` | M3 | `DOC-06` | Infrastructure compliance assist, architectural floor plan / metric validation. |

---

## 2. Rules for Adding Domain Modules

1. **Encapsulation:** Export only services meant for public consumption via the module's `exports: [...]` array.
2. **Contract Adherence:** Import shared DTOs and enums strictly from `src/shared/contracts/`.
3. **No Cross-Module Database Access:** Access another module's data through its exported Service or in-process interface, never by directly querying its database table or injecting another module's repository directly.
4. **Registration:** Register new modules in `src/app.module.ts` under the appropriate comment marker.
5. **Simulated Responses:** If a module produces mock data, ensure responses declare `isMock: true` and include the appropriate `MockProviderMetadata` from shared contracts.
