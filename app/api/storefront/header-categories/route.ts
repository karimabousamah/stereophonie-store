import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;

type HeaderCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type HeaderSubcategoryRow = {
  id: string;
  category_id: string;
  parent_subcategory_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
};

type PublishedProductSubcategoryRow = {
  subcategory_id: string | null;
};

export async function GET() {
  const supabase = createAdminClient();

  const [
    categoriesResult,
    subcategoriesResult,
    publishedProductsResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,sort_order")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("subcategories")
      .select(
        "id,category_id,parent_subcategory_id,name,slug,sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("products")
      .select("subcategory_id")
      .eq("status", "published")
      .not("subcategory_id", "is", null),
  ]);

  if (categoriesResult.error) {
    console.error(
      "Header categories could not load:",
      categoriesResult.error,
    );

    return NextResponse.json(
      {
        categories: [],
        error: "Categories unavailable",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const categories =
    (categoriesResult.data ??
      []) as HeaderCategoryRow[];

  /*
   * Category navigation remains usable even if the optional
   * Subcategory enrichment query fails.
   */
  if (
    subcategoriesResult.error ||
    publishedProductsResult.error
  ) {
    if (subcategoriesResult.error) {
      console.error(
        "Header subcategories could not load:",
        subcategoriesResult.error,
      );
    }

    if (publishedProductsResult.error) {
      console.error(
        "Header Subcategory product visibility could not load:",
        publishedProductsResult.error,
      );
    }

    return NextResponse.json(
      {
        categories: categories.map(
          (category) => ({
            ...category,
            subcategories: [],
          }),
        ),
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  const subcategories =
    (subcategoriesResult.data ??
      []) as HeaderSubcategoryRow[];

  const products =
    (publishedProductsResult.data ??
      []) as PublishedProductSubcategoryRow[];

  const subcategoryById =
    new Map(
      subcategories.map(
        (subcategory) => [
          subcategory.id,
          subcategory,
        ],
      ),
    );

  /*
   * Mark every Subcategory containing a published product.
   * Then propagate visibility upward through all parents.
   */
  const visibleSubcategoryIds =
    new Set<string>();

  for (const product of products) {
    let currentId =
      typeof product.subcategory_id === "string"
        ? product.subcategory_id
        : "";

    const visited =
      new Set<string>();

    while (
      currentId &&
      !visited.has(currentId)
    ) {
      visited.add(currentId);

      const current =
        subcategoryById.get(
          currentId,
        );

      if (!current) {
        break;
      }

      visibleSubcategoryIds.add(
        current.id,
      );

      currentId =
        current.parent_subcategory_id ??
        "";
    }
  }

  /*
   * The mega-menu shows the first visible level.
   *
   * Parent Subcategories remain valid navigation entries:
   * once opened, the existing Category page displays their
   * children using the normal Subcategory navigation.
   */
  const rootSubcategoriesByCategory =
    new Map<
      string,
      HeaderSubcategoryRow[]
    >();

  for (const subcategory of subcategories) {
    if (
      subcategory.parent_subcategory_id ||
      !visibleSubcategoryIds.has(
        subcategory.id,
      )
    ) {
      continue;
    }

    const current =
      rootSubcategoriesByCategory.get(
        subcategory.category_id,
      ) ?? [];

    current.push(
      subcategory,
    );

    rootSubcategoriesByCategory.set(
      subcategory.category_id,
      current,
    );
  }

  return NextResponse.json(
    {
      categories: categories.map(
        (category) => ({
          ...category,

          subcategories:
            (
              rootSubcategoriesByCategory.get(
                category.id,
              ) ?? []
            ).map(
              (subcategory) => ({
                id: subcategory.id,
                name: subcategory.name,
                slug: subcategory.slug,
                sort_order:
                  subcategory.sort_order,
              }),
            ),
        }),
      ),
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
