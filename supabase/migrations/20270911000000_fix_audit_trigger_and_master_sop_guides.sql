-- ============================================================================
-- MIGRATION: 20270911000000_fix_audit_trigger_and_master_sop_guides.sql
-- 1. Fix log_audit_event() to eliminate "column id does not exist" and record ? operator error
-- 2. Create authoritative public.master_service_guides for SOPs, Workflows & YouTube links
-- ============================================================================

-- 1. Resilient log_audit_event()
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_user_role VARCHAR;
    audit_reason TEXT;
    app_id UUID;
    v_record_json JSONB;
    v_record_id UUID;
    v_before JSONB := NULL;
    v_after JSONB := NULL;
BEGIN
    current_user_id := auth.uid();

    BEGIN
        audit_reason := current_setting('audit.reason', true);
    EXCEPTION WHEN OTHERS THEN
        audit_reason := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        v_record_json := to_jsonb(OLD);
        v_before := v_record_json;
    ELSE
        v_record_json := to_jsonb(NEW);
        v_after := v_record_json;
        IF TG_OP = 'UPDATE' THEN
            v_before := to_jsonb(OLD);
        END IF;
    END IF;

    -- Safely extract record_id from JSON without column id existence assumptions
    IF v_record_json ? 'id' AND (v_record_json->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_record_id := (v_record_json->>'id')::uuid;
    ELSIF v_record_json ? 'user_id' AND (v_record_json->>'user_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_record_id := (v_record_json->>'user_id')::uuid;
    ELSIF v_record_json ? 'application_id' AND (v_record_json->>'application_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_record_id := (v_record_json->>'application_id')::uuid;
    ELSE
        v_record_id := gen_random_uuid();
    END IF;

    -- Safely extract application_id if present
    IF v_record_json ? 'application_id' AND (v_record_json->>'application_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        app_id := (v_record_json->>'application_id')::uuid;
    ELSIF TG_TABLE_NAME IN ('warish_certificates', 'dependent_certificates') THEN
        app_id := v_record_id;
    ELSE
        app_id := NULL;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.system_audit_logs(
            table_name, record_id, action_type, before_state, after_state, user_id, reason, application_id
        ) VALUES (
            TG_TABLE_NAME, v_record_id, 'INSERT', NULL, v_after, current_user_id, audit_reason, app_id
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.system_audit_logs(
            table_name, record_id, action_type, before_state, after_state, user_id, reason, application_id
        ) VALUES (
            TG_TABLE_NAME, v_record_id, 'UPDATE', v_before, v_after, current_user_id, audit_reason, app_id
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.system_audit_logs(
            table_name, record_id, action_type, before_state, after_state, user_id, reason, application_id
        ) VALUES (
            TG_TABLE_NAME, v_record_id, 'DELETE', v_before, NULL, current_user_id, audit_reason, app_id
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create public.master_service_guides Table for SOPs, Workflows & YouTube Video Links
CREATE TABLE IF NOT EXISTS public.master_service_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    bengali_title TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    portal_name TEXT NOT NULL,
    portal_url TEXT NOT NULL,
    official_dept TEXT NOT NULL,
    description TEXT NOT NULL,
    bengali_description TEXT,
    regulatory_info TEXT,
    turnaround_time TEXT NOT NULL DEFAULT '7-15 working days',
    validity TEXT,
    fee_info TEXT,
    workflow JSONB NOT NULL DEFAULT '[]'::jsonb,
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    download_form_url TEXT,
    download_form_label TEXT,
    video_guide JSONB NOT NULL DEFAULT '{}'::jsonb,
    local_office_notice TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.master_service_guides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "master_service_guides_read_all" ON public.master_service_guides;
  CREATE POLICY "master_service_guides_read_all" ON public.master_service_guides
    FOR SELECT TO anon, authenticated USING (true);

  DROP POLICY IF EXISTS "master_service_guides_admin_write" ON public.master_service_guides;
  CREATE POLICY "master_service_guides_admin_write" ON public.master_service_guides
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON public.master_service_guides TO anon, authenticated;
GRANT ALL ON public.master_service_guides TO authenticated, service_role;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS master_service_guides_updated_at ON public.master_service_guides;
CREATE TRIGGER master_service_guides_updated_at
  BEFORE UPDATE ON public.master_service_guides
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RPC Function for Super Admin / Admin to update or upsert SOP & Video Workflow
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
        title,
        bengali_title,
        category,
        portal_name,
        portal_url,
        official_dept,
        description,
        bengali_description,
        regulatory_info,
        turnaround_time,
        validity,
        fee_info,
        workflow,
        documents,
        download_form_url,
        download_form_label,
        video_guide,
        local_office_notice,
        is_active,
        updated_at
    ) VALUES (
        _service_id,
        COALESCE(_payload->>'title', _service_id),
        _payload->>'bengali_title',
        COALESCE(_payload->>'category', 'General'),
        COALESCE(_payload->>'portal_name', 'Bagula II Gram Panchayat Portal'),
        COALESCE(_payload->>'portal_url', '#'),
        COALESCE(_payload->>'official_dept', 'Bagula II Gram Panchayat'),
        COALESCE(_payload->>'description', ''),
        _payload->>'bengali_description',
        _payload->>'regulatory_info',
        COALESCE(_payload->>'turnaround_time', '7-15 working days'),
        _payload->>'validity',
        _payload->>'fee_info',
        COALESCE(_payload->'workflow', '[]'::jsonb),
        COALESCE(_payload->'documents', '[]'::jsonb),
        _payload->>'download_form_url',
        _payload->>'download_form_label',
        COALESCE(_payload->'video_guide', '{}'::jsonb),
        _payload->>'local_office_notice',
        COALESCE((_payload->>'is_active')::boolean, true),
        NOW()
    )
    ON CONFLICT (service_id) DO UPDATE SET
        title = EXCLUDED.title,
        bengali_title = EXCLUDED.bengali_title,
        category = EXCLUDED.category,
        portal_name = EXCLUDED.portal_name,
        portal_url = EXCLUDED.portal_url,
        official_dept = EXCLUDED.official_dept,
        description = EXCLUDED.description,
        bengali_description = EXCLUDED.bengali_description,
        regulatory_info = EXCLUDED.regulatory_info,
        turnaround_time = EXCLUDED.turnaround_time,
        validity = EXCLUDED.validity,
        fee_info = EXCLUDED.fee_info,
        workflow = EXCLUDED.workflow,
        documents = EXCLUDED.documents,
        download_form_url = EXCLUDED.download_form_url,
        download_form_label = EXCLUDED.download_form_label,
        video_guide = EXCLUDED.video_guide,
        local_office_notice = EXCLUDED.local_office_notice,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING * INTO _row;

    -- Audit log
    INSERT INTO public.activity_logs (
        actor_user_id, actor_email, action_type, target_table, target_id, metadata
    ) VALUES (
        _uid, (SELECT email FROM auth.users WHERE id = _uid),
        'master_service_guide.update', 'master_service_guides', _service_id,
        jsonb_build_object('service_id', _service_id, 'title', _row.title)
    );

    RETURN to_jsonb(_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_master_service_guide(TEXT, JSONB) TO authenticated;
