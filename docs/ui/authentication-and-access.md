# ApprovalSync — Authentication, Sessions & Role-Based Access Control (FE-02)

> **Document Version:** 1.0.0
> **Milestone:** FE-02 (Login, role-aware navigation and session handling)
> **Lead Owner:** M4 — Frontend & Experience
> **Backend Contract Dependency:** BE-03 (Authentication, session/JWT and RBAC)
> **Status:** COMMITTED & FULLY TESTED (54/54 automated tests passing)

---

## 1. Overview & Objectives

Milestone **FE-02** integrates the real backend authentication and RBAC infrastructure (delivered in BE-03) with the frontend application shell established in FE-01. It replaces static mock personas with real authenticated session lifecycles, bearer token management, declarative route guards, role-aware navigation, and accessible institutional login UX adhering to the `ui-ux-pro-max` design intelligence framework.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Authentication Architecture                     │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Component                │ Architectural Responsibility                │
├──────────────────────────┼─────────────────────────────────────────────┤
│ LoginPage                │ Institutional credentials entry & validation│
│ AuthContext / useAuth    │ Centralized reactive session state & actions│
│ sessionStorage Manager   │ Scoped Bearer token storage & memory fallback│
│ ApiClient Interceptor    │ Dynamic Bearer injection & 401/403 handling │
│ ProtectedRoute           │ Guard preventing unauthenticated content flash│
│ AccessDeniedPage         │ HTTP 403 Forbidden state with return path   │
│ Role-Aware Nav           │ Dynamic Sidebar & Header filtered by role   │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. Institutional Login UX (`ui-ux-pro-max` Integration)

The login experience extends the **Swiss Minimalism & Enterprise Gateway** visual direction established in FE-01:

### 2.1 Visual Hierarchy & Institutional Trust
- **Brand Identity:** Centered header featuring the primary ShieldCheck icon, ApprovalSync brand title, prototype badge, and subtitle: *"AICTE Regulatory Compliance & Verification Portal"*.
- **Card Container:** Clean, high-density white surface card (`--color-surface`) framed with subtle neutral borders (`--color-border`) and soft elevation shadow (`--shadow-sm`).
- **Institutional Framing:** Clearly reminds users that the portal is restricted to authorized representatives and officers, with audit events recorded in the immutable SHA-256 ledger.

### 2.2 Form Usability & Accessibility (WCAG 2.2 AA)
- **Visible, Accessible Labels:** Every input has a visible `<label>` referencing the input via `htmlFor`. Required fields explicitly display an asterisk with `aria-hidden="true"` and an accessible `required` attribute.
- **Native Input Semantics:**
  - Email field utilizes `type="email"`, `name="email"`, `autoComplete="username"`, and paste support is explicitly preserved (WCAG 2.2 Accessible Authentication).
  - Password field utilizes `type="password"`, `name="password"`, `autoComplete="current-password"`, and provides an accessible show/hide toggle button with `aria-label="Show password"` / `"Hide password"`.
- **Inline Validation:** Validates required inputs and regex email formatting client-side. Associated errors are linked via `aria-describedby="[id]-error"` and trigger `aria-invalid="true"`.
- **Focus Rings:** Distinct, accessible focus ring (`var(--focus-ring)`: 2px solid primary with 2px offset) across all interactive fields.
- **Pending Submission Feedback:** Submit button displays an animated spinner (`Loader2`), sets `aria-busy="true"`, and disables repeated submission attempts to prevent double-login race conditions.

### 2.3 Error Handling & Anti-Enumeration
- **Generic 401 Rejection:** In compliance with security best practices, invalid credentials uniformly return:
  > *"Invalid email or password."*
  No information is disclosed regarding whether the email exists or whether an account is inactive.
- **Network Failure Resilience:** If the backend is unreachable or times out, the page displays a distinct, non-destructive connection error banner without clearing form inputs.

### 2.4 Synthetic Development Account Helper
- In local development mode (`import.meta.env.DEV`), a clearly framed development card is rendered below the form:
  - Account: `demo.institution@synthetic.approvalsync.local`
  - Seed Password: `DemoPass@123`
  - Role: `INSTITUTION_USER`
- Clicking **"Use Account"** fills the inputs into component state. It **does NOT** bypass authentication or auto-submit; the user must click "Sign In" to execute the real POST request against the backend.
- This helper is stripped out in production builds.

---

## 3. Session Lifecycle & Storage Architecture

### 3.1 Finite State Machine
Authentication state is strictly modeled as a discrete state machine in `src/auth/types.ts`:
- `INITIALIZING`: App is bootstrapping; inspecting storage and validating session against `GET /api/v1/auth/me`.
- `UNAUTHENTICATED`: No valid session active; protected content is blocked; public login available.
- `AUTHENTICATING`: Login request in progress; submit button disabled with spinner.
- `AUTHENTICATED`: Session verified; `user` profile populated; workspace accessible.
- `ERROR`: Transient network or server connection failure during initialization; recoverable retry UI active.

### 3.2 Token Storage Strategy & Security Trade-offs
```
Storage Mechanism: Scoped sessionStorage (TOKEN_STORAGE_KEY = 'approvalsync_auth_token')
Fallback: In-memory JavaScript closure variable
```

**Security Analysis & Trade-offs:**
- **Why not `localStorage`?** `localStorage` persists indefinitely across browser sessions, tabs, and window closes. In single-page applications, tokens stored in `localStorage` pose higher risk if an XSS vulnerability occurs anywhere on the domain.
- **Why `sessionStorage`?** `sessionStorage` is strictly scoped to the active browser tab. Closing the tab immediately destroys the token. Opening a new tab requires re-authentication, preventing cross-tab session contamination.
- **Fallback to Memory:** In restrictive security sandboxes, test environments, or if cookies/sessionStorage are disabled, tokens fall back to an in-memory closure variable.
- **Token Hygiene:** Tokens are never passed via URL query parameters, logged to consoles, or embedded in UI markup.

### 3.3 Session Bootstrap (`/auth/me`)
On initial mount:
1. `AuthProvider` reads `getStoredToken()`.
2. If token exists, calls `authService.getMe()`.
3. If valid (200), sets `user` and `status = 'AUTHENTICATED'`.
4. If invalid (401/403), invokes `clearStoredToken()` and returns to `UNAUTHENTICATED`.
5. If network failure occurs, sets `status = 'ERROR'` without wiping the token, presenting a "Retry Connection" button.

### 3.4 Client-Side Logout
- The `logout()` action clears `sessionStorage`, resets the in-memory user to `null`, sets `status = 'UNAUTHENTICATED'`, and navigates to `/login`.
- **Backend Statelessness Limitation:** Because BE-03 implements stateless signed JWTs without a server-side revocation blacklist, client-side logout effectively clears local credentials. Tokens remain cryptographically valid until expiration (`expiresIn: 3600s`).

---

## 4. Protected Routes & Authorization (RBAC)

### 4.1 Route Guard (`ProtectedRoute.tsx`)
The `<ProtectedRoute>` component wraps institutional routes:
- **Zero Content Flashing:** While `status === 'INITIALIZING'`, an accessible loading screen (`Spinner`) is rendered. Under no circumstances is protected DOM mounted before session resolution.
- **Unauthenticated Redirect:** When `!isAuthenticated`, redirects to `/login` passing the current pathname in router state:
  `<Navigate to="/login" state={{ from: location }} replace />`
- **Safe Return Destination:** After successful sign-in, `getSafeReturnUrl()` inspects `location.state.from`. It strictly verifies that the path is a safe internal relative path (starts with `/`, rejects `//` protocol-relative paths and external URIs).
- **Access Denied Guard:** If `allowedRoles` is configured and `!allowedRoles.includes(user.role)`, renders `<AccessDeniedPage>`.

### 4.2 Access Denied Experience (HTTP 403 Forbidden)
Rendered by `<AccessDeniedPage>`:
- Displays an alert shield icon with institutional red styling (`var(--color-danger)`).
- Explains that the authenticated user's role lacks clearance for the requested module.
- Displays the user's active email and formatted role.
- Shows the list of permitted roles for transparency.
- Provides a direct primary action: **"Return to Designated Workspace"** (`getDefaultRouteForRole(user.role)`).
- Provides a secondary action: **"Sign Out & Switch Account"**.
- Does **not** log the user out automatically.

---

## 5. Role-to-Route Permissions Matrix

Defined centrally in `frontend/src/auth/roleRoutes.ts`:

```typescript
export const ROUTE_PERMISSIONS: Record<string, RoutePermissionConfig> = {
  '/': {
    label: 'Workspace Overview',
    allowedRoles: [
      UserRole.INSTITUTION_USER,
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.EVC_INSPECTOR,
      UserRole.SHC_SAC_MEMBER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ],
  },
  '/applications': {
    label: 'Application Intake',
    allowedRoles: [UserRole.INSTITUTION_USER, UserRole.SYSTEM_ADMIN],
  },
  '/scrutiny': {
    label: 'Scrutiny Queue',
    allowedRoles: [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
    ],
  },
  '/verification': {
    label: 'Document AI & Checks',
    allowedRoles: [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.EVC_INSPECTOR,
      UserRole.SYSTEM_ADMIN,
    ],
  },
  '/evc': {
    label: 'EVC Ground Inspection',
    allowedRoles: [
      UserRole.EVC_INSPECTOR,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
    ],
  },
  '/rules': {
    label: 'APH Regulatory Rules',
    allowedRoles: [
      UserRole.SCRUTINY_OFFICER,
      UserRole.REGIONAL_OFFICER,
      UserRole.BUREAU_HEAD,
      UserRole.SYSTEM_ADMIN,
      UserRole.AUDITOR,
    ],
  },
  '/audit': {
    label: 'Audit Ledger & Proofs',
    allowedRoles: [UserRole.AUDITOR, UserRole.BUREAU_HEAD, UserRole.SYSTEM_ADMIN],
  },
  '/settings': {
    label: 'Platform Settings',
    allowedRoles: [...ALL_ROLES],
  },
};
```

---

## 6. Shell Layout Integration

### 6.1 Header User Identity & Logout
- **When Authenticated:** Displays user name or email and role title badge (`formatRoleName(user.role)`), alongside a functional "Sign Out" button with `LogOut` icon.
- **When Unauthenticated:** Displays a "Sign In" action linking to `/login`.
- **Health Probe Separation:** The API status badge ("API Online" / "API Standby") remains completely independent of authentication state.

### 6.2 Sidebar & Mobile Drawer Role Filtering
- Filters `NAV_ITEMS` using `canRoleAccessRoute(user.role, item.path)`.
- If a section contains zero accessible items for a role, the section header is omitted.
- For example, an `INSTITUTION_USER` sees *Workspace Overview*, *Application Intake*, and *Platform Settings*, but does not see *Scrutiny Queue*, *Ground EVC*, or *Audit Ledger*.

---

## 7. Verification & Automated Test Suites

54 automated unit and integration tests verify FE-02 across 8 test suites:

```text
 ✓ src/__tests__/api-client.spec.ts   (7 tests)  — HTTP transport, timeouts, multipart
 ✓ src/__tests__/auth-service.spec.ts (5 tests)  — Login request, token injection, 401/403
 ✓ src/__tests__/auth-context.spec.tsx(6 tests)  — Bootstrap, storage, network retry, logout
 ✓ src/__tests__/login-page.spec.tsx  (8 tests)  — Form rendering, validation, demo helper
 ✓ src/__tests__/role-nav.spec.tsx    (7 tests)  — RBAC matrix, open-redirect prevention, nav
 ✓ src/__tests__/routes.spec.tsx      (7 tests)  — Route protection, redirects, 403, 404
 ✓ src/__tests__/components.spec.tsx  (11 tests) — Reusable UI primitives
 ✓ src/__tests__/shell.spec.tsx       (3 tests)  — Layout structure and drawer toggle
```

---

## 8. Downstream Readiness (Unblocking FE-03)

With FE-02 committed and verified:
- **FE-03 (Application Intake & Wizard)** is officially unblocked on the frontend.
- `useAuth()` provides the authenticated `user.id`, `user.email`, and `user.institutionId`.
- Protected routes allow institution representatives to access `/applications`.
- API client automatically attaches the current session Bearer JWT to drafting and document upload requests.
