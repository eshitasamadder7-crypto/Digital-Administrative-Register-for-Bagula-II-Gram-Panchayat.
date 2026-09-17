
-- Rotate any residual passwords for the two legacy bootstrap admin emails to
-- random, unusable values. Login for these accounts (if they still exist) is
-- via Google OAuth; email/password sign-in is disabled at the auth-config level.
DO $$
DECLARE
  v_email text;
BEGIN
  FOREACH v_email IN ARRAY ARRAY['admin@bagulagp.in', 'nitishbiswas@zohomail.in']
  LOOP
    UPDATE auth.users
    SET encrypted_password = crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
        updated_at = now()
    WHERE lower(email) = v_email;
  END LOOP;
END $$;
