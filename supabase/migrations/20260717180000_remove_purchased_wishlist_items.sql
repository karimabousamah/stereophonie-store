CREATE OR REPLACE FUNCTION public.remove_purchased_product_from_wishlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  order_customer_user_id uuid;
  order_customer_email text;
BEGIN
  SELECT
    orders.customer_user_id,
    lower(
      trim(
        coalesce(
          orders.customer_email,
          ''
        )
      )
    )
  INTO
    order_customer_user_id,
    order_customer_email
  FROM public.orders
  WHERE orders.id = NEW.order_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  DELETE FROM public.wishlist_items
  WHERE wishlist_items.product_id =
    NEW.product_id
    AND (
      (
        order_customer_user_id IS NOT NULL
        AND wishlist_items.user_id =
          order_customer_user_id
      )
      OR
      (
        order_customer_email <> ''
        AND lower(
          trim(
            wishlist_items.email
          )
        ) = order_customer_email
      )
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS
  remove_purchased_product_from_wishlist_trigger
  ON public.order_items;

CREATE TRIGGER remove_purchased_product_from_wishlist_trigger
AFTER INSERT
ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION
  public.remove_purchased_product_from_wishlist();

REVOKE ALL
  ON FUNCTION public.remove_purchased_product_from_wishlist()
  FROM PUBLIC;

GRANT EXECUTE
  ON FUNCTION public.remove_purchased_product_from_wishlist()
  TO service_role;