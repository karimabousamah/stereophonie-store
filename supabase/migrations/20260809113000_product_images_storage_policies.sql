-- STEREOPHONIE
-- Secure admin access to the public product-images Storage bucket.
--
-- The bucket is public only for serving image URLs.
-- Upload/update/delete operations remain restricted to active admins.

drop policy if exists
  "Active admins can read product image objects"
on storage.objects;

drop policy if exists
  "Active admins can upload product image objects"
on storage.objects;

drop policy if exists
  "Active admins can update product image objects"
on storage.objects;

drop policy if exists
  "Active admins can delete product image objects"
on storage.objects;


create policy
  "Active admins can read product image objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_active_admin()
);


create policy
  "Active admins can upload product image objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_active_admin()
);


create policy
  "Active admins can update product image objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_active_admin()
)
with check (
  bucket_id = 'product-images'
  and public.is_active_admin()
);


create policy
  "Active admins can delete product image objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and public.is_active_admin()
);
