-- 1. Drop the bootstrap function (admin already exists)
DROP FUNCTION IF EXISTS public.claim_admin_if_unowned();

-- 2. Revoke EXECUTE on has_role from API roles; RLS still works because
-- policies run as the table owner and can call it regardless of grants.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- 3. Pin search_path on the updated_at trigger function
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin new.updated_at = now(); return new; end;
$$;