-- ============================================================
-- STEREOPHONIE STORE
-- Ask for price availability
-- ============================================================


-- ------------------------------------------------------------
-- CONFIGURATION PRICE
--
-- Coming Soon, Out of Stock and Ask for Price may intentionally
-- have no public regular price.
-- ------------------------------------------------------------

alter table public.product_variants
  alter column regular_price drop not null;


-- Old Admin behavior stored an intentionally blank unavailable
-- price as numeric 0. Convert only unavailable placeholder zeros
-- to the new nullable representation.
update public.product_variants
set
  regular_price = null,
  sale_price = null
where
  regular_price = 0
  and availability_status in (
    'coming_soon',
    'out_of_stock'
  );


-- ------------------------------------------------------------
-- CONFIGURATION AVAILABILITY
-- ------------------------------------------------------------

alter table public.product_variants
  drop constraint if exists
    product_variants_availability_status_check;

alter table public.product_variants
  add constraint
    product_variants_availability_status_check
  check (
    availability_status in (
      'in_stock',
      'low_stock',
      'out_of_stock',
      'coming_soon',
      'ask_for_price'
    )
  );


-- Existing regular-price >= 0 check safely permits NULL.
-- Add an explicit guard so Sale Price can never exist without
-- a corresponding Regular Price.
alter table public.product_variants
  drop constraint if exists
    product_variants_sale_requires_regular_price_check;

alter table public.product_variants
  add constraint
    product_variants_sale_requires_regular_price_check
  check (
    sale_price is null
    or regular_price is not null
  );


-- ------------------------------------------------------------
-- PRODUCT-LEVEL AVAILABILITY
--
-- This allows the aggregate product record to represent a fully
-- Ask-for-Price product when we wire the aggregate storefront
-- behavior in the accompanying application changes.
-- ------------------------------------------------------------

alter table public.products
  drop constraint if exists
    products_availability_check;

alter table public.products
  add constraint products_availability_check
  check (
    availability in (
      'in_stock',
      'coming_soon',
      'out_of_stock',
      'ask_for_price'
    )
  );
