GRANT USAGE ON SCHEMA app_private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION app_private.tg_warish_defaults() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.tg_dependent_defaults() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.tg_birth_defaults() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.tg_death_defaults() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.next_cert_number(cert_kind) TO authenticated;