-- Apply this in Supabase Dashboard -> SQL Editor -> New query, then Run.
-- Or via CLI:  supabase db execute --file docs/sql/grant_super_admin_and_deo.sql
--
-- Both users must have signed in at least ONCE with Google before running this
-- so that a row exists in auth.users for their email. The statements are
-- idempotent -- safe to re-run.

-- 1. super_admin for nitush6488@gmail.com  (+ legacy 'admin' row for RequireAdmin checks)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'nitush6488@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'nitush6488@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. admin role for the DEO account (needed so RequireAdmin lets them into /admin/*)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'nitush8343980898@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. DEO permission matrix: view/create/edit on the three certificate registers.
--    No delete. No admin management, backups, or activity-log access.
WITH deo AS (
  SELECT id AS user_id
  FROM auth.users
  WHERE lower(email) = 'nitush8343980898@gmail.com'
)
INSERT INTO public.admin_permissions (user_id, permission, action)
SELECT deo.user_id, p.permission, a.action
FROM deo
CROSS JOIN (VALUES
  ('warish_certs'::public.app_permission),
  ('dependent_certs'::public.app_permission),
  ('birth_certs'::public.app_permission)
) AS p(permission)
CROSS JOIN (VALUES
  ('view'::public.app_action),
  ('create'::public.app_action),
  ('edit'::public.app_action)
) AS a(action)
ON CONFLICT (user_id, permission, action) DO NOTHING;

-- Verify:
-- SELECT u.email, r.role FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
--  WHERE lower(u.email) IN ('nitush6488@gmail.com','nitush8343980898@gmail.com');
-- SELECT u.email, ap.permission, ap.action FROM auth.users u
--  JOIN public.admin_permissions ap ON ap.user_id = u.id
--  WHERE lower(u.email) = 'nitush8343980898@gmail.com';