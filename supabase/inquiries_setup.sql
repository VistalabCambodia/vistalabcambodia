-- Run or rerun in the Supabase SQL Editor to store public inquiries securely.
-- Visitors may submit inquiries. Only approved admins can read or update them.

create table if not exists public.inquiries (
  id text primary key,
  type text not null default 'General Contact',
  name text not null,
  business text not null default '',
  phone text not null default '',
  telegram text not null default '',
  province text not null default '',
  status text not null default 'New' check (status in ('New', 'In Progress', 'Contacted')),
  date date not null default current_date,
  details text not null default '',
  product text not null default '',
  brand text not null default '',
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

drop policy if exists "Visitors can submit inquiries" on public.inquiries;
create policy "Visitors can submit inquiries"
  on public.inquiries for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 160
    and char_length(id) between 1 and 100
    and type in ('General', 'General Contact', 'Product Inquiry')
    and status = 'New'
    and date = current_date
    and created_at between now() - interval '5 minutes' and now() + interval '5 minutes'
    and char_length(details) <= 5000
    and char_length(phone) <= 80
    and char_length(business) <= 200
    and char_length(telegram) <= 80
    and char_length(province) <= 100
    and char_length(product) <= 160
    and char_length(brand) <= 160
  );

drop policy if exists "Admins can read inquiries" on public.inquiries;
create policy "Admins can read inquiries"
  on public.inquiries for select to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Admins can update inquiries" on public.inquiries;
create policy "Admins can update inquiries"
  on public.inquiries for update to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

revoke all on public.inquiries from anon, public;
grant insert on public.inquiries to anon, authenticated;
grant select, update on public.inquiries to authenticated;
