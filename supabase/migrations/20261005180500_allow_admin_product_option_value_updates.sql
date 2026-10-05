-- ============================================================
-- STEREOPHONIE ADMIN
-- Allow active administrators to rename reusable option values
-- ============================================================

DROP POLICY IF EXISTS "Active admins update product option values"
ON public.admin_product_option_values;

CREATE POLICY "Active admins update product option values"
ON public.admin_product_option_values
FOR UPDATE
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());
