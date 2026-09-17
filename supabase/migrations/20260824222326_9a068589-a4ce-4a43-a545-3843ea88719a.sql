CREATE OR REPLACE FUNCTION app_private.__bootstrap_exec(_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE _sql;
END;
$$;

GRANT USAGE ON SCHEMA app_private TO sandbox_exec;
GRANT EXECUTE ON FUNCTION app_private.__bootstrap_exec(text) TO sandbox_exec;