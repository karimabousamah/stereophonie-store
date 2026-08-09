CREATE TABLE IF NOT EXISTS public.product_stock_notification_states (
  product_id uuid NOT NULL,
  stock_state text NOT NULL,
  state_version bigint DEFAULT 1 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT product_stock_notification_states_pkey
    PRIMARY KEY (product_id),

  CONSTRAINT product_stock_notification_states_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE,

  CONSTRAINT product_stock_notification_states_state_check
    CHECK (
      stock_state = ANY (
        ARRAY[
          'available'::text,
          'low_stock'::text,
          'out_of_stock'::text,
          'coming_soon'::text
        ]
      )
    ),

  CONSTRAINT product_stock_notification_states_version_check
    CHECK (state_version >= 1)
);

ALTER TABLE public.product_stock_notification_states
  OWNER TO postgres;

ALTER TABLE public.product_stock_notification_states
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read product stock notification states"
  ON public.product_stock_notification_states
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS
    last_low_stock_notified_version bigint
    DEFAULT 0
    NOT NULL,

  ADD COLUMN IF NOT EXISTS
    last_out_of_stock_notified_version bigint
    DEFAULT 0
    NOT NULL,

  ADD COLUMN IF NOT EXISTS
    last_notification_attempt_at timestamp with time zone,

  ADD COLUMN IF NOT EXISTS
    last_notification_error text;

ALTER TABLE public.stock_alerts
  ADD COLUMN IF NOT EXISTS
    last_attempt_at timestamp with time zone,

  ADD COLUMN IF NOT EXISTS
    last_error text;

CREATE OR REPLACE FUNCTION public.calculate_product_stock_notification_state(
  requested_product_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  variant_count integer;
  has_regular_stock boolean;
  has_low_stock boolean;
  all_coming_soon boolean;
BEGIN
  SELECT
    count(*),

    coalesce(
      bool_or(
        product_variants.availability_status = 'in_stock'
        AND product_variants.stock_quantity > 0
      ),
      false
    ),

    coalesce(
      bool_or(
        product_variants.availability_status = 'low_stock'
        AND product_variants.stock_quantity > 0
      ),
      false
    ),

    coalesce(
      bool_and(
        product_variants.availability_status = 'coming_soon'
      ),
      false
    )
  INTO
    variant_count,
    has_regular_stock,
    has_low_stock,
    all_coming_soon
  FROM public.product_variants
  WHERE product_variants.product_id =
    requested_product_id;

  IF variant_count = 0 THEN
    RETURN 'out_of_stock';
  END IF;

  IF has_regular_stock THEN
    RETURN 'available';
  END IF;

  IF has_low_stock THEN
    RETURN 'low_stock';
  END IF;

  IF all_coming_soon THEN
    RETURN 'coming_soon';
  END IF;

  RETURN 'out_of_stock';
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_product_stock_notification_state(
  requested_product_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  previous_state text;
  current_state text;
  current_version bigint;
  state_changed boolean := false;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE products.id =
      requested_product_id
  ) THEN
    RAISE EXCEPTION
      'The selected product does not exist.';
  END IF;

  current_state :=
    public.calculate_product_stock_notification_state(
      requested_product_id
    );

  SELECT
    product_stock_notification_states.stock_state,
    product_stock_notification_states.state_version
  INTO
    previous_state,
    current_version
  FROM public.product_stock_notification_states
  WHERE product_stock_notification_states.product_id =
    requested_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.product_stock_notification_states (
      product_id,
      stock_state,
      state_version,
      updated_at
    )
    VALUES (
      requested_product_id,
      current_state,
      1,
      now()
    );

    RETURN jsonb_build_object(
      'success',
      true,
      'initialized',
      true,
      'changed',
      false,
      'previous_state',
      NULL,
      'current_state',
      current_state,
      'state_version',
      1
    );
  END IF;

  IF previous_state <> current_state THEN
    current_version :=
      current_version + 1;

    state_changed := true;

    UPDATE public.product_stock_notification_states
    SET
      stock_state =
        current_state,

      state_version =
        current_version,

      updated_at =
        now()
    WHERE product_id =
      requested_product_id;
  END IF;

  RETURN jsonb_build_object(
    'success',
    true,
    'initialized',
    false,
    'changed',
    state_changed,
    'previous_state',
    previous_state,
    'current_state',
    current_state,
    'state_version',
    current_version
  );
END;
$function$;

INSERT INTO public.product_stock_notification_states (
  product_id,
  stock_state,
  state_version,
  updated_at
)
SELECT
  products.id,
  public.calculate_product_stock_notification_state(
    products.id
  ),
  1,
  now()
FROM public.products
ON CONFLICT (product_id)
DO NOTHING;

REVOKE ALL
  ON TABLE public.product_stock_notification_states
  FROM PUBLIC;

REVOKE ALL
  ON TABLE public.product_stock_notification_states
  FROM anon;

REVOKE ALL
  ON TABLE public.product_stock_notification_states
  FROM authenticated;

GRANT SELECT
  ON TABLE public.product_stock_notification_states
  TO authenticated;

GRANT ALL
  ON TABLE public.product_stock_notification_states
  TO service_role;

REVOKE ALL
  ON FUNCTION public.calculate_product_stock_notification_state(
    uuid
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.calculate_product_stock_notification_state(
    uuid
  )
  TO service_role;

REVOKE ALL
  ON FUNCTION public.refresh_product_stock_notification_state(
    uuid
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.refresh_product_stock_notification_state(
    uuid
  )
  TO service_role;