alter table public.homepage_settings
  add column if not exists manual_product_ids uuid[]
  not null
  default '{}'::uuid[];

update public.homepage_settings
set manual_product_ids = '{}'::uuid[]
where manual_product_ids is null;

alter table public.homepage_settings
  drop constraint if exists
  homepage_settings_products_sort_mode_check;

alter table public.homepage_settings
  add constraint
  homepage_settings_products_sort_mode_check
  check (
    products_sort_mode in (
      'newest',
      'featured_first',
      'new_arrivals_first',
      'manual'
    )
  );
