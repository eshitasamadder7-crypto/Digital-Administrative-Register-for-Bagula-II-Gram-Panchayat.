
-- Fix EXECUTE permissions on v2 / lifecycle RPCs
-- Root cause: public.* wrappers are plain SQL (invoker rights) and call
-- app_private.* SECURITY DEFINER functions, but `authenticated` had no
-- EXECUTE on the inner functions, so calls failed with permission denied.

-- Tighten default PUBLIC grants and re-grant explicitly per role.

-- app_private inner functions
REVOKE EXECUTE ON FUNCTION app_private.approve_certificate_v2(text, uuid, integer, integer, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.reject_certificate_v2(text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.restore_certificate(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.permanently_delete_rejected(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.archive_expired_rejections() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app_private.public_verify_advanced(text, date, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app_private.approve_certificate_v2(text, uuid, integer, integer, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.reject_certificate_v2(text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.restore_certificate(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.permanently_delete_rejected(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.archive_expired_rejections() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.public_verify_advanced(text, date, text, text) TO anon, authenticated, service_role;

-- public wrappers: tighten anon exposure on admin functions
REVOKE EXECUTE ON FUNCTION public.approve_certificate_v2(text, uuid, integer, integer, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_certificate_v2(text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.restore_certificate(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.permanently_delete_rejected(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.archive_expired_rejections() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(text, uuid, integer, integer, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_certificate_v2(text, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_certificate(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.permanently_delete_rejected(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_expired_rejections() TO authenticated, service_role;

-- public_verify_advanced remains open to anon (public verification endpoint)
GRANT EXECUTE ON FUNCTION public.public_verify_advanced(text, date, text, text) TO anon, authenticated, service_role;
