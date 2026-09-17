-- ==== 20260507005424_5607763a-550a-4511-870c-b636e8d8260a.sql
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "admins view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.whats_new_entries (
  id uuid primary key default gen_random_uuid(),
  posted_on date not null default current_date,
  content text not null,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.whats_new_entries enable row level security;

create policy "public can read published entries" on public.whats_new_entries
  for select to anon, authenticated using (is_published = true);
create policy "admins read all entries" on public.whats_new_entries
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins insert entries" on public.whats_new_entries
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update entries" on public.whats_new_entries
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete entries" on public.whats_new_entries
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger whats_new_entries_updated_at
  before update on public.whats_new_entries
  for each row execute function public.tg_set_updated_at();

create index whats_new_entries_posted_on_idx on public.whats_new_entries(posted_on desc, sort_order);

-- ==== 20260507010542
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin new.updated_at = now(); return new; end;
$$;

-- ==== 20260508012358
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

CREATE POLICY "admins read warish"
ON public.warish_certificates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "authenticated insert warish"
ON public.warish_certificates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

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

-- ==== 20260508012932
CREATE UNIQUE INDEX IF NOT EXISTS uq_warish_memo_per_date
ON public.warish_certificates (memo_no, cert_date);

-- ==== 20260605045647
CREATE TABLE IF NOT EXISTS public.dependent_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_no text NOT NULL,
  cert_date date NOT NULL,
  applicant_name text NOT NULL,
  village text,
  department text,
  data jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependent_certificates TO authenticated;
GRANT ALL ON public.dependent_certificates TO service_role;

ALTER TABLE public.dependent_certificates ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_dependent_updated_at ON public.dependent_certificates;
CREATE TRIGGER set_dependent_updated_at
BEFORE UPDATE ON public.dependent_certificates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ==== 20260606215915
DROP POLICY IF EXISTS "authenticated insert warish" ON public.warish_certificates;

-- ==== 20260606220442 / 20260606221715 grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warish_certificates TO authenticated;
GRANT ALL ON public.warish_certificates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependent_certificates TO authenticated;
GRANT ALL ON public.dependent_certificates TO service_role;
GRANT SELECT ON public.whats_new_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whats_new_entries TO authenticated;
GRANT ALL ON public.whats_new_entries TO service_role;

-- ==== 20260606221805
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;

CREATE POLICY "admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "admins delete dependent"
ON public.dependent_certificates
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert dependent"
ON public.dependent_certificates
FOR INSERT
TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = created_by);

CREATE POLICY "admins read dependent"
ON public.dependent_certificates
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update dependent"
ON public.dependent_certificates
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins delete warish" ON public.warish_certificates;
DROP POLICY IF EXISTS "admins insert warish" ON public.warish_certificates;
DROP POLICY IF EXISTS "admins read warish" ON public.warish_certificates;
DROP POLICY IF EXISTS "admins update warish" ON public.warish_certificates;

CREATE POLICY "admins delete warish"
ON public.warish_certificates
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert warish"
ON public.warish_certificates
FOR INSERT
TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role) AND auth.uid() = created_by);

CREATE POLICY "admins read warish"
ON public.warish_certificates
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update warish"
ON public.warish_certificates
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins delete entries" ON public.whats_new_entries;
DROP POLICY IF EXISTS "admins insert entries" ON public.whats_new_entries;
DROP POLICY IF EXISTS "admins read all entries" ON public.whats_new_entries;
DROP POLICY IF EXISTS "admins update entries" ON public.whats_new_entries;

CREATE POLICY "admins delete entries"
ON public.whats_new_entries
FOR DELETE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins insert entries"
ON public.whats_new_entries
FOR INSERT
TO authenticated
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins read all entries"
ON public.whats_new_entries
FOR SELECT
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update entries"
ON public.whats_new_entries
FOR UPDATE
TO authenticated
USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- ==== 20260606221920
GRANT INSERT ON public.user_roles TO authenticated;

-- ==== 20260607074118
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';