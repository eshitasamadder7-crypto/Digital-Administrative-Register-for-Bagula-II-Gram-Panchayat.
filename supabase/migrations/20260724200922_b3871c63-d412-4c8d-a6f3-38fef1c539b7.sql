-- Secure bootstrap RPC for initial role assignment based on hardcoded email whitelist.
-- This avoids the chicken-and-egg RLS problem where no super_admin exists yet.
CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS TABLE(assigned_role app_role, was_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _role app_role;
  _existing app_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;

  -- Whitelist: email -> role
  _role := CASE _email
    WHEN 'bagula2nogp111@gmail.com'   THEN 'super_admin'::app_role
    WHEN 'nitush6488@gmail.com'       THEN 'admin'::app_role
    WHEN 'nitush8343980898@gmail.com' THEN 'deo'::app_role
    ELSE NULL
  END;

  IF _role IS NULL THEN
    RAISE EXCEPTION 'Email % is not in the bootstrap whitelist', _email;
  END IF;

  -- If any role already exists for this user, return the highest existing (do not overwrite).
  SELECT role INTO _existing FROM public.user_roles WHERE user_id = _uid
    ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'deo' THEN 3 ELSE 4 END
    LIMIT 1;

  IF _existing IS NOT NULL THEN
    RETURN QUERY SELECT _existing, false;
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);

  INSERT INTO public.admin_profiles (user_id, email, status)
  VALUES (_uid, _email, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY SELECT _role, true;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_role() TO authenticated;

-- Clean up any stale mis-assigned roles for the two known users so the whitelist takes effect.
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND lower(u.email) IN ('nitush6488@gmail.com','nitush8343980898@gmail.com');
