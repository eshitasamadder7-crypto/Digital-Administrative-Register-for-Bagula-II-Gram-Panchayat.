CREATE OR REPLACE FUNCTION app_private.return_certificate(_kind text, _cert_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app_private AS $$
DECLARE uid uuid := auth.uid(); email text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Must be Admin or Super Admin to Return, or maybe we just check if it's Admin (Super Admin might just be read-only oversight)
  IF NOT (public.has_role(uid,'admin') OR public.has_role(uid,'super_admin')) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- The original logic remains the same (returns are an Admin action).
  SELECT u.email INTO email FROM auth.users u WHERE u.id = uid;
  IF lower(_kind) = 'warish' THEN
    UPDATE public.warish_certificates
    SET status='Returned', rejection_reason=_reason, return_count = COALESCE(return_count,0) + 1
    WHERE id = _cert_id;
  ELSIF lower(_kind) = 'dependent' THEN
    UPDATE public.dependent_certificates
    SET status='Returned', rejection_reason=_reason, return_count = COALESCE(return_count,0) + 1
    WHERE id = _cert_id;
  ELSE
    RAISE EXCEPTION 'unknown kind %', _kind;
  END IF;
END;
$$;
