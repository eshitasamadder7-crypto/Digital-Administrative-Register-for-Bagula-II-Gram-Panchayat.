
-- Permission / action enums
DO $$ BEGIN
  CREATE TYPE public.app_permission AS ENUM (
    'notices','representatives','staff','homepage_content','redirects',
    'warish_certs','dependent_certs','birth_certs','admins','activity_logs','backups'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_action AS ENUM ('view','create','edit','delete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- admin_profiles
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_by uuid,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_profiles TO service_role;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- admin_permissions
CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission public.app_permission NOT NULL,
  action public.app_action NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission, action)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_permissions TO authenticated;
GRANT ALL ON public.admin_permissions TO service_role;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action_type text NOT NULL,
  target_table text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION app_private.is_super_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION app_private.has_permission(_uid uuid, _perm public.app_permission, _act public.app_action)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    app_private.is_super_admin(_uid)
    OR EXISTS (
      SELECT 1 FROM public.admin_permissions
      WHERE user_id = _uid AND permission = _perm AND action = _act
    )
$$;

GRANT EXECUTE ON FUNCTION app_private.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_permission(uuid, public.app_permission, public.app_action) TO authenticated;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_admin_profiles_updated ON public.admin_profiles;
CREATE TRIGGER trg_admin_profiles_updated BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS: admin_profiles
CREATE POLICY "super admins manage admin_profiles" ON public.admin_profiles
  FOR ALL TO authenticated
  USING (app_private.is_super_admin(auth.uid()))
  WITH CHECK (app_private.is_super_admin(auth.uid()));

CREATE POLICY "users view own admin profile" ON public.admin_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users update own admin profile" ON public.admin_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins-perm holders read admin_profiles" ON public.admin_profiles
  FOR SELECT TO authenticated
  USING (app_private.has_permission(auth.uid(), 'admins', 'view'));

-- RLS: admin_permissions
CREATE POLICY "super admins manage permissions" ON public.admin_permissions
  FOR ALL TO authenticated
  USING (app_private.is_super_admin(auth.uid()))
  WITH CHECK (app_private.is_super_admin(auth.uid()));

CREATE POLICY "users view own permissions" ON public.admin_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- RLS: activity_logs
CREATE POLICY "authenticated insert own activity" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_user_id);

CREATE POLICY "activity_logs viewers read" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (app_private.has_permission(auth.uid(), 'activity_logs', 'view'));

-- Seed super_admin role for known emails
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM auth.users
WHERE lower(email) IN ('bagula2nogp111@gmail.com','nitush6488@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Self-claim policy for allowed emails
CREATE POLICY "allowed emails claim super_admin"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'super_admin'::app_role
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = ANY (ARRAY['bagula2nogp111@gmail.com','nitush6488@gmail.com'])
  );

-- Seed admin_profiles for existing admins
INSERT INTO public.admin_profiles (user_id, email, display_name, status)
SELECT u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.email), 'active'
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id AND r.role IN ('admin','super_admin')
ON CONFLICT (user_id) DO NOTHING;
