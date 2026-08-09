
CREATE OR REPLACE FUNCTION public.request_stock_alert(

  requested_product_id uuid,

  requested_variant_id uuid,

  requested_email text

)

RETURNS jsonb

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public, auth, pg_temp

AS $function$

DECLARE

  normalized_email text;

  alert_id uuid;

  authenticated_user_id uuid;

  alert_message text;

  alert_scope text;

BEGIN

  normalized_email :=

    lower(

      trim(

        coalesce(

          requested_email,

          ''

        )

      )

    );

  authenticated_user_id :=

    auth.uid();

  IF normalized_email = ''

    OR char_length(normalized_email) < 5

    OR char_length(normalized_email) > 320

    OR normalized_email !~

      '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'

  THEN

    RAISE EXCEPTION

      'Please enter a valid email address.';

  END IF;

  IF NOT EXISTS (

    SELECT 1

    FROM public.products AS product

    WHERE product.id =

      requested_product_id

      AND product.status =

        'published'

  ) THEN

    RAISE EXCEPTION

      'This product is not available.';

  END IF;

  IF requested_variant_id IS NOT NULL THEN

    IF NOT EXISTS (

      SELECT 1

      FROM public.product_variants AS variant

      WHERE variant.id =

        requested_variant_id

        AND variant.product_id =

          requested_product_id

    ) THEN

      RAISE EXCEPTION

        'The selected size or option is invalid.';

    END IF;

    IF EXISTS (

      SELECT 1

      FROM public.product_variants AS variant

      WHERE variant.id =

        requested_variant_id

        AND variant.product_id =

          requested_product_id

        AND variant.stock_quantity > 0

        AND variant.availability_status IN (

          'in_stock',

          'low_stock'

        )

    ) THEN

      RAISE EXCEPTION

        'This size or option is currently available.';

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

      authenticated_user_id,

      normalized_email,

      'pending',

      now(),

      NULL,

      now()

    )

    ON CONFLICT (

      variant_id,

      email

    )

    WHERE variant_id IS NOT NULL

    DO UPDATE SET

      product_id =

        EXCLUDED.product_id,

      user_id =

        COALESCE(

          EXCLUDED.user_id,

          public.stock_alerts.user_id

        ),

      status = 'pending',

      requested_at = now(),

      notified_at = NULL,

      last_attempt_at = NULL,

      last_error = NULL,

      updated_at = now()

    RETURNING id

    INTO alert_id;

    alert_scope :=

      'variant';

    alert_message :=

      'You will be notified when this size or option becomes available.';

  ELSE

    IF EXISTS (

      SELECT 1

      FROM public.product_variants AS variant

      WHERE variant.product_id =

        requested_product_id

        AND variant.stock_quantity > 0

        AND variant.availability_status IN (

          'in_stock',

          'low_stock'

        )

    ) THEN

      RAISE EXCEPTION

        'This product is currently available.';

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

      NULL,

      authenticated_user_id,

      normalized_email,

      'pending',

      now(),

      NULL,

      now()

    )

    ON CONFLICT (

      product_id,

      email

    )

    WHERE variant_id IS NULL

    DO UPDATE SET

      user_id =

        COALESCE(

          EXCLUDED.user_id,

          public.stock_alerts.user_id

        ),

      status = 'pending',

      requested_at = now(),

      notified_at = NULL,

      last_attempt_at = NULL,

      last_error = NULL,

      updated_at = now()

    RETURNING id

    INTO alert_id;

    alert_scope :=

      'product';

    alert_message :=

      'You will be notified when this product becomes available.';

  END IF;

  INSERT INTO public.stock_notification_preferences (

    email,

    notifications_enabled,

    unsubscribed_at,

    updated_at

  )

  VALUES (

    normalized_email,

    true,

    NULL,

    now()

  )

  ON CONFLICT (email)

  DO UPDATE SET

    notifications_enabled = true,

    unsubscribed_at = NULL,

    updated_at = now();

  UPDATE public.wishlist_items

  SET

    notifications_enabled = true,

    updated_at = now()

  WHERE lower(trim(email)) =

    normalized_email;

  RETURN jsonb_build_object(

    'success',

    true,

    'alert_id',

    alert_id,

    'scope',

    alert_scope,

    'email',

    normalized_email,

    'notifications_enabled',

    true,

    'message',

    alert_message

  );

END;

$function$;

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

