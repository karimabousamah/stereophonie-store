import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import type { HeaderNavigationCategory } from "@/lib/storefront-header-navigation-types";

/*
 * TOP HEADER ONLY
 *
 * This loader exists only so the visible desktop navigation:
 *
 * Store
 * Mobile Phones
 * Smart Watches
 * Fitness Devices
 * ...
 * Support
 *
 * is already available during the initial server render.
 *
 * Subcategory / Mega Menu enrichment remains handled by the
 * existing Header Category API and is intentionally untouched.
 */
async function loadTopHeaderCategories(): Promise<
  HeaderNavigationCategory[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order")
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Top Header Categories could not load:",
      error,
    );

    return [];
  }

  return (data ?? []) as HeaderNavigationCategory[];
}

export const getHeaderNavigationCategories =
  unstable_cache(
    loadTopHeaderCategories,
    [
      "stereophonie-top-header-categories-v1",
    ],
    {
      revalidate: 60,
    },
  );
