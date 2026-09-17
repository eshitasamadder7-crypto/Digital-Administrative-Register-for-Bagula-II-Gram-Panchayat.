GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warish_certificates TO authenticated;
GRANT ALL ON public.warish_certificates TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependent_certificates TO authenticated;
GRANT ALL ON public.dependent_certificates TO service_role;

GRANT SELECT ON public.whats_new_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whats_new_entries TO authenticated;
GRANT ALL ON public.whats_new_entries TO service_role;

CREATE OR REPLACE FUNCTION public.is_allowed_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(_email, '')) IN ('bagula2nogp111@gmail.com', 'nitush6488@gmail.com')
$$;

GRANT EXECUTE ON FUNCTION public.is_allowed_admin_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_allowed_admin_email(text) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_admin_role_for_allowed_email()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT lower(email) INTO _email
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT public.is_allowed_admin_email(_email) THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_admin_role_for_allowed_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_admin_role_for_allowed_email() TO service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) IN ('bagula2nogp111@gmail.com', 'nitush6488@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;