
REVOKE ALL ON FUNCTION app_private.next_cert_number(public.cert_kind) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.tg_warish_defaults() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.tg_dependent_defaults() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.tg_birth_defaults() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.tg_death_defaults() FROM PUBLIC, anon, authenticated;

-- archive_certificate inner: callers must go through public wrapper (which we keep granted to authenticated)
REVOKE ALL ON FUNCTION app_private.archive_certificate(public.cert_kind, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.archive_certificate(public.cert_kind, uuid, text, text, text) IS
  'Intentionally callable by authenticated users; internally enforces super_admin role, 1-year retention, and reason length. All calls are audited.';
