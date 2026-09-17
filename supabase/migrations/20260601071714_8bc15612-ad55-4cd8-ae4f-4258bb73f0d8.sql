
-- Grant admin to existing operator accounts
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('bagula2nogp111@gmail.com', 'nitush6488@gmail.com')
ON CONFLICT DO NOTHING;

-- Update trigger to also auto-grant for these emails on future signups
CREATE OR REPLACE FUNCTION public.tg_grant_admin_to_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) IN (
    'admin@bagulagp.in',
    'nitishbiswas@zohomail.in',
    'bagula2nogp111@gmail.com',
    'nitush6488@gmail.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
