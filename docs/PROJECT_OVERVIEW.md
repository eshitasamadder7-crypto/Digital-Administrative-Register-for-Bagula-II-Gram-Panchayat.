# Project Overview

**Bagula II Gram Panchayat — Digital Certificate Portal**

A React 18 + Vite + TypeScript + Tailwind + shadcn/ui frontend backed by Lovable Cloud (Supabase). The system issues verifiable government certificates and exposes a public verification page.

## Primary flows today

1. **Citizen / Verification** — anyone can visit `/verify` and check a certificate by verification ID or memo + date + Aadhaar-last-4.
2. **DAR Hub** (`/dar`) — landing page routing users to Citizen (coming soon), Office (Super Admin / DEO / Staff — Staff coming soon), or Verification.
3. **DEO / Admin / Super Admin sign-in** at `/admin`.
4. **Draft creation** — admins create Warish and Dependent certificate drafts.
5. **Review & approve** at `/admin/review` — approvers assign memo serial + year, issue date; rejections have a 30-day grace before permanent purge.
6. **Issued lists** at `/admin/warish` and `/admin/dependent` with QR-based verification links.
7. **Notice Maker** at `/admin/notices` publishes public "What's New" notices with expiry, pin, and archive support.
8. **Admin Management** at `/admin/manage` (Super Admin only) — promote users, grant per-module permissions, archive admins.

## Roles

- `super_admin` — full access, bypasses permission matrix.
- `admin` — access controlled by `admin_permissions` matrix.
- `deo` — data entry operator; lands on a dedicated `/admin/deo` dashboard.

## What this sprint changed

- Added `src/core/` engine placeholders and a certificate type registry.
- Added `src/shared/` + `src/modules/` barrels — no file moves, imports stable.
- Notice Maker: never / date / datetime / manual expiry, pinning, and manual archive.
- Admin Management: typed-email archive confirmation, protected emergency admin, restore flow.
- Admin Dashboard: `Backups & Restore` and `Account Settings` marked **Coming Soon** (routes still mounted).