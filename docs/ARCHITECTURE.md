# Architecture

## Routes (`src/App.tsx`)

Public: `/`, `/dar`, `/wbpms-info`, `/elected-representatives`, `/verify`, `/admin` (sign-in).
Auth-gated: `/admin/dashboard`, `/admin/deo`, `/admin/review`, `/admin/warish`, `/admin/dependent`, `/admin/notices`, `/admin/whats-new`, `/admin/manage`, `/admin/account`, `/admin/backups`, `/dependent-certificate`, `/warish-certificate`.

## Layers

```text
src/
  core/         AppStatus, certificate registry, engine placeholders
  modules/      barrel re-exports of existing pages (stable import paths)
  shared/       components/layouts/hooks/services/types/utils barrels
  pages/        actual page implementations (unchanged in this sprint)
  components/   shared and shadcn/ui components
  lib/          permissions, activity log, certificate archive helpers
  integrations/supabase/  generated client + types (never edit by hand)
```

## Engines (`src/core/`)

Lightweight placeholders. Existing pages keep calling their current code — engines are opt-in for new work.

- `workflowEngine` — wraps `AppStatus` transition rules.
- `certificateEngine` — reads `CERTIFICATE_TYPES` registry.
- `notificationEngine` — proxies `sonner`.
- `auditEngine` — proxies `logActivity`.
- `documentEngine` — reserved for future unified PDF pipeline.
- `searchEngine` — thin Supabase client wrapper.
- `qrEngine` — wraps the `public_verify` RPC.

## App state model (`src/core/appState.ts`)

`AppStatus` superset: `draft → submitted → locked → processing → returned → approved → rejected → issued → archived`. Existing tables keep their own status columns; the enum is a UI helper for new features.

## Certificate registry (`src/core/certificateRegistry.ts`)

`WARISH` (active), `DEPENDENT` (active), `LINKAGE` (planned).