CREATE OR REPLACE FUNCTION public.get_my_stock_notification_preference()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  authenticated_user_id uuid;
  normalized_email text;
  preference public.stock_notification_preferences%ROWTYPE;
BEGIN
  authenticated_user_id :=
    auth.uid();

  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION
      'You must be signed in to view notification preferences.';
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

  INSERT INTO public.stock_notification_preferences (
    email,
    notifications_enabled,
    updated_at
  )
  VALUES (
    normalized_email,
    true,
    now()
  )
  ON CONFLICT (email)
  DO NOTHING;

  SELECT preference_row.*
  INTO preference
  FROM public.stock_notification_preferences
    AS preference_row
  WHERE preference_row.email =
    normalized_email;

  RETURN jsonb_build_object(
    'success',
    true,
    'email',
    preference.email,
    'notifications_enabled',
    preference.notifications_enabled,
    'unsubscribed_at',
    preference.unsubscribed_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_my_stock_notification_preference(
  requested_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  authenticated_user_id uuid;
  normalized_email text;
BEGIN
  authenticated_user_id :=
    auth.uid();

  IF authenticated_user_id IS NULL THEN
    RAISE EXCEPTION
      'You must be signed in to update notification preferences.';
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

  INSERT INTO public.stock_notification_preferences (
    email,
    notifications_enabled,
    unsubscribed_at,
    updated_at
  )
  VALUES (
    normalized_email,
    requested_enabled,
    CASE
      WHEN requested_enabled
      THEN NULL
      ELSE now()
    END,
    now()
  )
  ON CONFLICT (email)
  DO UPDATE SET
    notifications_enabled =
      EXCLUDED.notifications_enabled,
    unsubscribed_at =
      EXCLUDED.unsubscribed_at,
    updated_at = now();

  UPDATE public.wishlist_items
  SET
    notifications_enabled =
      requested_enabled,
    updated_at = now()
  WHERE lower(trim(email)) =
    normalized_email;

  IF requested_enabled = false THEN
    UPDATE public.stock_alerts
    SET
      status = 'cancelled',
      updated_at = now()
    WHERE lower(trim(email)) =
      normalized_email
      AND status = 'pending';
  END IF;

  RETURN jsonb_build_object(
    'success',
    true,
    'email',
    normalized_email,
    'notifications_enabled',
    requested_enabled,
    'message',
    CASE
      WHEN requested_enabled
      THEN 'Stock email notifications were enabled.'
      ELSE 'Stock email notifications were disabled.'
    END
  );
END;
$function$;

REVOKE ALL
  ON FUNCTION public.get_my_stock_notification_preference()
  FROM PUBLIC;

REVOKE ALL
  ON FUNCTION public.get_my_stock_notification_preference()
  FROM anon;

GRANT EXECUTE
  ON FUNCTION public.get_my_stock_notification_preference()
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.get_my_stock_notification_preference()
  TO service_role;

REVOKE ALL
  ON FUNCTION public.set_my_stock_notification_preference(
    boolean
  )
  FROM PUBLIC;

REVOKE ALL
  ON FUNCTION public.set_my_stock_notification_preference(
    boolean
  )
  FROM anon;

GRANT EXECUTE
  ON FUNCTION public.set_my_stock_notification_preference(
    boolean
  )
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.set_my_stock_notification_preference(
    boolean
  )
  TO service_role;
