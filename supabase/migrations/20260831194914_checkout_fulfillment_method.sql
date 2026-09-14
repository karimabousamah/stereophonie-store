/*
 * Stereophonie checkout fulfillment architecture.
 *
 * Delivery:
 *   $4.00
 *
 * Store pickup:
 *   $0.00
 *
 * place_order() remains authoritative for product pricing, coupons,
 * inventory and order creation. This function only finalizes the
 * fulfillment-specific fee immediately after order creation.
 */

alter table public.orders
  add column if not exists fulfillment_method text
  not null
  default 'delivery';

alter table public.orders
  drop constraint if exists orders_fulfillment_method_check;

alter table public.orders
  add constraint orders_fulfillment_method_check
  check (fulfillment_method in ('delivery', 'pickup'));

create or replace function public.set_order_fulfillment(
  target_order_id uuid,
  requested_fulfillment_method text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_method text;
  fulfillment_fee numeric(12, 2);
begin
  normalized_method :=
    case
      when requested_fulfillment_method = 'pickup' then 'pickup'
      else 'delivery'
    end;

  fulfillment_fee :=
    case
      when normalized_method = 'pickup' then 0
      else 4
    end;

  update public.orders
  set
    fulfillment_method = normalized_method,
    delivery_fee = fulfillment_fee,
    total = greatest(
      0,
      coalesce(subtotal, 0)
      - coalesce(discount_amount, 0)
      + fulfillment_fee
    )
  where id = target_order_id;

  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

revoke all on function public.set_order_fulfillment(uuid, text) from public;

grant execute
on function public.set_order_fulfillment(uuid, text)
to anon, authenticated;
