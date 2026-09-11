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
import {
  getShopBrandFilterOptions,
  getShopCategoryFilterOptions,
} from "@/lib/storefront-shop-filter-options";

/*
 * Smaller first render for faster /shop navigation.
 * Load More keeps the existing 50-product batch size.
 */
const SHOP_INITIAL_PRODUCTS = 24;

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

  /*
   * Product loading is now two-stage:
   *
   * 1. The lightweight catalogue index preserves exact
   *    whole-catalogue filtering, searching, price bounds
   *    and sorting.
   *
   * 2. The expensive image/configuration graph is fetched
   *    only for the first visible batch.
   *
   * Category and brand filter metadata are independently
   * cached because they change far less often than products.
   */
  const [
    initialBatch,
    categories,
    brands,
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
      limit: SHOP_INITIAL_PRODUCTS,
    }),

    getShopCategoryFilterOptions(),
    getShopBrandFilterOptions(),
  ]);

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
