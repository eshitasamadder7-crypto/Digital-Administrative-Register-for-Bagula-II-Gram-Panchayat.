-- Auto-grant admin role to a designated owner email on signup
CREATE OR REPLACE FUNCTION public.tg_grant_admin_to_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin@bagulagp.in' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_admin_to_owner ON auth.users;
CREATE TRIGGER grant_admin_to_owner
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_grant_admin_to_owner();

-- Prevent duplicate memo + cert_date on warish_certificates
CREATE UNIQUE INDEX IF NOT EXISTS uq_warish_memo_per_date
ON public.warish_certificates (memo_no, cert_date);