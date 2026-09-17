
CREATE OR REPLACE FUNCTION public.tg_grant_admin_to_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(NEW.email) IN ('bagula2nogp111@gmail.com','nitush6488@gmail.com','nitishbiswas@zohomail.in') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS grant_admin_to_owner_on_insert ON auth.users;
CREATE TRIGGER grant_admin_to_owner_on_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_grant_admin_to_owner();

DROP TRIGGER IF EXISTS grant_admin_to_owner_on_update ON auth.users;
CREATE TRIGGER grant_admin_to_owner_on_update
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_grant_admin_to_owner();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) IN ('bagula2nogp111@gmail.com','nitush6488@gmail.com','nitishbiswas@zohomail.in')
ON CONFLICT DO NOTHING;
