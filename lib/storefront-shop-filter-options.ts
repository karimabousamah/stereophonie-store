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
