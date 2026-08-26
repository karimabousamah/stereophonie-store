
/*
 * Stereophonie first-order welcome discount.
 *
 * Existing coupon engine remains authoritative.
 * This layer adds:
 * - one welcome code per normalized email
 * - private code ownership
 * - server-only generation
 */

CREATE TABLE IF NOT EXISTS public.welcome_discount_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  email text NOT NULL,

  coupon_id uuid NOT NULL
    REFERENCES public.coupons(id)
    ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  last_emailed_at timestamptz,

  CONSTRAINT welcome_discount_claims_email_unique
    UNIQUE (email),

  CONSTRAINT welcome_discount_claims_coupon_unique
    UNIQUE (coupon_id),

  CONSTRAINT welcome_discount_claims_email_normalized
    CHECK (
      email = lower(trim(email))
      AND length(email) > 3
    )
);

CREATE INDEX IF NOT EXISTS
  welcome_discount_claims_email_idx
ON public.welcome_discount_claims(email);

ALTER TABLE public.welcome_discount_claims
ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON TABLE public.welcome_discount_claims
FROM PUBLIC, anon, authenticated;

GRANT ALL
ON TABLE public.welcome_discount_claims
TO service_role;


/*
 * Generate or retrieve exactly one welcome coupon per email.
 */
CREATE OR REPLACE FUNCTION public.claim_welcome_discount(
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text;
  previous_orders integer := 0;
  existing_code text;
  new_code text;
  new_coupon_id uuid;
BEGIN
  normalized_email :=
    lower(trim(coalesce(p_email, '')));

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
   * Never create another code for the same email.
   */
  SELECT c.code
  INTO existing_code
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
      'discount', 10
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
    'Private 10% discount for a customer''s first Stereophonie order.',
    'percentage',
    10,
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
    'discount', 10
  );

EXCEPTION
  WHEN unique_violation THEN
    /*
     * Two simultaneous requests for one email:
     * return the already-created code.
     */
    SELECT c.code
    INTO existing_code
    FROM public.welcome_discount_claims w
    JOIN public.coupons c
      ON c.id = w.coupon_id
    WHERE w.email = normalized_email;

    IF existing_code IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'existing', true,
        'code', existing_code,
        'discount', 10
      );
    END IF;

    RAISE;
END;
$$;

REVOKE ALL
ON FUNCTION public.claim_welcome_discount(text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.claim_welcome_discount(text)
TO service_role;


/*
 * Final database ownership protection.
 *
 * place_order() already validates:
 * - first_order_only
 * - max_redemptions
 * - max_redemptions_per_customer
 *
 * This trigger adds:
 * - the welcome coupon must belong to the order email.
 *
 * Because it is a BEFORE INSERT trigger on orders, manipulating
 * frontend JavaScript cannot bypass this protection.
 */
CREATE OR REPLACE FUNCTION
public.enforce_welcome_coupon_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_email text;
BEGIN
  IF NEW.coupon_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT email
  INTO owner_email
  FROM public.welcome_discount_claims
  WHERE coupon_id = NEW.coupon_id;

  IF owner_email IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(trim(NEW.customer_email)) <>
     lower(trim(owner_email))
  THEN
    RAISE EXCEPTION
      'This welcome discount code belongs to a different email address.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  enforce_welcome_coupon_email_trigger
ON public.orders;

CREATE TRIGGER
  enforce_welcome_coupon_email_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION
  public.enforce_welcome_coupon_email();
