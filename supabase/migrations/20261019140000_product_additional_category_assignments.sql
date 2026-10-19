-- ============================================================
-- STEREOPHONIE
-- Additional product category / subcategory placements
-- ============================================================
--
-- IMPORTANT ARCHITECTURE
--
-- products.category_id + products.subcategory_id remain the
-- canonical PRIMARY product destination.
--
-- This table stores ONLY ADDITIONAL storefront destinations.
--
-- Therefore:
-- - existing products need no backfill
-- - old storefront/admin behavior remains valid
-- - one physical product can appear in several category paths
-- - product data, inventory, media and configurations stay singular
-- ============================================================


-- ============================================================
-- 1. ADDITIONAL PRODUCT DESTINATIONS
-- ============================================================

create table if not exists public.product_category_assignments (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on update cascade
    on delete cascade,

  category_id uuid not null
    references public.categories(id)
    on update cascade
    on delete cascade,

  subcategory_id uuid
    references public.subcategories(id)
    on update cascade
    on delete cascade,

  created_at timestamptz not null default now()
);


-- A root-category destination may only be added once per product.

create unique index if not exists
  product_category_assignments_root_unique
on public.product_category_assignments (
  product_id,
  category_id
)
where subcategory_id is null;


-- A leaf-subcategory destination may only be added once per product.

create unique index if not exists
  product_category_assignments_leaf_unique
on public.product_category_assignments (
  product_id,
  category_id,
  subcategory_id
)
where subcategory_id is not null;


-- Fast product -> additional placements lookup.

create index if not exists
  product_category_assignments_product_idx
on public.product_category_assignments (
  product_id
);


-- Fast storefront category / subcategory lookup.

create index if not exists
  product_category_assignments_destination_idx
on public.product_category_assignments (
  category_id,
  subcategory_id,
  product_id
);


-- ============================================================
-- 2. CATEGORY / SUBCATEGORY INTEGRITY
-- ============================================================
--
-- Prevent impossible relationships such as:
--
-- Category: Phones
-- Subcategory: Gaming Laptops
--
-- when the selected Subcategory belongs to another Category.
-- ============================================================

create or replace function
  public.validate_product_category_assignment()
returns trigger
language plpgsql
as $$
declare
  owning_category uuid;
begin
  if new.subcategory_id is null then
    return new;
  end if;

  select category_id
  into owning_category
  from public.subcategories
  where id = new.subcategory_id;

  if owning_category is null then
    raise exception
      'Selected additional subcategory does not exist.';
  end if;

  if owning_category is distinct from new.category_id then
    raise exception
      'Selected additional subcategory does not belong to the selected category.';
  end if;

  return new;
end;
$$;


drop trigger if exists
  product_category_assignments_validate
on public.product_category_assignments;


create trigger
  product_category_assignments_validate
before insert or update of category_id, subcategory_id
on public.product_category_assignments
for each row
execute function
  public.validate_product_category_assignment();


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table
  public.product_category_assignments
enable row level security;


drop policy if exists
  "Public can read product category assignments"
on public.product_category_assignments;


create policy
  "Public can read product category assignments"
on public.product_category_assignments
for select
using (true);


drop policy if exists
  "Administrators can manage product category assignments"
on public.product_category_assignments;


create policy
  "Administrators can manage product category assignments"
on public.product_category_assignments
for all
using (
  public.is_active_admin()
)
with check (
  public.is_active_admin()
);


-- ============================================================
-- 4. TABLE PRIVILEGES
-- ============================================================

grant all
on table public.product_category_assignments
to postgres, service_role;

grant select
on table public.product_category_assignments
to anon;

grant select, insert, update, delete
on table public.product_category_assignments
to authenticated;


comment on table public.product_category_assignments is
  'Additional product category/subcategory storefront placements. The canonical Primary placement remains products.category_id + products.subcategory_id.';
