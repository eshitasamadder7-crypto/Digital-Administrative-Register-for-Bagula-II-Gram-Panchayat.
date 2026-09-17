# DEO Project — Fresh Initialization from Uploaded ZIP

Goal: ZIP → new Cloud backend → migrations → auth/demo roles → build/test/lint → ready for login test. No redesign, no refactoring, no extra work.

## 1. Load the ZIP as the whole app

Replace the current template contents with the uploaded project verbatim (excluding any git metadata and the ZIP's `.env`, which points at the old backend):

- App source: `src/`, `public/`, `index.html`, `docs/`
- Config: `package.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig*.json`, `eslint.config.js`, `components.json`
- Backend: `supabase/migrations/` (55 files), `supabase/functions/` (citizen-auth, mcp, office-accounts), `supabase/tests/`
- Remove the TanStack template files this replaces (`src/routes/`, `src/router.tsx`, `src/start.ts`, `src/server.ts`, `src/styles.css`, `routeTree.gen.ts`, template `vite.config.ts`).

The app stays exactly as authored: Vite + React 18 + React Router + shadcn + Tailwind 3.

## 2. New Lovable Cloud backend

- Enable Cloud on this project (creates a brand-new backend; the old Birth Portal backend is not touched or referenced).
- Regenerate `src/integrations/supabase/client.ts` env values for the new project. No old project ID or key remains anywhere.

## 3. Apply the ZIP migrations

- Apply all 55 migrations in filename order, exactly as written, into the new database — including master data seeds, document engine (`documents_engine`, `master_document_types`, `master_document_requirements`, `document_mode`, `document_requirement_stage`), certificate config (`master_certificate_types`, `certificate_sequences`, `valid_from`/`valid_until`, `config_snapshot`), RLS, RPCs, storage buckets/policies, audit logging.
- Verify each applies cleanly; if one fails on a Cloud-specific difference (e.g. a role/extension not present), fix only that statement minimally and report it — no schema redesign.
- The root-level `patch_find_duplicate.sql` and `patch_verify_advanced.sql` are applied only if the migration set does not already contain their definitions.

## 4. Auth and demo accounts

Create the five accounts in the new Auth system (email-confirmed) and assign roles through the app's own roles table/mechanism:

- nitush6488@gmail.com → ADMIN
- nitush8343980898@gmail.com → DEO
- bagula2nogp111@gmail.com → SUPER ADMIN (protected, never auto-deleted)
- bagulaiiofficerecords@gmail.com → OBSERVER
- NitishBiswas@zohomail.in → CITIZEN

The temporary password is set via the admin API only. It will not appear in source, migrations, config, or the frontend.

## 5. Validate

Run with the ZIP's package manager (bun/npm per lockfile):

- `build`
- `test` (vitest)
- `lint` (eslint)

Pre-existing unrelated warnings are reported, not fixed.

## 6. Report

ZIP loaded / Cloud connected / Supabase created / migrations applied / auth initialized / five roles configured / BUILD / TEST / LINT / blockers, then FINAL STATUS: READY FOR LOGIN TEST or BLOCKED with the exact blocker.

## Technical notes

- Supabase Edge Functions in the ZIP are kept as-is (this stack supports them); they are not converted.
- Storage buckets created by the migrations keep their private/citizen-document policies unchanged.
- Actual login verification through the browser is done only if credits allow after build passes; otherwise account/role setup is reported as configured.
