-- ============ 1. documents_engine: enable RLS + scoped policies ============
ALTER TABLE public.documents_engine ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_engine_select ON public.documents_engine
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR has_role(auth.uid(), 'deo')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY documents_engine_insert ON public.documents_engine
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND uploaded_by = auth.uid());

CREATE POLICY documents_engine_update ON public.documents_engine
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'deo')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
  );

-- ============ 2. Master/reference tables: RLS + authenticated read-only ============
ALTER TABLE public.master_appointment_document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_appointment_document_types_read ON public.master_appointment_document_types FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_designations ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_designations_read ON public.master_designations FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_document_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_document_requirements_read ON public.master_document_requirements FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_document_types_read ON public.master_document_types FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_notification_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_notification_types_read ON public.master_notification_types FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_post_offices ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_post_offices_read ON public.master_post_offices FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_rejection_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_rejection_reasons_read ON public.master_rejection_reasons FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_relations_read ON public.master_relations FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_villages ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_villages_read ON public.master_villages FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_wards_read ON public.master_wards FOR SELECT TO authenticated USING (true);

ALTER TABLE public.master_workflow_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_workflow_states_read ON public.master_workflow_states FOR SELECT TO authenticated USING (true);

-- ============ 3. Sensitive config tables: RLS enabled, no direct API access ============
-- (service_role bypasses RLS; SECURITY DEFINER functions run as owner — both keep working)
ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

-- ============ 4. events_engine: remove public read/write ============
DROP POLICY IF EXISTS allow_insert_events ON public.events_engine;
DROP POLICY IF EXISTS allow_read_events ON public.events_engine;
DROP POLICY IF EXISTS deny_delete_events ON public.events_engine;
DROP POLICY IF EXISTS deny_update_events ON public.events_engine;

CREATE POLICY events_engine_office_select ON public.events_engine
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'deo')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'super_admin')
  );
-- No INSERT/UPDATE/DELETE policies: events are written only by SECURITY DEFINER functions.

-- ============ 5. system_audit_logs: remove public read/write ============
DROP POLICY IF EXISTS allow_insert_audit ON public.system_audit_logs;
DROP POLICY IF EXISTS allow_read_audit ON public.system_audit_logs;
DROP POLICY IF EXISTS deny_delete_audit ON public.system_audit_logs;
DROP POLICY IF EXISTS deny_update_audit ON public.system_audit_logs;

CREATE POLICY system_audit_logs_admin_select ON public.system_audit_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
-- Entries are written only by the SECURITY DEFINER log_audit_event trigger.

-- ============ 6. Citizen edit-window column guard ============
CREATE OR REPLACE FUNCTION public.tg_certificate_citizen_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Office roles (DEO/Admin/Super Admin) and server-side (service role) updates are untouched.
  IF auth.uid() IS NOT NULL
     AND NOT (has_role(auth.uid(), 'deo')
              OR has_role(auth.uid(), 'admin')
              OR has_role(auth.uid(), 'super_admin')) THEN
    NEW.status                := OLD.status;
    NEW.source                := OLD.source;
    NEW.public_edit_until     := OLD.public_edit_until;
    NEW.citizen_user_id       := OLD.citizen_user_id;
    NEW.created_by            := OLD.created_by;
    NEW.memo_no               := OLD.memo_no;
    NEW.memo_serial           := OLD.memo_serial;
    NEW.memo_year             := OLD.memo_year;
    NEW.certificate_number    := OLD.certificate_number;
    NEW.issue_date            := OLD.issue_date;
    NEW.verification_id       := OLD.verification_id;
    NEW.verification_status   := OLD.verification_status;
    NEW.verification_count    := OLD.verification_count;
    NEW.approved_by           := OLD.approved_by;
    NEW.approval_timestamp    := OLD.approval_timestamp;
    NEW.rejected_by           := OLD.rejected_by;
    NEW.rejected_reason       := OLD.rejected_reason;
    NEW.rejection_timestamp   := OLD.rejection_timestamp;
    NEW.rejected_at           := OLD.rejected_at;
    NEW.rejection_reason      := OLD.rejection_reason;
    NEW.restored_at           := OLD.restored_at;
    NEW.return_count          := OLD.return_count;
    NEW.submitted_at          := OLD.submitted_at;
    NEW.last_returned_at      := OLD.last_returned_at;
    NEW.archived_at           := OLD.archived_at;
    NEW.archived_by           := OLD.archived_by;
    NEW.archive_reason        := OLD.archive_reason;
    NEW.office_copy_opened_at := OLD.office_copy_opened_at;
    NEW.parent_application_id := OLD.parent_application_id;
    NEW.document_mode         := OLD.document_mode;
    NEW.valid_from            := OLD.valid_from;
    NEW.valid_until           := OLD.valid_until;
    NEW.config_snapshot       := OLD.config_snapshot;
    NEW.pdf_storage_path      := OLD.pdf_storage_path;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_certificate_citizen_update_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS certificate_citizen_update_guard ON public.warish_certificates;
CREATE TRIGGER certificate_citizen_update_guard
  BEFORE UPDATE ON public.warish_certificates
  FOR EACH ROW EXECUTE FUNCTION public.tg_certificate_citizen_update_guard();

DROP TRIGGER IF EXISTS certificate_citizen_update_guard ON public.dependent_certificates;
CREATE TRIGGER certificate_citizen_update_guard
  BEFORE UPDATE ON public.dependent_certificates
  FOR EACH ROW EXECUTE FUNCTION public.tg_certificate_citizen_update_guard();

-- ============ 7. SECURITY DEFINER function hardening ============
-- 7a. App RPCs called by the signed-in frontend: revoke public/anon access, keep authenticated + service_role.
REVOKE EXECUTE ON FUNCTION public.application_timeline(cert_kind, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.application_timeline(cert_kind, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_certificate_v2(cert_kind, uuid, integer, integer, date) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_certificate(cert_kind, uuid, text, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_role() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.link_document_to_application(cert_kind, uuid, uuid, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_document_to_application(cert_kind, uuid, uuid, text, bigint, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_citizen_activity(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_citizen_activity(text, text, text, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_office_activity(text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_office_activity(text, text, text, jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.open_office_working_copy(cert_kind, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_office_working_copy(cert_kind, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.permanently_delete_rejected(cert_kind, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_certificate_v2(cert_kind, uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_certificate(cert_kind, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.return_application(cert_kind, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.return_application(cert_kind, uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.submit_application(cert_kind, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_application(cert_kind, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.verify_application_document(uuid, verification_status, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_application_document(uuid, verification_status, text) TO authenticated, service_role;

-- 7b. Internal-only / trigger / unused generic functions: no direct API execution at all.
REVOKE EXECUTE ON FUNCTION public.check_permission(character varying, character varying) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_permission(character varying, character varying) TO service_role;

REVOKE EXECUTE ON FUNCTION public.citizen_profile_is_complete(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.citizen_profile_is_complete(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_unlinked_document(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_unlinked_document(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event() TO service_role;

REVOKE EXECUTE ON FUNCTION public.notify_office_user(uuid, office_notification_kind, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_office_user(uuid, office_notification_kind, text, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.replace_application_document(cert_kind, uuid, uuid, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_application_document(cert_kind, uuid, uuid, text, bigint, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.rpc_approve_application(uuid, character varying) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_approve_application(uuid, character varying) TO service_role;

REVOKE EXECUTE ON FUNCTION public.rpc_submit_application(uuid, character varying) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_submit_application(uuid, character varying) TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_admin_profiles_guard_self_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_admin_profiles_guard_self_update() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_citizen_profiles_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_citizen_profiles_guard() TO service_role;

REVOKE EXECUTE ON FUNCTION public.tg_validate_certificate_geography() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_validate_certificate_geography() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validate_workflow_transition() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_workflow_transition() TO service_role;

-- 7c. public_verify stays publicly executable BY DESIGN (public certificate verification,
-- rate-limited by ip_hash and returns sanitized data only).

-- ============ 8. search_path hardening ============
ALTER FUNCTION public.check_permission(character varying, character varying) SET search_path = public, pg_temp;
ALTER FUNCTION public.log_audit_event() SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_workflow_transition() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_new_application_document_mode() SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_document_mode_tampering() SET search_path = public, pg_temp;
ALTER FUNCTION public.rpc_approve_application(uuid, character varying) SET search_path = public, pg_temp;
ALTER FUNCTION public.rpc_submit_application(uuid, character varying) SET search_path = public, pg_temp;
ALTER FUNCTION public.job_archive_completed_records() SET search_path = public, pg_temp;
ALTER FUNCTION public.job_close_expired_drafts() SET search_path = public, pg_temp;
ALTER FUNCTION public.job_close_expired_uploads() SET search_path = public, pg_temp;
ALTER FUNCTION public.job_refresh_credits() SET search_path = public, pg_temp;