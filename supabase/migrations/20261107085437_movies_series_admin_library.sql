-- ============================================================
-- Stereophonie Movies & Series admin library
-- ============================================================
--
-- The public homepage currently renders Movies & Series from
-- lib/stereophonie-entertainment.ts.
--
-- This table preserves the exact same storefront data shape while
-- allowing Admin -> Categories -> Movies & Series to manage titles.
--
-- Existing titles are seeded in their current storefront order.
-- Existing /public/trailers files remain untouched.
-- ============================================================

create table if not exists public.entertainment_titles (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,

  title text not null,

  kind text not null
    check (kind in ('Movie', 'Series')),

  year text not null,

  genre text not null,

  tagline text not null,

  poster_url text not null,
  poster_storage_path text,

  backdrop_url text not null,
  backdrop_storage_path text,

  trailer_url text not null,
  trailer_storage_path text,

  sort_order integer not null default 0
    check (sort_order >= 0),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entertainment_titles_active_order_idx
  on public.entertainment_titles (is_active, sort_order, created_at);

alter table public.entertainment_titles
  enable row level security;

drop policy if exists
  "Public can read active entertainment titles"
  on public.entertainment_titles;

create policy
  "Public can read active entertainment titles"
  on public.entertainment_titles
  for select
  to anon
  using (is_active = true);

drop policy if exists
  "Administrators can read entertainment titles"
  on public.entertainment_titles;

create policy
  "Administrators can read entertainment titles"
  on public.entertainment_titles
  for select
  to authenticated
  using (
    is_active = true
    or exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
        and admin_users.is_active = true
    )
  );

drop policy if exists
  "Administrators can create entertainment titles"
  on public.entertainment_titles;

create policy
  "Administrators can create entertainment titles"
  on public.entertainment_titles
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
        and admin_users.is_active = true
    )
  );

drop policy if exists
  "Administrators can update entertainment titles"
  on public.entertainment_titles;

create policy
  "Administrators can update entertainment titles"
  on public.entertainment_titles
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
        and admin_users.is_active = true
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
        and admin_users.is_active = true
    )
  );

drop policy if exists
  "Administrators can delete entertainment titles"
  on public.entertainment_titles;

create policy
  "Administrators can delete entertainment titles"
  on public.entertainment_titles
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
        and admin_users.is_active = true
    )
  );

grant select
  on table public.entertainment_titles
  to anon, authenticated;

grant insert, update, delete
  on table public.entertainment_titles
  to authenticated;

insert into public.entertainment_titles (
  slug,
  title,
  kind,
  year,
  genre,
  tagline,
  poster_url,
  backdrop_url,
  trailer_url,
  sort_order,
  is_active
)
values
  (
    'avengers-endgame',
    'Avengers: Endgame',
    'Movie',
    '2019',
    'Action · Adventure',
    'Whatever it takes.',
    'https://image.tmdb.org/t/p/w780/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    '/trailers/avengers-endgame.mp4',
    0,
    true
  ),
  (
    'oppenheimer',
    'Oppenheimer',
    'Movie',
    '2023',
    'Drama · History',
    'The world forever changes.',
    'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    '/trailers/oppenheimer.mp4',
    1,
    true
  ),
  (
    'dune-part-two',
    'Dune: Part Two',
    'Movie',
    '2024',
    'Science Fiction · Adventure',
    'Long live the fighters.',
    'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    '/trailers/dune-part-two.mp4',
    2,
    true
  ),
  (
    'the-batman',
    'The Batman',
    'Movie',
    '2022',
    'Crime · Mystery',
    'Unmask the truth.',
    'https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    'https://image.tmdb.org/t/p/original/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg',
    '/trailers/the-batman.mp4',
    3,
    true
  ),
  (
    'interstellar',
    'Interstellar',
    'Movie',
    '2014',
    'Science Fiction · Drama',
    'Mankind was born on Earth. It was never meant to die here.',
    'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    '/trailers/interstellar.mp4',
    4,
    true
  ),
  (
    'the-last-of-us',
    'The Last of Us',
    'Series',
    '2023',
    'Drama · Adventure',
    'When you''re lost in the darkness, look for the light.',
    'https://image.tmdb.org/t/p/w780/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
    'https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
    '/trailers/the-last-of-us.mp4',
    5,
    true
  ),
  (
    'stranger-things',
    'Stranger Things',
    'Series',
    '2016',
    'Science Fiction · Mystery',
    'Every ending has a beginning.',
    'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    '/trailers/stranger-things.mp4',
    6,
    true
  ),
  (
    'breaking-bad',
    'Breaking Bad',
    'Series',
    '2008',
    'Crime · Drama',
    'All bad things must come to an end.',
    'https://image.tmdb.org/t/p/w780/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    'https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    '/trailers/breaking-bad.mp4',
    7,
    true
  )
on conflict (slug) do nothing;
