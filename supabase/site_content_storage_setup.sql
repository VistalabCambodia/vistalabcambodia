-- Run once in Supabase SQL Editor to share site banners, brand images, flags, and news covers.
-- Admin accounts must already be listed in public.admin_users.

create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  brands jsonb not null default '[]'::jsonb,
  news jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists "Anyone can view site content" on public.site_content;
create policy "Anyone can view site content"
  on public.site_content for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add site content" on public.site_content;
create policy "Admins can add site content"
  on public.site_content for insert to authenticated
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "Admins can edit site content" on public.site_content;
create policy "Admins can edit site content"
  on public.site_content for update to authenticated
  using (exists (select 1 from public.admin_users where user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users where user_id = auth.uid()));

grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images"
  on storage.objects for select to public
  using (bucket_id = 'site-images');

drop policy if exists "Admins can upload site images" on storage.objects;
create policy "Admins can upload site images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-images'
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );

drop policy if exists "Admins can update site images" on storage.objects;
create policy "Admins can update site images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'site-images'
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  )
  with check (
    bucket_id = 'site-images'
    and exists (select 1 from public.admin_users where user_id = auth.uid())
  );
