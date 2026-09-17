-- ============================================================================
-- MIGRATION: 20270911000002_enhance_master_service_guides_schema.sql
-- 1. Create master_service_categories table
-- 2. Add slug, category_id, display_order, eligibility, purposes, faqs, destination_type to master_service_guides
-- 3. Update save_master_service_guide() RPC function
-- 4. Seed categories and enrich service guides
-- ============================================================================

-- 1. Master Service Categories Table
CREATE TABLE IF NOT EXISTS public.master_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_bn TEXT,
    icon TEXT,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.master_service_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "master_service_categories_read_all" ON public.master_service_categories;
  CREATE POLICY "master_service_categories_read_all" ON public.master_service_categories
    FOR SELECT TO anon, authenticated USING (true);

  DROP POLICY IF EXISTS "master_service_categories_admin_write" ON public.master_service_categories;
  CREATE POLICY "master_service_categories_admin_write" ON public.master_service_categories
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.master_service_categories TO anon, authenticated;
GRANT ALL ON public.master_service_categories TO authenticated, service_role;

-- 2. Enhance master_service_guides Table
ALTER TABLE public.master_service_guides
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS eligibility JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS purposes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS destination_type TEXT NOT NULL DEFAULT 'EXTERNAL_URL',
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- Add safe constraint for destination_type if not existing
DO $$ BEGIN
  ALTER TABLE public.master_service_guides
    ADD CONSTRAINT chk_destination_type 
    CHECK (destination_type IN ('INTERNAL_ROUTE', 'EXTERNAL_URL', 'DOCUMENT', 'NO_REDIRECT'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Populate slug with service_id if empty
UPDATE public.master_service_guides
SET slug = service_id
WHERE slug IS NULL OR slug = '';

-- Ensure unique constraint on slug
DO $$ BEGIN
  ALTER TABLE public.master_service_guides ADD CONSTRAINT uq_master_service_guides_slug UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Update save_master_service_guide RPC
CREATE OR REPLACE FUNCTION public.save_master_service_guide(
    _service_id TEXT,
    _payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _uid UUID := auth.uid();
    _row public.master_service_guides%ROWTYPE;
BEGIN
    IF _uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'super_admin')) THEN
        RAISE EXCEPTION 'Unauthorized: Only Admins can modify Master SOPs & Workflows';
    END IF;

    INSERT INTO public.master_service_guides (
        service_id,
        slug,
        title,
        bengali_title,
        category,
        category_id,
        display_order,
        portal_name,
        portal_url,
        destination_type,
        official_dept,
        description,
        bengali_description,
        regulatory_info,
        turnaround_time,
        validity,
        fee_info,
        eligibility,
        purposes,
        workflow,
        documents,
        faqs,
        download_form_url,
        download_form_label,
        video_guide,
        local_office_notice,
        is_active,
        version,
        updated_at
    ) VALUES (
        _service_id,
        COALESCE(_payload->>'slug', _service_id),
        COALESCE(_payload->>'title', _service_id),
        _payload->>'bengali_title',
        COALESCE(_payload->>'category', 'General'),
        _payload->>'category_id',
        COALESCE((_payload->>'display_order')::int, 0),
        COALESCE(_payload->>'portal_name', 'Bagula II Gram Panchayat Portal'),
        COALESCE(_payload->>'portal_url', '#'),
        COALESCE(_payload->>'destination_type', 'EXTERNAL_URL'),
        COALESCE(_payload->>'official_dept', 'Bagula II Gram Panchayat'),
        COALESCE(_payload->>'description', ''),
        _payload->>'bengali_description',
        _payload->>'regulatory_info',
        COALESCE(_payload->>'turnaround_time', '7-15 working days'),
        _payload->>'validity',
        _payload->>'fee_info',
        COALESCE(_payload->'eligibility', '[]'::jsonb),
        COALESCE(_payload->'purposes', '[]'::jsonb),
        COALESCE(_payload->'workflow', '[]'::jsonb),
        COALESCE(_payload->'documents', '[]'::jsonb),
        COALESCE(_payload->'faqs', '[]'::jsonb),
        _payload->>'download_form_url',
        _payload->>'download_form_label',
        COALESCE(_payload->'video_guide', '{}'::jsonb),
        _payload->>'local_office_notice',
        COALESCE((_payload->>'is_active')::boolean, true),
        COALESCE((_payload->>'version')::int, 1) + 1,
        NOW()
    )
    ON CONFLICT (service_id) DO UPDATE SET
        slug = COALESCE(EXCLUDED.slug, public.master_service_guides.slug),
        title = EXCLUDED.title,
        bengali_title = EXCLUDED.bengali_title,
        category = EXCLUDED.category,
        category_id = EXCLUDED.category_id,
        display_order = EXCLUDED.display_order,
        portal_name = EXCLUDED.portal_name,
        portal_url = EXCLUDED.portal_url,
        destination_type = EXCLUDED.destination_type,
        official_dept = EXCLUDED.official_dept,
        description = EXCLUDED.description,
        bengali_description = EXCLUDED.bengali_description,
        regulatory_info = EXCLUDED.regulatory_info,
        turnaround_time = EXCLUDED.turnaround_time,
        validity = EXCLUDED.validity,
        fee_info = EXCLUDED.fee_info,
        eligibility = EXCLUDED.eligibility,
        purposes = EXCLUDED.purposes,
        workflow = EXCLUDED.workflow,
        documents = EXCLUDED.documents,
        faqs = EXCLUDED.faqs,
        download_form_url = EXCLUDED.download_form_url,
        download_form_label = EXCLUDED.download_form_label,
        video_guide = EXCLUDED.video_guide,
        local_office_notice = EXCLUDED.local_office_notice,
        is_active = EXCLUDED.is_active,
        version = public.master_service_guides.version + 1,
        updated_at = NOW()
    RETURNING * INTO _row;

    -- Activity log
    INSERT INTO public.activity_logs (
        actor_user_id, actor_email, action_type, target_table, target_id, metadata
    ) VALUES (
        _uid, (SELECT email FROM auth.users WHERE id = _uid),
        'master_service_guide.update', 'master_service_guides', _service_id,
        jsonb_build_object('service_id', _service_id, 'title', _row.title, 'version', _row.version)
    );

    RETURN to_jsonb(_row);
END;
$$;

-- 4. Seed Master Service Categories
INSERT INTO public.master_service_categories (id, name, name_bn, icon, description, display_order)
VALUES
  ('direct-panchayat', 'Direct Panchayat Certificates', 'পঞ্চায়েত নিজস্ব সার্টিফিকেট', '📜', 'Legal succession (Warish) & family dependency certificates issued directly by Bagula II GP', 1),
  ('revenue', 'Revenue Services', 'রাজস্ব ও কর পরিষেবা', '💳', 'Panchayat & Rural Development (PRD) rural property tax payment & verification', 2),
  ('birth-death', 'Birth & Death', 'জন্ম ও মৃত্যু পরিষেবা', '👶', 'Civil registration under Section 12/17 RBD Act 1969 & Janma-Mrityu Tathya state portal', 3),
  ('employment', 'Employment', 'কর্মসংস্থান (১০০ দিনের কাজ)', '👷', 'Mahatma Gandhi National Rural Employment Guarantee Scheme (MGNREGA) facilitation', 4),
  ('wbpms', 'WBPMS Certificates', 'ডব্লিউবিপিএমএস শংসাপত্র', '📑', 'West Bengal Public Management System portal certificates with decentralized GP attestation', 5),
  ('elected-reps', 'Elected Representatives', 'নির্বাচিত জনপ্রতিনিধি ডিরেক্টরি', '🏛️', '30 Gram Sansad Ward Members, Polling Booths, and Bagula II Panchayat Executive Committee', 6)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
