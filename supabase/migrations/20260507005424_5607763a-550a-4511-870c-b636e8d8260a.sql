-- Roles
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

-- Bootstrap: first signed-in user can self-promote when no admins exist
create or replace function public.claim_admin_if_unowned()
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  has_any boolean;
begin
  if auth.uid() is null then return false; end if;
  select exists(select 1 from public.user_roles where role = 'admin') into has_any;
  if has_any then return false; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin')
    on conflict do nothing;
  return true;
end; $$;
grant execute on function public.claim_admin_if_unowned() to authenticated;