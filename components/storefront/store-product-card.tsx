"use client";

import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";

export type StoreProductImage = {
  image_url: string | null;
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
  variants: StoreProductVariant[];
};

export default function StoreProductCard({
  product,
  index = 0,
}: {
  product: StoreProductCardProduct;
  index?: number;
}) {
  return <V2ProductCard product={product} index={index} />;
}
