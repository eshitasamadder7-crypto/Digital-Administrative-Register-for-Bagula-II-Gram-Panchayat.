-- Table to persist generated Warish certificates (PII-sanitized)
CREATE TABLE public.warish_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no text NOT NULL,
  cert_date date NOT NULL,
  deceased_name text NOT NULL,
  applicant_name text NOT NULL,
  village text,
  data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warish_certificates ENABLE ROW LEVEL SECURITY;

-- Admins can read all
CREATE POLICY "admins read warish"
ON public.warish_certificates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Any authenticated user can insert (must set created_by = themselves)
CREATE POLICY "authenticated insert warish"
ON public.warish_certificates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Admins update/delete
CREATE POLICY "admins update warish"
ON public.warish_certificates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete warish"
ON public.warish_certificates FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER set_updated_at_warish
BEFORE UPDATE ON public.warish_certificates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_warish_created_at ON public.warish_certificates (created_at DESC);