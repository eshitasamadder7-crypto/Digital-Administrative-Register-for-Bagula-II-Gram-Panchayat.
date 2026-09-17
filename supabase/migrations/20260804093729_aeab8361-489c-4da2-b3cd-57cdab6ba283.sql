-- Least-privilege EXECUTE grants on SECURITY DEFINER functions

-- Unused helper: no client should call it
REVOKE ALL ON FUNCTION public.citizen_profile_is_complete(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.citizen_profile_is_complete(uuid) TO service_role;

-- Trigger + maintenance routines: never directly callable
REVOKE ALL ON FUNCTION public.tg_admin_profiles_guard_self_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_citizen_profiles_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_expired_rejections() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_verification_id(text, integer) FROM PUBLIC, anon;

-- No anonymous access to any privileged routine
REVOKE ALL ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_certificate(cert_kind, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_admin_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_office_activity(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_citizen_activity(text, text, text, jsonb) FROM PUBLIC, anon;

-- Intentionally public, rate-limited verification lookups
REVOKE ALL ON FUNCTION public.public_verify(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_verify_advanced(text, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_verify(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text, date, text, text) TO anon, authenticated, service_role;