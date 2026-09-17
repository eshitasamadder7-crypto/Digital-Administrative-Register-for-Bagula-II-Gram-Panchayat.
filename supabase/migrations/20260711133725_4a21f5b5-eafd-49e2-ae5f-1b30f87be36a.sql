-- Roles (include super_admin from the start to avoid ALTER TYPE in same tx)
create type public.app_role as enum ('admin', 'user', 'super_admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select, insert on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke all on function app_private.has_role(uuid, public.app_role) from public, anon;
grant execute on function app_private.has_role(uuid, public.app_role) to authenticated, service_role;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security invoker set search_path = public, app_private as $$
  select app_private.has_role(_user_id, _role);
$$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

create policy "users view own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create policy "super admins manage all roles" on public.user_roles
  for all to authenticated
  using (app_private.has_role(auth.uid(), 'super_admin'::app_role))
  with check (app_private.has_role(auth.uid(), 'super_admin'::app_role));

-- updated_at helper
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

-- What's New entries
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
grant select on public.whats_new_entries to anon;
grant select, insert, update, delete on public.whats_new_entries to authenticated;
grant all on public.whats_new_entries to service_role;
alter table public.whats_new_entries enable row level security;

create policy "public read published entries" on public.whats_new_entries
  for select to anon, authenticated using (is_published = true);
create policy "admins read all entries" on public.whats_new_entries
  for select to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admins insert entries" on public.whats_new_entries
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admins update entries" on public.whats_new_entries
  for update to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));
create policy "admins delete entries" on public.whats_new_entries
  for delete to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create trigger whats_new_entries_updated_at
  before update on public.whats_new_entries
  for each row execute function public.tg_set_updated_at();

create index whats_new_entries_posted_on_idx on public.whats_new_entries(posted_on desc, sort_order);

-- Cert enums (upfront)
create type public.verification_status as enum ('pending', 'verified', 'rejected', 'revoked');
create type public.cert_audit_action as enum ('created','approved','rejected','downloaded','modified','archived','restored','verified','revoked');
create type public.cert_kind as enum ('warish','dependent','birth','death');
create type public.backup_kind as enum ('daily','weekly','monthly','manual');
create type public.backup_status as enum ('running','success','failed');
create type public.app_permission as enum (
  'notices','representatives','staff','homepage_content','redirects',
  'warish_certs','dependent_certs','birth_certs','admins','activity_logs','backups'
);
create type public.app_action as enum ('view','create','edit','delete');

-- Warish certificates
create table public.warish_certificates (
  id uuid primary key default gen_random_uuid(),
  memo_no text,
  cert_date date,
  deceased_name text not null,
  applicant_name text not null,
  village text,
  data jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  certificate_number text unique,
  issue_date date,
  applicant_details jsonb not null default '{}'::jsonb,
  pdf_storage_path text,
  verification_status public.verification_status not null default 'pending',
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  verification_id text,
  status text not null default 'Pending Signature & Memo Registration',
  approved_by uuid references auth.users(id) on delete set null,
  approval_timestamp timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_reason text,
  rejection_timestamp timestamptz,
  verification_count int not null default 0,
  memo_serial int,
  memo_year int,
  rejected_at timestamptz,
  restored_at timestamptz,
  constraint warish_status_check check (status in
    ('Pending Signature & Memo Registration','Approved','Rejected','Cancelled','Superseded','Archived'))
);
grant select, insert, update, delete on public.warish_certificates to authenticated;
grant all on public.warish_certificates to service_role;
alter table public.warish_certificates enable row level security;

create trigger set_updated_at_warish before update on public.warish_certificates
  for each row execute function public.tg_set_updated_at();
create index idx_warish_created_at on public.warish_certificates (created_at desc);
create index idx_warish_rejected_at on public.warish_certificates (status, rejected_at);

-- Dependent certificates
create table public.dependent_certificates (
  id uuid primary key default gen_random_uuid(),
  memo_no text,
  cert_date date,
  applicant_name text not null,
  village text,
  department text,
  data jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  certificate_number text unique,
  issue_date date,
  applicant_details jsonb not null default '{}'::jsonb,
  pdf_storage_path text,
  verification_status public.verification_status not null default 'pending',
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  verification_id text,
  status text not null default 'Pending Signature & Memo Registration',
  approved_by uuid references auth.users(id) on delete set null,
  approval_timestamp timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_reason text,
  rejection_timestamp timestamptz,
  verification_count int not null default 0,
  memo_serial int,
  memo_year int,
  rejected_at timestamptz,
  restored_at timestamptz,
  constraint dependent_status_check check (status in
    ('Pending Signature & Memo Registration','Approved','Rejected','Cancelled','Superseded','Archived'))
);
grant select, insert, update, delete on public.dependent_certificates to authenticated;
grant all on public.dependent_certificates to service_role;
alter table public.dependent_certificates enable row level security;

create trigger set_updated_at_dependent before update on public.dependent_certificates
  for each row execute function public.tg_set_updated_at();

create policy warish_read_admin on public.warish_certificates for select to authenticated
  using ((public.has_role(auth.uid(),'admin') and archived_at is null) or public.has_role(auth.uid(),'super_admin'));
create policy warish_insert_admin on public.warish_certificates for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy warish_update_admin on public.warish_certificates for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create policy dependent_read_admin on public.dependent_certificates for select to authenticated
  using ((public.has_role(auth.uid(),'admin') and archived_at is null) or public.has_role(auth.uid(),'super_admin'));
create policy dependent_insert_admin on public.dependent_certificates for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy dependent_update_admin on public.dependent_certificates for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

-- admin_profiles
create table public.admin_profiles (
  user_id uuid primary key,
  email text not null,
  display_name text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_by uuid,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.admin_profiles to authenticated;
grant all on public.admin_profiles to service_role;
alter table public.admin_profiles enable row level security;
create trigger trg_admin_profiles_updated before update on public.admin_profiles
  for each row execute function public.tg_set_updated_at();

-- admin_permissions
create table public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  permission public.app_permission not null,
  action public.app_action not null,
  granted_by uuid,
  created_at timestamptz not null default now(),
  unique (user_id, permission, action)
);
grant select, insert, update, delete on public.admin_permissions to authenticated;
grant all on public.admin_permissions to service_role;
alter table public.admin_permissions enable row level security;

-- activity_logs
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action_type text not null,
  target_table text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
alter table public.activity_logs enable row level security;

create or replace function app_private.is_super_admin(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role = 'super_admin')
$$;
grant execute on function app_private.is_super_admin(uuid) to authenticated, service_role;

create or replace function app_private.has_permission(_uid uuid, _perm public.app_permission, _act public.app_action)
returns boolean language sql stable security definer set search_path = public as $$
  select app_private.is_super_admin(_uid)
    or exists (select 1 from public.admin_permissions where user_id = _uid and permission = _perm and action = _act)
$$;
grant execute on function app_private.has_permission(uuid, public.app_permission, public.app_action) to authenticated, service_role;

create policy "super admins manage admin_profiles" on public.admin_profiles
  for all to authenticated using (app_private.is_super_admin(auth.uid())) with check (app_private.is_super_admin(auth.uid()));
create policy "users view own admin profile" on public.admin_profiles
  for select to authenticated using (auth.uid() = user_id);
create policy "users update own admin profile" on public.admin_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins-perm holders read admin_profiles" on public.admin_profiles
  for select to authenticated using (app_private.has_permission(auth.uid(), 'admins', 'view'));

create policy "super admins manage permissions" on public.admin_permissions
  for all to authenticated using (app_private.is_super_admin(auth.uid())) with check (app_private.is_super_admin(auth.uid()));
create policy "users view own permissions" on public.admin_permissions
  for select to authenticated using (auth.uid() = user_id);

create policy "authenticated insert own activity" on public.activity_logs
  for insert to authenticated with check (auth.uid() = actor_user_id);
create policy "activity_logs viewers read" on public.activity_logs
  for select to authenticated using (app_private.has_permission(auth.uid(), 'activity_logs', 'view'));

-- Birth records
create table public.birth_certificate_records (
  id uuid primary key default gen_random_uuid(),
  certificate_number text unique,
  issue_date date not null default current_date,
  applicant_details jsonb not null default '{}'::jsonb,
  child_name text, father_name text, mother_name text,
  date_of_birth date, place_of_birth text,
  external_reference text, pdf_storage_path text,
  verification_status public.verification_status not null default 'pending',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.birth_certificate_records to authenticated;
grant all on public.birth_certificate_records to service_role;
alter table public.birth_certificate_records enable row level security;
create trigger birth_set_updated_at before update on public.birth_certificate_records
  for each row execute function public.tg_set_updated_at();
create policy birth_read_admin on public.birth_certificate_records for select to authenticated
  using ((public.has_role(auth.uid(),'admin') and archived_at is null) or public.has_role(auth.uid(),'super_admin'));
create policy birth_insert_admin on public.birth_certificate_records for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy birth_update_admin on public.birth_certificate_records for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

-- Death records
create table public.death_certificate_records (
  id uuid primary key default gen_random_uuid(),
  certificate_number text unique,
  issue_date date not null default current_date,
  applicant_details jsonb not null default '{}'::jsonb,
  deceased_name text, father_or_husband_name text,
  date_of_death date, place_of_death text,
  external_reference text, pdf_storage_path text,
  verification_status public.verification_status not null default 'pending',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.death_certificate_records to authenticated;
grant all on public.death_certificate_records to service_role;
alter table public.death_certificate_records enable row level security;
create trigger death_set_updated_at before update on public.death_certificate_records
  for each row execute function public.tg_set_updated_at();
create policy death_read_admin on public.death_certificate_records for select to authenticated
  using ((public.has_role(auth.uid(),'admin') and archived_at is null) or public.has_role(auth.uid(),'super_admin'));
create policy death_insert_admin on public.death_certificate_records for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy death_update_admin on public.death_certificate_records for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

-- Cert audit
create table public.certificate_audit_logs (
  id uuid primary key default gen_random_uuid(),
  cert_kind public.cert_kind not null,
  cert_table text not null,
  cert_id uuid not null,
  certificate_number text,
  action public.cert_audit_action not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  reason text,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_cert_audit_cert on public.certificate_audit_logs(cert_kind, cert_id, created_at desc);
create index idx_cert_audit_actor on public.certificate_audit_logs(actor_user_id, created_at desc);
grant select, insert on public.certificate_audit_logs to authenticated;
grant all on public.certificate_audit_logs to service_role;
alter table public.certificate_audit_logs enable row level security;
create policy cert_audit_read_admin on public.certificate_audit_logs for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy cert_audit_insert_admin on public.certificate_audit_logs for insert to authenticated
  with check (actor_user_id = auth.uid() and (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin')));

-- Backup + restore
create table public.backup_jobs (
  id uuid primary key default gen_random_uuid(),
  kind public.backup_kind not null,
  status public.backup_status not null default 'running',
  storage_path text,
  size_bytes bigint,
  table_counts jsonb not null default '{}'::jsonb,
  retention_until timestamptz not null,
  triggered_by uuid references auth.users(id) on delete set null,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.backup_jobs to authenticated;
grant all on public.backup_jobs to service_role;
alter table public.backup_jobs enable row level security;
create trigger backup_jobs_set_updated_at before update on public.backup_jobs
  for each row execute function public.tg_set_updated_at();
create policy backup_super_select on public.backup_jobs for select to authenticated using (public.has_role(auth.uid(),'super_admin'));
create policy backup_super_write on public.backup_jobs for insert to authenticated with check (public.has_role(auth.uid(),'super_admin'));
create policy backup_super_update on public.backup_jobs for update to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

create table public.restore_jobs (
  id uuid primary key default gen_random_uuid(),
  backup_job_id uuid references public.backup_jobs(id) on delete set null,
  status public.backup_status not null default 'running',
  reason text not null,
  triggered_by uuid not null references auth.users(id) on delete set null,
  triggered_by_email text,
  ip_address text,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.restore_jobs to authenticated;
grant all on public.restore_jobs to service_role;
alter table public.restore_jobs enable row level security;
create policy restore_super_select on public.restore_jobs for select to authenticated using (public.has_role(auth.uid(),'super_admin'));
create policy restore_super_write on public.restore_jobs for insert to authenticated
  with check (public.has_role(auth.uid(),'super_admin') and triggered_by = auth.uid());
create policy restore_super_update on public.restore_jobs for update to authenticated
  using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

-- Audit log for RPCs
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, actor_email text,
  action text not null,
  target_table text, target_id uuid, verification_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text, user_agent text,
  created_at timestamptz not null default now()
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy audit_log_admin_read on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy audit_log_admin_insert on public.audit_log for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

-- Verification lookups
create table public.verification_lookups (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  verification_id text, memo_no text,
  found boolean not null,
  created_at timestamptz not null default now()
);
grant all on public.verification_lookups to service_role;
alter table public.verification_lookups enable row level security;
create index idx_verification_lookups_recent on public.verification_lookups(ip_hash, created_at desc);
create policy verification_lookups_no_access on public.verification_lookups for select to authenticated using (false);

-- Verification ID generator
create or replace function app_private.generate_verification_id(_kind text, _year int)
returns text language plpgsql security definer set search_path = public, app_private as $$
declare code text; attempt int := 0; kind_code text;
        alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; suffix text; i int;
begin
  kind_code := case lower(_kind) when 'warish' then 'WAR' when 'dependent' then 'DEP' else null end;
  if kind_code is null then raise exception 'invalid kind %', _kind; end if;
  loop
    attempt := attempt + 1;
    suffix := '';
    for i in 1..6 loop
      suffix := suffix || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    end loop;
    code := format('BGL-II-%s-%s-%s', kind_code, _year::text, suffix);
    if not exists (select 1 from public.warish_certificates where verification_id = code)
       and not exists (select 1 from public.dependent_certificates where verification_id = code)
    then return code; end if;
    if attempt > 30 then raise exception 'could not allocate verification id'; end if;
  end loop;
end $$;
create or replace function public.generate_verification_id(_kind text, _year int)
returns text language sql security invoker set search_path = public, app_private as $$
  select app_private.generate_verification_id(_kind, _year);
$$;
revoke all on function public.generate_verification_id(text,int) from public, anon;
grant execute on function public.generate_verification_id(text,int) to authenticated;
revoke all on function app_private.generate_verification_id(text,int) from public, anon;
grant execute on function app_private.generate_verification_id(text,int) to authenticated;

-- Approve v2
create or replace function app_private.approve_certificate_v2(
  _kind text, _cert_id uuid, _memo_serial int, _memo_year int, _issue_date date
) returns jsonb language plpgsql security definer set search_path = public, app_private as $$
declare v_serial int; v_memo_no text; v_uid uuid := auth.uid(); v_email text; v_vid text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role(v_uid, 'admin') or public.has_role(v_uid, 'super_admin')) then raise exception 'Not authorized'; end if;
  if _memo_year is null or _issue_date is null then raise exception 'Memo year and issue date are required'; end if;
  if _kind not in ('warish','dependent') then raise exception 'Invalid kind'; end if;
  select email into v_email from auth.users where id = v_uid;
  if _memo_year >= 2027 then
    perform pg_advisory_xact_lock(hashtext('memo_serial:'||_kind||':'||_memo_year));
    if _kind = 'warish' then
      select coalesce(max(memo_serial),0)+1 into v_serial from public.warish_certificates where memo_year = _memo_year;
    else
      select coalesce(max(memo_serial),0)+1 into v_serial from public.dependent_certificates where memo_year = _memo_year;
    end if;
  else
    if _memo_serial is null or _memo_serial <= 0 then raise exception 'Serial number required for legacy year'; end if;
    v_serial := _memo_serial;
    if _kind = 'warish' then
      if exists (select 1 from public.warish_certificates where memo_serial=v_serial and memo_year=_memo_year and id <> _cert_id) then
        raise exception 'Duplicate memo number: %/BGL-II/%', v_serial, _memo_year using errcode = 'unique_violation'; end if;
    else
      if exists (select 1 from public.dependent_certificates where memo_serial=v_serial and memo_year=_memo_year and id <> _cert_id) then
        raise exception 'Duplicate memo number: %/BGL-II/%', v_serial, _memo_year using errcode = 'unique_violation'; end if;
    end if;
  end if;
  v_memo_no := v_serial::text || '/BGL-II/' || _memo_year::text;
  if _kind = 'warish' then
    update public.warish_certificates set memo_serial=v_serial, memo_year=_memo_year, memo_no=v_memo_no,
      cert_date=_issue_date, issue_date=_issue_date, status='Approved', approved_by=v_uid, approval_timestamp=now(),
      rejected_by=null, rejected_reason=null, rejection_timestamp=null, rejected_at=null
      where id=_cert_id returning verification_id into v_vid;
  else
    update public.dependent_certificates set memo_serial=v_serial, memo_year=_memo_year, memo_no=v_memo_no,
      cert_date=_issue_date, issue_date=_issue_date, status='Approved', approved_by=v_uid, approval_timestamp=now(),
      rejected_by=null, rejected_reason=null, rejection_timestamp=null, rejected_at=null
      where id=_cert_id returning verification_id into v_vid;
  end if;
  insert into public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
    values (v_uid, v_email, 'approve', _kind||'_certificates', _cert_id, v_vid,
            jsonb_build_object('memo_no', v_memo_no, 'issue_date', _issue_date));
  return jsonb_build_object('memo_no', v_memo_no, 'issue_date', _issue_date, 'verification_id', v_vid);
end; $$;
create or replace function public.approve_certificate_v2(_kind text, _cert_id uuid, _memo_serial int, _memo_year int, _issue_date date)
returns jsonb language sql set search_path = public, app_private as $$
  select app_private.approve_certificate_v2(_kind, _cert_id, _memo_serial, _memo_year, _issue_date);
$$;
revoke all on function app_private.approve_certificate_v2(text,uuid,int,int,date) from public, anon;
grant execute on function app_private.approve_certificate_v2(text,uuid,int,int,date) to authenticated, service_role;
revoke all on function public.approve_certificate_v2(text,uuid,int,int,date) from public, anon;
grant execute on function public.approve_certificate_v2(text,uuid,int,int,date) to authenticated, service_role;

-- Reject v2
create or replace function app_private.reject_certificate_v2(_kind text, _cert_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public, app_private as $$
declare v_uid uuid := auth.uid(); v_email text; v_vid text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role(v_uid,'admin') or public.has_role(v_uid,'super_admin')) then raise exception 'Not authorized'; end if;
  select email into v_email from auth.users where id = v_uid;
  if _kind = 'warish' then
    update public.warish_certificates set status='Rejected', rejected_by=v_uid, rejected_reason=_reason,
      rejection_timestamp=now(), rejected_at=now() where id=_cert_id returning verification_id into v_vid;
  elsif _kind = 'dependent' then
    update public.dependent_certificates set status='Rejected', rejected_by=v_uid, rejected_reason=_reason,
      rejection_timestamp=now(), rejected_at=now() where id=_cert_id returning verification_id into v_vid;
  else raise exception 'Invalid kind'; end if;
  insert into public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
    values (v_uid, v_email, 'reject', _kind||'_certificates', _cert_id, v_vid, jsonb_build_object('reason', _reason));
end; $$;
create or replace function public.reject_certificate_v2(_kind text, _cert_id uuid, _reason text)
returns void language sql set search_path = public, app_private as $$
  select app_private.reject_certificate_v2(_kind, _cert_id, _reason);
$$;
revoke all on function app_private.reject_certificate_v2(text,uuid,text) from public, anon;
grant execute on function app_private.reject_certificate_v2(text,uuid,text) to authenticated, service_role;
revoke all on function public.reject_certificate_v2(text,uuid,text) from public, anon;
grant execute on function public.reject_certificate_v2(text,uuid,text) to authenticated, service_role;

-- Restore
create or replace function app_private.restore_certificate(_kind text, _cert_id uuid)
returns void language plpgsql security definer set search_path = public, app_private as $$
declare v_uid uuid := auth.uid(); v_email text; v_vid text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role(v_uid,'admin') or public.has_role(v_uid,'super_admin')) then raise exception 'Not authorized'; end if;
  select email into v_email from auth.users where id = v_uid;
  if _kind = 'warish' then
    update public.warish_certificates set status='Pending Signature & Memo Registration',
      rejected_by=null, rejected_reason=null, rejection_timestamp=null, rejected_at=null, restored_at=now()
      where id=_cert_id and status in ('Rejected','Archived') returning verification_id into v_vid;
  elsif _kind = 'dependent' then
    update public.dependent_certificates set status='Pending Signature & Memo Registration',
      rejected_by=null, rejected_reason=null, rejection_timestamp=null, rejected_at=null, restored_at=now()
      where id=_cert_id and status in ('Rejected','Archived') returning verification_id into v_vid;
  else raise exception 'Invalid kind'; end if;
  insert into public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
    values (v_uid, v_email, 'restore', _kind||'_certificates', _cert_id, v_vid, '{}'::jsonb);
end; $$;
create or replace function public.restore_certificate(_kind text, _cert_id uuid)
returns void language sql set search_path = public, app_private as $$
  select app_private.restore_certificate(_kind, _cert_id);
$$;
revoke all on function app_private.restore_certificate(text,uuid) from public, anon;
grant execute on function app_private.restore_certificate(text,uuid) to authenticated, service_role;
revoke all on function public.restore_certificate(text,uuid) from public, anon;
grant execute on function public.restore_certificate(text,uuid) to authenticated, service_role;

-- Permanently delete
create or replace function app_private.permanently_delete_rejected(_kind text, _cert_id uuid)
returns void language plpgsql security definer set search_path = public, app_private as $$
declare v_uid uuid := auth.uid(); v_email text; v_vid text; v_status text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.has_role(v_uid,'super_admin') then raise exception 'Only super admins may permanently delete'; end if;
  select email into v_email from auth.users where id = v_uid;
  if _kind = 'warish' then
    select status, verification_id into v_status, v_vid from public.warish_certificates where id = _cert_id;
    if v_status not in ('Rejected','Archived') then raise exception 'Only rejected or archived records can be permanently deleted'; end if;
    insert into public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
      values (v_uid, v_email, 'permanent_delete', 'warish_certificates', _cert_id, v_vid, '{}'::jsonb);
    delete from public.warish_certificates where id = _cert_id;
  elsif _kind = 'dependent' then
    select status, verification_id into v_status, v_vid from public.dependent_certificates where id = _cert_id;
    if v_status not in ('Rejected','Archived') then raise exception 'Only rejected or archived records can be permanently deleted'; end if;
    insert into public.audit_log(actor_id, actor_email, action, target_table, target_id, verification_id, metadata)
      values (v_uid, v_email, 'permanent_delete', 'dependent_certificates', _cert_id, v_vid, '{}'::jsonb);
    delete from public.dependent_certificates where id = _cert_id;
  else raise exception 'Invalid kind'; end if;
end; $$;
create or replace function public.permanently_delete_rejected(_kind text, _cert_id uuid)
returns void language sql set search_path = public, app_private as $$
  select app_private.permanently_delete_rejected(_kind, _cert_id);
$$;
revoke all on function app_private.permanently_delete_rejected(text,uuid) from public, anon;
grant execute on function app_private.permanently_delete_rejected(text,uuid) to authenticated, service_role;
revoke all on function public.permanently_delete_rejected(text,uuid) from public, anon;
grant execute on function public.permanently_delete_rejected(text,uuid) to authenticated, service_role;

-- Archive expired rejections
create or replace function app_private.archive_expired_rejections()
returns int language plpgsql security definer set search_path = public, app_private as $$
declare n1 int; n2 int;
begin
  update public.warish_certificates set status='Archived'
    where status='Rejected' and rejected_at is not null and rejected_at < now() - interval '30 days';
  get diagnostics n1 = row_count;
  update public.dependent_certificates set status='Archived'
    where status='Rejected' and rejected_at is not null and rejected_at < now() - interval '30 days';
  get diagnostics n2 = row_count;
  return n1 + n2;
end; $$;
create or replace function public.archive_expired_rejections()
returns int language sql set search_path = public, app_private as $$
  select app_private.archive_expired_rejections();
$$;
revoke all on function app_private.archive_expired_rejections() from public, anon;
grant execute on function app_private.archive_expired_rejections() to authenticated, service_role;
revoke all on function public.archive_expired_rejections() from public, anon;
grant execute on function public.archive_expired_rejections() to authenticated, service_role;

-- Public verify by verification_id
create or replace function app_private.public_verify(_verification_id text, _ip_hash text)
returns jsonb language plpgsql security definer set search_path = public, app_private as $$
declare rec_kind text; rec_type_label text;
        rec_vid text; rec_memo text; rec_issue date;
        rec_app text; rec_dec text; rec_status text; rec_reason text; rec_data jsonb;
        recent_count int; v_prefix text;
        v_id text := upper(trim(_verification_id));
begin
  select count(*) into recent_count from public.verification_lookups
    where ip_hash = _ip_hash and created_at > now() - interval '10 minutes';
  if recent_count > 20 then return jsonb_build_object('status','rate_limited'); end if;
  if v_id like 'BGL-II-WAR-%' then
    v_prefix := 'BGL-II-WAR';
    select verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason, data
      into rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data
      from public.warish_certificates where verification_id = v_id limit 1;
    if found then rec_kind := 'warish'; rec_type_label := 'Warish Certificate'; end if;
  elsif v_id like 'BGL-II-DEP-%' then
    v_prefix := 'BGL-II-DEP';
    select verification_id, memo_no, issue_date, applicant_name, null::text, status, rejected_reason, data
      into rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data
      from public.dependent_certificates where verification_id = v_id limit 1;
    if found then rec_kind := 'dependent'; rec_type_label := 'Dependent Certificate'; end if;
  else
    insert into public.verification_lookups(ip_hash, verification_id, found) values (_ip_hash, v_id, false);
    return jsonb_build_object('status','not_found');
  end if;
  insert into public.verification_lookups(ip_hash, verification_id, found) values (_ip_hash, v_id, rec_kind is not null);
  if rec_kind is null then return jsonb_build_object('status','not_found'); end if;
  if rec_vid is null or position(v_prefix in upper(rec_vid)) <> 1 then return jsonb_build_object('status','inconsistent'); end if;
  if rec_status = 'Approved' then
    if rec_kind = 'warish' then
      update public.warish_certificates set verification_count = coalesce(verification_count,0)+1 where verification_id = v_id;
    else
      update public.dependent_certificates set verification_count = coalesce(verification_count,0)+1 where verification_id = v_id;
    end if;
  end if;
  return jsonb_build_object('status','found','kind',rec_kind,'certificate_type',rec_type_label,
    'verification_id',rec_vid,'applicant_name',rec_app,'deceased_name',rec_dec,'record_status',rec_status,
    'memo_no',case when rec_status='Approved' then rec_memo else null end,
    'issue_date',case when rec_status='Approved' then rec_issue else null end,
    'rejected_reason',case when rec_status='Rejected' then rec_reason else null end,
    'record_data',case when rec_status='Approved' then rec_data else null end,
    'issued_by','Bagula II Gram Panchayat','server_time',now());
end $$;
create or replace function public.public_verify(_verification_id text, _ip_hash text)
returns jsonb language sql security invoker set search_path = public, app_private as $$
  select app_private.public_verify(_verification_id, _ip_hash);
$$;
revoke all on function app_private.public_verify(text,text) from public;
grant execute on function app_private.public_verify(text,text) to anon, authenticated, service_role;
revoke all on function public.public_verify(text,text) from public;
grant execute on function public.public_verify(text,text) to anon, authenticated, service_role;

-- Public verify advanced
create or replace function app_private.public_verify_advanced(_memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text)
returns jsonb language plpgsql security definer set search_path = public, app_private as $$
declare rec_kind text; rec_type_label text; rec_vid text; rec_memo text; rec_issue date;
        rec_app text; rec_dec text; rec_status text; rec_reason text; rec_data jsonb;
        recent_count int; v_memo text := trim(_memo_no); v_prefix text;
begin
  select count(*) into recent_count from public.verification_lookups
    where ip_hash = _ip_hash and created_at > now() - interval '10 minutes';
  if recent_count > 20 then return jsonb_build_object('status','rate_limited'); end if;
  select verification_id, memo_no, issue_date, applicant_name, deceased_name, status, rejected_reason, data
    into rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data
    from public.warish_certificates where memo_no = v_memo and issue_date = _issue_date and status = 'Approved' limit 1;
  if found then rec_kind := 'warish'; rec_type_label := 'Warish Certificate'; end if;
  if rec_kind is null then
    select verification_id, memo_no, issue_date, applicant_name, null::text, status, rejected_reason, data
      into rec_vid, rec_memo, rec_issue, rec_app, rec_dec, rec_status, rec_reason, rec_data
      from public.dependent_certificates where memo_no = v_memo and issue_date = _issue_date and status = 'Approved' limit 1;
    if found then rec_kind := 'dependent'; rec_type_label := 'Dependent Certificate'; end if;
  end if;
  insert into public.verification_lookups(ip_hash, verification_id, found) values (_ip_hash, coalesce(rec_vid, v_memo), rec_kind is not null);
  if rec_kind is null then return jsonb_build_object('status','not_found'); end if;
  v_prefix := case rec_kind when 'warish' then 'BGL-II-WAR' else 'BGL-II-DEP' end;
  if rec_vid is null or position(v_prefix in upper(rec_vid)) <> 1 then return jsonb_build_object('status','inconsistent'); end if;
  if rec_kind = 'warish' then
    update public.warish_certificates set verification_count = coalesce(verification_count,0)+1 where verification_id = rec_vid;
  else
    update public.dependent_certificates set verification_count = coalesce(verification_count,0)+1 where verification_id = rec_vid;
  end if;
  return jsonb_build_object('status','found','kind',rec_kind,'certificate_type',rec_type_label,
    'verification_id',rec_vid,'applicant_name',rec_app,'deceased_name',rec_dec,'record_status',rec_status,
    'memo_no',rec_memo,'issue_date',rec_issue,
    'rejected_reason',case when rec_status='Rejected' then rec_reason else null end,
    'record_data',rec_data,'issued_by','Bagula II Gram Panchayat','server_time',now());
end $$;
create or replace function public.public_verify_advanced(_memo_no text, _issue_date date, _aadhaar_last4 text, _ip_hash text)
returns jsonb language sql set search_path = public, app_private as $$
  select app_private.public_verify_advanced(_memo_no, _issue_date, _aadhaar_last4, _ip_hash);
$$;
revoke all on function app_private.public_verify_advanced(text,date,text,text) from public;
grant execute on function app_private.public_verify_advanced(text,date,text,text) to anon, authenticated, service_role;
revoke all on function public.public_verify_advanced(text,date,text,text) from public;
grant execute on function public.public_verify_advanced(text,date,text,text) to anon, authenticated, service_role;

-- Archive certificate (soft delete)
create or replace function app_private.archive_certificate(
  _kind public.cert_kind, _cert_id uuid, _reason text, _ip text default null, _user_agent text default null
) returns void language plpgsql security definer set search_path = public, app_private as $$
declare _actor uuid := auth.uid(); _actor_email text; _issue date; _cert_no text; _table text;
begin
  if _actor is null then raise exception 'auth required'; end if;
  if not public.has_role(_actor, 'super_admin') then raise exception 'only super admins may archive certificates'; end if;
  if _reason is null or length(btrim(_reason)) < 8 then raise exception 'a reason of at least 8 characters is required'; end if;
  select email into _actor_email from auth.users where id = _actor;
  _table := case _kind
    when 'warish' then 'warish_certificates'
    when 'dependent' then 'dependent_certificates'
    when 'birth' then 'birth_certificate_records'
    when 'death' then 'death_certificate_records'
  end;
  execute format('select issue_date, certificate_number from public.%I where id = $1 and archived_at is null', _table)
    into _issue, _cert_no using _cert_id;
  if _cert_no is null and _issue is null then raise exception 'certificate not found or already archived'; end if;
  if _issue is null or _issue > (current_date - interval '1 year') then
    raise exception 'certificates may not be archived until one year after issue';
  end if;
  execute format('update public.%I set archived_at = now(), archived_by = $1, archive_reason = $2 where id = $3', _table)
    using _actor, _reason, _cert_id;
  insert into public.certificate_audit_logs(cert_kind, cert_table, cert_id, certificate_number, action,
    actor_user_id, actor_email, reason, ip_address, user_agent)
    values (_kind, _table, _cert_id, _cert_no, 'archived', _actor, _actor_email, _reason, _ip, _user_agent);
end $$;
create or replace function public.archive_certificate(
  _kind public.cert_kind, _cert_id uuid, _reason text, _ip text default null, _user_agent text default null
) returns void language sql security invoker set search_path = public, app_private as $$
  select app_private.archive_certificate(_kind, _cert_id, _reason, _ip, _user_agent);
$$;
revoke all on function app_private.archive_certificate(public.cert_kind, uuid, text, text, text) from public, anon;
grant execute on function app_private.archive_certificate(public.cert_kind, uuid, text, text, text) to authenticated;
revoke all on function public.archive_certificate(public.cert_kind, uuid, text, text, text) from public, anon;
grant execute on function public.archive_certificate(public.cert_kind, uuid, text, text, text) to authenticated;

grant usage on schema public to anon, authenticated, service_role;