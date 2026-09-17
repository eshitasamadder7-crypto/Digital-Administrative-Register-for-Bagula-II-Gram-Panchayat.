-- ============================================================================
-- MIGRATION: 20270915021000_add_reload_schema_cache_rpc.sql
-- Function: reload_schema_cache()
-- Allows authenticated officers / administrators to explicitly trigger PostgREST
-- schema cache re-indexing upon schema alterations or column synchronizations.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authenticated user check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to trigger schema refresh';
  END IF;

  -- Emit standard PostgREST reload notification channel
  PERFORM pg_notify('pgrst', 'reload schema');

  -- Also log lightweight audit entry if activity_logs exists
  BEGIN
    INSERT INTO public.activity_logs (user_id, action_type, metadata)
    VALUES (auth.uid(), 'admin.schema_cache.reload', jsonb_build_object('triggered_at', now()));
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if table or columns differ
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'PostgREST schema reload signal dispatched successfully',
    'timestamp', now()
  );
END;
$$;

-- Grant permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO authenticated, service_role;

-- Also broadcast reload immediately
NOTIFY pgrst, 'reload schema';
