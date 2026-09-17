
-- Notice Maker: additive columns for expiry & pin
ALTER TABLE public.whats_new_entries
  ADD COLUMN IF NOT EXISTS expiry_mode text NOT NULL DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.whats_new_entries
  DROP CONSTRAINT IF EXISTS whats_new_entries_expiry_mode_check;
ALTER TABLE public.whats_new_entries
  ADD CONSTRAINT whats_new_entries_expiry_mode_check
  CHECK (expiry_mode IN ('never','date','datetime','manual'));

CREATE INDEX IF NOT EXISTS whats_new_entries_pinned_idx
  ON public.whats_new_entries (is_pinned DESC, posted_on DESC);

-- Admin Management: archive-instead-of-delete
ALTER TABLE public.admin_profiles
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS admin_profiles_archived_idx
  ON public.admin_profiles (archived_at);
