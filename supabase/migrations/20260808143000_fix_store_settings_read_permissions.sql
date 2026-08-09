-- =========================================================
-- STEREOPHONIE
-- Public storefront settings read permissions
-- =========================================================

-- The storefront needs to read safe public settings such as:
-- store name
-- support contact information
-- delivery configuration
-- AI assistant availability
-- store operational / maintenance status
--
-- This does NOT expose passwords, Supabase keys,
-- authentication credentials, or environment variables.

alter table public.store_settings
enable row level security;

-- PostgreSQL table-level permissions.
grant select on table public.store_settings to anon;
grant select on table public.store_settings to authenticated;
grant select on table public.store_settings to service_role;

-- Recreate the public read policy safely.
drop policy if exists
  "Public can read store settings"
on public.store_settings;

create policy
  "Public can read store settings"
on public.store_settings
for select
to anon, authenticated
using (id = 'default');

