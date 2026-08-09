CREATE OR REPLACE FUNCTION public.merge_guest_wishlist_items(
  requested_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  authenticated_user_id uuid;
  normalized_email text;
  requested_item jsonb;
  requested_product_id uuid;
  requested_guest_token uuid;
  matching_guest_item public.wishlist_items%ROWTYPE;
  merged_count integer := 0;
  ignored_count integer := 0;
BEGIN
  authenticated_user_id :=
    auth.uid();

  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION
      'You must be signed in to synchronize a wishlist.';
  END IF;

  IF requested_items IS NULL THEN
    requested_items :=
      '[]'::jsonb;
  END IF;

  IF jsonb_typeof(requested_items) <> 'array' THEN
    RAISE EXCEPTION
      'The guest wishlist information is invalid.';
  END IF;

  IF jsonb_array_length(requested_items) > 200 THEN
    RAISE EXCEPTION
      'Too many wishlist items were submitted.';
  END IF;

  SELECT
    lower(
      trim(
        coalesce(
          account.email,
          ''
        )
      )
    )
  INTO normalized_email
  FROM auth.users AS account
  WHERE account.id =
    authenticated_user_id;

  IF normalized_email = '' THEN
    RAISE EXCEPTION
      'Your account does not have a valid email address.';
  END IF;

  FOR requested_item IN
    SELECT item
    FROM jsonb_array_elements(
      requested_items
    ) AS submitted(item)
  LOOP
    requested_product_id :=
      NULL;

    requested_guest_token :=
      NULL;

    BEGIN
      requested_product_id :=
        nullif(
          trim(
            requested_item
              ->> 'productId'
          ),
          ''
        )::uuid;

      requested_guest_token :=
        nullif(
          trim(
            requested_item
              ->> 'guestAccessToken'
          ),
          ''
        )::uuid;
    EXCEPTION
      WHEN invalid_text_representation
      THEN
        ignored_count :=
          ignored_count + 1;

        CONTINUE;
    END;

    IF requested_product_id IS NULL
      OR requested_guest_token IS NULL
    THEN
      ignored_count :=
        ignored_count + 1;

      CONTINUE;
    END IF;

    SELECT guest_item.*
    INTO matching_guest_item
    FROM public.wishlist_items
      AS guest_item
    WHERE guest_item.user_id IS NULL
      AND guest_item.source = 'guest'
      AND guest_item.product_id =
        requested_product_id
      AND guest_item.guest_access_token =
        requested_guest_token
    FOR UPDATE;

    IF NOT FOUND THEN
      ignored_count :=
        ignored_count + 1;

      CONTINUE;
    END IF;

    INSERT INTO public.wishlist_items (
      product_id,
      user_id,
      email,
      source,
      guest_access_token,
      notifications_enabled,
      created_at,
      updated_at
    )
    VALUES (
      matching_guest_item.product_id,
      authenticated_user_id,
      normalized_email,
      'account',
      NULL,
      matching_guest_item.notifications_enabled,
      matching_guest_item.created_at,
      now()
    )
    ON CONFLICT (
      user_id,
      product_id
    )
    WHERE user_id IS NOT NULL
    DO UPDATE SET
      email = EXCLUDED.email,
      notifications_enabled = true,
      updated_at = now();

    DELETE FROM public.wishlist_items
    WHERE id =
      matching_guest_item.id;

    merged_count :=
      merged_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',
    true,
    'merged_count',
    merged_count,
    'ignored_count',
    ignored_count,
    'message',
    CASE
      WHEN merged_count = 1
      THEN 'One guest wishlist item was added to your account.'
      WHEN merged_count > 1
      THEN merged_count ||
        ' guest wishlist items were added to your account.'
      ELSE 'Your account wishlist is synchronized.'
    END
  );
END;
$function$;

REVOKE ALL
  ON FUNCTION public.merge_guest_wishlist_items(
    jsonb
  )
  FROM PUBLIC;

REVOKE ALL
  ON FUNCTION public.merge_guest_wishlist_items(
    jsonb
  )
  FROM anon;

GRANT EXECUTE
  ON FUNCTION public.merge_guest_wishlist_items(
    jsonb
  )
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.merge_guest_wishlist_items(
    jsonb
  )
  TO service_role;
