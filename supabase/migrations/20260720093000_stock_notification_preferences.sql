CREATE TABLE IF NOT EXISTS public.stock_notification_preferences (
  email text NOT NULL,
  unsubscribe_token uuid DEFAULT gen_random_uuid() NOT NULL,
  notifications_enabled boolean DEFAULT true NOT NULL,
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  CONSTRAINT stock_notification_preferences_pkey
    PRIMARY KEY (email),

  CONSTRAINT stock_notification_preferences_token_unique
    UNIQUE (unsubscribe_token),

  CONSTRAINT stock_notification_preferences_email_check
    CHECK (
      email = lower(trim(email))
      AND char_length(email) >= 5
      AND char_length(email) <= 320
    )
);

ALTER TABLE public.stock_notification_preferences
  OWNER TO postgres;

ALTER TABLE public.stock_notification_preferences
  ENABLE ROW LEVEL SECURITY;

INSERT INTO public.stock_notification_preferences (
  email
)
SELECT DISTINCT
  lower(trim(source_email))
FROM (
  SELECT email AS source_email
  FROM public.wishlist_items

  UNION

  SELECT email AS source_email
  FROM public.stock_alerts
) AS existing_emails
WHERE source_email IS NOT NULL
  AND trim(source_email) <> ''
ON CONFLICT (email)
DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_stock_notification_preference(
  requested_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  normalized_email text;
  preference public.stock_notification_preferences%ROWTYPE;
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

  IF normalized_email = ''
    OR char_length(normalized_email) < 5
    OR char_length(normalized_email) > 320
    OR normalized_email !~
      '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN
    RAISE EXCEPTION
      'The notification email address is invalid.';
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
    'unsubscribe_token',
    preference.unsubscribe_token
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.unsubscribe_stock_notifications(
  requested_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  preference public.stock_notification_preferences%ROWTYPE;
BEGIN
  SELECT preference_row.*
  INTO preference
  FROM public.stock_notification_preferences
    AS preference_row
  WHERE preference_row.unsubscribe_token =
    requested_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'This unsubscribe link is invalid or has expired.';
  END IF;

  UPDATE public.stock_notification_preferences
  SET
    notifications_enabled = false,
    unsubscribed_at = now(),
    updated_at = now()
  WHERE email = preference.email;

  UPDATE public.wishlist_items
  SET
    notifications_enabled = false,
    updated_at = now()
  WHERE lower(trim(email)) =
    preference.email;

  UPDATE public.stock_alerts
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE lower(trim(email)) =
    preference.email
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success',
    true,
    'email',
    preference.email,
    'notifications_enabled',
    false,
    'message',
    'You have been unsubscribed from Nita Style stock notifications.'
  );
END;
$function$;

REVOKE ALL
  ON TABLE public.stock_notification_preferences
  FROM PUBLIC;

REVOKE ALL
  ON TABLE public.stock_notification_preferences
  FROM anon;

REVOKE ALL
  ON TABLE public.stock_notification_preferences
  FROM authenticated;

GRANT ALL
  ON TABLE public.stock_notification_preferences
  TO service_role;

REVOKE ALL
  ON FUNCTION public.ensure_stock_notification_preference(
    text
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.ensure_stock_notification_preference(
    text
  )
  TO service_role;

REVOKE ALL
  ON FUNCTION public.unsubscribe_stock_notifications(
    uuid
  )
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.unsubscribe_stock_notifications(
    uuid
  )
  TO anon;

GRANT EXECUTE
  ON FUNCTION public.unsubscribe_stock_notifications(
    uuid
  )
  TO authenticated;

GRANT EXECUTE
  ON FUNCTION public.unsubscribe_stock_notifications(
    uuid
  )
  TO service_role;
