create table if not exists public.store_settings (
  id text primary key default 'default',

  store_name text not null default 'Nita Style',
  support_email text not null default 'thenitastyle@gmail.com',
  whatsapp_number text not null default '+961 76 99 22 06',
  instagram_handle text not null default '@thenitastyle',

  delivery_fee numeric(12, 2) not null default 5,
  free_delivery_threshold numeric(12, 2) not null default 150,
  delivery_estimate text not null default '3–4 working days',
  delivery_country text not null default 'Lebanon',

  cod_enabled boolean not null default true,
  order_prefix text not null default 'NITA',

  order_confirmation_emails_enabled boolean not null default true,
  stock_alert_emails_enabled boolean not null default true,

  assistant_enabled boolean not null default true,
  assistant_model text not null default 'qwen3:8b',
  assistant_languages text not null default 'English, French, Arabic',
  assistant_welcome_message text not null default
    'Hello! I can help you discover products, check available sizes and assist with your order.',

  store_status text not null default 'operational'
    check (
      store_status in (
        'operational',
        'maintenance',
        'closed'
      )
    ),

  maintenance_message text not null default
    'Our online store is temporarily unavailable. Please check again shortly.',

  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.store_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

drop policy if exists
  "Active admins can read store settings"
on public.store_settings;

create policy
  "Active admins can read store settings"
on public.store_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  )
);

drop policy if exists
  "Active admins can update store settings"
on public.store_settings;

create policy
  "Active admins can update store settings"
on public.store_settings
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
  "Active admins can insert store settings"
on public.store_settings;

create policy
  "Active admins can insert store settings"
on public.store_settings
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
