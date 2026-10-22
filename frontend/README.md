# ApprovalSync — Frontend Boundary & Developer Specification

> **Milestone:** FND-02  
> **Lead Owner:** M4 — Frontend & Experience  
> **Framework Target:** React 18 + Vite (ADR-002)  
> **Status:** BOUNDARY ESTABLISHED — AWAITING M4 IMPLEMENTATION

---

## 1. Scope and Ownership Notice

This directory is exclusively owned by **M4 (Frontend & Experience)**. In accordance with project operating rules (FND-02):
- **Zero UI Generation in FND-02:** No dashboards, components, styling libraries, form wizards, or state management code are introduced in this foundation chunk.
- **Implementation Starting Point:** M4 will initiate frontend scaffolding and shell setup during chunk `FE-01` (gated on `FND-03` and `FND-02`).

---

## 2. Architecture and Contract Compliance

### 2.1 Technology Stack (ADR-002)
- **Framework:** React 18 Single-Page Application (SPA) bundled with Vite.
- **Routing:** React Router v6.
- **Language:** TypeScript 5.x.
- **API Client:** Axios or native `fetch` client configured with `/api/v1` base URL.
- **State Management:** React Query / TanStack Query (recommended for server state caching) or Zustand.

### 2.2 Shared API Contract Adherence
M4 implementations must strictly adhere to the contracts defined in:
1. [`docs/contracts/api-conventions.md`](../docs/contracts/api-conventions.md):
   - Handle standard `ApiResponse<T>` envelope (`data`, `meta.correlationId`, `meta.pagination`).
   - Parse standardized `ApiErrorResponse` (`error.code`, `error.message`, `error.details`).
   - Send `Authorization: Bearer <token>` on all authenticated requests.
   - Send `X-Correlation-Id` and `X-Idempotency-Key` headers on state transitions.
2. [`docs/contracts/data-contracts.md`](../docs/contracts/data-contracts.md):
   - Align with frozen domain enums (`ApplicationStatus`, `UserRole`, `ReviewDisposition`, etc.).
   - Prominently display `"SIMULATED / MOCK DATA"` badges whenever response payload has `isMock: true`.
   - Never display AI findings as autonomous decisions; enforce human officer disposition action buttons.

---

## 3. Local Development Proxy Setup (For FE-01)

When M4 configures `vite.config.ts`, route API calls to the local NestJS backend:
```typescript
// Example Vite proxy configuration for FE-01
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```
