-- 1. Master Data Layer
-- These tables provide strict referential integrity for the system.

CREATE TABLE IF NOT EXISTS public.master_villages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_post_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, pin_code)
);

CREATE TABLE IF NOT EXISTS public.master_wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_number VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relation_name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_rejection_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_notification_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(50) NOT NULL UNIQUE,
    template TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.master_appointment_document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID REFERENCES public.master_document_types(id) ON DELETE CASCADE,
    appointment_type VARCHAR(100) NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_type_id, appointment_type)
);

CREATE TABLE IF NOT EXISTS public.master_workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.business_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key VARCHAR(100) NOT NULL UNIQUE,
    rule_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed basic workflow states
INSERT INTO public.master_workflow_states (state_name, description) VALUES
    ('Draft', 'Initial application draft'),
    ('Submitted', 'Application submitted by citizen'),
    ('Under Review', 'Being reviewed by DEO/Admin'),
    ('Returned', 'Returned for corrections'),
    ('Resubmitted', 'Resubmitted after corrections'),
    ('Approved', 'Approved by authority'),
    ('Issued', 'Final certificate issued'),
    ('Archived', 'Archived record')
ON CONFLICT (state_name) DO NOTHING;


-- 2. Configuration & State Machine Layer

CREATE TABLE IF NOT EXISTS public.workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_state_id UUID REFERENCES public.master_workflow_states(id) ON DELETE CASCADE,
    to_state_id UUID REFERENCES public.master_workflow_states(id) ON DELETE CASCADE,
    role_required VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_state_id, to_state_id)
);

-- Seed basic workflow transitions
DO $$
DECLARE
    state_draft UUID;
    state_submitted UUID;
    state_under_review UUID;
    state_returned UUID;
    state_resubmitted UUID;
    state_approved UUID;
    state_issued UUID;
    state_archived UUID;
BEGIN
    SELECT id INTO state_draft FROM public.master_workflow_states WHERE state_name = 'Draft';
    SELECT id INTO state_submitted FROM public.master_workflow_states WHERE state_name = 'Submitted';
    SELECT id INTO state_under_review FROM public.master_workflow_states WHERE state_name = 'Under Review';
    SELECT id INTO state_returned FROM public.master_workflow_states WHERE state_name = 'Returned';
    SELECT id INTO state_resubmitted FROM public.master_workflow_states WHERE state_name = 'Resubmitted';
    SELECT id INTO state_approved FROM public.master_workflow_states WHERE state_name = 'Approved';
    SELECT id INTO state_issued FROM public.master_workflow_states WHERE state_name = 'Issued';
    SELECT id INTO state_archived FROM public.master_workflow_states WHERE state_name = 'Archived';

    -- Insert valid transitions
    INSERT INTO public.workflow_transitions (from_state_id, to_state_id, role_required) VALUES
        (state_draft, state_submitted, 'Citizen'),
        (state_submitted, state_under_review, 'DEO'),
        (state_under_review, state_returned, 'DEO'),
        (state_under_review, state_approved, 'Admin'),
        (state_returned, state_resubmitted, 'Citizen'),
        (state_resubmitted, state_under_review, 'DEO'),
        (state_approved, state_issued, 'Super Admin'),
        (state_issued, state_archived, 'System')
    ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
END $$;

-- Generic function to enforce state transitions on any table that uses state_id
CREATE OR REPLACE FUNCTION public.validate_workflow_transition()
RETURNS TRIGGER AS $$
DECLARE
    is_valid_transition BOOLEAN;
    user_role VARCHAR;
BEGIN
    -- Only validate if the state is actually changing
    IF OLD.state_id IS DISTINCT FROM NEW.state_id THEN

        -- Optionally, determine the current user's role from JWT claims or session config
        -- user_role := current_setting('request.jwt.claims', true)::json->>'role';
        -- For simplicity, we just check if the transition itself is allowed in workflow_transitions

        SELECT EXISTS (
            SELECT 1 FROM public.workflow_transitions
            WHERE from_state_id = OLD.state_id
              AND to_state_id = NEW.state_id
              AND is_active = TRUE
        ) INTO is_valid_transition;

        IF NOT is_valid_transition THEN
            RAISE EXCEPTION 'Invalid workflow transition from state_id % to state_id %', OLD.state_id, NEW.state_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Audit Engine

CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    user_id UUID,
    user_role VARCHAR(100),
    action_timestamp TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    application_id UUID
);

-- Deny updates and deletes on the audit table to ensure it remains append-only
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_update_audit ON public.system_audit_logs FOR UPDATE USING (false);
CREATE POLICY deny_delete_audit ON public.system_audit_logs FOR DELETE USING (false);
CREATE POLICY allow_read_audit ON public.system_audit_logs FOR SELECT USING (true);
CREATE POLICY allow_insert_audit ON public.system_audit_logs FOR INSERT WITH CHECK (true);

-- Generic trigger function to log changes automatically
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
    -- Extract user context (assuming Supabase Auth or custom headers/settings)
    current_user_id := auth.uid();

    -- Attempt to get reason and app_id from session context if available, else null
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


-- 4. Document Engine

CREATE TABLE IF NOT EXISTS public.documents_engine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type_id UUID REFERENCES public.master_document_types(id),
    owner_id UUID NOT NULL,
    application_id UUID, -- Link to application (Warish, Dependent, etc.)
    file_path TEXT NOT NULL,
    version INT DEFAULT 1,
    verification_status VARCHAR(50) DEFAULT 'Pending',
    hash_value TEXT, -- For integrity later
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attach audit trigger to documents_engine
CREATE TRIGGER trigger_audit_documents_engine
AFTER INSERT OR UPDATE OR DELETE ON public.documents_engine
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 5. Event Engine

CREATE TABLE IF NOT EXISTS public.events_engine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- e.g., 'submit', 'return', 'approve', 'issue', 'upload'
    application_id UUID,
    actor_id UUID,
    actor_role VARCHAR(100),
    event_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deny direct modifications to events_engine
ALTER TABLE public.events_engine ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_update_events ON public.events_engine FOR UPDATE USING (false);
CREATE POLICY deny_delete_events ON public.events_engine FOR DELETE USING (false);
CREATE POLICY allow_read_events ON public.events_engine FOR SELECT USING (true);
CREATE POLICY allow_insert_events ON public.events_engine FOR INSERT WITH CHECK (true);


-- 6. Permission Engine & API Separation

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(100) NOT NULL,
    action_name VARCHAR(100) NOT NULL, -- e.g., 'approve_application', 'issue_certificate'
    is_allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_name, action_name)
);

-- Seed basic permissions
INSERT INTO public.role_permissions (role_name, action_name) VALUES
    ('Citizen', 'submit_application'),
    ('DEO', 'return_application'),
    ('Admin', 'approve_application'),
    ('Super Admin', 'issue_certificate'),
    ('Watcher', 'view_reports')
ON CONFLICT (role_name, action_name) DO NOTHING;

-- Function to check permission
CREATE OR REPLACE FUNCTION public.check_permission(p_role_name VARCHAR, p_action_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_allowed BOOLEAN;
BEGIN
    SELECT is_allowed INTO v_is_allowed
    FROM public.role_permissions
    WHERE role_name = p_role_name AND action_name = p_action_name;

    RETURN COALESCE(v_is_allowed, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- Example Backend Engine RPCs (API Separation)
-- The frontend will call these instead of doing direct table INSERTS/UPDATES.

CREATE OR REPLACE FUNCTION public.rpc_submit_application(p_application_id UUID, p_table_name VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_state_submitted UUID;
    v_current_state UUID;
BEGIN
    SELECT id INTO v_state_submitted FROM public.master_workflow_states WHERE state_name = 'Submitted';

    -- In a real scenario, this would dynamically update the application table.
    -- Example using dynamic SQL to get current state and update:
    EXECUTE format('SELECT state_id FROM public.%I WHERE id = $1', p_table_name)
        INTO v_current_state USING p_application_id;

    -- Force update to Submitted state.
    -- The validate_workflow_transition trigger on the target table will enforce rules.
    EXECUTE format('UPDATE public.%I SET state_id = $1, updated_at = NOW() WHERE id = $2', p_table_name)
        USING v_state_submitted, p_application_id;

    -- Log Event
    INSERT INTO public.events_engine (event_type, application_id, actor_id)
    VALUES ('submit', p_application_id, auth.uid());

    RETURN '{"status": "success", "message": "Application submitted successfully"}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_approve_application(p_application_id UUID, p_table_name VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_state_approved UUID;
BEGIN
    -- Check permissions (assuming we extract role from auth or similar context)
    -- IF NOT public.check_permission(current_user_role, 'approve_application') THEN
    --    RAISE EXCEPTION 'Access denied';
    -- END IF;

    SELECT id INTO v_state_approved FROM public.master_workflow_states WHERE state_name = 'Approved';

    EXECUTE format('UPDATE public.%I SET state_id = $1, updated_at = NOW() WHERE id = $2', p_table_name)
        USING v_state_approved, p_application_id;

    INSERT INTO public.events_engine (event_type, application_id, actor_id)
    VALUES ('approve', p_application_id, auth.uid());

    RETURN '{"status": "success", "message": "Application approved successfully"}'::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke direct mutation access from public on all core tables to enforce API separation.
-- In a real setup, we would grant SELECT but revoke INSERT/UPDATE/DELETE.
-- For example:
-- REVOKE INSERT, UPDATE, DELETE ON public.warish_certificates FROM authenticated, anon;
-- REVOKE INSERT, UPDATE, DELETE ON public.dependent_certificates FROM authenticated, anon;


-- 7. Background Jobs using pg_cron

-- Note: pg_cron extension needs to be enabled. In Supabase this is often pre-enabled or can be enabled via:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job functions

-- 3-day edit close: Example job to lock applications in 'Draft' older than 3 days
CREATE OR REPLACE FUNCTION public.job_close_expired_drafts()
RETURNS void AS $$
BEGIN
    -- This is a generic representation. It would need to update specific application tables.
    -- E.g. UPDATE public.warish_certificates SET is_locked = true WHERE state_id = (select id from master_workflow_states where state_name = 'Draft') AND created_at < NOW() - INTERVAL '3 days';
    RAISE NOTICE 'Executing 3-day edit close job';
END;
$$ LANGUAGE plpgsql;

-- 30-day upload close
CREATE OR REPLACE FUNCTION public.job_close_expired_uploads()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Executing 30-day upload close job';
END;
$$ LANGUAGE plpgsql;

-- 6-month credit refresh
CREATE OR REPLACE FUNCTION public.job_refresh_credits()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Executing 6-month credit refresh job';
END;
$$ LANGUAGE plpgsql;

-- Archive completed records
CREATE OR REPLACE FUNCTION public.job_archive_completed_records()
RETURNS void AS $$
DECLARE
    v_state_issued UUID;
    v_state_archived UUID;
BEGIN
    SELECT id INTO v_state_issued FROM public.master_workflow_states WHERE state_name = 'Issued';
    SELECT id INTO v_state_archived FROM public.master_workflow_states WHERE state_name = 'Archived';

    -- In practice, dynamic SQL or explicit updates on target tables
    -- UPDATE public.warish_certificates SET state_id = v_state_archived WHERE state_id = v_state_issued AND updated_at < NOW() - INTERVAL '1 year';
    RAISE NOTICE 'Executing archive completed records job';
END;
$$ LANGUAGE plpgsql;

-- Schedule jobs using pg_cron
-- DO $$
-- BEGIN
--    -- Run every day at midnight
--    PERFORM cron.schedule('close_drafts', '0 0 * * *', 'SELECT public.job_close_expired_drafts()');
--    PERFORM cron.schedule('close_uploads', '0 0 * * *', 'SELECT public.job_close_expired_uploads()');
--    PERFORM cron.schedule('archive_records', '0 1 * * *', 'SELECT public.job_archive_completed_records()');
--
--    -- Run on the 1st of every 6th month
--    PERFORM cron.schedule('refresh_credits', '0 0 1 1,7 *', 'SELECT public.job_refresh_credits()');
-- END $$;
