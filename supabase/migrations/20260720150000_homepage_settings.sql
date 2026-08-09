create table if not exists public.homepage_settings (
  id text primary key default 'default',
  hero_eyebrow text not null default 'Premium electronics and technology',
  hero_line_one text not null default 'Explore',
  hero_line_two text not null default 'Premium',
  hero_line_three text not null default 'Technology',
  hero_description text not null default 'Discover smartphones, audio, accessories, electronics and technology selected by Stereophonie Store.',
  primary_button_label text not null default 'Shop now',
  primary_button_href text not null default '/shop',
  secondary_button_label text not null default 'Visit our store',
  secondary_button_href text not null default '/about',
  hero_product_id uuid references public.products(id) on delete set null,

  announcement_items text[] not null default array[
    'Premium technology',
    'Latest electronics',
    'Trusted products',
    'Store pickup available'
  ],

  products_eyebrow text not null default 'Selected for you',
  products_heading text not null default 'New arrivals',
  products_button_label text not null default 'Shop all products',
  products_button_href text not null default '/shop',

  categories_eyebrow text not null default 'Explore',
  categories_heading text not null default 'Shop by category',

  final_eyebrow text not null default 'Explore the full selection',
  final_line_one text not null default 'Find your next',
  final_line_two text not null default 'upgrade',
  final_button_label text not null default 'Shop now',
  final_button_href text not null default '/shop',

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,

  constraint homepage_settings_singleton_check
    check (id = 'default')
);

insert into public.homepage_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.homepage_settings
enable row level security;

drop policy if exists
  "Public can read homepage settings"
on public.homepage_settings;

create policy
  "Public can read homepage settings"
on public.homepage_settings
for select
to anon, authenticated
using (true);

drop policy if exists
  "Active admins manage homepage settings"
on public.homepage_settings;

create policy
  "Active admins manage homepage settings"
on public.homepage_settings
for all
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

grant select
on table public.homepage_settings
to anon;

grant select, insert, update, delete
on table public.homepage_settings
to authenticated;

grant all
on table public.homepage_settings
to service_role;
