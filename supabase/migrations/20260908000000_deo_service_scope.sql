-- 1. Add service_scope to admin_profiles
ALTER TABLE public.admin_profiles
ADD COLUMN IF NOT EXISTS service_scope text[] DEFAULT '{}'::text[];

-- 2. Create has_service_scope
CREATE OR REPLACE FUNCTION public.has_service_scope(_user_id uuid, _scope text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = _user_id
      AND service_scope IS NOT NULL
      AND (
        _scope = ANY(service_scope)
        OR 'all' = ANY(service_scope)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_service_scope(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_service_scope(uuid, text) TO service_role;

-- 3. Scope requests table
CREATE TABLE IF NOT EXISTS public.deo_scope_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_scope text[] NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deo_scope_requests TO authenticated;
GRANT ALL ON public.deo_scope_requests TO service_role;
ALTER TABLE public.deo_scope_requests ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS deo_scope_requests_updated_at ON public.deo_scope_requests;
CREATE TRIGGER deo_scope_requests_updated_at BEFORE UPDATE ON public.deo_scope_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Self select / insert for the DEO themselves
DROP POLICY IF EXISTS deo_scope_requests_self_select ON public.deo_scope_requests;
CREATE POLICY deo_scope_requests_self_select ON public.deo_scope_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS deo_scope_requests_self_insert ON public.deo_scope_requests;
CREATE POLICY deo_scope_requests_self_insert ON public.deo_scope_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Super admin sees and updates all
DROP POLICY IF EXISTS deo_scope_requests_super_admin_select ON public.deo_scope_requests;
CREATE POLICY deo_scope_requests_super_admin_select ON public.deo_scope_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS deo_scope_requests_super_admin_update ON public.deo_scope_requests;
CREATE POLICY deo_scope_requests_super_admin_update ON public.deo_scope_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));


-- 4. Apply fail-closed RLS to warish_certificates
DROP POLICY IF EXISTS warish_read_admin ON public.warish_certificates;
DROP POLICY IF EXISTS warish_insert_admin ON public.warish_certificates;
DROP POLICY IF EXISTS warish_update_admin ON public.warish_certificates;

CREATE POLICY warish_read_admin ON public.warish_certificates
FOR SELECT TO authenticated
USING (
  (public.has_role(auth.uid(), 'super_admin'))
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish') AND archived_at IS NULL)
);

CREATE POLICY warish_insert_admin ON public.warish_certificates
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish'))
);

CREATE POLICY warish_update_admin ON public.warish_certificates
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish'))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'warish'))
);


-- 5. Apply fail-closed RLS to dependent_certificates
DROP POLICY IF EXISTS dependent_read_admin ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_insert_admin ON public.dependent_certificates;
DROP POLICY IF EXISTS dependent_update_admin ON public.dependent_certificates;

CREATE POLICY dependent_read_admin ON public.dependent_certificates
FOR SELECT TO authenticated
USING (
  (public.has_role(auth.uid(), 'super_admin'))
  OR (public.has_role(auth.uid(), 'admin') AND archived_at IS NULL)
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent') AND archived_at IS NULL)
);

CREATE POLICY dependent_insert_admin ON public.dependent_certificates
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent'))
);

CREATE POLICY dependent_update_admin ON public.dependent_certificates
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent'))
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'deo') AND public.has_service_scope(auth.uid(), 'dependent'))
);
