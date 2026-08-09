CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid NOT NULL,
  user_id uuid,
  email text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  notified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT stock_alerts_pkey
    PRIMARY KEY (id),

  CONSTRAINT stock_alerts_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE,

  CONSTRAINT stock_alerts_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES public.product_variants(id)
    ON DELETE CASCADE,

  CONSTRAINT stock_alerts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  CONSTRAINT stock_alerts_status_check
    CHECK (
      status = ANY (
        ARRAY[
          'pending'::text,
          'notified'::text,
          'cancelled'::text
        ]
      )
    ),

  CONSTRAINT stock_alerts_email_check
    CHECK (
      char_length(email) >= 5
      AND char_length(email) <= 320
    ),

  CONSTRAINT stock_alerts_variant_email_key
    UNIQUE (variant_id, email)
);

ALTER TABLE public.stock_alerts
  OWNER TO postgres;

CREATE INDEX IF NOT EXISTS stock_alerts_product_id_idx
  ON public.stock_alerts (product_id);

CREATE INDEX IF NOT EXISTS stock_alerts_variant_id_idx
  ON public.stock_alerts (variant_id);

CREATE INDEX IF NOT EXISTS stock_alerts_status_idx
  ON public.stock_alerts (status);

CREATE INDEX IF NOT EXISTS stock_alerts_requested_at_idx
  ON public.stock_alerts (requested_at DESC);

ALTER TABLE public.stock_alerts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read stock alerts"
  ON public.stock_alerts
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update stock alerts"
  ON public.stock_alerts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete stock alerts"
  ON public.stock_alerts
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.request_stock_alert(
  requested_product_id uuid,
  requested_variant_id uuid,
  requested_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  normalized_email text;
  alert_id uuid;
BEGIN
  normalized_email :=
    lower(trim(coalesce(requested_email, '')));

  IF normalized_email = ''
    OR char_length(normalized_email) < 5
    OR char_length(normalized_email) > 320
    OR normalized_email !~
      '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$'
  THEN
    RAISE EXCEPTION
      'Please enter a valid email address.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = requested_product_id
      AND product.status = 'published'
  ) THEN
    RAISE EXCEPTION
      'This product is not available.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.product_variants AS variant
    WHERE variant.id = requested_variant_id
      AND variant.product_id = requested_product_id
      AND (
        variant.availability_status IN (
          'out_of_stock',
          'coming_soon'
        )
        OR variant.stock_quantity < 1
      )
  ) THEN
    RAISE EXCEPTION
      'This size is currently available and does not require a notification.';
  END IF;

  INSERT INTO public.stock_alerts (
    product_id,
    variant_id,
    user_id,
    email,
    status,
    requested_at,
    notified_at,
    updated_at
  )
  VALUES (
    requested_product_id,
    requested_variant_id,
    auth.uid(),
    normalized_email,
    'pending',
    now(),
    NULL,
    now()
  )
  ON CONFLICT (variant_id, email)
  DO UPDATE SET
    product_id = EXCLUDED.product_id,
    user_id = COALESCE(
      EXCLUDED.user_id,
      public.stock_alerts.user_id
    ),
    status = 'pending',
    requested_at = now(),
    notified_at = NULL,
    updated_at = now()
  RETURNING id
  INTO alert_id;

  RETURN jsonb_build_object(
    'success',
    true,
    'alert_id',
    alert_id,
    'message',
    'You will be notified when this size becomes available.'
  );
END;
$function$;

REVOKE ALL
  ON TABLE public.stock_alerts
  FROM PUBLIC;

REVOKE ALL
  ON TABLE public.stock_alerts
  FROM anon;

REVOKE ALL
  ON TABLE public.stock_alerts
  FROM authenticated;

GRANT SELECT, UPDATE, DELETE
  ON TABLE public.stock_alerts
  TO authenticated;

GRANT ALL
  ON TABLE public.stock_alerts
  TO service_role;

REVOKE ALL
  ON FUNCTION public.request_stock_alert(
    uuid,
    uuid,
    text
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.request_stock_alert(
    uuid,
    uuid,
    text
  )
  TO anon;

GRANT EXECUTE
  ON FUNCTION public.request_stock_alert(
    uuid,
    uuid,
    text
  )
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.request_stock_alert(
    uuid,
    uuid,
    text
  )
  TO service_role;