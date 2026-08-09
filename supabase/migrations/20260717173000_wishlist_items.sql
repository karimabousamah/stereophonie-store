CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  user_id uuid,
  email text NOT NULL,
  source text NOT NULL,
  guest_access_token uuid,
  notifications_enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT wishlist_items_pkey
    PRIMARY KEY (id),

  CONSTRAINT wishlist_items_product_id_fkey
    FOREIGN KEY (product_id)
    REFERENCES public.products(id)
    ON DELETE CASCADE,

  CONSTRAINT wishlist_items_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  CONSTRAINT wishlist_items_source_check
    CHECK (
      source = ANY (
        ARRAY[
          'account'::text,
          'guest'::text
        ]
      )
    ),

  CONSTRAINT wishlist_items_email_check
    CHECK (
      char_length(email) >= 5
      AND char_length(email) <= 320
    ),

  CONSTRAINT wishlist_items_identity_check
    CHECK (
      (
        user_id IS NOT NULL
        AND source = 'account'
        AND guest_access_token IS NULL
      )
      OR
      (
        user_id IS NULL
        AND source = 'guest'
        AND guest_access_token IS NOT NULL
      )
    )
);

ALTER TABLE public.wishlist_items
  OWNER TO postgres;

CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_account_product_unique
  ON public.wishlist_items (
    user_id,
    product_id
  )
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_guest_product_unique
  ON public.wishlist_items (
    product_id,
    email
  )
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_guest_token_unique
  ON public.wishlist_items (
    guest_access_token
  )
  WHERE guest_access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS wishlist_items_product_id_idx
  ON public.wishlist_items (
    product_id
  );

CREATE INDEX IF NOT EXISTS wishlist_items_email_idx
  ON public.wishlist_items (
    email
  );

CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx
  ON public.wishlist_items (
    user_id
  )
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wishlist_items_notifications_idx
  ON public.wishlist_items (
    product_id,
    notifications_enabled
  )
  WHERE notifications_enabled = true;

ALTER TABLE public.wishlist_items
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read wishlist items"
  ON public.wishlist_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update wishlist items"
  ON public.wishlist_items
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete wishlist items"
  ON public.wishlist_items
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Customers can read their wishlist"
  ON public.wishlist_items
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Customers can delete their wishlist"
  ON public.wishlist_items
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.add_wishlist_item(
  requested_product_id uuid,
  requested_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  authenticated_user_id uuid;
  normalized_email text;
  wishlist_item_id uuid;
  generated_guest_token uuid;
  wishlist_source text;
BEGIN
  authenticated_user_id :=
    auth.uid();

  IF NOT EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = requested_product_id
      AND product.status = 'published'
  ) THEN
    RAISE EXCEPTION
      'This product is not available.';
  END IF;

  IF authenticated_user_id IS NOT NULL THEN
    SELECT
      lower(trim(coalesce(account.email, '')))
    INTO normalized_email
    FROM auth.users AS account
    WHERE account.id = authenticated_user_id;

    IF normalized_email = '' THEN
      RAISE EXCEPTION
        'Your account does not have a valid email address.';
    END IF;

    INSERT INTO public.wishlist_items (
      product_id,
      user_id,
      email,
      source,
      guest_access_token,
      notifications_enabled,
      updated_at
    )
    VALUES (
      requested_product_id,
      authenticated_user_id,
      normalized_email,
      'account',
      NULL,
      true,
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
      updated_at = now()
    RETURNING id
    INTO wishlist_item_id;

    wishlist_source :=
      'account';

    generated_guest_token :=
      NULL;
  ELSE
    normalized_email :=
      lower(
        trim(
          coalesce(
            requested_email,
            ''
          )
        )
      );

    IF normalized_email = ''
      OR char_length(normalized_email) < 5
      OR char_length(normalized_email) > 320
      OR normalized_email !~
        '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    THEN
      RAISE EXCEPTION
        'Please enter a valid email address.';
    END IF;

    generated_guest_token :=
      gen_random_uuid();

    INSERT INTO public.wishlist_items (
      product_id,
      user_id,
      email,
      source,
      guest_access_token,
      notifications_enabled,
      updated_at
    )
    VALUES (
      requested_product_id,
      NULL,
      normalized_email,
      'guest',
      generated_guest_token,
      true,
      now()
    )
    ON CONFLICT (
      product_id,
      email
    )
    WHERE user_id IS NULL
    DO UPDATE SET
      notifications_enabled = true,
      updated_at = now()
    RETURNING
      id,
      guest_access_token
    INTO
      wishlist_item_id,
      generated_guest_token;

    wishlist_source :=
      'guest';
  END IF;

  RETURN jsonb_build_object(
    'success',
    true,
    'wishlist_item_id',
    wishlist_item_id,
    'product_id',
    requested_product_id,
    'email',
    normalized_email,
    'source',
    wishlist_source,
    'guest_access_token',
    generated_guest_token,
    'message',
    'The product was added to your wishlist.'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_wishlist_item(
  requested_product_id uuid,
  requested_email text DEFAULT NULL,
  requested_guest_token uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  authenticated_user_id uuid;
  normalized_email text;
  removed_count integer;
BEGIN
  authenticated_user_id :=
    auth.uid();

  IF authenticated_user_id IS NOT NULL THEN
    DELETE FROM public.wishlist_items
    WHERE product_id = requested_product_id
      AND user_id = authenticated_user_id;

    GET DIAGNOSTICS
      removed_count = ROW_COUNT;
  ELSE
    normalized_email :=
      lower(
        trim(
          coalesce(
            requested_email,
            ''
          )
        )
      );

    IF normalized_email = ''
      OR requested_guest_token IS NULL
    THEN
      RAISE EXCEPTION
        'The guest wishlist information is invalid.';
    END IF;

    DELETE FROM public.wishlist_items
    WHERE product_id = requested_product_id
      AND user_id IS NULL
      AND email = normalized_email
      AND guest_access_token =
        requested_guest_token;

    GET DIAGNOSTICS
      removed_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success',
    true,
    'removed',
    removed_count > 0,
    'product_id',
    requested_product_id,
    'message',
    CASE
      WHEN removed_count > 0
      THEN 'The product was removed from your wishlist.'
      ELSE 'The product was not present in your wishlist.'
    END
  );
END;
$function$;

REVOKE ALL
  ON TABLE public.wishlist_items
  FROM PUBLIC;

REVOKE ALL
  ON TABLE public.wishlist_items
  FROM anon;

REVOKE ALL
  ON TABLE public.wishlist_items
  FROM authenticated;

GRANT SELECT, UPDATE, DELETE
  ON TABLE public.wishlist_items
  TO authenticated;

GRANT ALL
  ON TABLE public.wishlist_items
  TO service_role;

REVOKE ALL
  ON FUNCTION public.add_wishlist_item(
    uuid,
    text
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.add_wishlist_item(
    uuid,
    text
  )
  TO anon;

GRANT EXECUTE
  ON FUNCTION public.add_wishlist_item(
    uuid,
    text
  )
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.add_wishlist_item(
    uuid,
    text
  )
  TO service_role;

REVOKE ALL
  ON FUNCTION public.remove_wishlist_item(
    uuid,
    text,
    uuid
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.remove_wishlist_item(
    uuid,
    text,
    uuid
  )
  TO anon;

GRANT EXECUTE
  ON FUNCTION public.remove_wishlist_item(
    uuid,
    text,
    uuid
  )
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.remove_wishlist_item(
    uuid,
    text,
    uuid
  )
  TO service_role;