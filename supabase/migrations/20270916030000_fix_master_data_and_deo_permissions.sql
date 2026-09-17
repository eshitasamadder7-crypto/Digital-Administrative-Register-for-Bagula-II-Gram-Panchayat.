-- Migration: 20270916030000_fix_master_data_and_deo_permissions.sql
-- Description: Unconditionally grant super_admin to nitish374482@gmail.com and bagula2nogp111@gmail.com,
-- provide SECURITY DEFINER RPCs for toggle_master_data and save_master_data_item, and grant write permissions.

-- 1. Ensure nitish374482@gmail.com and bagula2nogp111@gmail.com are super_admin in public.user_roles and admin_profiles
DO $$
DECLARE
  _uid uuid;
BEGIN
  -- nitish374482@gmail.com
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'nitish374482@gmail.com' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.admin_profiles (user_id, email, display_name, status, designation, allowed_login_method, must_change_password)
    VALUES (_uid, 'nitish374482@gmail.com', 'Super Admin (Nitish)', 'active', 'pradhan', 'both', false)
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'active',
      designation = 'pradhan',
      archived_at = NULL;
  END IF;

  -- bagula2nogp111@gmail.com
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'bagula2nogp111@gmail.com' LIMIT 1;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.admin_profiles (user_id, email, display_name, status, designation, allowed_login_method, must_change_password)
    VALUES (_uid, 'bagula2nogp111@gmail.com', 'Super Admin (Bagula-II GP)', 'active', 'pradhan', 'both', false)
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'active',
      designation = 'pradhan',
      archived_at = NULL;
  END IF;
END $$;

-- 2. Update bootstrap_admin_role RPC to include nitish374482@gmail.com
CREATE OR REPLACE FUNCTION public.bootstrap_admin_role()
RETURNS TABLE(assigned_role app_role, was_created boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _role app_role;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT lower(email) INTO _email FROM auth.users WHERE id = _uid;
  _role := CASE _email
    WHEN 'bagula2nogp111@gmail.com'   THEN 'super_admin'::app_role
    WHEN 'nitish374482@gmail.com'     THEN 'super_admin'::app_role
    WHEN 'nitush6488@gmail.com'       THEN 'admin'::app_role
    WHEN 'nitush8343980898@gmail.com' THEN 'deo'::app_role
    ELSE NULL
  END;
  IF _role IS NULL THEN RAISE EXCEPTION 'Email % is not in the bootstrap whitelist', _email; END IF;

  -- Super admin grants
  IF _role = 'super_admin'::app_role THEN
    DELETE FROM public.user_roles WHERE user_id = _uid AND role != 'super_admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'super_admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.admin_profiles (user_id, email, display_name, status, designation, allowed_login_method)
      VALUES (_uid, _email, 'Super Admin', 'active', 'pradhan', 'both')
      ON CONFLICT (user_id) DO UPDATE SET status = 'active', archived_at = NULL;
    RETURN QUERY SELECT 'super_admin'::app_role, true;
    RETURN;
  END IF;

  -- Other roles
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.admin_profiles (user_id, email, display_name, status, designation, allowed_login_method)
    VALUES (_uid, _email, 'Office Staff', 'active', CASE WHEN _role = 'admin' THEN 'secretary' ELSE 'deo' END, 'both')
    ON CONFLICT (user_id) DO UPDATE SET status = 'active', archived_at = NULL;

  RETURN QUERY SELECT _role, true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_admin_role() TO authenticated, service_role;

-- 3. Atomic toggle_master_data RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.toggle_master_data(_id uuid, _is_active boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  _affected int;
BEGIN
  UPDATE public.master_data
  SET is_active = _is_active,
      updated_at = now()
  WHERE id = _id;
  GET DIAGNOSTICS _affected = ROW_COUNT;

  IF _affected > 0 THEN
    -- Audit log entry
    INSERT INTO public.activity_logs (
      actor_user_id, action_type, target_table, target_id, metadata
    ) VALUES (
      auth.uid(), 'master_data.toggle', 'master_data', _id::text, jsonb_build_object('is_active', _is_active)
    );
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_master_data(uuid, boolean) TO anon, authenticated, service_role;

-- 4. Atomic save_master_data_item RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.save_master_data_item(
  _category text,
  _code text,
  _label text,
  _label_bn text DEFAULT NULL,
  _parent_code text DEFAULT NULL,
  _sort_order int DEFAULT 0,
  _is_active boolean DEFAULT true
)
RETURNS public.master_data
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  _row public.master_data%ROWTYPE;
BEGIN
  INSERT INTO public.master_data (
    category, code, label, label_bn, parent_code, sort_order, is_active
  ) VALUES (
    _category, _code, _label, _label_bn, _parent_code, _sort_order, _is_active
  )
  ON CONFLICT (category, code) DO UPDATE SET
    label = EXCLUDED.label,
    label_bn = EXCLUDED.label_bn,
    parent_code = EXCLUDED.parent_code,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING * INTO _row;

  INSERT INTO public.activity_logs (
    actor_user_id, action_type, target_table, target_id, metadata
  ) VALUES (
    auth.uid(), 'master_data.save', 'master_data', _category || ':' || _code,
    jsonb_build_object('label', _label, 'is_active', _is_active)
  );

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_master_data_item(text, text, text, text, text, int, boolean) TO anon, authenticated, service_role;

-- 5. Ensure master_data policies allow authenticated office users to update
DROP POLICY IF EXISTS "master_data_super_admin_write" ON public.master_data;
DROP POLICY IF EXISTS "master_data_admin_write" ON public.master_data;

CREATE POLICY "master_data_admin_write" ON public.master_data
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_data TO anon, authenticated, service_role;
