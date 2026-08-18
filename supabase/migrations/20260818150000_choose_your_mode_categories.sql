
-- ============================================================
-- STEREOPHONIE — CHOOSE YOUR MODE
-- Extend the existing categories system. Do NOT duplicate it.
-- ============================================================

alter table public.categories
  add column if not exists show_on_homepage boolean not null default true;

-- category image_url is already used by the storefront.
alter table public.categories
  add column if not exists image_url text;

create index if not exists categories_homepage_display_idx
  on public.categories (
    show_on_homepage,
    is_active,
    sort_order,
    name
  );

-- ------------------------------------------------------------
-- Category wallpaper bucket
-- ------------------------------------------------------------

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

drop policy if exists "category images public read"
on storage.objects;

create policy "category images public read"
on storage.objects
for select
using (bucket_id = 'category-images');

drop policy if exists "category images authenticated insert"
on storage.objects;

create policy "category images authenticated insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'category-images');

drop policy if exists "category images authenticated update"
on storage.objects;

create policy "category images authenticated update"
on storage.objects
for update
to authenticated
using (bucket_id = 'category-images')
with check (bucket_id = 'category-images');

drop policy if exists "category images authenticated delete"
on storage.objects;

create policy "category images authenticated delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'category-images');

-- ------------------------------------------------------------
-- Requested departments
-- Existing categories are preserved.
-- ------------------------------------------------------------

insert into public.categories (
  name,
  slug,
  description,
  sort_order,
  is_active,
  show_on_homepage
)
select
  value.name,
  value.slug,
  value.description,
  value.sort_order,
  true,
  true
from (
  values
    (
      'Desktops',
      'desktops',
      'Desktop computers and performance workstations.',
      50
    ),
    (
      'Gaming Laptops',
      'gaming-laptops',
      'Portable gaming systems built for high performance.',
      60
    ),
    (
      'Gaming',
      'gaming',
      'Gaming hardware, consoles and accessories.',
      70
    ),
    (
      'Networking',
      'networking',
      'Routers, mesh systems and connected networking hardware.',
      80
    ),
    (
      'Accessories',
      'accessories',
      'Essential technology accessories and everyday add-ons.',
      90
    ),
    (
      'Tablets',
      'tablets',
      'Tablets and portable touch-screen devices.',
      100
    ),
    (
      'Earphones',
      'earphones',
      'Compact wired and wireless personal audio.',
      110
    ),
    (
      'Headphones',
      'headphones',
      'Over-ear and on-ear audio for music, work and gaming.',
      120
    )
) as value(
  name,
  slug,
  description,
  sort_order
)
where not exists (
  select 1
  from public.categories category
  where lower(category.slug) = lower(value.slug)
     or lower(category.name) = lower(value.name)
);
