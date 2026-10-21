/*
 * Product variant barcodes are lookup identifiers, not globally unique
 * product identities.
 *
 * Multiple product configurations may intentionally share the same
 * physical barcode. Remove the historical uniqueness requirement while
 * retaining an indexed lookup path for non-empty barcodes.
 */

DROP INDEX IF EXISTS public.product_variants_barcode_unique_idx;

CREATE INDEX IF NOT EXISTS product_variants_barcode_idx
ON public.product_variants (barcode)
WHERE barcode IS NOT NULL
  AND btrim(barcode) <> '';

COMMENT ON INDEX public.product_variants_barcode_idx IS
'Non-unique lookup index for optional product variant barcodes. Duplicate non-empty barcodes are intentionally allowed.';
