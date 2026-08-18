
-- ============================================================
-- STEREOPHONIE
-- Exact 7-day NEW DROP lifecycle
-- ============================================================

alter table public.products
  add column if not exists new_drop_started_at timestamptz;

comment on column public.products.new_drop_started_at is
  'Timestamp from which the automatic seven-day NEW DROP period begins.';

-- ------------------------------------------------------------
-- Trigger:
--
-- A NEW DROP timer begins when:
-- 1. a product is published with is_new_arrival = true
-- 2. a draft becomes published while marked new
-- 3. an already-published product is newly marked as new
--
-- Ordinary product edits DO NOT reset the timer.
-- ------------------------------------------------------------

create or replace function public.manage_new_drop_started_at()
returns trigger
language plpgsql
as $$
begin
  if
    new.status = 'published'
    and coalesce(new.is_new_arrival, false) = true
  then

    if tg_op = 'INSERT' then
      if new.new_drop_started_at is null then
        new.new_drop_started_at := now();
      end if;

    elsif
      old.status is distinct from 'published'
      or coalesce(old.is_new_arrival, false) = false
    then
      new.new_drop_started_at := now();

    end if;

  else
    -- Turning NEW DROP off cancels the active timer.
    if coalesce(new.is_new_arrival, false) = false then
      new.new_drop_started_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists products_manage_new_drop_started_at
on public.products;

create trigger products_manage_new_drop_started_at
before insert or update of status, is_new_arrival
on public.products
for each row
execute function public.manage_new_drop_started_at();

-- ------------------------------------------------------------
-- Existing NEW DROP products
--
-- We do not know their historical exact publish timestamp.
-- created_at is the safest historical fallback, preventing old
-- products from incorrectly receiving another fresh seven days.
-- All products published after this migration use the exact
-- publication transition timestamp.
-- ------------------------------------------------------------

update public.products
set new_drop_started_at = created_at
where
  status = 'published'
  and coalesce(is_new_arrival, false) = true
  and new_drop_started_at is null;

create index if not exists products_active_new_drop_idx
on public.products (
  is_new_arrival,
  new_drop_started_at desc
)
where
  status = 'published'
  and is_new_arrival = true;
