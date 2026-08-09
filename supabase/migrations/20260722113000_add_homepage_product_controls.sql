alter table public.homepage_settings
  add column if not exists products_enabled boolean not null default true,
  add column if not exists products_limit integer not null default 4,
  add column if not exists products_sort_mode text not null default 'featured_first';

update public.homepage_settings
set
  products_enabled =
    coalesce(products_enabled, true),

  products_limit =
    case
      when products_limit <= 4 then 4
      when products_limit <= 8 then 8
      else 12
    end,

  products_sort_mode =
    case
      when products_sort_mode in (
        'newest',
        'featured_first',
        'new_arrivals_first'
      )
      then products_sort_mode
      else 'featured_first'
    end
where id = 'default';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'homepage_settings_products_limit_check'
  ) then
    alter table public.homepage_settings
      add constraint
        homepage_settings_products_limit_check
      check (
        products_limit in (4, 8, 12)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'homepage_settings_products_sort_mode_check'
  ) then
    alter table public.homepage_settings
      add constraint
        homepage_settings_products_sort_mode_check
      check (
        products_sort_mode in (
          'newest',
          'featured_first',
          'new_arrivals_first'
        )
      );
  end if;
end
$$;
