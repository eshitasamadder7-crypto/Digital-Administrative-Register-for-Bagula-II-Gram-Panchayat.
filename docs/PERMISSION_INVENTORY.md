# Permission Inventory (Phase 1 - Step 7)

## Purpose
This document maps the active frontend permissions (used in `<RequirePermission>`) to the backend enforcement mechanisms (database RLS and RPC checks), derived directly from repository evidence.

## Role Model
The core roles are defined in `public.user_roles.role` as an enum (`app_role`): `deo`, `admin`, `super_admin`.
*(Note: A recent master-data script introduced `office_system_role`, but it is not currently the primary gate for the legacy certificates or existing dashboard.)*

## Frontend Permission Mapping

| Frontend Key (`AppPermission`) | Route/Component Example | Target Action | Backend Enforcement Mechanism | Enforcement Status |
|-------------------|--------------------------------|--------------|--------------------------------|-------------------|
| `warish_certs`    | `/admin/warish` `<AdminWarishList>` | `view`, `edit`, `create` | RLS on `warish_certificates` using `has_role(auth.uid(), 'admin')` (or `super_admin`) | Active / Verified |
| `dependent_certs` | `/admin/dependent` `<AdminDependentList>` | `view`, `edit`, `create` | RLS on `dependent_certificates` using `has_role(auth.uid(), 'admin')` (or `super_admin`) | Active / Verified |
| `notices`         | `/admin/notices`, `/admin/whats-new` | `view`, `edit` | `whats_new_entries` RLS, restricted mostly to `admin` / `super_admin`. | Active / Verified |
| `admins`          | `/admin/manage`, `/admin/master-data` | `superAdminOnly` | RLS checks `has_role(auth.uid(), 'super_admin')` explicitly. | Active / Verified |
| `backups`         | `/admin/backups` | `superAdminOnly` | `backup_jobs` / `restore_jobs` RLS restricted to `super_admin`. | Active / Verified |
| `birth_certs`     | `ROLE_PERMISSIONS` dict (Admin) | `view`, `edit` | Schema exists but no UI page currently routes here. | Future / Unused |

## Backend Enforcement Analysis

1. **RPC Level (`approve_certificate_v2`, `reject_certificate_v2`, etc.)**
   - Strictly validates `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')`.
   - DEOs (`deo`) cannot execute these RPCs.

2. **`role_permissions` Table**
   - A table `public.role_permissions` was added in `20270101000000_robust_backend_architecture.sql` with seeds like `('Citizen', 'submit_application')`.
   - **Status:** This appears to be for the newly built Citizen Workflow architecture. The legacy Office Admin UI (the routes listed above) still primarily rely on the `has_role` helper and hardcoded UI matrices (`lib/permissions.ts`), not this new table.

3. **`admin_permissions` Table**
   - Contains a per-user JSON or row structure mapped by Super Admins in the legacy `/admin/manage` UI.
   - Evaluated heavily on the client (`src/lib/permissions.ts`) to hide/show buttons.

## Conclusion
The frontend `<RequirePermission>` component relies primarily on local state hydration. Security is backed up by `has_role()` inside RLS and RPCs. The new `role_permissions` table is present but represents a parallel/future authorization boundary for dynamic citizen workflows rather than replacing the legacy admin logic.