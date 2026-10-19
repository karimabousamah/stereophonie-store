-- ============================================================
-- STEREOPHONIE
-- Preserve additional product category selection order
-- ============================================================

alter table public.product_category_assignments
add column if not exists display_position integer;


-- Existing assignments did not previously store their UI order.
-- Give them a deterministic initial ordering.
with ranked as (
  select
    id,
    row_number() over (
      partition by product_id
      order by created_at asc, id asc
    ) - 1 as position
  from public.product_category_assignments
)
update public.product_category_assignments as assignment
set display_position = ranked.position
from ranked
where assignment.id = ranked.id
  and assignment.display_position is null;


update public.product_category_assignments
set display_position = 0
where display_position is null;


alter table public.product_category_assignments
alter column display_position set default 0;


alter table public.product_category_assignments
alter column display_position set not null;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where
      conname =
        'product_category_assignments_display_position_nonnegative'
      and conrelid =
        'public.product_category_assignments'::regclass
  ) then
    alter table public.product_category_assignments
    add constraint
      product_category_assignments_display_position_nonnegative
    check (display_position >= 0);
  end if;
end
$$;


create index if not exists
  product_category_assignments_product_position_idx
on public.product_category_assignments (
  product_id,
  display_position,
  created_at,
  id
);


comment on column
  public.product_category_assignments.display_position
is
  'Zero-based ordering of additional category destinations after the canonical product destination.';
