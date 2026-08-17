-- ============================================================
-- STEREOPHONIE
-- Electronics product variant architecture
--
-- Backward-compatible migration.
-- The legacy `size` column remains temporarily because existing
-- checkout/order code still references it.
-- ============================================================

ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS variant_name text;

ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------
-- Backfill existing variants.
-- Existing clothing-style values remain valid during migration.
-- ------------------------------------------------------------

UPDATE public.product_variants
SET variant_name =
  CASE
    WHEN NULLIF(BTRIM(color_name), '') IS NOT NULL
      THEN BTRIM(size) || ' / ' || BTRIM(color_name)
    ELSE BTRIM(size)
  END
WHERE variant_name IS NULL
   OR BTRIM(variant_name) = '';

-- ------------------------------------------------------------
-- Keep a usable human-readable variant name.
-- ------------------------------------------------------------

ALTER TABLE public.product_variants
ALTER COLUMN variant_name SET NOT NULL;

ALTER TABLE public.product_variants
ADD CONSTRAINT product_variants_variant_name_not_blank
CHECK (BTRIM(variant_name) <> '');

-- ------------------------------------------------------------
-- Replace the clothing-specific uniqueness rule.
-- ------------------------------------------------------------

ALTER TABLE public.product_variants
DROP CONSTRAINT IF EXISTS product_variants_product_id_size_color_name_key;

ALTER TABLE public.product_variants
ADD CONSTRAINT product_variants_product_id_variant_name_key
UNIQUE (product_id, variant_name);

-- ------------------------------------------------------------
-- Useful JSONB index for future specification filtering.
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS product_variants_attributes_gin_idx
ON public.product_variants
USING gin (attributes);

COMMENT ON COLUMN public.product_variants.variant_name IS
'Human-readable sellable configuration, for example 256GB / Black or M5 / 24GB / 1TB.';

COMMENT ON COLUMN public.product_variants.attributes IS
'Flexible product configuration attributes such as storage, memory, processor, color, connectivity or edition.';

COMMENT ON COLUMN public.product_variants.size IS
'Legacy compatibility field. Do not use for new storefront terminology.';
