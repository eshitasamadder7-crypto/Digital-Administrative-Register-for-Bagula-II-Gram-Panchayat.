
-- 1. Dependent certificate records
CREATE TABLE IF NOT EXISTS public.dependent_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no text NOT NULL,
  cert_date date NOT NULL,
  applicant_name text NOT NULL,
  village text,
  department text,
  data jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependent_certificates TO authenticated;
GRANT ALL ON public.dependent_certificates TO service_role;

ALTER TABLE public.dependent_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated insert dependent" ON public.dependent_certificates;
CREATE POLICY "authenticated insert dependent"
  ON public.dependent_certificates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "admins read dependent" ON public.dependent_certificates;
CREATE POLICY "admins read dependent"
  ON public.dependent_certificates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins update dependent" ON public.dependent_certificates;
CREATE POLICY "admins update dependent"
  ON public.dependent_certificates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins delete dependent" ON public.dependent_certificates;
CREATE POLICY "admins delete dependent"
  ON public.dependent_certificates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS set_dependent_updated_at ON public.dependent_certificates;
CREATE TRIGGER set_dependent_updated_at
BEFORE UPDATE ON public.dependent_certificates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. Repair admin auto-grant trigger
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
