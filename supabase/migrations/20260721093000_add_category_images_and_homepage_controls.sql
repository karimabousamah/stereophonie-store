alter table public.categories
  add column if not exists image_url text,
  add column if not exists storage_path text;

alter table public.homepage_settings
  add column if not exists categories_enabled boolean not null default true,
  add column if not exists categories_limit integer not null default 6;

update public.homepage_settings
set
  categories_enabled = coalesce(categories_enabled, true),
  categories_limit = greatest(
    1,
    least(
      coalesce(categories_limit, 6),
      12
    )
  )
where id = 'default';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'homepage_settings_categories_limit_check'
  ) then
    alter table public.homepage_settings
      add constraint homepage_settings_categories_limit_check
      check (
        categories_limit >= 1
        and categories_limit <= 12
      );
  end if;
end
$$;
