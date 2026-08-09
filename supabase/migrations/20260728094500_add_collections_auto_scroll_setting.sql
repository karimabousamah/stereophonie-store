alter table public.homepage_settings
  add column if not exists collections_auto_scroll_enabled boolean
  not null
  default true;

update public.homepage_settings
set collections_auto_scroll_enabled = true
where collections_auto_scroll_enabled is null;
