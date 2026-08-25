-- ============================================================
-- STEREOPHONIE
-- Per-category homepage Light / Dark appearance
-- ============================================================

alter table public.categories
  add column if not exists homepage_theme text not null default 'light';

update public.categories
set homepage_theme = 'light'
where homepage_theme is null
   or homepage_theme not in ('light', 'dark');

alter table public.categories
  drop constraint if exists categories_homepage_theme_check;

alter table public.categories
  add constraint categories_homepage_theme_check
  check (homepage_theme in ('light', 'dark'));

comment on column public.categories.homepage_theme is
  'Controls whether the homepage category presentation uses the light or dark storefront theme.';
