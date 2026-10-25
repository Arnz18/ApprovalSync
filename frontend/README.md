# ApprovalSync — Frontend Architecture & Developer Guide

> **Milestones:**
> - **FE-01** — Frontend shell, design system, routing and API client (`COMMITTED`)
> - **FE-02** — Login, role-aware navigation and session handling (`COMMITTED`)
> **Lead Owner:** M4 — Frontend & Experience
> **Framework:** React 18 + TypeScript 5 + Vite 5 Single-Page Application (SPA)
> **Status:** FE-01 & FE-02 IMPLEMENTED & TESTED (54/54 automated tests passing)

---

## 1. Overview and Architecture

ApprovalSync is an AI-powered regulatory compliance, document authentication, and decision-support platform designed for AICTE approval workflows. The frontend provides a serious, high-density, accessible institutional workspace for college representatives, scrutiny officers, regional directors, and expert inspection committee members.

### Core Architectural Decisions
- **Framework & Bundler:** React 18.3 + Vite 5.4 SPA (fast HMR, sub-second production builds).
- **Type Safety:** TypeScript 5.5 with strict compiler options (`noImplicitAny`, `noUnusedLocals`, `strictNullChecks`).
- **Routing & Route Guards:** React Router v6 with declarative `<ProtectedRoute>` guards, return-path preservation with open-redirect sanitization (`getSafeReturnUrl`), and accessible 404 not-found / 403 access-denied fallbacks.
- **Centralized Authentication & Session Model:** Implemented in `src/auth/` adhering to BE-03 contracts. Session state is modeled explicitly (`INITIALIZING`, `UNAUTHENTICATED`, `AUTHENTICATING`, `AUTHENTICATED`, `ERROR`). Session bootstrap verifies bearer tokens on application startup against `GET /api/v1/auth/me` without flashing protected content.
- **Token Handling Strategy:** Scoped to `sessionStorage` (with in-memory fallback) to restrict token exposure to the active browser tab/session, avoiding persistent `localStorage` cross-tab XSS persistence.
- **Role-Based Access Control (RBAC):** Strict presentation-layer mapping based on the frozen `UserRole` enum (`INSTITUTION_USER`, `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `EVC_INSPECTOR`, `SHC_SAC_MEMBER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`, `AUDITOR`). Navigation links and routes fail closed by default. The real backend remains the authoritative security boundary.
- **Visual Design System:** Built following the `ui-ux-pro-max` design intelligence framework, utilizing a **Swiss Minimalism & Enterprise Gateway** visual direction with a balanced, high-trust institutional color palette, Lexend/Source Sans 3 typography, CSS custom properties, and zero raw hex values in components.
- **Centralized Typed API Client:** Native `fetch`-based client adhering to `docs/contracts/api-conventions.md`: handles `ApiResponse<T>` and `ApiErrorResponse` envelopes, automated `X-Correlation-Id` generation, dynamic bearer token injection via `apiClient.setAuthTokenProvider(getStoredToken)`, query parameter serialization, `FormData` multipart uploads without boundary overwrites, configurable timeout aborts, and network failure resilience.
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
    ├── App.tsx                  # Root component wrapping BrowserRouter & AuthProvider
    ├── vite-env.d.ts            # Vite client environment typing declarations
    ├── test/
    │   └── setup.ts             # Vitest test setup (@testing-library/jest-dom)
    ├── auth/                    # FE-02 Authentication & RBAC Layer
    │   ├── types.ts             # AuthUser, LoginCredentials, AuthStatus, AuthInitError
    │   ├── sessionStorage.ts    # Scoped sessionStorage token management & memory fallback
    │   ├── AuthContext.tsx      # Centralized AuthProvider & session lifecycle
    │   ├── useAuth.ts           # Typed useAuth hook with safe guest fallback
    │   ├── roleRoutes.ts        # RBAC permissions matrix, role titles, and return-path sanitizer
    │   └── index.ts             # Master exports for auth layer
    ├── styles/
    │   ├── tokens.css           # Design tokens (colors, typography, spacing, radius, shadows)
    │   ├── components.css       # Reusable component styles
    │   ├── layout.css           # Application shell, header, sidebar, mobile drawer, footer
    │   └── index.css            # Global base styles, reset, and focus rings
    ├── api/
    │   ├── types.ts             # Shared DTO envelopes and frozen domain enums
    │   ├── client.ts            # Centralized typed ApiClient with correlation tracing & token injection
    │   ├── index.ts             # Public API layer exports
    │   └── services/
    │       ├── authService.ts   # BE-03 Auth API Service (/auth/login, /auth/me)
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
    │       ├── Header.tsx       # Dynamic authenticated user profile, role badge, and logout
    │       ├── Sidebar.tsx      # Role-filtered navigation with active route highlights
    │       ├── MobileNav.tsx    # Responsive mobile drawer
    │       ├── Footer.tsx       # Regulatory disclaimers and API documentation links
    │       └── AppLayout.tsx    # Main layout shell with Outlet
    ├── pages/
    │   ├── HomePage.tsx         # Primary institutional overview and interactive design sandbox
    │   ├── LoginPage.tsx        # Institutional login page with inline validation & dev helper
    │   ├── AccessDeniedPage.tsx # HTTP 403 Forbidden state with return to workspace action
    │   ├── FeaturePlaceholderPage.tsx # Standardized placeholder explaining downstream chunks
    │   └── NotFoundPage.tsx     # 404 Not Found page
    ├── routes/
    │   ├── ProtectedRoute.tsx   # Session guard, loading state, unauthenticated redirect, and 403 guard
    │   └── AppRoutes.tsx        # Centralized route mapping
    └── __tests__/               # Frontend unit & integration test suites (54 tests)
        ├── api-client.spec.ts   # API client request/error/timeout/upload tests (7 tests)
        ├── auth-service.spec.ts # Auth service, token injection, and 401/403 tests (5 tests)
        ├── auth-context.spec.tsx# AuthContext session bootstrap, storage, and logout tests (6 tests)
        ├── login-page.spec.tsx  # LoginPage validation, credentials, and errors tests (8 tests)
        ├── role-nav.spec.tsx    # Role matrix, safe return URL, and nav filtering tests (7 tests)
        ├── routes.spec.tsx      # Routing, placeholder, protected redirect, and 403 tests (7 tests)
        ├── components.spec.tsx  # UI components behavior & accessibility tests (11 tests)
        └── shell.spec.tsx       # Shell layout and navigation tests (3 tests)
```

---

## 3. Authentication & Session Architecture (FE-02)

### 3.1 Authentication Flow
1. **Public Login Route (`/login`):**
   - Accessible without an active session.
   - If an authenticated user navigates to `/login`, they are immediately redirected to their designated workspace or safe return destination.
   - Enforces native email and password semantics with inline client-side validation (`required`, regex email syntax).
   - Prevents duplicate submissions with disabled submit actions and `aria-busy="true"`.
   - On rejection (HTTP 401), displays generic `"Invalid email or password."` message to eliminate account enumeration attack vectors.
   - In development mode (`import.meta.env.DEV`), provides a click-to-fill helper for synthetic seed account `demo.institution@synthetic.approvalsync.local` / `DemoPass@123`.

2. **Session Bootstrap & Verification:**
   - On application mount, `AuthProvider` inspects `sessionStorage` for an existing access token.
   - If present, invokes `GET /api/v1/auth/me` with `Authorization: Bearer <token>`.
   - While verification is pending (`status === 'INITIALIZING'`), `<ProtectedRoute>` renders an accessible institutional loading screen. **No protected content is rendered before validation completes.**
   - If `401 Unauthorized` or `403 Forbidden` is returned, the stored token is invalidated and cleared, returning to `UNAUTHENTICATED`.
   - If a transient network failure occurs (`ERR_NETWORK` / `status === 'ERROR'`), the token is retained and a recoverable connection retry screen is displayed, preventing accidental logouts due to temporary backend downtime.

3. **Client-Side Token Storage & XSS Trade-offs:**
   - Tokens are stored in browser `sessionStorage` (`TOKEN_STORAGE_KEY`), falling back to memory if storage is inaccessible.
   - **Trade-off Analysis:** Unlike `localStorage` (which persists indefinitely and is vulnerable across tabs and browser restarts), `sessionStorage` is strictly scoped to the current browser tab and lifetime.
   - Tokens are never logged, placed in query parameters, or rendered in UI text.

4. **Logout Behavior:**
   - The "Sign Out" button in `Header` triggers `logout()`.
   - Clears `sessionStorage`, resets in-memory user to `null`, sets `status = 'UNAUTHENTICATED'`, and navigates to `/login`.
   - **Backend Note:** Because BE-03 issues stateless signed JWTs and does not expose a server-side revocation list/token blacklist endpoint, client-side logout invalidates the local session. The JWT remains cryptographically signed until its natural expiration (`expiresIn`).

---

## 4. Role-Based Navigation & Permissions Matrix

All route permissions are defined centrally in `src/auth/roleRoutes.ts` against the authoritative `UserRole` enum:

| Route Path | Module Title | Permitted Roles | Default Landing Role |
|---|---|---|---|
| `/` | Workspace Overview | All authenticated roles | `SYSTEM_ADMIN`, `BUREAU_HEAD`, `SHC_SAC_MEMBER` |
| `/applications` | Application Intake & Wizard | `INSTITUTION_USER`, `SYSTEM_ADMIN` | `INSTITUTION_USER` |
| `/scrutiny` | Scrutiny Officer Review Queue | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER` |
| `/verification` | Document AI & Checks | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `EVC_INSPECTOR`, `SYSTEM_ADMIN` | — |
| `/evc` | EVC Ground Inspection | `EVC_INSPECTOR`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN` | `EVC_INSPECTOR` |
| `/rules` | APH Regulatory Rules | `SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `BUREAU_HEAD`, `SYSTEM_ADMIN`, `AUDITOR` | — |
| `/audit` | Cryptographic Audit Ledger | `AUDITOR`, `BUREAU_HEAD`, `SYSTEM_ADMIN` | `AUDITOR` |
| `/settings` | Platform Settings & Health | All authenticated roles | — |

### Access Denied (HTTP 403 Forbidden)
When an authenticated user attempts to access a protected route outside their role clearance:
- The `<AccessDeniedPage>` is rendered.
- Displays the user's current identity and role alongside required role clearance.
- Preserves the authenticated session without forcing a logout.
- Provides a safe button to return to their designated workspace (`getDefaultRouteForRole(user.role)`).

### Open-Redirect Prevention
Post-login redirections are sanitized through `getSafeReturnUrl()`. Destination paths are accepted only if they are safe relative paths starting with a single `/`. External schemes (`http://`, `https://`), protocol-relative URLs (`//`), and `/login` loopbacks are rejected and fallback to `/`.

---

## 5. Local Development & Quality Gates

### 5.1 Installation
```bash
cd frontend
npm install
```

### 5.2 Running the Development Server
```bash
npm run dev
```
The application will be served at `http://localhost:5173`.
By default, requests to `/api` are automatically proxied to the NestJS backend at `http://localhost:3000`.

### 5.3 Quality Gates & Validation Commands
All commands run from `frontend/`:

| Check | Command | Purpose |
|---|---|---|
| **Type Check** | `npm run typecheck` | Validates TypeScript compilation with zero emitted files (`tsc --noEmit`) |
| **Linting** | `npm run lint` | Runs ESLint across all `.ts` and `.tsx` source files (`--max-warnings=0`) |
| **Formatting** | `npm run format:check` | Checks code formatting against Prettier rules |
| **Auto-Format** | `npm run format` | Auto-formats code with Prettier |
| **Unit Tests** | `npm test` | Runs the Vitest test runner across all 8 test suites (54 tests) |
| **Production Build** | `npm run build` | Compiles TypeScript and produces optimized production bundle in `dist/` |

---

## 6. Environment Configuration

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

## 7. Downstream Extension Guide

When implementing downstream chunks (`FE-03` through `FE-07`):
1. **Reuse Components:** Utilize components from `@/components/ui` (`Button`, `Card`, `Badge`, `FormField`, `Alert`, `Modal`, `EmptyState`, `PageHeader`).
2. **Access Current User:** Use `const { user, logout } = useAuth()` to access safe profile projection and role.
3. **Protect New Routes:** Wrap routes in `<ProtectedRoute allowedRoles={[...]}>`.
4. **Follow Design Tokens:** Never introduce ad-hoc hex values; reference CSS variables in `tokens.css` (`var(--color-*)`, `var(--space-*)`).
5. **Respect Contract Enums:** Import domain enums directly from `@/api/types` (`ApplicationStatus`, `UserRole`, `VerificationStatus`).
6. **Preserve Human Sovereignty:** Never present automated AI indicators as final approval or rejection decisions; provide explicit officer disposition action controls with justification inputs.
