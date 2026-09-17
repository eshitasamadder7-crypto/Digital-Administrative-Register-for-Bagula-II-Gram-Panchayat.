# Bagula Panchayat Hub — Digital Administrative Register (DAR)

**Permanent development reference.** Every future turn starts by reading this file and continues from the lowest-numbered unfinished step. Do not rebuild completed items; flip the status inline when a step is done.

- Legend: ✅ Already Implemented · 🟡 Partially Implemented · 🔴 Not Implemented · ⚠ Needs Improvement
- Roadmap tags: `✅ Existing` (verify + document) · `🟡 Improve` (harden without redesign) · `🔴 Future Development` (net-new)
- Guardrails (permanent): no renames, moves, or deletions of imported code; no schema / RLS / auth / workflow changes unless the step explicitly says so; no UI redesign unless a step calls for it.

---

## Part 1 — Development Report (read-only audit)

Stack: **Vite 5 + React 18 + React Router v6 + TypeScript + Tailwind + shadcn/ui + TanStack Query + Supabase (`@supabase/supabase-js` + `@lovable.dev/cloud-auth-js`)**. Tests via Vitest + Playwright. Source tree: `src/pages`, `src/components`, `src/lib`, `src/hooks`, `src/integrations`, `supabase/migrations` (32 SQL files, ~76 RLS policies, 16 SQL functions). No Supabase Edge Functions.

### A. Public Site
| Item | Status | Notes |
|---|---|---|
| `/` home (`Index.tsx`, 793 LOC) | ✅ Already Implemented | Hero + services + What's New via `useWhatsNew` |
| `/wbpms-info` (`WbpmsInfo.tsx`) | ✅ Already Implemented | Static WBPMS info page |
| `/elected-representatives` | ✅ Already Implemented | Representatives listing |
| `/verify` (`Verify.tsx`, 414 LOC) | ✅ Already Implemented | Calls `public_verify` / `public_verify_advanced` RPCs |
| `/dependent-certificate` | 🟡 Partially Implemented | Currently wrapped in `RequireAdmin` — confirm intent (admin-issue vs public intake) |
| `/warish-certificate` | 🟡 Partially Implemented | Same as above |
| `GovHeader` / `GovFooter` / `NavLink` | ✅ Already Implemented | Layout chrome; hidden on `/` |
| `NotFound` catch-all | ✅ Already Implemented | 25 LOC |
| `public/sitemap.xml`, `robots.txt`, `llms.txt` | ✅ Already Implemented | Present |
| Per-route SEO via `react-helmet-async` | ⚠ Needs Improvement | Dep installed; coverage not verified |

### B. Admin Console
| Item | Status | Notes |
|---|---|---|
| `/admin` sign-in (`AdminAuth.tsx`) | ✅ Already Implemented | Lovable Cloud auth broker |
| `/admin/dashboard` | ✅ Already Implemented | Nav hub |
| `/admin/review` (453 LOC) | ✅ Already Implemented | Approve / reject queue |
| `/admin/warish` list | ✅ Already Implemented | Perm: `warish_certs` |
| `/admin/dependent` list | ✅ Already Implemented | Perm: `dependent_certs` |
| `/admin/notices` + `/admin/whats-new` | ✅ Already Implemented | Two paths → same page |
| `/admin/manage` (294 LOC) | ✅ Already Implemented | Super-admin only |
| `/admin/account` | ✅ Already Implemented | Profile / password |
| `/admin/backups` (214 LOC) | 🟡 Partially Implemented | UI wires `backup_jobs`/`restore_jobs`; no worker in repo |
| `AdminAuthDebugPanel` | ⚠ Needs Improvement | Confirm dev-only before publish |
| Archive + audit-trail dialogs | ✅ Already Implemented | |

### C. Certificates
| Item | Status | Notes |
|---|---|---|
| Warish issue flow (`WarishCertificate.tsx`, 1046 LOC) | ✅ Already Implemented | jsPDF + html2canvas |
| Dependent issue flow (`DependentCertificate.tsx`, 649 LOC) | ✅ Already Implemented | Same pattern |
| Birth certificate table | 🟡 Partially Implemented | Table exists; no page |
| Death certificate table | 🟡 Partially Implemented | Table exists; no page |
| RPCs: `approve_certificate` v1/v2, `reject_certificate` v1/v2 | ✅ Already Implemented | v1 likely deprecated |
| `app_private.cert_counters` memo numbering | ✅ Already Implemented | |
| `generate_verification_id(kind, year)` | ✅ Already Implemented | |
| `archive_certificate`, `restore_certificate`, `permanently_delete_rejected`, `archive_expired_rejections` | ✅ Already Implemented | |
| `certificate_audit_logs` + trail dialog | ✅ Already Implemented | |

### D. Auth & Permissions
| Item | Status | Notes |
|---|---|---|
| Supabase auth + Lovable Cloud auth JS | ✅ Already Implemented | |
| `user_roles` + `app_role` enum + `has_role()` SECURITY DEFINER | ✅ Already Implemented | |
| `admin_profiles`, `admin_permissions` | ✅ Already Implemented | Powers `RequirePermission` |
| Allow-listed admin emails (`is_allowed_admin_email`, `ensure_admin_role_for_allowed_email`, `tg_grant_admin_to_owner`) | ✅ Already Implemented | |
| `<RequireAdmin>` / `<RequirePermission>` guards | ✅ Already Implemented | |
| Password reset / MFA | 🔴 Not Implemented | |
| Cross-tab session refresh | ⚠ Needs Improvement | |

### E. Database & RLS
| Item | Status | Notes |
|---|---|---|
| 32 migrations in `supabase/migrations/` | ✅ Already Implemented | |
| Tables: `admin_profiles`, `admin_permissions`, `user_roles`, `activity_logs`, `audit_log`, `certificate_audit_logs`, `verification_lookups`, `warish_certificates`, `dependent_certificates`, `birth_certificate_records`, `death_certificate_records`, `whats_new_entries`, `backup_jobs`, `restore_jobs`, `app_private.cert_counters` | ✅ Already Implemented | |
| ~76 RLS policies | ✅ Already Implemented | Not re-verified for gaps |
| 16 SECURITY DEFINER functions | ✅ Already Implemented | |
| Triggers: `tg_set_updated_at`, `tg_grant_admin_to_owner` | ✅ Already Implemented | |
| Explicit grants to `authenticated` / `service_role` / `anon` | ⚠ Needs Improvement | Spot-check verify surface |

### F. Storage
| Item | Status | Notes |
|---|---|---|
| Supabase Storage buckets | 🔴 Not Implemented | No bucket inserts; PDFs generated client-side, not persisted |

### G. Audit / Activity
| Item | Status | Notes |
|---|---|---|
| `activity_logs` + `src/lib/activityLog.ts` | ✅ Already Implemented | |
| `audit_log` | ✅ Already Implemented | |
| `certificate_audit_logs` | ✅ Already Implemented | |

### H. Backups
| Item | Status | Notes |
|---|---|---|
| `backup_jobs`/`restore_jobs` + admin UI | 🟡 Partially Implemented | Queue only; no executor in repo |

### I. Verification (public)
| Item | Status | Notes |
|---|---|---|
| `/verify` + `verification_lookups` + `public_verify*` RPCs | ✅ Already Implemented | IP-hash rate-limit arg |

### J. Notices / What's New
| Item | Status | Notes |
|---|---|---|
| `whats_new_entries` + admin editor + `useWhatsNew` | ✅ Already Implemented | |

### K. Tooling / CI / Tests
| Item | Status | Notes |
|---|---|---|
| Vitest setup + one example test | 🟡 Partially Implemented | |
| Playwright config + fixture | 🟡 Partially Implemented | No specs |
| ESLint + Prettier | ✅ Already Implemented | |
| CI pipeline (`.github/workflows`) | 🔴 Not Implemented | |
| Typed Supabase (`src/integrations/supabase/types.ts`) | ✅ Already Implemented | |

### L. Environment / Secrets
Archived `.env` referenced (NOT copied): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`. Re-add via Lovable Cloud secrets before running against the hosted DB.

---

## Part 2 — 100-Step Roadmap

> Rule: never skip a step; never restart a completed one. Flip `[ ]` → `[x]` and update the status tag in place.

### Phase 1 — Foundation & Audit (1–10)
- [x] **1.** ✅ Existing — Import codebase + Development Report (this file, Day 1).
- [x] **2.** ✅ Existing — Verify `bun run build` + dev server; record warnings. (Logged in `docs/BUILD_AUDIT.md`)
- [ ] **3.** ✅ Existing — Wire `VITE_SUPABASE_*` secrets in Lovable Cloud; confirm client boot.
- [ ] **4.** ✅ Existing — Playwright baseline screenshot of every route.
- [ ] **5.** ✅ Existing — Confirm hosted Supabase matches the 32 migrations (read-only).
- [x] **6.** 🟡 Improve — Document intent of `/dependent-certificate` and `/warish-certificate` (admin-issue vs public intake). (Logged in `docs/ROUTE_INTENT.md`)
- [x] **7.** 🟡 Improve — Inventory `RequirePermission` keys vs `admin_permissions` rows. (Logged in `docs/PERMISSION_INVENTORY.md`)
- [x] **8.** 🟡 Improve — Generate `docs/RLS_MATRIX.md` (subject × action × using/with-check).
- [ ] **9.** ✅ Existing — Verify only `public_verify*` are `TO anon` execute grants.
- [x] **10.** 🟡 Improve — Add README pointer to this roadmap.

### Phase 2 — Stability Hardening (11–25)
- [ ] **11.** 🟡 Improve — Error boundaries around `/admin/*`.
- [ ] **12.** 🟡 Improve — Loading skeletons on admin list pages.
- [ ] **13.** 🟡 Improve — Centralize RPC error toast messages.
- [ ] **14.** 🟡 Improve — TanStack Query key invalidation for approve/reject/archive.
- [ ] **15.** 🟡 Improve — Gate `AdminAuthDebugPanel` behind `import.meta.env.DEV`.
- [ ] **16.** 🟡 Improve — Retry policy for verification lookups.
- [ ] **17.** 🟡 Improve — DOMPurify sweep on notice editor.
- [ ] **18.** 🟡 Improve — Per-page `<Helmet>` title + description.
- [ ] **19.** 🟡 Improve — Favicon + PWA manifest.
- [ ] **20.** 🟡 Improve — Offline banner on public forms.
- [ ] **21.** 🟡 Improve — Verify `tg_set_updated_at` covers all mutable tables.
- [ ] **22.** 🟡 Improve — Index review for `verification_lookups(ip_hash, created_at)`.
- [ ] **23.** 🟡 Improve — Audit v1 approve/reject call sites, plan deprecation.
- [ ] **24.** 🟡 Improve — Server-side rate limit note for `public_verify`.
- [ ] **25.** 🟡 Improve — Freeze RLS matrix as tested baseline.

### Phase 3 — Certificates (26–45)
- [ ] **26.** ✅ Existing — Warish PDF layout QA.
- [ ] **27.** ✅ Existing — Dependent PDF layout QA.
- [ ] **28.** 🟡 Improve — Shared PDF header/footer component.
- [ ] **29.** 🟡 Improve — Signature block placement audit.
- [ ] **30.** 🟡 Improve — QR code (verification URL) on issued PDFs.
- [ ] **31.** 🟡 Improve — Print-friendly CSS pass.
- [ ] **32.** 🔴 Future Development — Birth certificate issue page.
- [ ] **33.** 🔴 Future Development — Birth certificate admin review flow.
- [ ] **34.** 🔴 Future Development — Death certificate issue page.
- [ ] **35.** 🔴 Future Development — Death certificate admin review flow.
- [ ] **36.** 🔴 Future Development — Trade license register.
- [ ] **37.** 🔴 Future Development — Property tax register.
- [ ] **38.** 🔴 Future Development — Water tax register.
- [ ] **39.** 🔴 Future Development — Marriage certificate register.
- [ ] **40.** 🔴 Future Development — Income certificate register.
- [ ] **41.** 🔴 Future Development — Residence certificate register.
- [ ] **42.** 🔴 Future Development — NOC register.
- [ ] **43.** 🔴 Future Development — Grievance register.
- [ ] **44.** 🔴 Future Development — Meeting minutes register.
- [ ] **45.** 🔴 Future Development — Asset inventory register.

### Phase 4 — Auth & Access (46–55)
- [ ] **46.** 🟡 Improve — Password reset flow.
- [ ] **47.** 🔴 Future Development — TOTP MFA for admins.
- [ ] **48.** 🟡 Improve — Inactivity auto sign-out.
- [ ] **49.** 🟡 Improve — Admin invite (email link) + `admin_permissions` seeding.
- [ ] **50.** 🟡 Improve — Role revocation UI writes `user_roles`.
- [ ] **51.** 🟡 Improve — Audit log for every permission change.
- [ ] **52.** 🔴 Future Development — Public citizen accounts.
- [ ] **53.** 🔴 Future Development — Citizen application tracking dashboard.
- [ ] **54.** 🔴 Future Development — SMS/email notification on status change.
- [ ] **55.** 🟡 Improve — Sign-in rate limiting.

### Phase 5 — Verification & Public Trust (56–65)
- [ ] **56.** ✅ Existing — `/verify` copy + Aadhaar-last-4 UX pass.
- [ ] **57.** 🟡 Improve — Verification success page (QR + memo).
- [ ] **58.** 🟡 Improve — Verification failure telemetry.
- [ ] **59.** 🔴 Future Development — Bulk CSV verification for third parties.
- [ ] **60.** 🔴 Future Development — Signed-URL read-only PDF.
- [ ] **61.** 🟡 Improve — CAPTCHA after N failures.
- [ ] **62.** 🔴 Future Development — Public `/api/public/verify` with signature.
- [ ] **63.** 🟡 Improve — Verification lookup retention policy.
- [ ] **64.** 🟡 Improve — IP-hash salt rotation.
- [ ] **65.** 🟡 Improve — Verification analytics for admin.

### Phase 6 — Storage & Documents (66–72)
- [ ] **66.** 🔴 Future Development — `certificates` Storage bucket + RLS.
- [ ] **67.** 🔴 Future Development — Persist issued PDFs.
- [ ] **68.** 🔴 Future Development — Supporting-doc uploads on application.
- [ ] **69.** 🔴 Future Development — Retention + purge cron.
- [ ] **70.** 🔴 Future Development — Antivirus scan hook.
- [ ] **71.** 🔴 Future Development — Signed-URL viewer component.
- [ ] **72.** 🔴 Future Development — Watermark previews for pending certs.

### Phase 7 — Backups & Ops (73–80)
- [ ] **73.** 🟡 Improve — Backup worker executes `backup_jobs`.
- [ ] **74.** 🟡 Improve — Restore worker executes `restore_jobs`.
- [ ] **75.** 🔴 Future Development — Nightly pg_cron backup schedule.
- [ ] **76.** 🔴 Future Development — Off-site backup mirror.
- [ ] **77.** 🟡 Improve — Backup integrity checksum.
- [ ] **78.** 🔴 Future Development — Point-in-time restore UI.
- [ ] **79.** 🟡 Improve — Retention policy for `activity_logs` and `audit_log`.
- [ ] **80.** 🔴 Future Development — Ops health dashboard.

### Phase 8 — Public Site Content (81–88)
- [ ] **81.** 🟡 Improve — Home hero copy pass.
- [ ] **82.** 🟡 Improve — `/wbpms-info` content refresh.
- [ ] **83.** 🟡 Improve — `/elected-representatives` bios + photos.
- [ ] **84.** 🔴 Future Development — Tenders & notices archive.
- [ ] **85.** 🔴 Future Development — Downloadable forms library.
- [ ] **86.** 🔴 Future Development — Village statistics dashboard.
- [ ] **87.** 🔴 Future Development — Bengali / English language toggle.
- [ ] **88.** 🟡 Improve — Accessibility (WCAG 2.1 AA) sweep.

### Phase 9 — Testing & CI (89–95)
- [ ] **89.** 🟡 Improve — Expand Vitest for `src/lib/*`.
- [ ] **90.** 🟡 Improve — Playwright specs: home, verify, admin sign-in.
- [ ] **91.** 🔴 Future Development — Playwright specs: full approve/reject/archive.
- [ ] **92.** 🔴 Future Development — GitHub Actions CI (lint + typecheck + test).
- [ ] **93.** 🔴 Future Development — Preview deploy on PR.
- [ ] **94.** 🔴 Future Development — Migration lint (no destructive DDL without review).
- [ ] **95.** 🔴 Future Development — RLS policy test harness.

### Phase 10 — Launch (96–100)
- [ ] **96.** 🟡 Improve — SEO pass + JSON-LD (GovernmentOrganization).
- [ ] **97.** 🟡 Improve — Performance pass (bundle + image lazy-load).
- [ ] **98.** 🟡 Improve — Security scan + fix.
- [ ] **99.** 🟡 Improve — Publish to custom domain.
- [ ] **100.** ✅ Existing — Freeze v1.0; open v1.1 for further work.

---

_Last updated: Day 1 — import + audit. Next unfinished step: **2**._
