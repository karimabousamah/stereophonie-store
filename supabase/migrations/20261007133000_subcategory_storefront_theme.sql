-- ============================================================
-- STEREOPHONIE
-- Subcategory storefront Light / Dark appearance
--
-- Mirrors the existing categories.homepage_theme presentation
-- setting without adding show_on_homepage to subcategories.
-- ============================================================

alter table public.subcategories
  add column if not exists homepage_theme text not null default 'light';

update public.subcategories
set homepage_theme = 'light'
where homepage_theme is null
   or homepage_theme not in ('light', 'dark');

alter table public.subcategories
  drop constraint if exists subcategories_homepage_theme_check;

alter table public.subcategories
  add constraint subcategories_homepage_theme_check
  check (homepage_theme in ('light', 'dark'));

comment on column public.subcategories.homepage_theme is
  'Controls the light or dark storefront presentation theme for this category-tree node.';
