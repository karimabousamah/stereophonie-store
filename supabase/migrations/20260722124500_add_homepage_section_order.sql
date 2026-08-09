alter table public.homepage_settings
  add column if not exists section_order text[]
  not null
  default array[
    'products',
    'collections',
    'categories'
  ]::text[];

update public.homepage_settings
set section_order =
  array[
    'products',
    'collections',
    'categories'
  ]::text[]
where
  section_order is null
  or array_length(section_order, 1) <> 3
  or not (
    section_order <@
    array[
      'products',
      'collections',
      'categories'
    ]::text[]
  )
  or section_order[1] = section_order[2]
  or section_order[1] = section_order[3]
  or section_order[2] = section_order[3];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'homepage_settings_section_order_check'
  ) then
    alter table public.homepage_settings
      add constraint
        homepage_settings_section_order_check
      check (
        array_length(section_order, 1) = 3
        and section_order <@
          array[
            'products',
            'collections',
            'categories'
          ]::text[]
        and section_order[1] <> section_order[2]
        and section_order[1] <> section_order[3]
        and section_order[2] <> section_order[3]
      );
  end if;
end
$$;
