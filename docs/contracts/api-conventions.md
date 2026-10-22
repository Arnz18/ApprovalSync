# ApprovalSync — Shared API Conventions & Protocols

> **Document Version:** 1.0.0<br>
> **Status:** APPROVED BASELINE (Milestone FND-02)<br>
> **Author:** M1 — Platform & Integration Lead<br>
> **Stakeholders:** M2 (Backend Core & Workflow), M3 (Document AI & Verification), M4 (Frontend & Experience)<br>
> **Last Updated:** 2026-10-22

---

## 1. Overview and Core Principles

This specification defines the authoritative API conventions for **ApprovalSync**. All modules developed by M2 (Backend Core & Workflow), M3 (Document AI & Verification), and consumed by M4 (Frontend & Experience) must strictly adhere to these protocols.

### Architectural Principles
1. **Predictability:** Consistent URI structure, parameter names, and payload shapes across all 13 domain modules.
2. **Defensive Validation:** Strict DTO validation with zero tolerance for unknown properties (`forbidNonWhitelisted: true`).
3. **Traceability:** Every request and response carries an immutable correlation identifier (`correlationId`) for end-to-end tracing across HTTP endpoints, BullMQ workers, and audit ledgers.
4. **Information Security:** Zero exposure of stack traces, database schema details, or raw server exceptions in API error responses.
5. **Clear Simulation Demarcation:** Synthetic data and mock provider responses must be prominently flagged in payloads and headers.

---

## 2. API Versioning and URL Conventions

### 2.1 URI Namespace and Versioning
All public REST endpoints must be prefixed with the major API version:
```
https://<host>[:port]/api/v1/<resource>
```

- **Base URL:** `/api/v1`
- **Health Check Endpoint:** `GET /api/v1/health`
- **OpenAPI / Swagger Documentation:** `GET /api/v1/docs` (available in non-production environments)

### 2.2 Resource Naming Rules
- Resources use **kebab-case** and are **pluralized nouns**:
  - Correct: `/api/v1/applications`, `/api/v1/scrutiny-reviews`, `/api/v1/audit-logs`
  - Incorrect: `/api/v1/application`, `/api/v1/getApplications`, `/api/v1/scrutiny_reviews`
- Sub-resources express ownership hierarchies (maximum 2 nesting levels):
  - Correct: `/api/v1/applications/:id/documents`
  - Correct: `/api/v1/applications/:id/timeline`
- Action-oriented endpoints on specific resources use verbs only when standard CRUD is insufficient:
  - Correct: `POST /api/v1/applications/:id/submit`
  - Correct: `POST /api/v1/applications/:id/transitions`
  - Correct: `POST /api/v1/audit-logs/verify`

### 2.3 HTTP Method Semantics

| HTTP Method | Idempotent | Safe | Usage in ApprovalSync | Expected Response Code |
|---|---|---|---|---|
| `GET` | Yes | Yes | Retrieve resource representations or query lists. Must never mutate state. | `200 OK` |
| `POST` | No | No | Create resources or initiate state transitions. | `201 Created` (creation), `200 OK` (computation/action), `202 Accepted` (async job) |
| `PATCH` | No | No | Partially update resource properties (e.g. draft application fields). | `200 OK` |
| `PUT` | Yes | No | Replace complete resource representation. Restricted use. | `200 OK` |
| `DELETE` | Yes | No | Soft-delete or archive resources (hard deletes prohibited by audit policy). | `200 OK` or `204 No Content` |

---

## 3. Standard Response Envelope

All API responses follow a uniform JSON structure.

### 3.1 Single Resource Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "7f8b9c2a-1d3e-4b5a-9f6c-8e0a1b2c3d4e",
    "applicationNumber": "AICTE-2026-ENGG-0042",
    "institutionId": "inst-1001",
    "status": "UNDER_SCRUTINY",
    "createdAt": "2026-10-22T14:30:00.000Z",
    "updatedAt": "2026-10-22T14:35:12.000Z"
  },
  "meta": {
    "timestamp": "2026-10-22T14:35:12.150Z",
    "correlationId": "c3f8d1e0-4a8b-4f9e-9d2a-1b2c3d4e5f6a"
  }
}
```

### 3.2 Paginated List Success Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "7f8b9c2a-1d3e-4b5a-9f6c-8e0a1b2c3d4e",
      "applicationNumber": "AICTE-2026-ENGG-0042",
      "status": "UNDER_SCRUTINY"
    }
  ],
  "meta": {
    "timestamp": "2026-10-22T14:35:12.150Z",
    "correlationId": "c3f8d1e0-4a8b-4f9e-9d2a-1b2c3d4e5f6a",
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 142,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### 3.3 Asynchronous Job Acceptance Response (`202 Accepted`)
Used when an operation triggers long-running background tasks (e.g. BullMQ OCR processing):
```json
{
  "success": true,
  "data": {
    "jobId": "job-ocr-550e8400-e29b-41d4-a716-446655440000",
    "status": "QUEUED",
    "statusUrl": "/api/v1/jobs/job-ocr-550e8400-e29b-41d4-a716-446655440000",
    "estimatedDurationSeconds": 5
  },
  "meta": {
    "timestamp": "2026-10-22T14:35:12.150Z",
    "correlationId": "c3f8d1e0-4a8b-4f9e-9d2a-1b2c3d4e5f6a"
  }
}
```

---

## 4. Error Response Format & Codes

Every non-2xx HTTP response returns a standardized JSON error structure.

### 4.1 Error Envelope Structure
```json
{
  "success": false,
  "error": {
    "code": "ERR_VALIDATION_FAILED",
    "message": "One or more request parameters failed validation.",
    "statusCode": 400,
    "timestamp": "2026-10-22T14:35:12.150Z",
    "path": "/api/v1/applications",
    "correlationId": "c3f8d1e0-4a8b-4f9e-9d2a-1b2c3d4e5f6a",
    "details": [
      {
        "field": "landAreaAcres",
        "message": "landAreaAcres must be a positive number",
        "rule": "isPositive"
      }
    ]
  }
}
```

### 4.2 Standard Error Codes Catalog

| HTTP Status | Error Code (`code`) | Description |
|---|---|---|
| `400 Bad Request` | `ERR_VALIDATION_FAILED` | Request body or query parameters failed schema validation. |
| `400 Bad Request` | `ERR_MALFORMED_REQUEST` | Invalid JSON syntax or unsupported Content-Type. |
| `400 Bad Request` | `ERR_INVALID_STATE_TRANSITION` | Requested FSM transition violates state transition guards. |
| `401 Unauthorized` | `ERR_UNAUTHORIZED` | Missing, expired, or invalid JWT Bearer token. |
| `403 Forbidden` | `ERR_FORBIDDEN` | Authenticated user lacks required RBAC role or institutional tenancy. |
| `404 Not Found` | `ERR_RESOURCE_NOT_FOUND` | The requested entity does not exist or is inaccessible. |
| `409 Conflict` | `ERR_CONCURRENCY_CONFLICT` | Optimistic lock collision (entity updated by another transaction). |
| `409 Conflict` | `ERR_IDEMPOTENCY_IN_PROGRESS` | Duplicate request with identical `X-Idempotency-Key` already executing. |
| `413 Payload Too Large` | `ERR_PAYLOAD_TOO_LARGE` | Document upload exceeds 25MB limit. |
| `415 Unsupported Media` | `ERR_UNSUPPORTED_MEDIA_TYPE` | Uploaded file MIME type or magic bytes are not approved PDF/image. |
| `422 Unprocessable` | `ERR_POLICY_VIOLATION` | Business logic or statutory constraint violated (e.g. invalid deed date). |
| `429 Too Many Requests`| `ERR_RATE_LIMITED` | Client exceeded rate limits (default: 100 req/min). |
| `500 Server Error` | `ERR_INTERNAL_SERVER_ERROR` | Unhandled server exception. Raw details logged server-side only. |
| `502 Bad Gateway` | `ERR_ADAPTER_UNAVAILABLE` | External verification adapter timed out or returned upstream error. |

---

## 5. Request Validation & Serialization

### 5.1 NestJS Global Validation Policy
The backend runtime enforces strict validation on every incoming request:
```typescript
new ValidationPipe({
  whitelist: true,              // Strip properties not defined in the DTO
  forbidNonWhitelisted: true,   // Reject request if unrecognized properties exist
  transform: true,              // Automatically transform payloads to DTO class instances
  transformOptions: {
    enableImplicitConversion: false, // Explicit @Type() casting required
  },
})
```

### 5.2 Common Field Formats
- **Identifiers:** Canonical UUIDv4 strings (e.g. `123e4567-e89b-12d3-a456-426614174000`).
- **Timestamps:** ISO 8601 UTC strings formatted as `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g. `2026-10-22T19:45:00.000Z`).
- **Currency Amounts:** Fixed numeric strings or 64-bit integers in lowest denominations (e.g. paise) to prevent floating-point inaccuracy.
- **Null vs. Undefined:**
  - Omitted (`undefined`): Field is not being modified.
  - Explicit `null`: Field is intentionally cleared (where permitted by schema).

---

## 6. Pagination, Sorting & Filtering Conventions

### 6.1 Query Parameters for Collection Endpoints

| Parameter | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `page` | integer | `1` | Min: `1` | Page number (1-indexed). |
| `limit` | integer | `20` | Min: `1`, Max: `100` | Number of items per page. |
| `sortBy` | string | `createdAt` | Allowed DTO fields | Target sort field. |
| `sortOrder`| string | `DESC` | `ASC` \| `DESC` | Sort direction. |
| `status` | string | — | Valid enum values | Filter by status enum. |
| `search` | string | — | Max 100 chars | Free-text search on indexed terms (application number, institution name). |

Example Request:
```http
GET /api/v1/applications?page=2&limit=25&status=UNDER_SCRUTINY&sortBy=submittedAt&sortOrder=ASC
```

---

## 7. Authentication, Headers & Tenancy

### 7.1 Required Request Headers
- `Authorization`: `Bearer <jwt-token>` (Required on all protected routes).
- `X-Correlation-Id`: Client-supplied tracing ID (Optional; if omitted, backend generates a UUIDv4).
- `X-Institution-Id`: Tenant context when a multi-institution administrator acts on behalf of a specific institution.

### 7.2 Idempotency for State Mutations
For critical state transitions and submissions:
- `X-Idempotency-Key`: UUIDv4 string supplied by the frontend client.
- The backend caches responses in Redis for 24 hours. Repeating a request with the same idempotency key returns the cached response without re-executing business logic.

### 7.3 Development Identity Stubs (Provisional & Non-Production)
During local development before M2 completes `BE-03` (Auth & RBAC), controllers may accept test header stubs:
- `X-Dev-User-Id`: `usr-dev-001`
- `X-Dev-User-Role`: `SCRUTINY_OFFICER`

> [!WARNING]
> Dev identity headers are strictly disabled when `NODE_ENV === 'production'`. They exist purely to unblock early integration testing of module boundaries.

---

## 8. Simulated & Mock Data Interface Declarations

In accordance with ADR-003 and the Seven Safety Rules, any endpoint returning simulated data or communicating with a sandbox adapter must include metadata headers and payload indicators:

### Response Header:
```http
X-ApprovalSync-Simulation: true
```

### Payload Block:
```json
{
  "verification": {
    "status": "VERIFIED_MOCK",
    "isMock": true,
    "provider": "SIMULATED_DIGILOCKER_SANDBOX",
    "verificationScope": "SYNTHETIC_TEST_CERTIFICATE_ONLY",
    "disclaimer": "Verified against local test keypair. Not an official government verification."
  }
}
```
