-- ============================================================
-- STEREOPHONIE ADMIN
-- Reusable product option values
-- ============================================================

-- Reusable values explicitly created from product option selectors.
--
-- Examples:
--   ram       -> 24 GB
--   storage   -> 3 TB
--   capacity  -> 750 ml
--   model     -> Special Edition
--
-- option_key keeps reusable libraries separated by option type.

CREATE TABLE IF NOT EXISTS public.admin_product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT admin_product_option_values_key_not_blank
    CHECK (btrim(option_key) <> ''),

  CONSTRAINT admin_product_option_values_value_not_blank
    CHECK (btrim(value) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_product_option_values_key_value_lower_idx
ON public.admin_product_option_values (
  lower(btrim(option_key)),
  lower(btrim(value))
);

CREATE INDEX IF NOT EXISTS admin_product_option_values_key_idx
ON public.admin_product_option_values (
  lower(btrim(option_key)),
  created_at
);

ALTER TABLE public.admin_product_option_values
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins read product option values"
ON public.admin_product_option_values;

CREATE POLICY "Active admins read product option values"
ON public.admin_product_option_values
FOR SELECT
TO authenticated
USING (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins create product option values"
ON public.admin_product_option_values;

CREATE POLICY "Active admins create product option values"
ON public.admin_product_option_values
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins delete product option values"
ON public.admin_product_option_values;

CREATE POLICY "Active admins delete product option values"
ON public.admin_product_option_values
FOR DELETE
TO authenticated
USING (public.is_active_admin());
