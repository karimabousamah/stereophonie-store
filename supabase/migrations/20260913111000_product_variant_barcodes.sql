ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS barcode text;

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_barcode_unique_idx
ON public.product_variants (barcode)
WHERE barcode IS NOT NULL AND btrim(barcode) <> '';

COMMENT ON COLUMN public.product_variants.barcode IS
'Optional physical barcode identifier for this exact sellable product configuration, such as UPC, EAN or GTIN.';
