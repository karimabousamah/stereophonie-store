-- ============================================================
-- STEREOPHONIE
-- HOMEPAGE HERO MIXED MEDIA
-- ============================================================
--
-- Adds an ordered mixed-media collection for the homepage hero.
--
-- Supported media:
--   - image
--   - video
--
-- IMPORTANT:
-- The existing homepage_settings.hero_image_url and
-- homepage_settings.hero_image_storage_path are deliberately
-- preserved as the legacy/fallback hero.
--
-- No existing homepage data is removed or rewritten.
-- ============================================================


create table if not exists public.homepage_hero_media (
  id uuid primary key default gen_random_uuid(),

  media_type text not null,

  media_url text not null,

  storage_path text not null,

  sort_order integer not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint homepage_hero_media_type_check
    check (media_type in ('image', 'video')),

  constraint homepage_hero_media_url_not_empty_check
    check (length(trim(media_url)) > 0),

  constraint homepage_hero_media_storage_path_not_empty_check
    check (length(trim(storage_path)) > 0),

  constraint homepage_hero_media_sort_order_check
    check (sort_order >= 0)
);


-- ------------------------------------------------------------
-- ORDER / STOREFRONT LOOKUP
-- ------------------------------------------------------------

create index if not exists
  homepage_hero_media_active_order_idx
on public.homepage_hero_media (
  is_active,
  sort_order,
  created_at
);


-- ------------------------------------------------------------
-- UPDATED_AT
-- ------------------------------------------------------------

create or replace function public.set_homepage_hero_media_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
  homepage_hero_media_set_updated_at
on public.homepage_hero_media;


create trigger
  homepage_hero_media_set_updated_at
before update
on public.homepage_hero_media
for each row
execute function public.set_homepage_hero_media_updated_at();


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.homepage_hero_media
enable row level security;


-- ------------------------------------------------------------
-- PUBLIC STOREFRONT READ
-- ------------------------------------------------------------

drop policy if exists
  "homepage hero media public read"
on public.homepage_hero_media;


create policy
  "homepage hero media public read"
on public.homepage_hero_media
for select
to anon, authenticated
using (
  is_active = true
);


-- ------------------------------------------------------------
-- ACTIVE ADMIN INSERT
-- ------------------------------------------------------------

drop policy if exists
  "homepage hero media admin insert"
on public.homepage_hero_media;


create policy
  "homepage hero media admin insert"
on public.homepage_hero_media
for insert
to authenticated
with check (
  exists (
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
  "homepage hero media admin update"
on public.homepage_hero_media;


create policy
  "homepage hero media admin update"
on public.homepage_hero_media
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
)
with check (
  exists (
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
  "homepage hero media admin delete"
on public.homepage_hero_media;


create policy
  "homepage hero media admin delete"
on public.homepage_hero_media
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
);


-- ------------------------------------------------------------
-- GRANTS
-- ------------------------------------------------------------

grant select
on table public.homepage_hero_media
to anon, authenticated;

grant insert, update, delete
on table public.homepage_hero_media
to authenticated;


-- ============================================================
-- END
-- ============================================================
