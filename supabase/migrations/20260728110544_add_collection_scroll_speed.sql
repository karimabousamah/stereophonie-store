alter table public.homepage_settings
  add column if not exists collections_auto_scroll_speed text
  not null
  default 'normal';

update public.homepage_settings
set collections_auto_scroll_speed = 'normal'
where collections_auto_scroll_speed is null
   or collections_auto_scroll_speed not in ('slow', 'normal', 'fast');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'homepage_settings_collections_auto_scroll_speed_check'
  ) then
    alter table public.homepage_settings
      add constraint homepage_settings_collections_auto_scroll_speed_check
      check (
        collections_auto_scroll_speed in ('slow', 'normal', 'fast')
      );
  end if;
end
$$;
