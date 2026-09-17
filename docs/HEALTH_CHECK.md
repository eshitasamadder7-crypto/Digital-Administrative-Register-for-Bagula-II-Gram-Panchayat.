# System Health Check

Snapshot taken during the Prototype Stabilization sprint. No runtime changes were made to produce this report.

## Routes

| Route | Status |
| ----- | ------ |
| `/`, `/dar`, `/verify`, `/wbpms-info`, `/elected-representatives` | Healthy |
| `/admin`, `/admin/dashboard`, `/admin/deo`, `/admin/review` | Healthy |
| `/admin/warish`, `/admin/dependent`, `/admin/notices`, `/admin/manage` | Healthy |
| `/warish-certificate`, `/dependent-certificate` | Healthy |
| `/admin/account`, `/admin/backups` | **Coming Soon** (route mounted, dashboard tile disabled) |
| `/admin/whats-new` | Healthy (alias of `/admin/notices`) |

## Components

All components under `src/components/` are in active use. `AdminAuthDebugPanel` is dev-only.

## Database (Supabase)

All tables have RLS enabled and required GRANTs. See `DATABASE.md`.

## Storage buckets

None configured. Not currently required — certificates are rendered client-side and verified via RPC.

## Authentication

Supabase Auth (email + password + Google). Role checks route through `has_role()` SECURITY DEFINER. Healthy.

## Certificate generator / QR verify / PDF

Warish and Dependent generators live in their respective pages under `src/pages/`. QR verification uses `public_verify` / `public_verify_advanced` RPCs. All Healthy — untouched this sprint.

## Legend

- **Healthy** — in active use, no known issues.
- **Needs Improvement** — works, but flagged for follow-up.
- **Deprecated** — replaced but kept for compatibility.
- **Unused** — safe to remove in a future cleanup sprint.