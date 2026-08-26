-- =========================================================
-- HOMEPAGE ANNOUNCEMENT BACKGROUND MODE
-- =========================================================
--
-- animated = existing 0 → 100 mustard loader
-- still    = permanent mustard background
-- none     = no mustard background
--

alter table public.homepage_settings
add column if not exists announcement_background_mode text;

update public.homepage_settings
set announcement_background_mode = 'animated'
where announcement_background_mode is null;

alter table public.homepage_settings
alter column announcement_background_mode
set default 'animated';

alter table public.homepage_settings
alter column announcement_background_mode
set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'homepage_settings_announcement_background_mode_check'
  ) then
    alter table public.homepage_settings
    add constraint homepage_settings_announcement_background_mode_check
    check (
      announcement_background_mode in (
        'animated',
        'still',
        'none'
      )
    );
  end if;
end $$;
