begin;


/* ============================================================
   STEREOPHONIE — ADMIN CREATED ORDERS
   ============================================================

   Purpose:
   - Preserve the existing public.place_order() transaction.
   - Allow a trusted server-side administrator workflow to create
     an order on behalf of a registered customer or guest.
   - Correctly link the order to the selected customer account.
   - Record who created it and where it originated.
   - Keep inventory / pricing / coupons inside the existing
     authoritative place_order() implementation.

   This function is deliberately NOT exposed to browser clients.
   Only the server-side service_role may execute it.
   ============================================================ */


/* ------------------------------------------------------------
   1. ORDER AUDIT / ORIGIN FIELDS
   ------------------------------------------------------------ */

alter table public.orders
  add column if not exists order_source text
  not null
  default 'storefront';

alter table public.orders
  add column if not exists created_by_admin_id uuid;

alter table public.orders
  add column if not exists source_order_id uuid;


/* ------------------------------------------------------------
   2. CONSTRAINTS
   ------------------------------------------------------------ */

do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_order_source_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_order_source_check
      check (
        order_source in (
          'storefront',
          'admin'
        )
      );
  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_created_by_admin_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_created_by_admin_id_fkey
      foreign key (created_by_admin_id)
      references auth.users(id)
      on delete set null;
  end if;


  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_source_order_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_source_order_id_fkey
      foreign key (source_order_id)
      references public.orders(id)
      on delete set null;
  end if;

end
$$;


/* ------------------------------------------------------------
   3. INDEXES
   ------------------------------------------------------------ */

create index if not exists
  orders_order_source_index
on public.orders (order_source);

create index if not exists
  orders_created_by_admin_id_index
on public.orders (created_by_admin_id);

create index if not exists
  orders_source_order_id_index
on public.orders (source_order_id);


/* ------------------------------------------------------------
   4. DOCUMENTATION
   ------------------------------------------------------------ */

comment on column public.orders.order_source is
  'Origin of the order. storefront = customer checkout; admin = created by an administrator on behalf of a customer.';

comment on column public.orders.created_by_admin_id is
  'Administrator Auth user who created this order. NULL for normal storefront orders.';

comment on column public.orders.source_order_id is
  'Optional original order when this order was created as a replacement or follow-up.';


/* ------------------------------------------------------------
   5. TRUSTED ADMIN ORDER WRAPPER
   ------------------------------------------------------------ */

create or replace function public.admin_place_order(
  p_creating_admin_user_id uuid,
  p_customer_data jsonb,
  p_cart_items jsonb,
  p_coupon_code text default null,
  p_target_customer_user_id uuid default null,
  p_requested_fulfillment_method text default 'pickup',
  p_requested_payment_status text default 'unpaid',
  p_requested_gift_wrapping boolean default false,
  p_source_order_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  created_result jsonb;
  created_order_id uuid;

  normalized_fulfillment text;
  normalized_payment_status text;

  submitted_customer_email text;
  registered_customer_email text;
begin

  /* ----------------------------------------------------------
     Administrator verification

     The service-role caller still has to supply the current
     administrator's real Auth user ID.

     An inactive or unknown administrator cannot create orders.
     ---------------------------------------------------------- */

  if p_creating_admin_user_id is null then
    raise exception
      'Administrator identity is required.';
  end if;


  if not exists (
    select 1
    from public.admin_users
    where admin_users.user_id =
      p_creating_admin_user_id
      and admin_users.is_active is true
  ) then
    raise exception
      'This administrator is not authorized to create orders.';
  end if;


  /* ----------------------------------------------------------
     Validate customer payload
     ---------------------------------------------------------- */

  if p_customer_data is null
     or jsonb_typeof(p_customer_data) <> 'object' then
    raise exception
      'Customer information is required.';
  end if;


  submitted_customer_email :=
    lower(
      trim(
        coalesce(
          p_customer_data->>'email',
          ''
        )
      )
    );


  if submitted_customer_email = '' then
    raise exception
      'Customer email is required.';
  end if;


  /* ----------------------------------------------------------
     Registered customer linkage

     A registered account may only be linked when the email in
     the admin order matches that Auth account.

     Guest orders simply pass NULL as target customer ID.
     ---------------------------------------------------------- */

  if p_target_customer_user_id is not null then

    select
      lower(
        trim(
          coalesce(
            auth.users.email,
            ''
          )
        )
      )
    into registered_customer_email
    from auth.users
    where auth.users.id =
      p_target_customer_user_id;


    if registered_customer_email is null
       or registered_customer_email = '' then
      raise exception
        'The selected customer account could not be found.';
    end if;


    if registered_customer_email <>
       submitted_customer_email then
      raise exception
        'The selected customer account does not match the submitted email address.';
    end if;

  end if;


  /* ----------------------------------------------------------
     Fulfilment
     ---------------------------------------------------------- */

  normalized_fulfillment :=
    lower(
      trim(
        coalesce(
          p_requested_fulfillment_method,
          ''
        )
      )
    );


  if normalized_fulfillment not in (
    'pickup',
    'delivery'
  ) then
    raise exception
      'The selected fulfillment method is invalid.';
  end if;


  /* ----------------------------------------------------------
     Initial payment status

     An admin-created order can begin unpaid or already paid.
     Refunded is intentionally not a valid creation state.
     ---------------------------------------------------------- */

  normalized_payment_status :=
    lower(
      trim(
        coalesce(
          p_requested_payment_status,
          ''
        )
      )
    );


  if normalized_payment_status not in (
    'unpaid',
    'paid'
  ) then
    raise exception
      'The selected payment status is invalid.';
  end if;


  /* ----------------------------------------------------------
     Optional replacement / follow-up order validation
     ---------------------------------------------------------- */

  if p_source_order_id is not null
     and not exists (
       select 1
       from public.orders
       where orders.id =
         p_source_order_id
     ) then
    raise exception
      'The source order could not be found.';
  end if;


  /* ----------------------------------------------------------
     CREATE THE ORDER

     Reuse the existing authoritative transaction.

     public.place_order() already owns:
     - published-product validation
     - configuration validation
     - stock locking
     - stock availability checks
     - authoritative price calculation
     - coupon validation
     - order creation
     - order item snapshots
     - inventory decrement
     ---------------------------------------------------------- */

  created_result :=
    public.place_order(
      p_customer_data,
      p_cart_items,
      p_coupon_code
    );


  if created_result is null
     or coalesce(
       (created_result->>'success')::boolean,
       false
     ) is not true then
    raise exception
      'The order could not be created.';
  end if;


  created_order_id :=
    nullif(
      created_result->>'order_id',
      ''
    )::uuid;


  if created_order_id is null then
    raise exception
      'The new order ID was not returned.';
  end if;


  /* ----------------------------------------------------------
     Finalize fulfilment INSIDE THE SAME TRANSACTION
     ---------------------------------------------------------- */

  perform public.set_order_fulfillment(
    created_order_id,
    normalized_fulfillment
  );


  /* ----------------------------------------------------------
     Link customer + stamp admin metadata

     Because this wrapper and public.place_order() are executing
     in the same PostgreSQL transaction, failure here rolls the
     entire order back — including its inventory changes.
     ---------------------------------------------------------- */

  update public.orders
  set
    customer_user_id =
      p_target_customer_user_id,

    order_source =
      'admin',

    created_by_admin_id =
      p_creating_admin_user_id,

    source_order_id =
      p_source_order_id,

    payment_status =
      normalized_payment_status,

    gift_wrapping_requested =
      coalesce(
        p_requested_gift_wrapping,
        false
      )

  where orders.id =
    created_order_id;


  if not found then
    raise exception
      'The newly created order could not be finalized.';
  end if;


  /* ----------------------------------------------------------
     Keep coupon ownership aligned with the selected account.

     place_order() already performs coupon limits using email as
     a fallback when auth.uid() is unavailable.
     ---------------------------------------------------------- */

  update public.coupon_redemptions
  set customer_user_id =
    p_target_customer_user_id
  where coupon_redemptions.order_id =
    created_order_id;


  /* ----------------------------------------------------------
     Return the familiar place_order result plus admin metadata.
     ---------------------------------------------------------- */

  return
    created_result
    ||
    jsonb_build_object(
      'order_source',
      'admin',

      'customer_user_id',
      p_target_customer_user_id,

      'created_by_admin_id',
      p_creating_admin_user_id,

      'fulfillment_method',
      normalized_fulfillment,

      'payment_status',
      normalized_payment_status,

      'gift_wrapping_requested',
      coalesce(
        p_requested_gift_wrapping,
        false
      ),

      'source_order_id',
      p_source_order_id
    );

end;
$$;


/* ------------------------------------------------------------
   6. PERMISSIONS

   NEVER expose admin_place_order() to normal browser sessions.
   The future Next.js server action will call it through the
   existing server-only createAdminClient().
   ------------------------------------------------------------ */

revoke all
on function public.admin_place_order(
  uuid,
  jsonb,
  jsonb,
  text,
  uuid,
  text,
  text,
  boolean,
  uuid
)
from public;

revoke all
on function public.admin_place_order(
  uuid,
  jsonb,
  jsonb,
  text,
  uuid,
  text,
  text,
  boolean,
  uuid
)
from anon;

revoke all
on function public.admin_place_order(
  uuid,
  jsonb,
  jsonb,
  text,
  uuid,
  text,
  text,
  boolean,
  uuid
)
from authenticated;

grant execute
on function public.admin_place_order(
  uuid,
  jsonb,
  jsonb,
  text,
  uuid,
  text,
  text,
  boolean,
  uuid
)
to service_role;


comment on function public.admin_place_order(
  uuid,
  jsonb,
  jsonb,
  text,
  uuid,
  text,
  text,
  boolean,
  uuid
) is
  'Server-only order creation wrapper used by Stereophonie administrators to create orders on behalf of registered or guest customers.';


commit;
