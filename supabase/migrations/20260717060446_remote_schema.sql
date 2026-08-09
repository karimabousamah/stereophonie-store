


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."create_customer_profile_after_signup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.customer_profiles (
    user_id,
    first_name,
    last_name,
    phone_country_code,
    phone_number
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(
      nullif(
        new.raw_user_meta_data ->> 'phone_country_code',
        ''
      ),
      '+961'
    ),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (user_id) do update
  set
    first_name = case
      when excluded.first_name <> ''
        then excluded.first_name
      else public.customer_profiles.first_name
    end,

    last_name = case
      when excluded.last_name <> ''
        then excluded.last_name
      else public.customer_profiles.last_name
    end,

    phone_country_code = case
      when excluded.phone_country_code <> ''
        then excluded.phone_country_code
      else public.customer_profiles.phone_country_code
    end,

    phone_number = case
      when excluded.phone_number <> ''
        then excluded.phone_number
      else public.customer_profiles.phone_number
    end,

    updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."create_customer_profile_after_signup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;


ALTER FUNCTION "public"."is_active_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_admin_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
      and admin_users.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_active_admin_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and is_active = true
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_default_customer_address"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.customer_addresses
      where user_id = new.user_id
    ) then
      new.is_default = true;
    end if;
  end if;

  if new.is_default then
    update public.customer_addresses
    set
      is_default = false,
      updated_at = now()
    where user_id = new.user_id
      and id <> new.id
      and is_default = true;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."manage_default_customer_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_order"("customer_data" "jsonb", "cart_items" "jsonb", "coupon_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  new_order_id uuid;
  new_order_number text;

  calculated_subtotal numeric(12, 2) := 0;
  calculated_discount_amount numeric(12, 2) := 0;
  calculated_delivery_fee numeric(12, 2) := 0;
  calculated_total numeric(12, 2) := 0;

  cart_item jsonb;
  selected_variant record;
  selected_coupon record;

  selected_coupon_id uuid := null;
  normalized_coupon_code text := '';

  requested_quantity integer;
  selected_unit_price numeric(12, 2);
  selected_regular_price numeric(12, 2);
  selected_line_total numeric(12, 2);

  active_redemptions_count integer := 0;
  customer_redemptions_count integer := 0;
  previous_customer_orders_count integer := 0;

  customer_first_name text;
  customer_last_name text;
  v_customer_email text;
  customer_phone text;
  customer_country text;
  customer_city text;
  customer_area text;
  customer_address text;
  customer_building text;
  customer_floor text;
  customer_delivery_notes text;
begin
  if customer_data is null then
    raise exception
      'Customer information is required.';
  end if;

  if cart_items is null
     or jsonb_typeof(cart_items) <> 'array'
     or jsonb_array_length(cart_items) = 0 then
    raise exception
      'The cart is empty.';
  end if;

  customer_first_name :=
    trim(
      coalesce(
        customer_data->>'firstName',
        ''
      )
    );

  customer_last_name :=
    trim(
      coalesce(
        customer_data->>'lastName',
        ''
      )
    );

  v_customer_email :=
    lower(
      trim(
        coalesce(
          customer_data->>'email',
          ''
        )
      )
    );

  customer_phone :=
    trim(
      coalesce(
        customer_data->>'phone',
        ''
      )
    );

  customer_country :=
    trim(
      coalesce(
        customer_data->>'country',
        'Lebanon'
      )
    );

  customer_city :=
    trim(
      coalesce(
        customer_data->>'city',
        ''
      )
    );

  customer_area :=
    trim(
      coalesce(
        customer_data->>'area',
        ''
      )
    );

  customer_address :=
    trim(
      coalesce(
        customer_data->>'address',
        ''
      )
    );

  customer_building :=
    nullif(
      trim(
        coalesce(
          customer_data->>'building',
          ''
        )
      ),
      ''
    );

  customer_floor :=
    nullif(
      trim(
        coalesce(
          customer_data->>'floor',
          ''
        )
      ),
      ''
    );

  customer_delivery_notes :=
    nullif(
      trim(
        coalesce(
          customer_data->>'deliveryNotes',
          ''
        )
      ),
      ''
    );

  if customer_first_name = '' then
    raise exception
      'First name is required.';
  end if;

  if customer_last_name = '' then
    raise exception
      'Last name is required.';
  end if;

  if v_customer_email = '' then
    raise exception
      'Email address is required.';
  end if;

  if customer_phone = '' then
    raise exception
      'Phone number is required.';
  end if;

  if customer_city = '' then
    raise exception
      'City is required.';
  end if;

  if customer_area = '' then
    raise exception
      'Area is required.';
  end if;

  if customer_address = '' then
    raise exception
      'Street address is required.';
  end if;

  /*
   * First pass:
   * Validate products, lock stock and calculate subtotal.
   */
  for cart_item in
    select value
    from jsonb_array_elements(cart_items)
  loop
    requested_quantity :=
      greatest(
        1,
        coalesce(
          (
            cart_item->>'quantity'
          )::integer,
          1
        )
      );

    select
      product_variants.id,
      product_variants.product_id,
      product_variants.size,
      product_variants.sku,
      product_variants.regular_price,
      product_variants.sale_price,
      product_variants.stock_quantity,
      product_variants.availability_status,
      products.name as product_name,
      products.slug as product_slug,
      products.status as product_status,
      (
        select
          product_images.image_url
        from public.product_images
        where product_images.product_id =
          product_variants.product_id
        order by
          product_images.is_primary desc,
          product_images.position asc
        limit 1
      ) as product_image_url
    into selected_variant
    from public.product_variants
    join public.products
      on products.id =
        product_variants.product_id
    where product_variants.id =
      (
        cart_item->>'variantId'
      )::uuid
    for update of product_variants;

    if not found then
      raise exception
        'One selected product size no longer exists.';
    end if;

    if selected_variant.product_status <>
       'published' then
      raise exception
        '% is no longer available.',
        selected_variant.product_name;
    end if;

    if selected_variant.availability_status
       not in (
         'in_stock',
         'low_stock'
       ) then
      raise exception
        'Size % of % is unavailable.',
        selected_variant.size,
        selected_variant.product_name;
    end if;

    if selected_variant.stock_quantity <
       requested_quantity then
      raise exception
        'Only % unit(s) of size % for % remain.',
        selected_variant.stock_quantity,
        selected_variant.size,
        selected_variant.product_name;
    end if;

    selected_regular_price :=
      selected_variant.regular_price;

    selected_unit_price :=
      coalesce(
        selected_variant.sale_price,
        selected_variant.regular_price
      );

    if selected_unit_price is null
       or selected_unit_price <= 0 then
      raise exception
        'The price for % is unavailable.',
        selected_variant.product_name;
    end if;

    selected_line_total :=
      selected_unit_price *
      requested_quantity;

    calculated_subtotal :=
      calculated_subtotal +
      selected_line_total;
  end loop;

  /*
   * Secure coupon validation.
   */
  normalized_coupon_code :=
    upper(
      trim(
        coalesce(
          coupon_code,
          ''
        )
      )
    );

  if normalized_coupon_code <> '' then
    select
      coupons.id,
      coupons.code,
      coupons.discount_type,
      coupons.discount_value,
      coupons.minimum_subtotal,
      coupons.max_discount_amount,
      coupons.starts_at,
      coupons.ends_at,
      coupons.is_active,
      coupons.first_order_only,
      coupons.max_redemptions,
      coupons.max_redemptions_per_customer
    into selected_coupon
    from public.coupons
    where upper(trim(coupons.code)) =
      normalized_coupon_code
    for update;

    if not found then
      raise exception
        'This coupon code is invalid.';
    end if;

    if selected_coupon.is_active is not true then
      raise exception
        'This coupon is currently inactive.';
    end if;

    if selected_coupon.starts_at is not null
       and selected_coupon.starts_at > now() then
      raise exception
        'This coupon is not active yet.';
    end if;

    if selected_coupon.ends_at is not null
       and selected_coupon.ends_at <= now() then
      raise exception
        'This coupon has expired.';
    end if;

    if calculated_subtotal <
       selected_coupon.minimum_subtotal then
      raise exception
        'This coupon requires a minimum subtotal of $%.',
        trim(
          to_char(
            selected_coupon.minimum_subtotal,
            'FM999999990.00'
          )
        );
    end if;

    if selected_coupon.max_redemptions
       is not null then
      select count(*)
      into active_redemptions_count
      from public.coupon_redemptions
      where coupon_redemptions.coupon_id =
        selected_coupon.id
        and coupon_redemptions.released_at
          is null;

      if active_redemptions_count >=
         selected_coupon.max_redemptions then
        raise exception
          'This coupon has reached its usage limit.';
      end if;
    end if;

    if selected_coupon.max_redemptions_per_customer
       is not null then
      select count(*)
      into customer_redemptions_count
      from public.coupon_redemptions
      where coupon_redemptions.coupon_id =
        selected_coupon.id
        and coupon_redemptions.released_at
          is null
        and (
          (
            auth.uid() is not null
            and coupon_redemptions.customer_user_id =
              auth.uid()
          )
          or lower(
            coupon_redemptions.customer_email
          ) = v_customer_email
        );

      if customer_redemptions_count >=
         selected_coupon.max_redemptions_per_customer then
        raise exception
          'You have already reached the usage limit for this coupon.';
      end if;
    end if;

    if selected_coupon.first_order_only then
      select count(*)
      into previous_customer_orders_count
      from public.orders
      where orders.status <> 'cancelled'
        and (
          (
            auth.uid() is not null
            and orders.customer_user_id =
              auth.uid()
          )
          or lower(
            orders.customer_email
          ) = v_customer_email
        );

      if previous_customer_orders_count > 0 then
        raise exception
          'This coupon is available for first orders only.';
      end if;
    end if;

    if selected_coupon.discount_type =
       'percentage' then
      calculated_discount_amount :=
        round(
          calculated_subtotal *
          (
            selected_coupon.discount_value /
            100
          ),
          2
        );
    else
      calculated_discount_amount :=
        selected_coupon.discount_value;
    end if;

    if selected_coupon.max_discount_amount
       is not null then
      calculated_discount_amount :=
        least(
          calculated_discount_amount,
          selected_coupon.max_discount_amount
        );
    end if;

    calculated_discount_amount :=
      greatest(
        0,
        least(
          calculated_discount_amount,
          calculated_subtotal
        )
      );

    selected_coupon_id :=
      selected_coupon.id;
  end if;

  calculated_total :=
    calculated_subtotal -
    calculated_discount_amount +
    calculated_delivery_fee;

  new_order_number :=
    'STER-' ||
    to_char(
      now(),
      'YYYYMMDD'
    ) ||
    '-' ||
    upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        8
      )
    );

  insert into public.orders (
    order_number,
    status,
    payment_status,
    customer_first_name,
    customer_last_name,
    customer_email,
    customer_phone,
    delivery_country,
    delivery_city,
    delivery_area,
    delivery_address,
    delivery_building,
    delivery_floor,
    delivery_notes,
    subtotal,
    discount_amount,
    delivery_fee,
    total,
    coupon_id,
    coupon_code,
    customer_user_id
  )
  values (
    new_order_number,
    'pending',
    'unpaid',
    customer_first_name,
    customer_last_name,
    v_customer_email,
    customer_phone,
    customer_country,
    customer_city,
    customer_area,
    customer_address,
    customer_building,
    customer_floor,
    customer_delivery_notes,
    calculated_subtotal,
    calculated_discount_amount,
    calculated_delivery_fee,
    calculated_total,
    selected_coupon_id,
    nullif(
      normalized_coupon_code,
      ''
    ),
    auth.uid()
  )
  returning id
  into new_order_id;

  /*
   * Save order-item snapshots and reduce stock.
   */
  for cart_item in
    select value
    from jsonb_array_elements(cart_items)
  loop
    requested_quantity :=
      greatest(
        1,
        coalesce(
          (
            cart_item->>'quantity'
          )::integer,
          1
        )
      );

    select
      product_variants.id,
      product_variants.product_id,
      product_variants.size,
      product_variants.sku,
      product_variants.regular_price,
      product_variants.sale_price,
      product_variants.stock_quantity,
      product_variants.low_stock_threshold,
      product_variants.availability_status,
      products.name as product_name,
      products.slug as product_slug,
      (
        select
          product_images.image_url
        from public.product_images
        where product_images.product_id =
          product_variants.product_id
        order by
          product_images.is_primary desc,
          product_images.position asc
        limit 1
      ) as product_image_url
    into selected_variant
    from public.product_variants
    join public.products
      on products.id =
        product_variants.product_id
    where product_variants.id =
      (
        cart_item->>'variantId'
      )::uuid
    for update of product_variants;

    selected_regular_price :=
      selected_variant.regular_price;

    selected_unit_price :=
      coalesce(
        selected_variant.sale_price,
        selected_variant.regular_price
      );

    selected_line_total :=
      selected_unit_price *
      requested_quantity;

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      product_name,
      product_slug,
      product_image_url,
      size,
      sku,
      unit_price,
      regular_price,
      quantity,
      line_total
    )
    values (
      new_order_id,
      selected_variant.product_id,
      selected_variant.id,
      selected_variant.product_name,
      selected_variant.product_slug,
      selected_variant.product_image_url,
      selected_variant.size,
      selected_variant.sku,
      selected_unit_price,
      selected_regular_price,
      requested_quantity,
      selected_line_total
    );

    update public.product_variants
    set
      stock_quantity =
        stock_quantity -
        requested_quantity,

      availability_status =
        case
          when stock_quantity -
               requested_quantity <= 0
            then 'out_of_stock'

          when stock_quantity -
               requested_quantity <=
               low_stock_threshold
            then 'low_stock'

          else 'in_stock'
        end
    where id =
      selected_variant.id;
  end loop;

  if selected_coupon_id is not null then
    insert into public.coupon_redemptions (
      coupon_id,
      order_id,
      customer_user_id,
      customer_email,
      discount_amount
    )
    values (
      selected_coupon_id,
      new_order_id,
      auth.uid(),
      v_customer_email,
      calculated_discount_amount
    );
  end if;

  return jsonb_build_object(
    'success',
    true,
    'order_id',
    new_order_id,
    'order_number',
    new_order_number,
    'subtotal',
    calculated_subtotal,
    'discount_amount',
    calculated_discount_amount,
    'delivery_fee',
    calculated_delivery_fee,
    'total',
    calculated_total,
    'coupon_code',
    nullif(
      normalized_coupon_code,
      ''
    )
  );
exception
  when others then
    raise;
end;
$_$;


ALTER FUNCTION "public"."place_order"("customer_data" "jsonb", "cart_items" "jsonb", "coupon_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."preview_coupon"("coupon_code_input" "text", "cart_subtotal" numeric, "customer_email_input" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  normalized_coupon_code text;
  normalized_customer_email text;

  selected_coupon record;

  calculated_discount numeric(12, 2) := 0;
  subtotal_after_discount numeric(12, 2) := 0;

  active_redemptions_count integer := 0;
  customer_redemptions_count integer := 0;
  previous_customer_orders_count integer := 0;
begin
  normalized_coupon_code :=
    upper(
      trim(
        coalesce(
          coupon_code_input,
          ''
        )
      )
    );

  normalized_customer_email :=
    lower(
      trim(
        coalesce(
          customer_email_input,
          ''
        )
      )
    );

  if normalized_coupon_code = '' then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Enter a coupon code.'
    );
  end if;

  if cart_subtotal is null
     or cart_subtotal <= 0 then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Your cart subtotal is invalid.'
    );
  end if;

  select
    coupons.id,
    coupons.code,
    coupons.name,
    coupons.description,
    coupons.discount_type,
    coupons.discount_value,
    coupons.minimum_subtotal,
    coupons.max_discount_amount,
    coupons.starts_at,
    coupons.ends_at,
    coupons.is_active,
    coupons.first_order_only,
    coupons.max_redemptions,
    coupons.max_redemptions_per_customer
  into selected_coupon
  from public.coupons
  where upper(trim(coupons.code)) =
    normalized_coupon_code;

  if not found then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'This coupon code is invalid.'
    );
  end if;

  if selected_coupon.is_active is not true then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'This coupon is currently inactive.'
    );
  end if;

  if selected_coupon.starts_at is not null
     and selected_coupon.starts_at > now() then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'This coupon is not active yet.'
    );
  end if;

  if selected_coupon.ends_at is not null
     and selected_coupon.ends_at <= now() then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'This coupon has expired.'
    );
  end if;

  if cart_subtotal <
     selected_coupon.minimum_subtotal then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'This coupon requires a minimum subtotal of $' ||
      trim(
        to_char(
          selected_coupon.minimum_subtotal,
          'FM999999990.00'
        )
      ) ||
      '.'
    );
  end if;

  if selected_coupon.max_redemptions
     is not null then
    select count(*)
    into active_redemptions_count
    from public.coupon_redemptions
    where coupon_redemptions.coupon_id =
      selected_coupon.id
      and coupon_redemptions.released_at
        is null;

    if active_redemptions_count >=
       selected_coupon.max_redemptions then
      return jsonb_build_object(
        'success',
        false,
        'message',
        'This coupon has reached its usage limit.'
      );
    end if;
  end if;

  if selected_coupon.max_redemptions_per_customer
     is not null then
    if auth.uid() is null
       and normalized_customer_email = '' then
      return jsonb_build_object(
        'success',
        false,
        'message',
        'Enter your email address before applying this coupon.'
      );
    end if;

    select count(*)
    into customer_redemptions_count
    from public.coupon_redemptions
    where coupon_redemptions.coupon_id =
      selected_coupon.id
      and coupon_redemptions.released_at
        is null
      and (
        (
          auth.uid() is not null
          and coupon_redemptions.customer_user_id =
            auth.uid()
        )
        or (
          normalized_customer_email <> ''
          and lower(
            coupon_redemptions.customer_email
          ) = normalized_customer_email
        )
      );

    if customer_redemptions_count >=
       selected_coupon.max_redemptions_per_customer then
      return jsonb_build_object(
        'success',
        false,
        'message',
        'You have already reached the usage limit for this coupon.'
      );
    end if;
  end if;

  if selected_coupon.first_order_only then
    if auth.uid() is null
       and normalized_customer_email = '' then
      return jsonb_build_object(
        'success',
        false,
        'message',
        'Enter your email address before applying this first-order coupon.'
      );
    end if;

    select count(*)
    into previous_customer_orders_count
    from public.orders
    where orders.status <> 'cancelled'
      and (
        (
          auth.uid() is not null
          and orders.customer_user_id =
            auth.uid()
        )
        or (
          normalized_customer_email <> ''
          and lower(
            orders.customer_email
          ) = normalized_customer_email
        )
      );

    if previous_customer_orders_count > 0 then
      return jsonb_build_object(
        'success',
        false,
        'message',
        'This coupon is available for first orders only.'
      );
    end if;
  end if;

  if selected_coupon.discount_type =
     'percentage' then
    calculated_discount :=
      round(
        cart_subtotal *
        (
          selected_coupon.discount_value /
          100
        ),
        2
      );
  else
    calculated_discount :=
      selected_coupon.discount_value;
  end if;

  if selected_coupon.max_discount_amount
     is not null then
    calculated_discount :=
      least(
        calculated_discount,
        selected_coupon.max_discount_amount
      );
  end if;

  calculated_discount :=
    greatest(
      0,
      least(
        calculated_discount,
        cart_subtotal
      )
    );

  subtotal_after_discount :=
    greatest(
      0,
      cart_subtotal -
      calculated_discount
    );

  return jsonb_build_object(
    'success',
    true,
    'code',
    selected_coupon.code,
    'name',
    selected_coupon.name,
    'description',
    selected_coupon.description,
    'discount_type',
    selected_coupon.discount_type,
    'discount_value',
    selected_coupon.discount_value,
    'discount_amount',
    calculated_discount,
    'subtotal_after_discount',
    subtotal_after_discount,
    'message',
    'Coupon applied successfully.'
  );
end;
$_$;


ALTER FUNCTION "public"."preview_coupon"("coupon_code_input" "text", "cart_subtotal" numeric, "customer_email_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_customer_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_customer_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_product_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'published'
     and new.published_at is null then
    new.published_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_product_published_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_cancelled_order_coupon_redemption"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'cancelled'
     and old.status is distinct from 'cancelled' then

    update public.coupon_redemptions
    set
      released_at = now(),
      release_reason = 'order_cancelled'
    where order_id = new.id
      and released_at is null;

  elsif old.status = 'cancelled'
        and new.status is distinct from 'cancelled' then

    update public.coupon_redemptions
    set
      released_at = null,
      release_reason = null
    where order_id = new.id
      and release_reason = 'order_cancelled';

  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_cancelled_order_coupon_redemption"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_coupon_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_coupon_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_customer_order"("p_order_number" "text", "p_customer_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  selected_order public.orders%rowtype;
  order_products jsonb;
begin
  select *
  into selected_order
  from public.orders
  where lower(trim(order_number)) =
        lower(trim(p_order_number))
    and lower(trim(customer_email)) =
        lower(trim(p_customer_email))
  limit 1;

  if selected_order.id is null then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'No order was found with these details.'
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
        item.id,

        'product_name',
        item.product_name,

        'size',
        item.size,

        'quantity',
        item.quantity,

        'unit_price',
        item.unit_price,

        'line_total',
        item.line_total
      )
      order by item.id
    ),
    '[]'::jsonb
  )
  into order_products
  from public.order_items as item
  where item.order_id =
        selected_order.id;

  return jsonb_build_object(
    'success',
    true,

    'order',
    jsonb_build_object(
      'order_number',
      selected_order.order_number,

      'status',
      selected_order.status,

      'payment_status',
      selected_order.payment_status,

      'customer_first_name',
      selected_order.customer_first_name,

      'customer_last_name',
      selected_order.customer_last_name,

      'delivery_city',
      selected_order.delivery_city,

      'delivery_area',
      selected_order.delivery_area,

      'coupon_code',
      selected_order.coupon_code,

      'subtotal',
      selected_order.subtotal,

      'discount_amount',
      selected_order.discount_amount,

      'delivery_fee',
      selected_order.delivery_fee,

      'total',
      selected_order.total,

      'created_at',
      selected_order.created_at,

      'status_updated_at',
      selected_order.status_updated_at,

      'items',
      order_products
    )
  );
end;
$$;


ALTER FUNCTION "public"."track_customer_order"("p_order_number" "text", "p_customer_email" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "image_path" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "image_path" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "customer_user_id" "uuid",
    "customer_email" "text" NOT NULL,
    "discount_amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "released_at" timestamp with time zone,
    "release_reason" "text",
    CONSTRAINT "coupon_redemptions_discount_check" CHECK (("discount_amount" >= (0)::numeric)),
    CONSTRAINT "coupon_redemptions_email_check" CHECK (("length"(TRIM(BOTH FROM "customer_email")) > 0))
);


ALTER TABLE "public"."coupon_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(12,2) NOT NULL,
    "minimum_subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "max_discount_amount" numeric(12,2),
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "first_order_only" boolean DEFAULT false NOT NULL,
    "max_redemptions" integer,
    "max_redemptions_per_customer" integer,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coupons_code_format_check" CHECK ((("code" = "upper"(TRIM(BOTH FROM "code"))) AND ("code" ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'::"text"))),
    CONSTRAINT "coupons_customer_limit_check" CHECK ((("max_redemptions_per_customer" IS NULL) OR ("max_redemptions_per_customer" > 0))),
    CONSTRAINT "coupons_date_range_check" CHECK ((("starts_at" IS NULL) OR ("ends_at" IS NULL) OR ("ends_at" > "starts_at"))),
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" > (0)::numeric)),
    CONSTRAINT "coupons_max_discount_check" CHECK ((("max_discount_amount" IS NULL) OR ("max_discount_amount" > (0)::numeric))),
    CONSTRAINT "coupons_max_redemptions_check" CHECK ((("max_redemptions" IS NULL) OR ("max_redemptions" > 0))),
    CONSTRAINT "coupons_minimum_subtotal_check" CHECK (("minimum_subtotal" >= (0)::numeric)),
    CONSTRAINT "coupons_percentage_limit_check" CHECK ((("discount_type" <> 'percentage'::"text") OR ("discount_value" <= (100)::numeric)))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "label" "text" DEFAULT 'Home'::"text" NOT NULL,
    "country" "text" DEFAULT 'Lebanon'::"text" NOT NULL,
    "city" "text" NOT NULL,
    "area" "text" DEFAULT ''::"text" NOT NULL,
    "address_line" "text" NOT NULL,
    "building" "text" DEFAULT ''::"text" NOT NULL,
    "floor" "text" DEFAULT ''::"text" NOT NULL,
    "apartment" "text" DEFAULT ''::"text" NOT NULL,
    "landmark" "text" DEFAULT ''::"text" NOT NULL,
    "delivery_instructions" "text" DEFAULT ''::"text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_profiles" (
    "user_id" "uuid" NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "phone_country_code" "text" DEFAULT '+961'::"text" NOT NULL,
    "phone_number" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_slug" "text",
    "product_image_url" "text",
    "size" "text" NOT NULL,
    "sku" "text",
    "unit_price" numeric(12,2) NOT NULL,
    "regular_price" numeric(12,2),
    "quantity" integer NOT NULL,
    "line_total" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "customer_first_name" "text" NOT NULL,
    "customer_last_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "delivery_country" "text" DEFAULT 'Lebanon'::"text" NOT NULL,
    "delivery_city" "text" NOT NULL,
    "delivery_area" "text" NOT NULL,
    "delivery_address" "text" NOT NULL,
    "delivery_building" "text",
    "delivery_floor" "text",
    "delivery_notes" "text",
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "delivery_fee" numeric(12,2) DEFAULT 0 NOT NULL,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "customer_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "admin_notes" "text",
    "status_updated_at" timestamp with time zone DEFAULT "now"(),
    "coupon_id" "uuid",
    "coupon_code" "text",
    "discount_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "orders_discount_amount_check" CHECK ((("discount_amount" >= (0)::numeric) AND ("discount_amount" <= "subtotal"))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'paid'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'preparing'::"text", 'out_for_delivery'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "alt_text" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    CONSTRAINT "product_images_position_check" CHECK (("position" >= 0))
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sku" "text",
    "size" "text" NOT NULL,
    "color_name" "text",
    "regular_price" numeric(10,2) NOT NULL,
    "sale_price" numeric(10,2),
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "low_stock_threshold" integer DEFAULT 1 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "availability_status" "text" DEFAULT 'in_stock'::"text" NOT NULL,
    CONSTRAINT "product_variants_availability_status_check" CHECK (("availability_status" = ANY (ARRAY['in_stock'::"text", 'low_stock'::"text", 'out_of_stock'::"text", 'coming_soon'::"text"]))),
    CONSTRAINT "product_variants_check" CHECK ((("sale_price" IS NULL) OR (("sale_price" >= (0)::numeric) AND ("sale_price" < "regular_price")))),
    CONSTRAINT "product_variants_low_stock_threshold_check" CHECK (("low_stock_threshold" >= 0)),
    CONSTRAINT "product_variants_regular_price_check" CHECK (("regular_price" >= (0)::numeric)),
    CONSTRAINT "product_variants_stock_quantity_check" CHECK (("stock_quantity" >= 0))
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "collection_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "short_description" "text",
    "description" "text",
    "material" "text",
    "care_instructions" "text",
    "fit_notes" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "availability" "text" DEFAULT 'in_stock'::"text" NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "is_trending" boolean DEFAULT false NOT NULL,
    "is_new_arrival" boolean DEFAULT false NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_availability_check" CHECK (("availability" = ANY (ARRAY['in_stock'::"text", 'coming_soon'::"text", 'out_of_stock'::"text"]))),
    CONSTRAINT "products_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_order_unique" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_size_color_name_key" UNIQUE ("product_id", "size", "color_name");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



CREATE INDEX "coupon_redemptions_active_index" ON "public"."coupon_redemptions" USING "btree" ("coupon_id", "released_at");



CREATE INDEX "coupon_redemptions_coupon_index" ON "public"."coupon_redemptions" USING "btree" ("coupon_id");



CREATE INDEX "coupon_redemptions_email_index" ON "public"."coupon_redemptions" USING "btree" ("lower"("customer_email"));



CREATE INDEX "coupon_redemptions_user_index" ON "public"."coupon_redemptions" USING "btree" ("customer_user_id");



CREATE INDEX "coupons_active_schedule_index" ON "public"."coupons" USING "btree" ("is_active", "starts_at", "ends_at");



CREATE UNIQUE INDEX "coupons_code_unique_index" ON "public"."coupons" USING "btree" ("upper"(TRIM(BOTH FROM "code")));



CREATE INDEX "customer_addresses_default_index" ON "public"."customer_addresses" USING "btree" ("user_id", "is_default");



CREATE INDEX "customer_addresses_user_id_index" ON "public"."customer_addresses" USING "btree" ("user_id");



CREATE INDEX "order_items_order_id_index" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_items_product_id_index" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "order_items_variant_id_index" ON "public"."order_items" USING "btree" ("variant_id");



CREATE INDEX "orders_coupon_code_index" ON "public"."orders" USING "btree" ("coupon_code");



CREATE INDEX "orders_coupon_id_index" ON "public"."orders" USING "btree" ("coupon_id");



CREATE INDEX "orders_created_at_index" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "orders_customer_email_index" ON "public"."orders" USING "btree" ("customer_email");



CREATE INDEX "orders_status_index" ON "public"."orders" USING "btree" ("status");



CREATE UNIQUE INDEX "product_images_one_primary_per_product_idx" ON "public"."product_images" USING "btree" ("product_id") WHERE ("is_primary" = true);



CREATE INDEX "product_images_product_id_idx" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "product_images_product_position_idx" ON "public"."product_images" USING "btree" ("product_id", "position");



CREATE INDEX "product_variants_product_id_idx" ON "public"."product_variants" USING "btree" ("product_id");



CREATE INDEX "products_category_id_idx" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "products_collection_id_idx" ON "public"."products" USING "btree" ("collection_id");



CREATE INDEX "products_created_at_idx" ON "public"."products" USING "btree" ("created_at" DESC);



CREATE INDEX "products_status_idx" ON "public"."products" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "collections_set_updated_at" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "coupons_touch_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."touch_coupon_updated_at"();



CREATE OR REPLACE TRIGGER "manage_default_customer_address_trigger" BEFORE INSERT OR UPDATE OF "is_default" ON "public"."customer_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."manage_default_customer_address"();



CREATE OR REPLACE TRIGGER "orders_sync_coupon_redemption" AFTER UPDATE OF "status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_cancelled_order_coupon_redemption"();



CREATE OR REPLACE TRIGGER "product_variants_set_updated_at" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "products_set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_customer_addresses_updated_at" BEFORE UPDATE ON "public"."customer_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_customer_updated_at"();



CREATE OR REPLACE TRIGGER "set_customer_profiles_updated_at" BEFORE UPDATE ON "public"."customer_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_customer_updated_at"();



CREATE OR REPLACE TRIGGER "set_product_published_at_trigger" BEFORE INSERT OR UPDATE OF "status", "published_at" ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_product_published_at"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON UPDATE CASCADE ON DELETE SET NULL;



CREATE POLICY "Active admins manage categories" ON "public"."categories" TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());



CREATE POLICY "Active admins manage collections" ON "public"."collections" TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());



CREATE POLICY "Active admins manage coupons" ON "public"."coupons" TO "authenticated" USING ("public"."is_active_admin_user"()) WITH CHECK ("public"."is_active_admin_user"());



CREATE POLICY "Active admins manage product images" ON "public"."product_images" TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());



CREATE POLICY "Active admins manage product variants" ON "public"."product_variants" TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());



CREATE POLICY "Active admins manage products" ON "public"."products" TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());



CREATE POLICY "Active admins read categories" ON "public"."categories" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());



CREATE POLICY "Active admins read collections" ON "public"."collections" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());



CREATE POLICY "Active admins read order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());



CREATE POLICY "Active admins read orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());



CREATE POLICY "Active admins read product images" ON "public"."product_images" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());



CREATE POLICY "Active admins read product variants" ON "public"."product_variants" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());



CREATE POLICY "Active admins read products" ON "public"."products" FOR SELECT TO "authenticated" USING ("public"."is_active_admin"());



CREATE POLICY "Active admins update orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."is_active_admin"()) WITH CHECK ("public"."is_active_admin"());



CREATE POLICY "Active admins view coupon redemptions" ON "public"."coupon_redemptions" FOR SELECT TO "authenticated" USING ("public"."is_active_admin_user"());



CREATE POLICY "Admins can delete categories" ON "public"."categories" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete collections" ON "public"."collections" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete product images" ON "public"."product_images" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete products" ON "public"."products" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can delete variants" ON "public"."product_variants" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert categories" ON "public"."categories" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert collections" ON "public"."collections" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert product images" ON "public"."product_images" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert variants" ON "public"."product_variants" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can read all product images" ON "public"."product_images" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read all products" ON "public"."products" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read all variants" ON "public"."product_variants" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = "auth"."uid"()) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admins can read orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = "auth"."uid"()) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admins can read their own admin record" ON "public"."admin_users" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("is_active" = true)));



CREATE POLICY "Admins can update categories" ON "public"."categories" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update collections" ON "public"."collections" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = "auth"."uid"()) AND ("admin_users"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE (("admin_users"."user_id" = "auth"."uid"()) AND ("admin_users"."is_active" = true)))));



CREATE POLICY "Admins can update product images" ON "public"."product_images" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update products" ON "public"."products" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update variants" ON "public"."product_variants" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins read themselves" ON "public"."admin_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Customers can create their own addresses" ON "public"."customer_addresses" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Customers can create their own profile" ON "public"."customer_profiles" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Customers can delete their own addresses" ON "public"."customer_addresses" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Customers can update their own addresses" ON "public"."customer_addresses" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Customers can update their own profile" ON "public"."customer_profiles" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Customers can view their own addresses" ON "public"."customer_addresses" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Customers can view their own order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("lower"(TRIM(BOTH FROM "orders"."customer_email")) = "lower"(TRIM(BOTH FROM COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))))))));



CREATE POLICY "Customers can view their own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("lower"(TRIM(BOTH FROM "customer_email")) = "lower"(TRIM(BOTH FROM COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))));



CREATE POLICY "Customers can view their own profile" ON "public"."customer_profiles" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Public can read active categories" ON "public"."categories" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Public can read active collections" ON "public"."collections" FOR SELECT TO "authenticated", "anon" USING (("is_active" = true));



CREATE POLICY "Public can read active variants of published products" ON "public"."product_variants" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."products"
  WHERE (("products"."id" = "product_variants"."product_id") AND ("products"."status" = 'published'::"text") AND ("products"."published_at" IS NOT NULL) AND ("products"."published_at" <= "now"()))))));



CREATE POLICY "Public can read images of published products" ON "public"."product_images" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."products"
  WHERE (("products"."id" = "product_images"."product_id") AND ("products"."status" = 'published'::"text") AND ("products"."published_at" IS NOT NULL) AND ("products"."published_at" <= "now"())))));



CREATE POLICY "Public can read published products" ON "public"."products" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'published'::"text") AND ("published_at" IS NOT NULL) AND ("published_at" <= "now"())));



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_active_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_active_admin_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_admin_user"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."place_order"("customer_data" "jsonb", "cart_items" "jsonb", "coupon_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_order"("customer_data" "jsonb", "cart_items" "jsonb", "coupon_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."place_order"("customer_data" "jsonb", "cart_items" "jsonb", "coupon_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."preview_coupon"("coupon_code_input" "text", "cart_subtotal" numeric, "customer_email_input" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."preview_coupon"("coupon_code_input" "text", "cart_subtotal" numeric, "customer_email_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."preview_coupon"("coupon_code_input" "text", "cart_subtotal" numeric, "customer_email_input" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."track_customer_order"("p_order_number" "text", "p_customer_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_customer_order"("p_order_number" "text", "p_customer_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."track_customer_order"("p_order_number" "text", "p_customer_email" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_users" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_users" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_users" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."collections" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."coupon_redemptions" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."coupon_redemptions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."coupon_redemptions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."coupons" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."customer_addresses" TO "anon";
GRANT ALL ON TABLE "public"."customer_addresses" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."customer_addresses" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."customer_profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."customer_profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."customer_profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."orders" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_images" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."product_variants" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";







