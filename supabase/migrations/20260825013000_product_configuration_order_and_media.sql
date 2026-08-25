-- ============================================================
-- STEREOPHONIE
-- Stable configuration ordering + configuration-specific media
-- ============================================================

-- ------------------------------------------------------------
-- PRODUCT CONFIGURATION ORDER
-- ------------------------------------------------------------

ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS display_position integer;

UPDATE public.product_variants pv
SET display_position = ranked.position
FROM (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY product_id
      ORDER BY
        lower(coalesce(nullif(btrim(variant_name), ''), size, '')),
        id
    ) - 1 AS position
  FROM public.product_variants
) ranked
WHERE pv.id = ranked.id
  AND pv.display_position IS NULL;

ALTER TABLE public.product_variants
ALTER COLUMN display_position SET DEFAULT 0;

UPDATE public.product_variants
SET display_position = 0
WHERE display_position IS NULL;

ALTER TABLE public.product_variants
ALTER COLUMN display_position SET NOT NULL;

CREATE INDEX IF NOT EXISTS product_variants_product_position_idx
ON public.product_variants(product_id, display_position, id);

COMMENT ON COLUMN public.product_variants.display_position IS
'Administrator-controlled configuration order on the storefront. Lower values appear first.';


-- ------------------------------------------------------------
-- STABLE PHOTO → CONFIGURATION RELATIONSHIP
-- ------------------------------------------------------------

ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS variant_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_images_variant_id_fkey'
  ) THEN
    ALTER TABLE public.product_images
    ADD CONSTRAINT product_images_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES public.product_variants(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS product_images_variant_id_idx
ON public.product_images(product_id, variant_id);


-- ------------------------------------------------------------
-- CONFIGURATION-SPECIFIC PHOTO ORDER
-- ------------------------------------------------------------

ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS variant_position integer;

ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS is_variant_primary boolean;

UPDATE public.product_images
SET variant_position = position
WHERE variant_position IS NULL;

UPDATE public.product_images
SET is_variant_primary = false
WHERE is_variant_primary IS NULL;

ALTER TABLE public.product_images
ALTER COLUMN variant_position SET DEFAULT 0;

ALTER TABLE public.product_images
ALTER COLUMN is_variant_primary SET DEFAULT false;

UPDATE public.product_images
SET variant_position = 0
WHERE variant_position IS NULL;

UPDATE public.product_images
SET is_variant_primary = false
WHERE is_variant_primary IS NULL;

ALTER TABLE public.product_images
ALTER COLUMN variant_position SET NOT NULL;

ALTER TABLE public.product_images
ALTER COLUMN is_variant_primary SET NOT NULL;

CREATE INDEX IF NOT EXISTS product_images_variant_order_idx
ON public.product_images(
  product_id,
  variant_id,
  is_variant_primary DESC,
  variant_position,
  position
);

COMMENT ON COLUMN public.product_images.variant_position IS
'Photograph order inside its assigned product configuration.';

COMMENT ON COLUMN public.product_images.is_variant_primary IS
'True when this photograph is the main photograph for its assigned configuration.';


-- ------------------------------------------------------------
-- BACKFILL EXISTING variant_name LINKS
-- ------------------------------------------------------------

UPDATE public.product_images pi
SET variant_id = pv.id
FROM public.product_variants pv
WHERE pi.variant_id IS NULL
  AND pi.variant_name IS NOT NULL
  AND btrim(pi.variant_name) <> ''
  AND pv.product_id = pi.product_id
  AND lower(btrim(pv.variant_name)) = lower(btrim(pi.variant_name));

-- Preserve the old global primary as configuration primary where
-- a photograph already belongs to an exact configuration.
UPDATE public.product_images
SET is_variant_primary = true
WHERE variant_id IS NOT NULL
  AND is_primary = true;

