CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER FUNCTION app_private.__bootstrap_exec(text) SET search_path = public, extensions;