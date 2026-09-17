DO $$ BEGIN CREATE TYPE public.whats_new_expiry_mode AS ENUM ('never','date','datetime','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.whats_new_entries
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_mode public.whats_new_expiry_mode NOT NULL DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DROP FUNCTION IF EXISTS public.approve_certificate_v2(public.cert_kind, uuid, int, text, date, date);
CREATE OR REPLACE FUNCTION public.approve_certificate_v2(_kind public.cert_kind, _cert_id uuid, _memo_serial int, _memo_year int, _issue_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'approve_certificate_v2 not yet implemented'; END; $$;
GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(public.cert_kind, uuid, int, int, date) TO authenticated;