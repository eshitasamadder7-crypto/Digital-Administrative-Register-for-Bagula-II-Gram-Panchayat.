-- Cleanup function for expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- We delete auth users who have must_change_password = true AND were created > 3 hours ago.
  -- Deleting the user triggers cascade deletion of admin_profiles and user_roles.
  DELETE FROM auth.users
  WHERE id IN (
    SELECT user_id FROM public.admin_profiles
    WHERE must_change_password = true
      AND created_at < now() - interval '3 hours'
  );
END;
$$;
