/*
 * Secure customer receipt URLs.
 *
 * Every order receives a long random receipt token.
 * The token is used only as an unguessable capability URL for the
 * customer-facing PDF receipt endpoint.
 *
 * No public SELECT policy is added to orders or order_items.
 */

alter table public.orders
add column if not exists receipt_token text;

update public.orders
set receipt_token =
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
where receipt_token is null
   or btrim(receipt_token) = '';

alter table public.orders
alter column receipt_token
set default (
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
);

alter table public.orders
alter column receipt_token
set not null;

create unique index if not exists orders_receipt_token_unique_idx
on public.orders (receipt_token);

comment on column public.orders.receipt_token is
'Private random capability token used for customer PDF receipt URLs.';
