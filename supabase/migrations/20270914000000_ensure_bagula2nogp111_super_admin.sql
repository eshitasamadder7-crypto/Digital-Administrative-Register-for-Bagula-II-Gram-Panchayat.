-- Ensure bagula2nogp111@gmail.com is unconditionally converted to SUPER ADMIN
DO $$
DECLARE
  _uid uuid;
BEGIN
  -- Look for the user ID in auth.users
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'bagula2nogp111@gmail.com' LIMIT 1;
  
  IF _uid IS NOT NULL THEN
    -- Remove any non-super_admin roles
    DELETE FROM public.user_roles WHERE user_id = _uid AND role != 'super_admin';

    -- Ensure super_admin role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure admin_profiles record is active with super_admin designation and full access
    INSERT INTO public.admin_profiles (user_id, email, display_name, status, designation, allowed_login_method, must_change_password)
    VALUES (_uid, 'bagula2nogp111@gmail.com', 'Super Admin (Bagula-II GP)', 'active', 'pradhan', 'both', false)
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'active',
      designation = 'pradhan',
      archived_at = NULL;
  END IF;
END $$;

-- Update bootstrap_admin_role to ensure bagula2nogp111@gmail.com always gets converted to super_admin
CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS TABLE(assigned_role app_role, was_created boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _role app_role;
  _existing app_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;
  _role := CASE _email
    WHEN 'bagula2nogp111@gmail.com'   THEN 'super_admin'::app_role
    WHEN 'nitush6488@gmail.com'       THEN 'admin'::app_role
    WHEN 'nitush8343980898@gmail.com' THEN 'deo'::app_role
    ELSE NULL
  END;
  IF _role IS NULL THEN RAISE EXCEPTION 'Email % is not in the bootstrap whitelist', _email; END IF;

  -- For bagula2nogp111@gmail.com, unconditionally guarantee super_admin role
  IF _email = 'bagula2nogp111@gmail.com' THEN
    DELETE FROM public.user_roles WHERE user_id = _uid AND role != 'super_admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'super_admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.admin_profiles (user_id, email, display_name, status, designation, allowed_login_method)
      VALUES (_uid, _email, 'Super Admin (Bagula-II GP)', 'active', 'pradhan', 'both')
      ON CONFLICT (user_id) DO UPDATE SET status = 'active', archived_at = NULL;
    RETURN QUERY SELECT 'super_admin'::app_role, true;
    RETURN;
  END IF;

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
END; $$;
