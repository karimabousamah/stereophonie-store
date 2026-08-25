-- ============================================================
-- STEREOPHONIE V5
-- Configuration colour system + configuration photographs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_custom_colors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    hex_value text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

    CONSTRAINT admin_custom_colors_name_not_blank
      CHECK (btrim(name) <> ''),

    CONSTRAINT admin_custom_colors_hex_valid
      CHECK (hex_value ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_custom_colors_name_lower_idx
ON public.admin_custom_colors (lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS admin_custom_colors_hex_lower_idx
ON public.admin_custom_colors (lower(hex_value));

ALTER TABLE public.admin_custom_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active admins read custom colors"
ON public.admin_custom_colors;

CREATE POLICY "Active admins read custom colors"
ON public.admin_custom_colors
FOR SELECT
TO authenticated
USING (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins create custom colors"
ON public.admin_custom_colors;

CREATE POLICY "Active admins create custom colors"
ON public.admin_custom_colors
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Active admins delete custom colors"
ON public.admin_custom_colors;

CREATE POLICY "Active admins delete custom colors"
ON public.admin_custom_colors
FOR DELETE
TO authenticated
USING (public.is_active_admin());

ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS variant_name text;

CREATE INDEX IF NOT EXISTS product_images_variant_name_idx
ON public.product_images(product_id, variant_name);

COMMENT ON COLUMN public.product_images.variant_name IS
'Optional configuration association. NULL means shared across every configuration.';
