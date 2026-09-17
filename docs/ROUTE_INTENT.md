# Route Intent Documentation (Phase 1 - Step 6)

## Purpose
This document clarifies the architectural intent and actual authorization model of primary routes based on verifiable repository evidence, primarily from `src/App.tsx`, `src/pages/WarishCertificate.tsx`, `src/components/RequireAdmin.tsx`, and `src/modules/citizen/RequireCitizen.tsx`.

## Route Categories

### 1. Legacy Admin-Issue Certificate Routes
**Routes:**
- `/warish-certificate` (via `src/pages/WarishCertificate.tsx`)
- `/dependent-certificate` (via `src/pages/DependentCertificate.tsx`)

**Authorization & Intent:**
- Both are explicitly wrapped in `<RequireAdmin>` in `src/App.tsx`.
- Within the components, they manually check for a session (`supabase.auth.getSession()`) and redirect to `/admin` if the user is unauthenticated.
- **Intent:** These are **Admin-Issue (or Office-Issue)** flows, *not* public citizen intake forms. They represent the legacy or direct-office data entry pathway for DEOs/Admins to generate draft certificates.
- **Note:** They operate independently of the newer Citizen Application Workflow.

### 2. Office/Admin Routes
**Routes:**
- `/admin/*` (e.g., `/admin/dashboard`, `/admin/review`, `/admin/manage`)

**Authorization & Intent:**
- Wrapped in components utilizing `<RequireAdmin>` and specific `<RequirePermission>` checks.
- `<RequireAdmin>` enforces that the session user has one of `admin`, `super_admin`, or `deo` roles in the backend `user_roles` table, checking explicitly against the DB.
- Access for "Super Admin" is checked securely via `bootstrap_admin_role` fallback or explicit backend roles.
- Suspended admin accounts are blocked in `<RequireAdmin>`.
- `<RequirePermission>` further gates specific features (e.g. `RequirePermission permission="warish_certs"`).

### 3. Citizen Portal Routes
**Routes:**
- `/public/*` (e.g., `/public/register`, `/public/dashboard`, `/public/apply/:type`)

**Authorization & Intent:**
- Gated by `RequireCitizen` (`src/modules/citizen/RequireCitizen.tsx`).
- `RequireCitizen` explicitly checks that a user has a citizen profile. It intentionally blocks "office users" (Admins/DEOs) from accessing citizen spaces (`if (!loading && session && profile === null) return <Navigate to="/public/login" />`).
- **Intent:** Self-service public intake forms, tracked through RLS policies scoped to `auth.uid()`.

### 4. DAR Hub & Verification
**Routes:**
- `/dar`
- `/verify`

**Authorization & Intent:**
- These are **unauthenticated public routes**.
- `/dar` acts as an entry router (Citizen vs Office vs Verify).
- `/verify` interfaces securely with read-only RPCs (`public_verify`, `public_verify_advanced`) with built-in IP rate limiting.

## Conclusion
The distinction between `/warish-certificate` (Legacy Office Data Entry) and `/public/apply/warish` (Citizen Workflow) is strict. The former is strictly admin-gated and relies on the office session; the latter is citizen-gated.
