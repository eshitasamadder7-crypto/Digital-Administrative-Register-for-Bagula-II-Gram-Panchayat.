-- Migration: 20270917010000_create_notices_backend.sql
-- Description: Create notices table, indexes, RLS policies, RPC functions, and initial seed notices for Bagula II Gram Panchayat

CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_no text,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  effective_date date NOT NULL DEFAULT current_date,
  expiry_date timestamptz,
  is_pinned boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'normal',
  target_audience text NOT NULL DEFAULT 'all',
  attachment_url text,
  attachment_name text,
  attachment_size_bytes bigint,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text DEFAULT 'Gram Panchayat Office',
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notices_category_check CHECK (category IN ('general', 'birth_death', 'tenders', 'meetings', 'schemes', 'tax', 'emergency')),
  CONSTRAINT notices_priority_check CHECK (priority IN ('urgent', 'high', 'normal', 'low'))
);

-- Index for speedy retrieval of active public notices
CREATE INDEX IF NOT EXISTS idx_notices_active_feed
  ON public.notices (is_published, is_pinned DESC, published_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notices_category
  ON public.notices (category);

-- Row Level Security
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.notices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;

-- Public can read published, non-archived, non-expired notices
DROP POLICY IF EXISTS notices_public_read ON public.notices;
CREATE POLICY notices_public_read ON public.notices
  FOR SELECT TO anon, authenticated
  USING (
    is_published = true
    AND archived_at IS NULL
    AND (expiry_date IS NULL OR expiry_date > now())
  );

-- Admins and designated super admins can view all notices including drafts and archives
DROP POLICY IF EXISTS notices_admin_read ON public.notices;
CREATE POLICY notices_admin_read ON public.notices
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
  );

-- Admins and designated super admins can insert notices
DROP POLICY IF EXISTS notices_admin_insert ON public.notices;
CREATE POLICY notices_admin_insert ON public.notices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
  );

-- Admins and designated super admins can update notices
DROP POLICY IF EXISTS notices_admin_update ON public.notices;
CREATE POLICY notices_admin_update ON public.notices
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
  );

-- Admins and designated super admins can delete notices
DROP POLICY IF EXISTS notices_admin_delete ON public.notices;
CREATE POLICY notices_admin_delete ON public.notices
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
  );

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS tr_notices_updated_at ON public.notices;
CREATE TRIGGER tr_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_updated_at();

-- RPC: Get active public notices safely with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_active_notices(p_category text DEFAULT NULL)
RETURNS SETOF public.notices
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.notices
  WHERE is_published = true
    AND archived_at IS NULL
    AND (expiry_date IS NULL OR expiry_date > now())
    AND (p_category IS NULL OR category = p_category)
  ORDER BY
    is_pinned DESC,
    CASE priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      ELSE 4
    END,
    published_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_notices(text) TO anon, authenticated, service_role;

-- RPC: Save or update notice
CREATE OR REPLACE FUNCTION public.save_notice(
  p_id uuid DEFAULT NULL,
  p_title text DEFAULT '',
  p_notice_no text DEFAULT NULL,
  p_category text DEFAULT 'general',
  p_content text DEFAULT '',
  p_is_pinned boolean DEFAULT false,
  p_is_published boolean DEFAULT true,
  p_priority text DEFAULT 'normal',
  p_attachment_url text DEFAULT NULL,
  p_attachment_name text DEFAULT NULL,
  p_expiry_date timestamptz DEFAULT NULL,
  p_target_audience text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _calling_user_id uuid;
  _calling_email text;
  _is_authorized boolean;
  _result_row public.notices;
BEGIN
  _calling_user_id := auth.uid();
  _calling_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  _is_authorized := (
    _calling_email IN ('bagula2nogp111@gmail.com', 'nitish374482@gmail.com')
    OR public.has_role(_calling_user_id, 'super_admin')
    OR public.has_role(_calling_user_id, 'admin')
  );

  IF NOT _is_authorized THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can manage notices.';
  END IF;

  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'Notice title cannot be empty.';
  END IF;

  IF trim(p_content) = '' THEN
    RAISE EXCEPTION 'Notice content cannot be empty.';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.notices
    SET
      title = trim(p_title),
      notice_no = trim(p_notice_no),
      category = p_category,
      content = trim(p_content),
      is_pinned = p_is_pinned,
      is_published = p_is_published,
      priority = p_priority,
      attachment_url = p_attachment_url,
      attachment_name = p_attachment_name,
      expiry_date = p_expiry_date,
      target_audience = p_target_audience,
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO _result_row;
  ELSE
    INSERT INTO public.notices (
      title,
      notice_no,
      category,
      content,
      is_pinned,
      is_published,
      priority,
      attachment_url,
      attachment_name,
      expiry_date,
      target_audience,
      created_by,
      created_by_name
    ) VALUES (
      trim(p_title),
      trim(p_notice_no),
      p_category,
      trim(p_content),
      p_is_pinned,
      p_is_published,
      p_priority,
      p_attachment_url,
      p_attachment_name,
      p_expiry_date,
      p_target_audience,
      _calling_user_id,
      coalesce(_calling_email, 'Admin')
    )
    RETURNING * INTO _result_row;
  END IF;

  RETURN to_jsonb(_result_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_notice(uuid, text, text, text, text, boolean, boolean, text, text, text, timestamptz, text) TO authenticated, service_role;

-- Seed initial official notices if table is currently empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.notices LIMIT 1) THEN
    INSERT INTO public.notices (
      notice_no,
      title,
      category,
      content,
      is_pinned,
      is_published,
      priority,
      target_audience,
      effective_date,
      published_at
    ) VALUES
    (
      'B-II/GP/BIRTH/2026/04',
      'Special Schedule for Birth & Death Certificate Digitalization at Bagula II GP Office',
      'birth_death',
      'Applications for offline legacy Birth & Death Certificate digitization will be received exclusively on the 1st Tuesday and 1st Wednesday of every month. Maximum processing quota is 100 applications per day (total 300 applications per monthly cycle). Citizens are advised to bring original hospital discharge certificates, immunization cards, child/parent Aadhaar, and parent EPIC (Voter ID) cards.',
      true,
      true,
      'urgent',
      'citizens',
      CURRENT_DATE,
      NOW() - INTERVAL '1 day'
    ),
    (
      'B-II/GP/GS/2026/18',
      'Annual Gram Sansad & Gram Sabha General Assembly Meeting 2026',
      'meetings',
      'All adult residents, booth representatives, and self-help group coordinators of Bagula II Gram Panchayat are cordially invited to attend the Annual Gram Sansad deliberations regarding village road repairs, drainage planning, drinking water tap connections under Jal Jeevan Mission, and MGNREGA annual labor budget approval.',
      true,
      true,
      'high',
      'all',
      CURRENT_DATE,
      NOW() - INTERVAL '3 days'
    ),
    (
      'B-II/GP/TAX/2026/22',
      'Panchayat Property & Holding Tax (PRD Tax) Assessment Camp',
      'tax',
      'Citizens can now clear their pending Panchayati Raj Property & Holding Taxes online via the PRD Tax gateway or directly at the Gram Panchayat revenue collection desk. Instant computerized QR-verifiable payment receipts are issued upon clearance.',
      false,
      true,
      'normal',
      'citizens',
      CURRENT_DATE,
      NOW() - INTERVAL '5 days'
    ),
    (
      'B-II/GP/TRADE/2026/31',
      'Commercial Trade License (Pro-Prampatra) Renewal & Fresh Registration Notice',
      'general',
      'All commercial shops, wholesale dealerships, and service centers operating within Bagula II Gram Panchayat limits are required to register or renew their trade licenses (Pro-Prampatra) through the West Bengal Panchayat Management System (WBPMS). Free assistance kiosk is active on all working days.',
      false,
      true,
      'normal',
      'business',
      CURRENT_DATE,
      NOW() - INTERVAL '7 days'
    ),
    (
      'B-II/GP/NREGA/2026/12',
      'MGNREGA 100 Days Work Social Audit & Aadhaar-Based Payment (ABPS) Drive',
      'schemes',
      'Special verification of MGNREGA Job Card holders and DBT bank account seeding is ongoing across all 30 election booths. Registered workers are requested to verify their bank details and active status with their respective ward representatives.',
      false,
      true,
      'normal',
      'farmers',
      CURRENT_DATE,
      NOW() - INTERVAL '10 days'
    );
  END IF;
END $$;
