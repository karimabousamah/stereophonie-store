import type { Metadata } from "next";

import GamingDesktopBuilder from "@/components/storefront/gaming-desktop-builder";
import V2ShopPage from "@/components/stereophonie-v2/shop/v2-shop-page";
import {
  shopSelectedAvailability,
  shopSelectedPrice,
  shopSelectedSort,
  shopSingleParameter,
} from "@/lib/storefront-shop-catalog";
import {
  loadShopProductBatch,
  SHOP_PRODUCTS_PER_BATCH,
} from "@/lib/storefront-shop-loader";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse Stereophonie electronics, technology and accessories. Filter products by category, brand, availability and price.",
};

type ShopPageProps = {
  searchParams: Promise<{
    search?: string | string[];
    q?: string | string[];
    category?: string | string[];
    offers?: string | string[];
    brand?: string | string[];
    availability?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    sort?: string | string[];
  }>;
};

export default async function ShopPage({
  searchParams,
}: ShopPageProps) {
  const parameters = await searchParams;

  const search =
    shopSingleParameter(parameters.search).trim() ||
    shopSingleParameter(parameters.q).trim();

  const category = shopSingleParameter(
    parameters.category,
  ).trim();

  /*
   * STEREOPHONIE_GAMING_DESKTOP_BUILDER_ROUTE
   *
   * Gaming Desktop remains a custom consultation experience
   * rather than a normal product-grid category.
   */
  const normalizedGamingDesktopCategory = category
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

  const isGamingDesktopExperience =
    normalizedGamingDesktopCategory.includes("gaming") &&
    (normalizedGamingDesktopCategory.includes("desktop") ||
      normalizedGamingDesktopCategory.includes("pc"));

  if (isGamingDesktopExperience) {
    return <GamingDesktopBuilder />;
  }

  const offers =
    shopSingleParameter(parameters.offers)
      .trim()
      .toLowerCase() === "true";

  const brand = shopSingleParameter(
    parameters.brand,
  ).trim();

  const availability = shopSelectedAvailability(
    shopSingleParameter(
      parameters.availability,
    ).toLowerCase(),
  );

  const requestedMinimumPrice = shopSelectedPrice(
    shopSingleParameter(parameters.minPrice),
  );

  const requestedMaximumPrice = shopSelectedPrice(
    shopSingleParameter(parameters.maxPrice),
  );

  const sort = shopSelectedSort(
    shopSingleParameter(parameters.sort).toLowerCase(),
  );

  const supabase = await createClient();

  /*
   * Product loading is now two-stage:
   *
   * 1. The lightweight catalogue index preserves exact
   *    whole-catalogue filtering, searching, price bounds
   *    and sorting.
   *
   * 2. The expensive image/configuration graph is fetched
   *    only for the first visible batch.
   */
  const [
    initialBatch,
    categoriesResult,
    brandsResult,
  ] = await Promise.all([
    loadShopProductBatch({
      filters: {
        search,
        category,
        offers,
        brand,
        availability,
        requestedMinimumPrice,
        requestedMaximumPrice,
        sort,
      },
      offset: 0,
      limit: SHOP_PRODUCTS_PER_BATCH,
    }),

    supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("brands")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),
  ]);

  if (categoriesResult.error) {
    console.error(
      "Stereophonie categories could not load:",
      categoriesResult.error,
    );
  }

  if (brandsResult.error) {
    console.error(
      "Stereophonie brands could not load:",
      brandsResult.error,
    );
  }

  const categories = (categoriesResult.data ?? [])
    .map((item) => String(item.name ?? "").trim())
    .filter(Boolean);

  const brands = (brandsResult.data ?? [])
    .map((item) => String(item.name ?? "").trim())
    .filter(Boolean);

  return (
    <V2ShopPage
      products={initialBatch.products}
      totalProducts={initialBatch.totalProducts}
      categories={categories}
      brands={brands}
      selectedCategory={category}
      selectedBrand={brand}
      selectedOffers={offers}
      selectedAvailability={availability}
      selectedSort={sort}
      selectedMinPrice={initialBatch.minimumPrice}
      selectedMaxPrice={initialBatch.maximumPrice}
      minimumAvailablePrice={
        initialBatch.minimumAvailablePrice
      }
      maximumAvailablePrice={
        initialBatch.maximumAvailablePrice
      }
      selectedSearch={search}
    />
  );
}
