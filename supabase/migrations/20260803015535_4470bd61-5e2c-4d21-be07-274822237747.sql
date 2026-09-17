-- 1. Remove client-side insert policies on log tables
DROP POLICY IF EXISTS activity_logs_self_insert ON public.activity_logs;
DROP POLICY IF EXISTS cert_audit_self_insert ON public.certificate_audit_logs;
DROP POLICY IF EXISTS citizen_activity_self_insert ON public.citizen_activity_logs;

REVOKE INSERT ON public.activity_logs FROM authenticated, anon;
REVOKE INSERT ON public.certificate_audit_logs FROM authenticated, anon;
REVOKE INSERT ON public.citizen_activity_logs FROM authenticated, anon;

-- 2. Trusted server-side logging RPCs
CREATE OR REPLACE FUNCTION public.log_office_activity(
  _action_type text,
  _target_table text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (has_role(_uid,'deo') OR has_role(_uid,'admin') OR has_role(_uid,'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _action_type IS NULL OR _action_type !~ '^[a-z0-9_.:-]{3,64}$' THEN
    RAISE EXCEPTION 'Invalid action type';
  END IF;
  IF _target_table IS NOT NULL AND _target_table !~ '^[a-z0-9_]{1,63}$' THEN
    RAISE EXCEPTION 'Invalid target table';
  END IF;
  INSERT INTO public.activity_logs (actor_user_id, actor_email, action_type, target_table, target_id, metadata)
  VALUES (_uid, (SELECT email FROM auth.users WHERE id = _uid), _action_type, _target_table,
          left(coalesce(_target_id,''), 128), coalesce(_metadata,'{}'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.log_citizen_activity(
  _action_type text,
  _target_table text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _cid text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _action_type IS NULL OR _action_type !~ '^[a-z0-9_.:-]{3,64}$' THEN
    RAISE EXCEPTION 'Invalid action type';
  END IF;
  IF _target_table IS NOT NULL AND _target_table !~ '^[a-z0-9_]{1,63}$' THEN
    RAISE EXCEPTION 'Invalid target table';
  END IF;
  SELECT citizen_id INTO _cid FROM public.citizen_profiles WHERE user_id = _uid;
  INSERT INTO public.citizen_activity_logs (user_id, citizen_id, action_type, target_table, target_id, metadata)
  VALUES (_uid, _cid, _action_type, _target_table, left(coalesce(_target_id,''), 128), coalesce(_metadata,'{}'::jsonb));
END; $$;

REVOKE ALL ON FUNCTION public.log_office_activity(text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_citizen_activity(text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_office_activity(text,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_citizen_activity(text,text,text,jsonb) TO authenticated;

-- 3. Trigger-only internal functions must not be callable via the API
REVOKE ALL ON FUNCTION public.tg_citizen_profiles_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_admin_profiles_guard_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_verification_id(text,int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_expired_rejections() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_citizen_id() FROM PUBLIC, anon, authenticated;
