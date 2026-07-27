-- Public image bucket for product and gallery uploads.
-- Run this once in Supabase SQL Editor.

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read site images" on storage.objects;
drop policy if exists "Public upload site images" on storage.objects;
drop policy if exists "Public update site images" on storage.objects;
drop policy if exists "Public delete site images" on storage.objects;

create policy "Public read site images"
on storage.objects for select
to anon
using (bucket_id = 'site-images');

create policy "Public upload site images"
on storage.objects for insert
to anon
with check (bucket_id = 'site-images');

create policy "Public update site images"
on storage.objects for update
to anon
using (bucket_id = 'site-images')
with check (bucket_id = 'site-images');

create policy "Public delete site images"
on storage.objects for delete
to anon
using (bucket_id = 'site-images');
