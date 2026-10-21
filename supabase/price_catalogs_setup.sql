-- Run once in the Supabase SQL Editor to store private wholesale price catalogs.
-- Admin accounts must already be listed in public.admin_users. Staff accounts
-- allowed to view/download the catalog belong in catalog_staff_users.

create table if not exists public.catalog_staff_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.catalog_staff_users enable row level security;
drop policy if exists "Staff can read their own catalog access" on public.catalog_staff_users;
create policy "Staff can read their own catalog access"
  on public.catalog_staff_users for select to authenticated
  using (auth.uid() = user_id);
revoke all on public.catalog_staff_users from anon, public;
grant select on public.catalog_staff_users to authenticated;

create table if not exists public.price_catalogs (
  id text primary key,
  title text not null default '',
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.price_catalogs enable row level security;

drop policy if exists "Admins can manage price catalogs" on public.price_catalogs;
create policy "Admins can manage price catalogs"
  on public.price_catalogs
  for all
  to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Staff can view price catalogs" on public.price_catalogs;
create policy "Staff can view price catalogs"
  on public.price_catalogs for select to authenticated
  using (exists (select 1 from public.catalog_staff_users where user_id = auth.uid()));

revoke all on public.price_catalogs from anon, public;
grant select, insert, update, delete on public.price_catalogs to authenticated;

-- After creating a staff account in Authentication > Users, grant viewer access:
-- insert into public.catalog_staff_users (user_id)
-- select id from auth.users where email = 'STAFF_EMAIL'
-- on conflict (user_id) do nothing;
