import { unstable_cache } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

export const SHOP_CATEGORY_FILTER_TAG =
  "storefront-shop-category-filters";

export const SHOP_BRAND_FILTER_TAG =
  "storefront-shop-brand-filters";

export type ShopCategoryFilterOption = {
  id: string;
  label: string;
  rootCategoryName: string;
  rootCategorySlug: string;
  subcategoryId: string | null;
};

type ShopCategoryFilterRootRow = {
  id: string;
  name: string;
  slug: string;
};

type ShopCategoryFilterNodeRow = {
  id: string;
  category_id: string;
  parent_subcategory_id: string | null;
  name: string;
};

type ShopCategoryProductAssignmentRow = {
  category_id: string | null;
  subcategory_id: string | null;
};

export const getShopCategoryFilterOptions = unstable_cache(
  async (): Promise<ShopCategoryFilterOption[]> => {
    const supabase = createAdminClient();

    const [
      categoriesResult,
      subcategoriesResult,
      productsResult,
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, sort_order")
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
          "id, category_id, parent_subcategory_id, name, sort_order",
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
        .select(
          "category_id, subcategory_id",
        )
        .eq("status", "published"),
    ]);

    if (categoriesResult.error) {
      console.error(
        "Stereophonie shop categories could not load:",
        categoriesResult.error,
      );

      return [];
    }

    if (subcategoriesResult.error) {
      console.error(
        "Stereophonie shop Subcategories could not load:",
        subcategoriesResult.error,
      );

      return [];
    }

    if (productsResult.error) {
      console.error(
        "Stereophonie shop Category assignments could not load:",
        productsResult.error,
      );

      return [];
    }

    const categories =
      (categoriesResult.data ??
        []) as ShopCategoryFilterRootRow[];

    const subcategories =
      (subcategoriesResult.data ??
        []) as ShopCategoryFilterNodeRow[];

    const assignments =
      (productsResult.data ??
        []) as ShopCategoryProductAssignmentRow[];

    const populatedRoots =
      new Set<string>();

    const populatedLeaves =
      new Set<string>();

    for (const product of assignments) {
      if (product.category_id) {
        populatedRoots.add(
          product.category_id,
        );
      }

      if (product.subcategory_id) {
        populatedLeaves.add(
          product.subcategory_id,
        );
      }
    }

    const nodesByCategory =
      new Map<
        string,
        ShopCategoryFilterNodeRow[]
      >();

    for (const node of subcategories) {
      const nodes =
        nodesByCategory.get(
          node.category_id,
        ) ?? [];

      nodes.push(node);

      nodesByCategory.set(
        node.category_id,
        nodes,
      );
    }

    const options:
      ShopCategoryFilterOption[] = [];

    /*
     * Same selection principle as Admin Add/Edit Product:
     *
     * Root without children -> selectable.
     * Root with children    -> organizational only.
     * Parent Subcategory    -> organizational only.
     * Deepest leaf          -> selectable.
     *
     * Storefront addition:
     * empty leaves remain hidden from customers.
     */
    for (const category of categories) {
      const nodes =
        nodesByCategory.get(
          category.id,
        ) ?? [];

      const childrenByParent =
        new Map<
          string | null,
          ShopCategoryFilterNodeRow[]
        >();

      for (const node of nodes) {
        const children =
          childrenByParent.get(
            node.parent_subcategory_id,
          ) ?? [];

        children.push(node);

        childrenByParent.set(
          node.parent_subcategory_id,
          children,
        );
      }

      const rootChildren =
        childrenByParent.get(null) ??
        [];

      if (rootChildren.length === 0) {
        if (
          populatedRoots.has(
            category.id,
          )
        ) {
          options.push({
            id: `category:${category.id}`,
            label: category.name,
            rootCategoryName:
              category.name,
            rootCategorySlug:
              category.slug,
            subcategoryId: null,
          });
        }

        continue;
      }

      const visited =
        new Set<string>();

      function appendLeaves(
        node: ShopCategoryFilterNodeRow,
      ) {
        if (visited.has(node.id)) {
          return;
        }

        visited.add(node.id);

        const children =
          childrenByParent.get(
            node.id,
          ) ?? [];

        if (children.length === 0) {
          if (
            populatedLeaves.has(
              node.id,
            )
          ) {
            options.push({
              id: `subcategory:${node.id}`,
              label: node.name,
              rootCategoryName:
                category.name,
              rootCategorySlug:
                category.slug,
              subcategoryId:
                node.id,
            });
          }

          return;
        }

        for (const child of children) {
          appendLeaves(child);
        }
      }

      for (const child of rootChildren) {
        appendLeaves(child);
      }
    }

    return options;
  },
  [
    "stereophonie-shop-category-filter-options-v3",
  ],
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
      .filter(Boolean)
      .sort((first, second) =>
        first.localeCompare(second, undefined, {
          sensitivity: "base",
        }),
      );
  },
  ["stereophonie-shop-brand-filter-options-v2"],
  {
    revalidate: 300,
    tags: [SHOP_BRAND_FILTER_TAG],
  },
);
