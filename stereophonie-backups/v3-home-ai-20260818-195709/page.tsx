import type { Metadata } from "next";

import V3Homepage, {
  type V3HomeCategory,
} from "@/components/stereophonie-v3/home/v3-homepage";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import {
  isCurrentNewDrop,
  isProductOnOffer,
  type V3Product,
  type V3ProductImage,
  type V3ProductVariant,
} from "@/components/stereophonie-v3/shared/v3-product-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Stereophonie",
  description:
    "Discover technology, electronics and accessories at Stereophonie.",
};

type NamedRelation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
  created_at: string | null;
  categories: NamedRelation;
  brands: NamedRelation;
  product_images: V3ProductImage[] | null;
  product_variants: V3ProductVariant[] | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
};

function relationName(
  relation: NamedRelation,
  fallback = "",
) {
  if (!relation) {
    return fallback;
  }

  if (Array.isArray(relation)) {
    return (
      relation[0]?.name?.trim() ||
      fallback
    );
  }

  return relation.name?.trim() || fallback;
}

function normalizeProduct(
  product: ProductRow,
): V3Product {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: relationName(
      product.categories,
      "Technology",
    ),
    brandName: relationName(
      product.brands,
      "",
    ),
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    new_drop_started_at:
      product.new_drop_started_at,
    created_at: product.created_at,
    images: product.product_images ?? [],
    variants: product.product_variants ?? [],
  };
}

export default async function HomePage() {
  const supabase = await createClient();

  const [
    productsResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
          id,
          name,
          slug,
          description,
          is_featured,
          is_trending,
          is_new_arrival,
          new_drop_started_at,
          created_at,

          categories (
            name
          ),

          brands (
            name
          ),

          product_images (
            image_url,
            alt_text,
            position,
            is_primary
          ),

          product_variants (
            regular_price,
            sale_price,
            stock_quantity,
            size,
            variant_name,
            is_active,
            availability_status
          )
        `,
      )
      .eq("status", "published")
      .order("created_at", {
        ascending: false,
      })
      .limit(40),

    supabase
      .from("categories")
      .select(
        `
          id,
          name,
          slug,
          image_url,
          sort_order
        `,
      )
      .eq("is_active", true)
      .eq("show_on_homepage", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),
  ]);

  if (productsResult.error) {
    console.error(
      "V3 homepage products could not load:",
      productsResult.error,
    );
  }

  if (categoriesResult.error) {
    console.error(
      "V3 homepage categories could not load:",
      categoriesResult.error,
    );
  }

  const products = (
    (productsResult.data ?? []) as ProductRow[]
  ).map(normalizeProduct);

  const categories: V3HomeCategory[] = (
    (categoriesResult.data ?? []) as CategoryRow[]
  ).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    homepage_title: null,
    homepage_description: null,
    homepage_wallpaper_url:
      category.image_url ?? null,
  }));

  const latestProducts = products
    .filter(isCurrentNewDrop)
    .slice(0, 4);

  const latestFallback =
    latestProducts.length > 0
      ? latestProducts
      : products.slice(0, 4);

  const offerProducts = products
    .filter(isProductOnOffer)
    .slice(0, 4);

  const featuredProducts = products
    .filter(
      (product) =>
        product.is_featured ||
        product.is_trending,
    )
    .slice(0, 4);

  const featuredFallback =
    featuredProducts.length > 0
      ? featuredProducts
      : products.slice(4, 8);

  return (
    <>
      <V3Header />

      <V3Homepage
        categories={categories}
        latestProducts={latestFallback}
        offerProducts={offerProducts}
        featuredProducts={featuredFallback}
        catalogProducts={products}
      />

      <V3Footer />
    </>
  );
}
