-- ============================================================
-- STEREOPHONIE
-- Configuration-specific photograph ordering
-- ============================================================


-- ------------------------------------------------------------
-- REPAIR EXISTING CONFIGURATION MEDIA
-- ------------------------------------------------------------
--
-- Older code allowed is_variant_primary and variant_position
-- to drift apart.
--
-- Preserve the photograph currently marked Main and then
-- normalize every configuration to clean 0, 1, 2... positions.
--

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY product_id, variant_id
      ORDER BY
        is_variant_primary DESC,
        variant_position ASC,
        position ASC,
        id ASC
    ) - 1 AS new_variant_position
  FROM public.product_images
  WHERE variant_id IS NOT NULL
)
UPDATE public.product_images AS image
SET variant_position = ranked.new_variant_position
FROM ranked
WHERE image.id = ranked.id;


UPDATE public.product_images
SET is_variant_primary = (variant_position = 0)
WHERE variant_id IS NOT NULL;


-- Shared images are never configuration-primary.
UPDATE public.product_images
SET is_variant_primary = false
WHERE variant_id IS NULL;


-- ------------------------------------------------------------
-- ATOMIC CONFIGURATION-SPECIFIC MOVE
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_move_product_configuration_image(
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

  current_group_index integer;
  target_group_index integer;

  current_variant_name text;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Administrator access required.';
  END IF;

  IF requested_direction NOT IN ('left', 'right') THEN
    RAISE EXCEPTION 'Invalid photograph direction.';
  END IF;


  -- Selected photograph.
  SELECT *
  INTO current_row
  FROM public.product_images
  WHERE id = requested_image_id
    AND product_id = requested_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The photograph could not be found.';
  END IF;


  current_variant_name :=
    lower(
      coalesce(
        nullif(btrim(current_row.variant_name), ''),
        ''
      )
    );


  /*
   * Normalize the selected photograph's own configuration
   * before moving anything.
   *
   * Stable variant_id is authoritative.
   *
   * Legacy products without variant_id fall back to
   * variant_name.
   *
   * Blank variant_id + blank variant_name = shared images.
   */
  WITH group_rows AS (
    SELECT
      image.id,
      row_number() OVER (
        ORDER BY
          image.is_variant_primary DESC,
          image.variant_position ASC,
          image.position ASC,
          image.id ASC
      ) - 1 AS normalized_position
    FROM public.product_images AS image
    WHERE image.product_id = requested_product_id
      AND (
        (
          current_row.variant_id IS NOT NULL
          AND image.variant_id = current_row.variant_id
        )
        OR
        (
          current_row.variant_id IS NULL
          AND image.variant_id IS NULL
          AND lower(
            coalesce(
              nullif(btrim(image.variant_name), ''),
              ''
            )
          ) = current_variant_name
        )
      )
  )
  UPDATE public.product_images AS image
  SET variant_position = group_rows.normalized_position
  FROM group_rows
  WHERE image.id = group_rows.id;


  -- Reload the normalized selected row.
  SELECT *
  INTO current_row
  FROM public.product_images
  WHERE id = requested_image_id
    AND product_id = requested_product_id
  FOR UPDATE;


  current_group_index := current_row.variant_position;

  target_group_index :=
    CASE
      WHEN requested_direction = 'left'
        THEN current_group_index - 1
      ELSE current_group_index + 1
    END;


  -- Find the immediate neighbour INSIDE THE SAME CONFIGURATION.
  SELECT *
  INTO target_row
  FROM public.product_images AS image
  WHERE image.product_id = requested_product_id
    AND image.variant_position = target_group_index
    AND image.id <> current_row.id
    AND (
      (
        current_row.variant_id IS NOT NULL
        AND image.variant_id = current_row.variant_id
      )
      OR
      (
        current_row.variant_id IS NULL
        AND image.variant_id IS NULL
        AND lower(
          coalesce(
            nullif(btrim(image.variant_name), ''),
            ''
          )
        ) = current_variant_name
      )
    )
  ORDER BY image.position ASC, image.id ASC
  LIMIT 1
  FOR UPDATE;


  -- Already first / last inside the configuration.
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      false,
      current_row.id,
      current_group_index,
      current_group_index;

    RETURN;
  END IF;


  -- Swap configuration positions.
  UPDATE public.product_images
  SET variant_position = -1000
  WHERE id = current_row.id
    AND product_id = requested_product_id;


  UPDATE public.product_images
  SET variant_position = current_group_index
  WHERE id = target_row.id
    AND product_id = requested_product_id;


  UPDATE public.product_images
  SET variant_position = target_group_index
  WHERE id = current_row.id
    AND product_id = requested_product_id;


  /*
   * The first photograph in each configuration is Main.
   *
   * This keeps the arrows, Main badge, admin ordering and
   * storefront gallery perfectly synchronized.
   */
  UPDATE public.product_images AS image
  SET is_variant_primary =
    (image.variant_position = 0)
  WHERE image.product_id = requested_product_id
    AND (
      (
        current_row.variant_id IS NOT NULL
        AND image.variant_id = current_row.variant_id
      )
      OR
      (
        current_row.variant_id IS NULL
        AND image.variant_id IS NULL
        AND lower(
          coalesce(
            nullif(btrim(image.variant_name), ''),
            ''
          )
        ) = current_variant_name
      )
    );


  RETURN QUERY
  SELECT
    true,
    current_row.id,
    current_group_index,
    target_group_index;
END;
$$;


REVOKE ALL
ON FUNCTION public.admin_move_product_configuration_image(
  uuid,
  uuid,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_move_product_configuration_image(
  uuid,
  uuid,
  text
)
TO authenticated;


COMMENT ON FUNCTION
public.admin_move_product_configuration_image(uuid, uuid, text)
IS
'Moves an existing product photograph left or right inside its own product configuration using variant_position.';
