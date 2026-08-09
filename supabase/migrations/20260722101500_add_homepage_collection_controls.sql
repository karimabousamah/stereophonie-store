alter table public.homepage_settings
  add column if not exists collections_enabled boolean not null default true,
  add column if not exists collections_eyebrow text not null default 'Curated selections',
  add column if not exists collections_heading text not null default 'Collections',
  add column if not exists collections_button_label text not null default 'View all collections',
  add column if not exists collections_button_href text not null default '/collections',
  add column if not exists collections_limit integer not null default 4;

update public.homepage_settings
set
  collections_enabled =
    coalesce(collections_enabled, true),

  collections_eyebrow =
    coalesce(
      nullif(trim(collections_eyebrow), ''),
      'Curated selections'
    ),

  collections_heading =
    coalesce(
      nullif(trim(collections_heading), ''),
      'Collections'
    ),

  collections_button_label =
    coalesce(
      nullif(trim(collections_button_label), ''),
      'View all collections'
    ),

  collections_button_href =
    coalesce(
      nullif(trim(collections_button_href), ''),
      '/collections'
    ),

  collections_limit =
    greatest(
      1,
      least(
        coalesce(collections_limit, 4),
        6
      )
    )
where id = 'default';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'homepage_settings_collections_limit_check'
  ) then
    alter table public.homepage_settings
      add constraint
        homepage_settings_collections_limit_check
      check (
        collections_limit >= 1
        and collections_limit <= 6
      );
  end if;
end
$$;
