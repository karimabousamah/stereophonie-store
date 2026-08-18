-- ============================================================
-- STEREOPHONIE
-- Homepage / Choose Your Mode category controls
-- ============================================================

alter table public.categories
  add column if not exists show_on_homepage boolean not null default true;

-- image_url already exists in the current Stereophonie schema.
-- Do not duplicate it.

create index if not exists categories_homepage_sort_idx
  on public.categories (
    show_on_homepage,
    is_active,
    sort_order,
    name
  );

-- Dedicated public storage bucket for category wallpapers.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'category-images',
  'category-images',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public storefront may read category wallpapers.
drop policy if exists "Public category images are readable"
on storage.objects;

create policy "Public category images are readable"
on storage.objects
for select
using (bucket_id = 'category-images');

-- Authenticated admin uploads.
drop policy if exists "Authenticated users can upload category images"
on storage.objects;

create policy "Authenticated users can upload category images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'category-images');

drop policy if exists "Authenticated users can update category images"
on storage.objects;

create policy "Authenticated users can update category images"
on storage.objects
for update
to authenticated
using (bucket_id = 'category-images')
with check (bucket_id = 'category-images');

drop policy if exists "Authenticated users can delete category images"
on storage.objects;

create policy "Authenticated users can delete category images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'category-images');
