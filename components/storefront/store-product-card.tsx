"use client";

import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";

export type StoreProductImage = {
  image_url: string | null;

  /*
   * Lightweight permanent storefront derivative.
   * Falls back to image_url if unavailable.
   */
  storefront_image_url?: string | null;

  alt_text: string | null;

  /*
   * Legacy global image ordering.
   */
  position: number;
  is_primary: boolean;

  /*
   * Stable configuration-specific media.
   *
   * null variant_id = shared product photograph.
   */
  variant_id?: string | null;
  variant_position?: number | null;
  is_variant_primary?: boolean | null;

  /*
   * Complete many-to-many configuration media assignments.
   *
   * The default storefront gallery still uses the first configuration,
   * while interactive colour selection can resolve another
   * configuration's actual photographs from this graph.
   */
  product_image_variants?:
    | {
        variant_id: string;
        position: number;
        is_primary: boolean;
      }[]
    | null;
};

export type StoreProductVariant = {
  /*
   * Exact database configuration identity.
   */
  id?: string | null;

  /*
   * Administrator-controlled storefront order.
   */
  display_position?: number | null;

  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  size?: string | null;
  variant_name?: string | null;
  attributes?: Record<string, unknown> | null;
  is_active?: boolean | null;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
};

export type StoreProductCardProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categoryName: string;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;

  /**
   * Exact timestamp used for the automatic seven-day
   * NEW DROP lifecycle.
   */
  new_drop_started_at?: string | null;

  images: StoreProductImage[];

  /*
   * Existing first-configuration storefront gallery.
   *
   * This remains the default card image order. `images` additionally
   * retains the complete configuration media graph for interactive
   * colour selection.
   */
  defaultImages?: StoreProductImage[];

  variants: StoreProductVariant[];
};

export default function StoreProductCard({
  product,
  index = 0,
}: {
  product: StoreProductCardProduct;
  index?: number;
}) {
  /*
   * ============================================================
   * AUTHORITATIVE STOREFRONT MEDIA ORDER
   * ============================================================
   *
   * app/shop/page.tsx has already selected and ordered the gallery
   * belonging to the administrator's first configuration.
   *
   * At this point the array itself is authoritative:
   *
   *   images[0] = Configuration 1 / Position 1 / Main
   *   images[1] = Configuration 1 / Position 2 / Hover
   *
   * V2ProductCard predates product_image_variants and still understands
   * legacy variant image fields. Normalize those legacy fields here so
   * it cannot reinterpret the already-correct gallery and accidentally
   * choose another photograph.
   */
  const defaultImages =
    product.defaultImages?.length
      ? product.defaultImages
      : product.images;

  const authoritativeDefaultImages = defaultImages.map(
    (image, imageIndex) => ({
      ...image,

      position: imageIndex,
      is_primary: imageIndex === 0,

      /*
       * Preserve the existing default first-configuration gallery.
       * The complete product.images graph remains untouched so
       * clicked colourways can resolve their own media assignments.
       */
      variant_id: null,
      variant_position: imageIndex,
      is_variant_primary: imageIndex === 0,
    }),
  );

  const authoritativeProduct: StoreProductCardProduct = {
    ...product,
    defaultImages: authoritativeDefaultImages,
  };

  return <V2ProductCard product={authoritativeProduct} index={index} />;
}
