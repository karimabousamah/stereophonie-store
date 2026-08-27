/*
 * Dynamic Stereophonie first-order welcome discount.
 *
 * Admin controls:
 * - whether new welcome claims are enabled
 * - the percentage used for newly generated coupons
 *
 * Existing issued coupons preserve their original discount_value.
 */

ALTER TABLE public.homepage_settings
  ADD COLUMN IF NOT EXISTS welcome_discount_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS welcome_discount_percentage integer NOT NULL DEFAULT 10;

UPDATE public.homepage_settings
SET
  welcome_discount_enabled =
    COALESCE(welcome_discount_enabled, true),
  welcome_discount_percentage =
    COALESCE(welcome_discount_percentage, 10)
WHERE id = 'default';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'homepage_settings_welcome_discount_percentage_check'
  ) THEN
    ALTER TABLE public.homepage_settings
      ADD CONSTRAINT homepage_settings_welcome_discount_percentage_check
      CHECK (
        welcome_discount_percentage >= 1
        AND welcome_discount_percentage <= 100
      );
  END IF;
END;
$$;


/*
 * Replace the original one-argument claim function with a
 * percentage-aware version. The function is service-role only.
 */

DROP FUNCTION IF EXISTS public.claim_welcome_discount(text);

CREATE OR REPLACE FUNCTION public.claim_welcome_discount(
  p_email text,
  p_discount_percentage integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text;
  requested_discount integer;
  previous_orders integer := 0;
  existing_code text;
  existing_discount numeric;
  new_code text;
  new_coupon_id uuid;
BEGIN
  normalized_email :=
    lower(trim(coalesce(p_email, '')));

  requested_discount :=
    greatest(
      1,
      least(
        100,
        coalesce(p_discount_percentage, 10)
      )
    );

  IF normalized_email = ''
     OR normalized_email !~
       '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Enter a valid email address.'
    );
  END IF;

  /*
   * If this email already owns a welcome coupon,
   * return that same coupon and its ORIGINAL value.
   */
  SELECT
    c.code,
    c.discount_value
  INTO
    existing_code,
    existing_discount
  FROM public.welcome_discount_claims w
  JOIN public.coupons c
    ON c.id = w.coupon_id
  WHERE w.email = normalized_email;

  IF existing_code IS NOT NULL THEN

    SELECT count(*)
    INTO previous_orders
    FROM public.orders
    WHERE lower(customer_email) =
      normalized_email
      AND status <> 'cancelled';

    IF previous_orders > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'already_customer', true,
        'message',
        'This welcome offer is available for first orders only.'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'existing', true,
      'code', existing_code,
      'discount', existing_discount
    );
  END IF;

  /*
   * Existing customers cannot claim a first-order offer.
   */
  SELECT count(*)
  INTO previous_orders
  FROM public.orders
  WHERE lower(customer_email) =
    normalized_email
    AND status <> 'cancelled';

  IF previous_orders > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_customer', true,
      'message',
      'This welcome offer is available for first orders only.'
    );
  END IF;

  LOOP
    new_code :=
      'WELCOME-' ||
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

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.coupons
      WHERE code = new_code
    );
  END LOOP;

  INSERT INTO public.coupons (
    code,
    name,
    description,
    discount_type,
    discount_value,
    minimum_subtotal,
    max_discount_amount,
    starts_at,
    ends_at,
    is_active,
    first_order_only,
    max_redemptions,
    max_redemptions_per_customer,
    created_by
  )
  VALUES (
    new_code,
    'First order welcome offer',
    'Private ' || requested_discount ||
      '% discount for a customer''s first Stereophonie order.',
    'percentage',
    requested_discount,
    0,
    NULL,
    now(),
    NULL,
    true,
    true,
    1,
    1,
    NULL
  )
  RETURNING id
  INTO new_coupon_id;

  INSERT INTO public.welcome_discount_claims (
    email,
    coupon_id
  )
  VALUES (
    normalized_email,
    new_coupon_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'existing', false,
    'code', new_code,
    'discount', requested_discount
  );

EXCEPTION
  WHEN unique_violation THEN
    /*
     * Two simultaneous requests for one email:
     * return the already-created coupon with its real value.
     */
    SELECT
      c.code,
      c.discount_value
    INTO
      existing_code,
      existing_discount
    FROM public.welcome_discount_claims w
    JOIN public.coupons c
      ON c.id = w.coupon_id
    WHERE w.email = normalized_email;

    IF existing_code IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'existing', true,
        'code', existing_code,
        'discount', existing_discount
      );
    END IF;

    RAISE;
END;
$$;

REVOKE ALL
ON FUNCTION public.claim_welcome_discount(text, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.claim_welcome_discount(text, integer)
TO service_role;
