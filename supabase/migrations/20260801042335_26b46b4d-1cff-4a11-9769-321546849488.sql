-- 1) Prevent self privilege escalation on admin_profiles
CREATE OR REPLACE FUNCTION public.tg_admin_profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.user_id
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.status       := OLD.status;
    NEW.system_role  := OLD.system_role;
    NEW.designation  := OLD.designation;
    NEW.office_id    := OLD.office_id;
    NEW.email        := OLD.email;
    NEW.archived_at  := OLD.archived_at;
    NEW.created_by   := OLD.created_by;
    NEW.user_id      := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_admin_profiles_guard_self_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS admin_profiles_guard_self_update ON public.admin_profiles;
CREATE TRIGGER admin_profiles_guard_self_update
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_admin_profiles_guard_self_update();

-- 2) Tighten EXECUTE privileges on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.public_verify(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_verify_advanced(text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_verify(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text, date, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_verification_id(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_expired_rejections() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_admin_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_certificate(cert_kind, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_verification_id(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_expired_rejections() TO service_role;