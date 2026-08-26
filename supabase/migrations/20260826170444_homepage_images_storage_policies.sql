
-- ============================================================
-- STEREOPHONIE
-- HOMEPAGE IMAGES STORAGE ACCESS
-- ============================================================
--
-- Purpose:
--   Allow authenticated active administrators to upload,
--   replace and delete homepage hero images in the
--   `homepage-images` Supabase Storage bucket.
--
-- Public users can read the images because the bucket is used
-- by the public storefront.
--
-- This does NOT modify:
--   - product-images bucket
--   - product database tables
--   - homepage settings RLS
--   - wishlist
--   - orders
--   - customer permissions
-- ============================================================


-- ------------------------------------------------------------
-- PUBLIC READ
-- ------------------------------------------------------------

drop policy if exists
  "Public can read homepage images"
on storage.objects;

create policy
  "Public can read homepage images"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'homepage-images'
);


-- ------------------------------------------------------------
-- ACTIVE ADMIN INSERT
-- ------------------------------------------------------------

drop policy if exists
  "Active admins can upload homepage images"
on storage.objects;

create policy
  "Active admins can upload homepage images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'homepage-images'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
);


-- ------------------------------------------------------------
-- ACTIVE ADMIN UPDATE
-- ------------------------------------------------------------

drop policy if exists
  "Active admins can update homepage images"
on storage.objects;

create policy
  "Active admins can update homepage images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'homepage-images'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
)
with check (
  bucket_id = 'homepage-images'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
);


-- ------------------------------------------------------------
-- ACTIVE ADMIN DELETE
-- ------------------------------------------------------------

drop policy if exists
  "Active admins can delete homepage images"
on storage.objects;

create policy
  "Active admins can delete homepage images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'homepage-images'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
);
