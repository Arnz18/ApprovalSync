# ApprovalSync — Design System Specification

> **Document Version:** 1.0.0
> **Milestone:** FE-01 (Frontend shell, design system, routing and API client)
> **Lead Owner:** M4 — Frontend & Experience
> **Framework Skill:** `ui-ux-pro-max` (Enterprise Gateway / Swiss Minimalism)
> **Target Platform:** Web (Desktop, Laptop, Tablet, Mobile)

---

## 1. Visual Direction & Design Rationale

ApprovalSync is an institutional regulatory decision-support system for AICTE approval workflows. The interface must communicate authority, procedural integrity, clarity, and trust.

### 1.1 `ui-ux-pro-max` Configuration Dials
- **Style:** **Swiss Minimalism & Enterprise Gateway**
  - High contrast, functional typography, clean grid structures, and clear visual hierarchy.
  - Avoids decorative gradients, random colors, floating emojis as interface icons, or gimmicky animations.
- **Visual Density Dial:** **7/10 (Standard / Institutional Dashboard)**
  - Dense enough to support reviewing extensive compliance checklists, document tables, and audit logs without excessive scrolling.
  - Spacing scale centered around an 8px base grid (`--space-1: 4px` to `--space-8: 32px`).
- **Motion Dial:** **3/10 (Subtle Micro-interactions)**
  - Fast transitions (150ms–250ms) for button hovers, modal entrances, and alert dismissals.
  - Fully respects `prefers-reduced-motion: reduce` by setting transition durations to `0ms`.
- **Variance Dial:** **5/10 (Balanced Modern)**
  - Predictable top-header and left-sidebar layout standard in government and enterprise administrative portals.

---

## 2. Color Palette & Semantic Tokens

All color references in ApprovalSync components use CSS custom properties defined in `frontend/src/styles/tokens.css`. Direct raw hex codes in components are prohibited.

### 2.1 Brand & Neutral Tokens

| Token | Value | Semantic Purpose |
|---|---|---|
| `--color-primary` | `#1E3A5F` | Deep Trust Navy — institutional brand anchor, header accents, primary buttons |
| `--color-primary-hover` | `#152A45` | Primary button hover state |
| `--color-primary-active` | `#0F1D30` | Primary button pressed/active state |
| `--color-on-primary` | `#FFFFFF` | Text on primary brand backgrounds (contrast ratio > 7:1) |
| `--color-secondary` | `#2563EB` | Royal Blue — interactive links, active navigation items, secondary actions |
| `--color-secondary-hover`| `#1D4ED8` | Interactive link hover state |
| `--color-background` | `#F8FAFC` | Slate Neutral 50 — application canvas background |
| `--color-surface` | `#FFFFFF` | Pure White — cards, modals, headers, content containers |
| `--color-foreground` | `#0F172A` | Slate 900 — high-contrast body text (contrast ratio > 14:1) |
| `--color-muted` | `#F1F5F9` | Slate 100 — table headers, secondary buttons, footer background |
| `--color-muted-foreground`| `#475569`| Slate 600 — descriptions, metadata, helper text |
| `--color-border` | `#CBD5E1` | Slate 300 — prominent card and input borders |
| `--color-border-subtle` | `#E2E8F0` | Slate 200 — dividers and subtle outlines |
| `--color-ring` | `#1E3A5F` | Accessible focus ring indicator (`:focus-visible`) |

### 2.2 Semantic Status & Compliance Tokens

| Token | Background | Border | Text | Usage |
|---|---|---|---|---|
| **Success** | `#F0FDF4` | `#BBF7D0` | `#14532D` | `APPROVED`, `COMPLIANT`, `VERIFIED_MOCK`, API Online |
| **Warning** | `#FFFBEB` | `#FDE68A` | `#78350F` | `DEFICIENCY_ISSUED`, `ADVISORY_FLAG`, review notices |
| **Error / Destructive** | `#FEF2F2` | `#FECACA` | `#7F1D1D` | `REJECTED`, `CRITICAL_DEFICIENCY`, validation errors |
| **Info / Progress** | `#F0F9FF` | `#BAE6FD` | `#0C4A6E` | `SUBMITTED`, `EVC_IN_PROGRESS`, system notices |
| **Simulated / Mock** | `#FEF3C7` | `#F59E0B` | `#92400E` | Prominent `SIMULATED / MOCK DATA` indicator badge |

---

## 3. Typography Scale

Google Fonts are loaded via preconnected CDN links in `index.html`:
- **Heading Font:** `Lexend` — designed specifically for readability and institutional clarity.
- **Body Font:** `Source Sans 3` — professional open-source sans-serif optimized for UI and tabular data.
- **Monospace Font:** `JetBrains Mono` — hashes, correlation IDs, and application identifiers.

### Font Sizes & Scale

| Token | Size | Line Height | Usage |
|---|---|---|---|
| `--font-size-xs` | `0.75rem` (12px) | `1.25` | Badges, fine print, metadata, helper text |
| `--font-size-sm` | `0.875rem` (14px) | `1.375` | Buttons, form inputs, navigation items, card descriptions |
| `--font-size-base` | `1.0rem` (16px) | `1.5` | Standard body copy, list items, card titles |
| `--font-size-lg` | `1.125rem` (18px) | `1.375` | Modal titles, section headers |
| `--font-size-xl` | `1.25rem` (20px) | `1.25` | Subsystem titles, secondary page headers |
| `--font-size-2xl` | `1.5rem` (24px) | `1.25` | Page titles, major metrics numbers |
| `--font-size-3xl` | `1.875rem` (30px) | `1.2` | Hero headlines, primary dashboard title |

---

## 4. Spacing, Elevation & Layout Tokens

### 4.1 Spacing Scale (8px Base Grid)
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1.0rem;   /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2.0rem;   /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3.0rem;  /* 48px */
--space-16: 4.0rem;  /* 64px */
```

### 4.2 Border Radii
- `--radius-sm`: `4px` (buttons, inputs, status badges)
- `--radius-md`: `6px` (dropdowns, cards)
- `--radius-lg`: `8px` (containers, cards)
- `--radius-xl`: `12px` (modal dialogs)
- `--radius-full`: `9999px` (pills, badges)

### 4.3 Elevation & Shadows
- `--shadow-sm`: `0 1px 2px 0 rgba(15, 23, 42, 0.05)` (cards, headers)
- `--shadow-md`: `0 4px 6px -1px rgba(15, 23, 42, 0.08)` (dropdown menus)
- `--shadow-lg`: `0 10px 15px -3px rgba(15, 23, 42, 0.08)` (modals, mobile drawer)

---

## 5. Reusable Component Catalog

All components are located in `frontend/src/components/ui/` and exported via barrel `index.ts`:

1. **`Button`**:
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `destructive`.
   - Sizes: `sm`, `md`, `lg`.
   - Built-in loading state with accessible spinner (`aria-busy="true"`).
   - Icon support (`leftIcon`, `rightIcon`).
2. **`Badge`**:
   - Semantic variants (`default`, `primary`, `success`, `warning`, `error`, `info`, `mock`).
   - Domain badges: `ApplicationStatusBadge`, `VerificationStatusBadge`, `ComplianceSeverityBadge`.
   - Contract requirement: `SimulatedDataBadge` (`"SIMULATED / MOCK DATA"`).
3. **`Card`**:
   - Compound primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
4. **`FormField`, `Input`, `Select`, `Textarea`**:
   - Fully accessible form controls: label `htmlFor`, error and helper `aria-describedby`, error styling.
5. **`Alert`**:
   - Variants: `info`, `success`, `warning`, `error`.
   - Accessible roles (`role="alert"` for warning/error, `role="status"` for info/success).
6. **`Loading`**:
   - `Spinner` (sizes `sm`, `md`, `lg`) and `Skeleton` (shimmer animation for data loading).
7. **`EmptyState`**:
   - Icon, title, description, and action button.
8. **`PageHeader`**:
   - Title, subtitle, breadcrumb links, and action slot.
9. **`Modal`**:
   - Accessible dialog primitive: backdrop click, Escape key dismissal, body scroll lock, focus isolation.

---

## 6. Accessibility & Responsive Standards

### 6.1 Accessibility (WCAG 2.1 AA)
- **Visible Focus:** Global `:focus-visible` ring (`2px solid var(--color-ring)` with `2px` offset).
- **Color Contrast:** All body text exceeds 7:1 contrast ratio against card and surface backgrounds.
- **Screen Readers:** Error messages use `role="alert"`; icon buttons provide explicit `aria-label`.
- **Motion Reduction:** `@media (prefers-reduced-motion: reduce)` disables all transition animations.
- **No Color Alone:** Status badges combine semantic color tokens with readable text labels and SVG icons.

### 6.2 Responsive Breakpoints
- **Narrow Mobile (< 640px):** Single-column layout, compact header, hidden user pill, hamburger drawer.
- **Tablet (640px - 1023px):** Multi-column metrics grid, expandable search, slide-out drawer navigation.
- **Desktop (1024px - 1439px):** Permanent left sidebar navigation (`16rem`), fixed header, multi-column card layout.
- **Widescreen (>= 1440px):** Content container constrained to `--max-content-width: 80rem` centered horizontally.
