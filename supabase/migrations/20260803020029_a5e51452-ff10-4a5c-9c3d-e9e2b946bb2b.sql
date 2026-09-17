ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS allowed_login_method text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_profiles_allowed_login_method_check'
  ) THEN
    ALTER TABLE public.admin_profiles
      ADD CONSTRAINT admin_profiles_allowed_login_method_check
      CHECK (allowed_login_method IN ('google','password','both'));
  END IF;
END $$;

-- Keep the self-update guard in sync: officers may not change these fields themselves.
CREATE OR REPLACE FUNCTION public.tg_admin_profiles_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = NEW.user_id
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.status       := OLD.status;
    NEW.system_role  := OLD.system_role;
    NEW.designation  := OLD.designation;
    NEW.office_id    := OLD.office_id;
    NEW.email        := OLD.email;
    NEW.archived_at  := OLD.archived_at;
    NEW.created_by   := OLD.created_by;
    NEW.user_id      := OLD.user_id;
    NEW.allowed_login_method := OLD.allowed_login_method;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.tg_admin_profiles_guard_self_update() FROM PUBLIC, anon, authenticated;