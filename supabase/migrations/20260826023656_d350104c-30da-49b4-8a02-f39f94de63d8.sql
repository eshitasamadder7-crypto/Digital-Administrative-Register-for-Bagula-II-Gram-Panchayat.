ALTER TABLE public.warish_certificates ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.dependent_certificates ADD COLUMN IF NOT EXISTS rejection_reason text;