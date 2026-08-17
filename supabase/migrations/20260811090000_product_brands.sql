-- =========================================================
-- STEREOPHONIE — PRODUCT BRANDS
-- =========================================================

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists brands_name_lower_unique
  on public.brands (lower(name));

create unique index if not exists brands_slug_unique
  on public.brands (slug);

alter table public.products
  add column if not exists brand_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_brand_id_fkey'
  ) then
    alter table public.products
      add constraint products_brand_id_fkey
      foreign key (brand_id)
      references public.brands(id)
      on update cascade
      on delete set null;
  end if;
end $$;

create index if not exists products_brand_id_idx
  on public.products (brand_id);

alter table public.brands enable row level security;

drop policy if exists "Public reads active brands" on public.brands;

create policy "Public reads active brands"
  on public.brands
  for select
  to anon, authenticated
  using (
    is_active = true
    or public.is_active_admin()
  );

drop policy if exists "Active admins manage brands" on public.brands;

create policy "Active admins manage brands"
  on public.brands
  for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

grant select on public.brands to anon;
grant select on public.brands to authenticated;
grant all on public.brands to service_role;
