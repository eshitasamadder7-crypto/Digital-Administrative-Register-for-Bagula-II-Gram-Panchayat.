# Database

All tables live in `public`. RLS is enabled on every table; grants are set for `authenticated` and `service_role`. Sensitive data is accessed through `SECURITY DEFINER` functions in `app_private`.

| Table                        | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `activity_logs`              | Admin action audit trail.                        |
| `admin_permissions`          | Per-user module/action permission matrix.        |
| `admin_profiles`             | Admin metadata; **added `archived_at`** this sprint. |
| `audit_log`                  | Row-level audit trail for certificate changes.   |
| `backup_jobs` / `restore_jobs` | Backup subsystem (Coming Soon).                |
| `birth_certificate_records`  | Birth certificate registry.                      |
| `certificate_audit_logs`     | Approval/rejection/restore trail.                |
| `death_certificate_records`  | Death certificate registry.                      |
| `dependent_certificates`     | Dependent certificate drafts + issued records.   |
| `user_roles`                 | Role assignments (`super_admin`, `admin`, `deo`).|
| `verification_lookups`       | Public verification hit log.                     |
| `warish_certificates`        | Warish certificate drafts + issued records.      |
| `whats_new_entries`          | Public notices; **added `expiry_mode`, `expires_at`, `is_pinned`, `archived_at`** this sprint. |

## Roles

`app_role` enum: `super_admin`, `admin`, `deo`. Roles are stored in `user_roles`; never on profile tables. Role checks use the `has_role(uid, role)` SECURITY DEFINER function.

## This sprint's schema changes

All additive, no renames, no drops:

- `whats_new_entries` → `expiry_mode` (default `never`), `expires_at`, `is_pinned` (default false), `archived_at`; new index on `(is_pinned DESC, posted_on DESC)`.
- `admin_profiles` → `archived_at`; new index on `archived_at`.