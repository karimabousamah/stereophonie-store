import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

export const SHOP_CATEGORY_FILTER_TAG =
  "storefront-shop-category-filters";

export const SHOP_BRAND_FILTER_TAG =
  "storefront-shop-brand-filters";

export const getShopCategoryFilterOptions = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Stereophonie shop categories could not load:",
        error,
      );

      return [];
    }

    return (data ?? [])
      .map((item) => String(item.name ?? "").trim())
      .filter(Boolean);
  },
  ["stereophonie-shop-category-filter-options-v1"],
  {
    revalidate: 300,
    tags: [SHOP_CATEGORY_FILTER_TAG],
  },
);

export async function getShopBrandFilterOptionsForCategory(
  categoryName: string,
): Promise<string[]> {
  const normalizedCategory = categoryName.trim();

  if (!normalizedCategory) {
    return getShopBrandFilterOptions();
  }

  const supabase = createAdminClient();

  /*
   * Category-scoped brand facets come from published products,
   * not from the global brand library.
   *
   * This intentionally ignores the currently selected brand so the
   * customer can always switch between every brand represented in
   * the selected category.
   */
  const { data, error } = await supabase
    .from("products")
    .select(
      `
        categories (
          name
        ),
        brands (
          name,
          is_active
        )
      `,
    )
    .eq("status", "published");

  if (error) {
    console.error(
      "Stereophonie category brand options could not load:",
      error,
    );

    return [];
  }

  const brands = new Set<string>();

  for (const product of data ?? []) {
    const categoryRelation = product.categories;
    const category = Array.isArray(categoryRelation)
      ? categoryRelation[0]
      : categoryRelation;

    if (
      String(category?.name ?? "").trim().toLowerCase() !==
      normalizedCategory.toLowerCase()
    ) {
      continue;
    }

    const brandRelation = product.brands;
    const brand = Array.isArray(brandRelation)
      ? brandRelation[0]
      : brandRelation;

    const brandName = String(brand?.name ?? "").trim();

    if (brandName && brand?.is_active !== false) {
      brands.add(brandName);
    }
  }

  return Array.from(brands).sort((first, second) =>
    first.localeCompare(second, undefined, {
      sensitivity: "base",
    }),
  );
}

export const getShopBrandFilterOptions = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("brands")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Stereophonie shop brands could not load:",
        error,
      );

      return [];
    }

    return (data ?? [])
      .map((item) => String(item.name ?? "").trim())
      .filter(Boolean);
  },
  ["stereophonie-shop-brand-filter-options-v1"],
  {
    revalidate: 300,
    tags: [SHOP_BRAND_FILTER_TAG],
  },
);
