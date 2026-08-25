
-- ============================================================
-- STEREOPHONIE
-- Atomic existing-product photograph reordering
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_move_product_image(
  requested_product_id uuid,
  requested_image_id uuid,
  requested_direction text
)
RETURNS TABLE (
  moved boolean,
  image_id uuid,
  old_position integer,
  new_position integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row public.product_images%ROWTYPE;
  target_row public.product_images%ROWTYPE;
  maximum_position integer;
BEGIN
  /*
   * Never allow this SECURITY DEFINER function to be used by
   * ordinary storefront/customer accounts.
   */
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;

  IF requested_direction NOT IN ('left', 'right') THEN
    RAISE EXCEPTION 'Invalid photograph direction.';
  END IF;

  /*
   * Lock the selected photograph.
   */
  SELECT *
  INTO current_row
  FROM public.product_images
  WHERE id = requested_image_id
    AND product_id = requested_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The photograph could not be found.';
  END IF;

  /*
   * Find the immediately preceding/following photograph according
   * to the SAME global `position` field used by the admin grid.
   *
   * This means:
   *
   *   position 0 | position 1 | position 2
   *
   * really becomes:
   *
   *   position 0 | position 1 | position 2
   *
   * after every arrow click, regardless of configuration assignment.
   */
  IF requested_direction = 'left' THEN
    SELECT *
    INTO target_row
    FROM public.product_images
    WHERE product_id = requested_product_id
      AND (
        position < current_row.position
        OR (
          position = current_row.position
          AND id < current_row.id
        )
      )
      AND id <> current_row.id
    ORDER BY position DESC, id DESC
    LIMIT 1
    FOR UPDATE;
  ELSE
    SELECT *
    INTO target_row
    FROM public.product_images
    WHERE product_id = requested_product_id
      AND (
        position > current_row.position
        OR (
          position = current_row.position
          AND id > current_row.id
        )
      )
      AND id <> current_row.id
    ORDER BY position ASC, id ASC
    LIMIT 1
    FOR UPDATE;
  END IF;

  /*
   * First / last photograph: nothing to move.
   */
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      false,
      current_row.id,
      current_row.position,
      current_row.position;

    RETURN;
  END IF;

  /*
   * Use a temporary position so this remains safe if a uniqueness
   * rule is ever added in the future.
   */
  SELECT COALESCE(MAX(position), -1) + 1000
  INTO maximum_position
  FROM public.product_images
  WHERE product_id = requested_product_id;

  UPDATE public.product_images
  SET position = maximum_position
  WHERE id = current_row.id
    AND product_id = requested_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not prepare photograph movement.';
  END IF;

  UPDATE public.product_images
  SET position = current_row.position
  WHERE id = target_row.id
    AND product_id = requested_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not move the neighbouring photograph.';
  END IF;

  UPDATE public.product_images
  SET position = target_row.position
  WHERE id = current_row.id
    AND product_id = requested_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not finish photograph movement.';
  END IF;

  /*
   * Normalize every product image to clean consecutive positions.
   *
   * We intentionally preserve the newly swapped ordering.
   */
  WITH ordered AS (
    SELECT
      id,
      row_number() OVER (
        ORDER BY position ASC, id ASC
      ) - 1 AS normalized_position
    FROM public.product_images
    WHERE product_id = requested_product_id
  )
  UPDATE public.product_images AS pi
  SET position = ordered.normalized_position
  FROM ordered
  WHERE pi.id = ordered.id;

  /*
   * Return the ACTUAL persisted result so the application can
   * verify that the database really changed.
   */
  RETURN QUERY
  SELECT
    true,
    pi.id,
    current_row.position,
    pi.position
  FROM public.product_images AS pi
  WHERE pi.id = current_row.id;
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_move_product_image(uuid, uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_move_product_image(uuid, uuid, text)
TO authenticated;

COMMENT ON FUNCTION public.admin_move_product_image(uuid, uuid, text) IS
'Atomically moves one existing product photograph left/right using product_images.position. Restricted to active administrators.';
