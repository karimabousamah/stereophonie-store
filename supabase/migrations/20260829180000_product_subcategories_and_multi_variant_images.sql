-- ============================================================
-- STEREOPHONIE
-- Product subcategories + multi-configuration photographs
-- ============================================================


-- ============================================================
-- 1. SUBCATEGORIES
--
-- Keep the existing categories table as the TOP-LEVEL category
-- directory used by homepage/header/shop navigation.
--
-- Subcategories live separately so they never accidentally
-- appear in CHOOSE YOUR MODE or the header.
-- ============================================================

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),

  category_id uuid not null
    references public.categories(id)
    on update cascade
    on delete cascade,

  name text not null,
  slug text not null,
  description text,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists
  subcategories_category_name_unique
on public.subcategories (
  category_id,
  lower(name)
);

create unique index if not exists
  subcategories_category_slug_unique
on public.subcategories (
  category_id,
  slug
);

create index if not exists
  subcategories_category_lookup_idx
on public.subcategories (
  category_id,
  is_active,
  sort_order,
  name
);


-- ============================================================
-- 2. PRODUCTS MAY HAVE ONE OPTIONAL SUBCATEGORY
--
-- category_id remains the top-level category.
-- subcategory_id is dependent on category_id.
-- ============================================================

alter table public.products
  add column if not exists subcategory_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_subcategory_id_fkey'
  ) then
    alter table public.products
      add constraint products_subcategory_id_fkey
      foreign key (subcategory_id)
      references public.subcategories(id)
      on update cascade
      on delete set null;
  end if;
end $$;

create index if not exists
  products_subcategory_id_idx
on public.products(subcategory_id);


-- Database-level protection against:
--
-- Category = Phones
-- Subcategory = Gaming Laptops
--
-- if that subcategory belongs to another category.

create or replace function public.validate_product_subcategory()
returns trigger
language plpgsql
as $$
declare
  parent_category uuid;
begin
  if new.subcategory_id is null then
    return new;
  end if;

  select category_id
  into parent_category
  from public.subcategories
  where id = new.subcategory_id;

  if parent_category is null then
    raise exception 'Selected subcategory does not exist.';
  end if;

  if parent_category is distinct from new.category_id then
    raise exception
      'Selected subcategory does not belong to the selected category.';
  end if;

  return new;
end;
$$;

drop trigger if exists products_validate_subcategory
on public.products;

create trigger products_validate_subcategory
before insert or update of category_id, subcategory_id
on public.products
for each row
execute function public.validate_product_subcategory();


-- ============================================================
-- 3. MANY-TO-MANY PRODUCT IMAGE CONFIGURATION ASSIGNMENTS
--
-- One physical product_images row may belong to:
--
--   Graphite / 40mm
--   Graphite / 44mm
--
-- simultaneously.
--
-- ZERO rows in this table means:
--   photograph is Shared with all configurations.
-- ============================================================

create table if not exists public.product_image_variants (
  image_id uuid not null
    references public.product_images(id)
    on update cascade
    on delete cascade,

  variant_id uuid not null
    references public.product_variants(id)
    on update cascade
    on delete cascade,

  position integer not null default 0,
  is_primary boolean not null default false,

  created_at timestamptz not null default now(),

  primary key (image_id, variant_id)
);

create index if not exists
  product_image_variants_variant_order_idx
on public.product_image_variants (
  variant_id,
  position,
  image_id
);

create index if not exists
  product_image_variants_image_idx
on public.product_image_variants(image_id);


-- ============================================================
-- 4. IMAGE / CONFIGURATION SAFETY
--
-- A photograph from Product A may never be linked to a variant
-- belonging to Product B.
-- ============================================================

create or replace function public.validate_product_image_variant()
returns trigger
language plpgsql
as $$
declare
  image_product uuid;
  variant_product uuid;
begin
  select product_id
  into image_product
  from public.product_images
  where id = new.image_id;

  select product_id
  into variant_product
  from public.product_variants
  where id = new.variant_id;

  if image_product is null then
    raise exception 'Product photograph does not exist.';
  end if;

  if variant_product is null then
    raise exception 'Product configuration does not exist.';
  end if;

  if image_product is distinct from variant_product then
    raise exception
      'Photograph and configuration belong to different products.';
  end if;

  return new;
end;
$$;

drop trigger if exists product_image_variants_validate
on public.product_image_variants;

create trigger product_image_variants_validate
before insert or update
on public.product_image_variants
for each row
execute function public.validate_product_image_variant();


-- ============================================================
-- 5. BACKFILL CURRENT SINGLE-CONFIGURATION PHOTOGRAPHS
--
-- Existing assignments are preserved.
--
-- product_images.variant_id IS NULL:
--     stays Shared with all.
--
-- product_images.variant_id IS NOT NULL:
--     copied into the new junction table.
--
-- Legacy columns are deliberately NOT removed yet.
-- ============================================================

insert into public.product_image_variants (
  image_id,
  variant_id,
  position,
  is_primary
)
select
  image.id,
  image.variant_id,
  coalesce(image.variant_position, 0),
  coalesce(image.is_variant_primary, false)
from public.product_images as image
where image.variant_id is not null
on conflict (image_id, variant_id)
do nothing;


-- ============================================================
-- 6. RLS
-- ============================================================

alter table public.subcategories enable row level security;
alter table public.product_image_variants enable row level security;


drop policy if exists
  "Public can read subcategories"
on public.subcategories;

create policy
  "Public can read subcategories"
on public.subcategories
for select
using (true);


drop policy if exists
  "Public can read product image variants"
on public.product_image_variants;

create policy
  "Public can read product image variants"
on public.product_image_variants
for select
using (true);


drop policy if exists
  "Administrators can manage subcategories"
on public.subcategories;

create policy
  "Administrators can manage subcategories"
on public.subcategories
for all
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


drop policy if exists
  "Administrators can manage image configurations"
on public.product_image_variants;

create policy
  "Administrators can manage image configurations"
on public.product_image_variants
for all
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


comment on table public.subcategories is
  'Dependent product subcategories. Top-level categories remain in public.categories.';

comment on column public.products.subcategory_id is
  'Optional subcategory belonging to products.category_id.';

comment on table public.product_image_variants is
  'Many-to-many links between product photographs and product configurations. No rows for an image means shared with all configurations.';

