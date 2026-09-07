alter table public.products
  add column if not exists offer_started_at timestamptz,
  add column if not exists discovering_started_at timestamptz,
  add column if not exists coming_soon_started_at timestamptz;

comment on column public.products.offer_started_at is
  'Timestamp when a published product most recently entered More for Less.';

comment on column public.products.discovering_started_at is
  'Timestamp when a published product most recently entered Worth Discovering.';

comment on column public.products.coming_soon_started_at is
  'Timestamp when a published product most recently entered aggregate Coming Soon availability.';


create or replace function public.manage_discovering_started_at()
returns trigger
language plpgsql
as $$
declare
  new_active boolean;
  old_active boolean;
begin
  new_active :=
    new.status = 'published'
    and (
      coalesce(new.is_featured, false)
      or coalesce(new.is_trending, false)
    );

  if tg_op = 'INSERT' then
    if new_active then
      if new.discovering_started_at is null then
        new.discovering_started_at := now();
      end if;
    else
      new.discovering_started_at := null;
    end if;

    return new;
  end if;

  old_active :=
    old.status = 'published'
    and (
      coalesce(old.is_featured, false)
      or coalesce(old.is_trending, false)
    );

  if new_active then
    if not old_active then
      new.discovering_started_at := now();
    end if;
  else
    new.discovering_started_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists products_manage_discovering_started_at
on public.products;

create trigger products_manage_discovering_started_at
before insert or update of status, is_featured, is_trending
on public.products
for each row
execute function public.manage_discovering_started_at();


create or replace function public.manage_coming_soon_started_at()
returns trigger
language plpgsql
as $$
declare
  new_active boolean;
  old_active boolean;
begin
  new_active :=
    new.status = 'published'
    and new.availability = 'coming_soon';

  if tg_op = 'INSERT' then
    if new_active then
      if new.coming_soon_started_at is null then
        new.coming_soon_started_at := now();
      end if;
    else
      new.coming_soon_started_at := null;
    end if;

    return new;
  end if;

  old_active :=
    old.status = 'published'
    and old.availability = 'coming_soon';

  if new_active then
    if not old_active then
      new.coming_soon_started_at := now();
    end if;
  else
    new.coming_soon_started_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists products_manage_coming_soon_started_at
on public.products;

create trigger products_manage_coming_soon_started_at
before insert or update of status, availability
on public.products
for each row
execute function public.manage_coming_soon_started_at();


create or replace function public.refresh_product_offer_started_at(
  target_product_id uuid
)
returns void
language plpgsql
as $$
declare
  product_status text;
  current_started_at timestamptz;
  has_offer boolean;
begin
  select
    p.status,
    p.offer_started_at
  into
    product_status,
    current_started_at
  from public.products p
  where p.id = target_product_id;

  if not found then
    return;
  end if;

  select exists (
    select 1
    from public.product_variants v
    where
      v.product_id = target_product_id
      and coalesce(v.is_active, true) = true
      and coalesce(v.regular_price, 0) > 0
      and coalesce(v.sale_price, 0) > 0
      and v.sale_price < v.regular_price
  )
  into has_offer;

  if product_status = 'published' and has_offer then
    if current_started_at is null then
      update public.products
      set offer_started_at = now()
      where id = target_product_id;
    end if;
  else
    if current_started_at is not null then
      update public.products
      set offer_started_at = null
      where id = target_product_id;
    end if;
  end if;
end;
$$;


create or replace function public.manage_product_offer_variant_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_product_offer_started_at(old.product_id);
    return old;
  end if;

  perform public.refresh_product_offer_started_at(new.product_id);

  if
    tg_op = 'UPDATE'
    and old.product_id is distinct from new.product_id
  then
    perform public.refresh_product_offer_started_at(old.product_id);
  end if;

  return new;
end;
$$;

drop trigger if exists product_variants_manage_offer_started_at
on public.product_variants;

create trigger product_variants_manage_offer_started_at
after insert or update of
  product_id,
  regular_price,
  sale_price,
  is_active
or delete
on public.product_variants
for each row
execute function public.manage_product_offer_variant_change();


create or replace function public.manage_product_offer_publication()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_product_offer_started_at(new.id);
  return new;
end;
$$;

drop trigger if exists products_manage_offer_publication
on public.products;

create trigger products_manage_offer_publication
after insert or update of status
on public.products
for each row
execute function public.manage_product_offer_publication();


update public.products
set discovering_started_at = coalesce(published_at, created_at)
where
  status = 'published'
  and (
    coalesce(is_featured, false)
    or coalesce(is_trending, false)
  )
  and discovering_started_at is null;

update public.products
set coming_soon_started_at = coalesce(published_at, created_at)
where
  status = 'published'
  and availability = 'coming_soon'
  and coming_soon_started_at is null;

update public.products p
set offer_started_at = coalesce(p.published_at, p.created_at)
where
  p.status = 'published'
  and p.offer_started_at is null
  and exists (
    select 1
    from public.product_variants v
    where
      v.product_id = p.id
      and coalesce(v.is_active, true) = true
      and coalesce(v.regular_price, 0) > 0
      and coalesce(v.sale_price, 0) > 0
      and v.sale_price < v.regular_price
  );

create index if not exists products_homepage_offer_started_idx
on public.products (offer_started_at desc)
where status = 'published' and offer_started_at is not null;

create index if not exists products_homepage_discovering_started_idx
on public.products (discovering_started_at desc)
where status = 'published' and discovering_started_at is not null;

create index if not exists products_homepage_coming_soon_started_idx
on public.products (coming_soon_started_at desc)
where status = 'published' and coming_soon_started_at is not null;
