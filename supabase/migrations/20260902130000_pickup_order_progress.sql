begin;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'pending',
      'confirmed',
      'preparing',
      'out_for_delivery',
      'ready_for_pickup',
      'completed',
      'cancelled'
    )
  );

create index if not exists orders_fulfillment_method_index
  on public.orders (fulfillment_method);

commit;
