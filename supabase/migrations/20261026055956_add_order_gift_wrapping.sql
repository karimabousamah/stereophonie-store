-- ST_GIFT_WRAP_DATABASE_V2
-- One optional preference for gift wrapping the entire order.
-- Existing orders default to false.
-- No effect on prices, discounts, inventory or delivery fees.

alter table public.orders
  add column if not exists gift_wrapping_requested
  boolean not null default false;

comment on column public.orders.gift_wrapping_requested is
  'Customer requested gift wrapping for this order.';
