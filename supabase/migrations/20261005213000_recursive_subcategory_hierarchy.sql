-- ============================================================
-- STEREOPHONIE
-- Recursive category hierarchy
--
-- Top-level storefront departments remain in public.categories.
-- Existing public.subcategories is extended into a recursive tree.
--
-- This deliberately preserves:
--   products.category_id    -> root category
--   products.subcategory_id -> optional node inside that category
-- ============================================================


-- ============================================================
-- 1. HIERARCHY + PRESENTATION
-- ============================================================

alter table public.subcategories
  add column if not exists parent_subcategory_id uuid,
  add column if not exists image_url text;


-- A subcategory may belong to another subcategory.
-- ON DELETE RESTRICT prevents deleting a parent while children remain.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subcategories_parent_subcategory_id_fkey'
      and conrelid = 'public.subcategories'::regclass
  ) then
    alter table public.subcategories
      add constraint subcategories_parent_subcategory_id_fkey
      foreign key (parent_subcategory_id)
      references public.subcategories(id)
      on update cascade
      on delete restrict;
  end if;
end $$;


create index if not exists
  subcategories_parent_lookup_idx
on public.subcategories (
  category_id,
  parent_subcategory_id,
  is_active,
  sort_order,
  name
);


create index if not exists
  subcategories_parent_subcategory_id_idx
on public.subcategories(parent_subcategory_id);


-- ============================================================
-- 2. HIERARCHY VALIDATION
--
-- Guarantees:
-- - a node cannot parent itself;
-- - parent must belong to the same top-level category;
-- - recursive cycles are rejected.
-- ============================================================

create or replace function public.validate_subcategory_hierarchy()
returns trigger
language plpgsql
as $$
declare
  parent_category uuid;
  cycle_found boolean;
begin
  if new.parent_subcategory_id is null then
    return new;
  end if;

  if new.parent_subcategory_id = new.id then
    raise exception 'A subcategory cannot be its own parent.';
  end if;

  select category_id
  into parent_category
  from public.subcategories
  where id = new.parent_subcategory_id;

  if parent_category is null then
    raise exception 'Selected parent subcategory does not exist.';
  end if;

  if parent_category is distinct from new.category_id then
    raise exception
      'A subcategory parent must belong to the same top-level category.';
  end if;

  with recursive ancestors as (
    select
      id,
      parent_subcategory_id,
      array[id]::uuid[] as visited
    from public.subcategories
    where id = new.parent_subcategory_id

    union all

    select
      parent.id,
      parent.parent_subcategory_id,
      ancestors.visited || parent.id
    from public.subcategories as parent
    join ancestors
      on parent.id = ancestors.parent_subcategory_id
    where not parent.id = any(ancestors.visited)
  )
  select exists (
    select 1
    from ancestors
    where id = new.id
  )
  into cycle_found;

  if cycle_found then
    raise exception 'Subcategory hierarchy cannot contain a cycle.';
  end if;

  return new;
end;
$$;


drop trigger if exists subcategories_validate_hierarchy
on public.subcategories;

create trigger subcategories_validate_hierarchy
before insert or update of
  category_id,
  parent_subcategory_id
on public.subcategories
for each row
execute function public.validate_subcategory_hierarchy();


-- ============================================================
-- 3. PROTECT CATEGORY CHANGES USED BY EXISTING PRODUCTS
--
-- Existing product validation already guarantees that
-- products.subcategory_id belongs to products.category_id.
--
-- This trigger prevents moving an already-used subcategory tree
-- to another root category when that would invalidate products.
-- ============================================================

create or replace function public.protect_subcategory_category_change()
returns trigger
language plpgsql
as $$
begin
  if new.category_id is not distinct from old.category_id then
    return new;
  end if;

  if exists (
    select 1
    from public.products
    where subcategory_id = old.id
  ) then
    raise exception
      'Move products out of this subcategory before changing its top-level category.';
  end if;

  if exists (
    select 1
    from public.subcategories
    where parent_subcategory_id = old.id
  ) then
    raise exception
      'Move child subcategories before changing this subcategory top-level category.';
  end if;

  return new;
end;
$$;


drop trigger if exists subcategories_protect_category_change
on public.subcategories;

create trigger subcategories_protect_category_change
before update of category_id
on public.subcategories
for each row
execute function public.protect_subcategory_category_change();


comment on column public.subcategories.parent_subcategory_id is
  'Optional recursive parent. NULL means the node is directly beneath its top-level category.';

comment on column public.subcategories.image_url is
  'Optional storefront wallpaper/artwork for this category-tree node.';

comment on table public.subcategories is
  'Recursive category-tree nodes beneath public.categories. Every node retains its root category_id for product compatibility.';
