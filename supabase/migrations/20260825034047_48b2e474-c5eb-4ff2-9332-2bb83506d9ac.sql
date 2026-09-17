REVOKE ALL ON FUNCTION app_private.__bootstrap_exec(text) FROM PUBLIC;
DROP FUNCTION IF EXISTS app_private.__bootstrap_exec(text);
REVOKE USAGE ON SCHEMA app_private FROM sandbox_exec;