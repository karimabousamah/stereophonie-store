-- =========================================================
-- STEREOPHONIE HOMEPAGE ANNOUNCEMENTS
-- =========================================================

create table if not exists public.homepage_announcements (
  id uuid primary key default gen_random_uuid(),

  message text not null
    check (
      char_length(trim(message)) >= 1
      and char_length(message) <= 300
    ),

  link_label text
    check (
      link_label is null
      or char_length(link_label) <= 80
    ),

  link_href text
    check (
      link_href is null
      or char_length(link_href) <= 500
    ),

  is_active boolean not null default true,

  sort_order integer not null default 0
    check (sort_order >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists
  homepage_announcements_active_order_idx
on public.homepage_announcements (
  is_active,
  sort_order,
  created_at
);

alter table public.homepage_announcements
  enable row level security;


-- ---------------------------------------------------------
-- Public storefront read access.
-- Only active announcements are visible anonymously.
-- Administrators may also read inactive rows.
-- ---------------------------------------------------------

drop policy if exists
  "homepage announcements public read"
on public.homepage_announcements;

create policy
  "homepage announcements public read"
on public.homepage_announcements
for select
using (
  is_active = true

  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
);


-- ---------------------------------------------------------
-- Administrator insert
-- ---------------------------------------------------------

drop policy if exists
  "homepage announcements admin insert"
on public.homepage_announcements;

create policy
  "homepage announcements admin insert"
on public.homepage_announcements
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


-- ---------------------------------------------------------
-- Administrator update
-- ---------------------------------------------------------

drop policy if exists
  "homepage announcements admin update"
on public.homepage_announcements;

create policy
  "homepage announcements admin update"
on public.homepage_announcements
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


-- ---------------------------------------------------------
-- Administrator delete
-- ---------------------------------------------------------

drop policy if exists
  "homepage announcements admin delete"
on public.homepage_announcements;

create policy
  "homepage announcements admin delete"
on public.homepage_announcements
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


-- ---------------------------------------------------------
-- Initial Stereophonie announcements
-- ---------------------------------------------------------

insert into public.homepage_announcements (
  message,
  link_label,
  link_href,
  is_active,
  sort_order
)
select
  'Find Stereophonie on Toters.',
  null,
  null,
  true,
  0
where not exists (
  select 1
  from public.homepage_announcements
  where message = 'Find Stereophonie on Toters.'
);

insert into public.homepage_announcements (
  message,
  link_label,
  link_href,
  is_active,
  sort_order
)
select
  'Enjoy a 2-year warranty on all Stereophonie products.',
  null,
  null,
  true,
  1
where not exists (
  select 1
  from public.homepage_announcements
  where message =
    'Enjoy a 2-year warranty on all Stereophonie products.'
);

insert into public.homepage_announcements (
  message,
  link_label,
  link_href,
  is_active,
  sort_order
)
select
  'Deferred payment is available for phones, tablets and consoles.',
  null,
  null,
  true,
  2
where not exists (
  select 1
  from public.homepage_announcements
  where message =
    'Deferred payment is available for phones, tablets and consoles.'
);

insert into public.homepage_announcements (
  message,
  link_label,
  link_href,
  is_active,
  sort_order
)
select
  'We repair electronic devices. Drop yours at our store and leave the rest to us.',
  null,
  null,
  true,
  3
where not exists (
  select 1
  from public.homepage_announcements
  where message =
    'We repair electronic devices. Drop yours at our store and leave the rest to us.'
);
