# ApprovalSync — Frontend Architecture & Developer Guide

> **Milestone:** FE-01 — Frontend shell, design system, routing and API client
> **Lead Owner:** M4 — Frontend & Experience
> **Framework:** React 18 + TypeScript 5 + Vite 5 Single-Page Application (SPA)
> **Status:** FE-01 FOUNDATION IMPLEMENTED & VERIFIED

---

## 1. Overview and Architecture

ApprovalSync is an AI-powered regulatory compliance, document authentication, and decision-support platform designed for AICTE approval workflows. The frontend provides a serious, high-density, accessible institutional workspace for college representatives, scrutiny officers, regional directors, and expert inspection committee members.

### Core Architectural Decisions
- **Framework & Bundler:** React 18.3 + Vite 5.4 SPA (fast HMR, sub-second production builds).
- **Type Safety:** TypeScript 5.5 with strict compiler options (`noImplicitAny`, `noUnusedLocals`, `strictNullChecks`).
- **Routing:** React Router v6 with centralized route definitions and accessible 404 not-found fallback.
- **Visual Design System:** Built following the `ui-ux-pro-max` design intelligence framework, utilizing a **Swiss Minimalism & Enterprise Gateway** visual direction with a balanced, high-trust institutional color palette, Lexend/Source Sans 3 typography, CSS custom properties, and zero raw hex values in components.
- **Centralized Typed API Client:** Native `fetch`-based client adhering to `docs/contracts/api-conventions.md`: handles `ApiResponse<T>` and `ApiErrorResponse` envelopes, automated `X-Correlation-Id` generation, query parameter serialization, `FormData` multipart uploads without boundary overwrites, configurable timeout aborts, and network failure resilience.
- **Institutional Safety Boundary:** Enforces the Human Sovereignty principle (ADR-004): automated document validation, OCR extraction, and anomaly scores are prominently framed as advisory decision support. Prominent `SIMULATED / MOCK DATA` badges are rendered on synthetic records.

---

## 2. Directory Structure

```text
frontend/
├── index.html                   # HTML entry point with preconnected typography fonts
├── vite.config.ts               # Vite configuration with @/ alias, port 5173, /api proxy, and Vitest setup
├── tsconfig.json                # TypeScript compiler configuration (strict)
├── tsconfig.node.json           # Node configuration for build tools
├── .eslintrc.cjs                # ESLint configuration
├── .prettierrc                  # Prettier code formatting rules
├── .env.example                 # Public Vite environment template
└── src/
    ├── main.tsx                 # React application mount point
    ├── App.tsx                  # Root component wrapping BrowserRouter
    ├── vite-env.d.ts            # Vite client environment typing declarations
    ├── test/
    │   └── setup.ts             # Vitest test setup (@testing-library/jest-dom)
    ├── styles/
    │   ├── tokens.css           # Design tokens (colors, typography, spacing, radius, shadows)
    │   ├── components.css       # Reusable component styles
    │   ├── layout.css           # Application shell, header, sidebar, mobile drawer, footer
    │   └── index.css            # Global base styles, reset, and focus rings
    ├── api/
    │   ├── types.ts             # Shared DTO envelopes and frozen domain enums
    │   ├── client.ts            # Centralized typed ApiClient with correlation tracing
    │   ├── index.ts             # Public API layer exports
    │   └── services/
    │       └── healthService.ts # Health check service (/health, /liveness, /readiness)
    ├── components/
    │   ├── ui/                  # Reusable design system components
    │   │   ├── Button.tsx       # Buttons with loading spinners, icons, variants
    │   │   ├── Badge.tsx        # Semantic & domain status badges (ApplicationStatus, etc.)
    │   │   ├── Card.tsx         # Card container, header, title, content, footer
    │   │   ├── FormField.tsx    # Accessible inputs, select, textarea, error/helper text
    │   │   ├── Alert.tsx        # Informational, success, warning, error alerts
    │   │   ├── Loading.tsx      # Spinner and Skeleton loading primitives
    │   │   ├── EmptyState.tsx   # Empty state displays with actions
    │   │   ├── PageHeader.tsx   # Page titles, breadcrumbs, action slots
    │   │   ├── Modal.tsx        # Accessible dialog primitive with focus trap and Esc handling
    │   │   └── index.ts         # Export barrel for UI components
    │   └── layout/              # Application workspace shell
    │       ├── Header.tsx       # Institutional branded header with live backend status
    │       ├── Sidebar.tsx      # Primary navigation with active route highlights
    │       ├── MobileNav.tsx    # Responsive mobile drawer
    │       ├── Footer.tsx       # Regulatory disclaimers and API documentation links
    │       └── AppLayout.tsx    # Main layout shell with Outlet
    ├── pages/
    │   ├── HomePage.tsx         # Primary institutional overview and interactive design sandbox
    │   ├── FeaturePlaceholderPage.tsx # Standardized placeholder explaining downstream chunks
    │   └── NotFoundPage.tsx     # 404 Not Found page
    ├── routes/
    │   └── AppRoutes.tsx        # Centralized route mapping
    └── __tests__/               # Frontend unit & integration test suites
        ├── api-client.spec.ts   # API client request/error/timeout/upload tests
        ├── components.spec.tsx  # UI components behavior & accessibility tests
        ├── routes.spec.tsx      # Routing, placeholder, and 404 tests
        └── shell.spec.tsx       # Shell layout and navigation tests
```

---

## 3. Local Development & Quality Gates

### 3.1 Installation
```bash
cd frontend
npm install
```

### 3.2 Running the Development Server
```bash
npm run dev
```
The application will be served at `http://localhost:5173`.
By default, requests to `/api` are automatically proxied to the NestJS backend at `http://localhost:3000`.

### 3.3 Quality Gates & Validation Commands
All commands run from `frontend/`:

| Check | Command | Purpose |
|---|---|---|
| **Type Check** | `npm run typecheck` | Validates TypeScript compilation with zero emitted files (`tsc --noEmit`) |
| **Linting** | `npm run lint` | Runs ESLint across all `.ts` and `.tsx` source files (`--max-warnings=0`) |
| **Formatting** | `npm run format:check` | Checks code formatting against Prettier rules |
| **Auto-Format** | `npm run format` | Auto-formats code with Prettier |
| **Unit Tests** | `npm test` | Runs the Vitest test runner across all test suites |
| **Production Build** | `npm run build` | Compiles TypeScript and produces optimized production bundle in `dist/` |

---

## 4. Environment Configuration

Copy `.env.example` to `.env.local` to override local environment variables:
```bash
# Public API Base URL:
# Defaults to '/api/v1' which is proxied by Vite dev server to 'http://localhost:3000'
VITE_API_BASE_URL=/api/v1

# Request timeout in milliseconds (default: 15000)
VITE_API_TIMEOUT_MS=15000

# Environment label
VITE_APP_ENV=development
```

> [!WARNING]
> All `VITE_*` environment variables are bundled directly into the public client application bundle. **Never commit secrets, private keys, passwords, or sensitive credentials to frontend environment files.**

---

## 5. API Client Usage

Import the singleton `apiClient` or domain services from `@/api`:

```typescript
import { apiClient, ApiResponse, ApiClientError } from '@/api';

// GET request with query params
try {
  const applications = await apiClient.get<ApplicationSummary[]>('/applications', {
    page: 1,
    limit: 20,
    status: 'UNDER_SCRUTINY',
  });
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(`API Error ${error.code}: ${error.message}`, error.details);
  }
}

// Multipart file upload (FormData)
const formData = new FormData();
formData.append('file', file);
const uploadResult = await apiClient.upload('/applications/:id/documents', formData);
```

---

## 6. Route Registry & Downstream Milestones

The following routes are registered in `AppRoutes.tsx`:

| Route Path | Module Title | Owning Chunk | Current Status | Notes |
|---|---|---|---|---|
| `/` | Institutional Regulatory Workspace | `FE-01` | **IMPLEMENTED** | Active overview, metrics summary, subsystem directory, interactive design test |
| `/applications` | Application Intake & Wizard | `FE-03` | `BLOCKED` | Awaiting `FE-02`, `BE-04`, `DOC-01` |
| `/scrutiny` | Scrutiny Officer Review Queue | `FE-04` | `BLOCKED` | Awaiting `FE-02`, `BE-06`, `DOC-07` |
| `/verification` | Document AI & Verification Checks | `DOC-04` | `COMMITTED` | Feature preview available |
| `/evc` | EVC Ground Inspection | `FE-06` | `BLOCKED` | Awaiting `BE-06`, `DOC-06` |
| `/rules` | APH Versioned Regulatory Rules | `BE-05` | `COMMITTED` | Feature preview available |
| `/audit` | Cryptographic Audit Ledger | `BE-07` | `PLANNED` | Feature preview available |
| `/settings` | Platform Settings & Health | `FE-01` | **IMPLEMENTED** | Environment and connection diagnostic views |
| `/*` | 404 Route Not Found | `FE-01` | **IMPLEMENTED** | Fallback for unmapped paths |

---

## 7. Downstream Extension Guide

When implementing downstream chunks (`FE-02` through `FE-07`):
1. **Reuse Components:** Utilize components from `@/components/ui` (`Button`, `Card`, `Badge`, `FormField`, `Alert`, `Modal`, `EmptyState`, `PageHeader`).
2. **Follow Design Tokens:** Never introduce ad-hoc hex values; reference CSS variables in `tokens.css` (`var(--color-*)`, `var(--space-*)`).
3. **Respect Contract Enums:** Import domain enums directly from `@/api/types` (`ApplicationStatus`, `UserRole`, `VerificationStatus`).
4. **Preserve Human Sovereignty:** Never present automated AI indicators as final approval or rejection decisions; provide explicit officer disposition action controls with justification inputs.
