GRANT SELECT
ON TABLE public.products
TO service_role;

GRANT SELECT
ON TABLE public.product_variants
TO service_role;

GRANT SELECT
ON TABLE public.product_images
TO service_role;

GRANT SELECT, UPDATE
ON TABLE public.wishlist_items
TO service_role;

GRANT SELECT, UPDATE
ON TABLE public.stock_alerts
TO service_role;

GRANT SELECT
ON TABLE public.product_stock_notification_states
TO service_role;

GRANT EXECUTE
ON FUNCTION public.refresh_product_stock_notification_state(
  uuid
)
TO service_role;

GRANT EXECUTE
ON FUNCTION public.calculate_product_stock_notification_state(
  uuid
)
TO service_role;