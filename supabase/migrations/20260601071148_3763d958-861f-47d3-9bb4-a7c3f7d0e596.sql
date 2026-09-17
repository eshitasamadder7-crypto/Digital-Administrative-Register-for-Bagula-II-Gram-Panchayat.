-- [REDACTED 2026-07-31 — security remediation]
-- This migration originally seeded two admin accounts into auth.users with
-- hard-coded plaintext passwords. Those credentials are considered compromised
-- and have been removed from the source tree. Admin accounts are now
-- provisioned exclusively via Google OAuth + the bootstrap_admin_role() RPC.
-- Intentionally a no-op.
SELECT 1;
