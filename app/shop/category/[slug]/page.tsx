import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

import { StereophonieShopPage } from "@/app/shop/page";
import type {
  StorefrontSubcategoryNavigation,
} from "@/components/stereophonie-v3/shop/category-subcategory-navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { STOREFRONT_CATEGORY_CACHE_TAG } from "@/lib/storefront-cache-tags";

const SITE_URL = "https://www.stereophoniestore.com";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    search?: string | string[];
    q?: string | string[];
    subcategory?: string | string[];
    offers?: string | string[];
    brand?: string | string[];
    availability?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    sort?: string | string[];
  }>;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type SubcategoryRow = {
  id: string;
  category_id: string;
  parent_subcategory_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  homepage_theme: "light" | "dark" | null;
  sort_order: number;
};

function firstSearchParameter(
  value: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

async function loadVisibleSubcategoryNavigation({
  category,
  requestedSubcategory,
}: {
  category: CategoryRow;
  requestedSubcategory:
    | string
    | string[]
    | undefined;
}): Promise<{
  navigation:
    | StorefrontSubcategoryNavigation
    | null;
  leafSubcategoryId: string;
}> {
  const supabase = createAdminClient();

  const [
    subcategoriesResult,
    publishedProductsResult,
  ] = await Promise.all([
    supabase
      .from("subcategories")
      .select(
        "id, category_id, parent_subcategory_id, name, slug, image_url, homepage_theme, sort_order",
      )
      .eq("category_id", category.id)
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
          `
            category_id,
            subcategory_id,
            product_category_assignments (
              category_id,
              subcategory_id
            )
          `,
        )
        .eq("status", "published"),
  ]);

  if (subcategoriesResult.error) {
    console.error(
      "Stereophonie category subcategories could not load:",
      subcategoriesResult.error,
    );
  }

  if (publishedProductsResult.error) {
    console.error(
      "Stereophonie category product assignments could not load:",
      publishedProductsResult.error,
    );
  }

  if (
    subcategoriesResult.error ||
    publishedProductsResult.error
  ) {
    return {
      navigation: null,
      leafSubcategoryId: "",
    };
  }

  const subcategories =
    (subcategoriesResult.data ??
      []) as SubcategoryRow[];

  const nodesById =
    new Map<string, SubcategoryRow>(
      subcategories.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const childrenByParent =
    new Map<
      string | null,
      SubcategoryRow[]
    >();

  for (const node of subcategories) {
    const siblings =
      childrenByParent.get(
        node.parent_subcategory_id,
      ) ?? [];

    siblings.push(node);

    childrenByParent.set(
      node.parent_subcategory_id,
      siblings,
    );
  }

  /*
     * Only published products count.
     *
     * Both the canonical destination and explicit additional
     * destinations can populate storefront Subcategories.
     *
     * A NULL subcategory_id belongs only to the root Category.
     * It must not make a child Subcategory visible.
     */
    const directlyPopulated =
      new Set<string>();

    for (
      const product
      of publishedProductsResult.data ?? []
    ) {
      if (
        product.category_id ===
        category.id
      ) {
        const primarySubcategoryId =
          typeof product.subcategory_id ===
          "string"
            ? product.subcategory_id.trim()
            : "";

        if (primarySubcategoryId) {
          directlyPopulated.add(
            primarySubcategoryId,
          );
        }
      }

      for (
        const assignment
        of product.product_category_assignments ??
          []
      ) {
        if (
          assignment.category_id !==
          category.id
        ) {
          continue;
        }

        const additionalSubcategoryId =
          typeof assignment.subcategory_id ===
          "string"
            ? assignment.subcategory_id.trim()
            : "";

        if (additionalSubcategoryId) {
          directlyPopulated.add(
            additionalSubcategoryId,
          );
        }
      }
    }

  /*
   * An active node must also have a complete active path
   * back to the root Category. This prevents orphaned
   * descendants from appearing when an ancestor is inactive.
   */
  const reachabilityCache =
    new Map<string, boolean>();

  function isReachableFromRoot(
    nodeId: string,
    ancestry = new Set<string>(),
  ): boolean {
    const cached =
      reachabilityCache.get(nodeId);

    if (cached !== undefined) {
      return cached;
    }

    const node =
      nodesById.get(nodeId);

    if (!node) {
      return false;
    }

    if (ancestry.has(nodeId)) {
      reachabilityCache.set(
        nodeId,
        false,
      );

      return false;
    }

    if (!node.parent_subcategory_id) {
      reachabilityCache.set(
        nodeId,
        true,
      );

      return true;
    }

    const nextAncestry =
      new Set(ancestry);

    nextAncestry.add(nodeId);

    const reachable =
      isReachableFromRoot(
        node.parent_subcategory_id,
        nextAncestry,
      );

    reachabilityCache.set(
      nodeId,
      reachable,
    );

    return reachable;
  }

  /*
   * Recursive bottom-up visibility:
   *
   * populated leaf    -> visible
   * empty leaf        -> hidden
   * populated branch  -> visible
   * empty branch      -> hidden
   */
  const visibilityCache =
    new Map<string, boolean>();

  function branchHasPublishedProduct(
    nodeId: string,
    ancestry = new Set<string>(),
  ): boolean {
    const cached =
      visibilityCache.get(nodeId);

    if (cached !== undefined) {
      return cached;
    }

    if (!isReachableFromRoot(nodeId)) {
      visibilityCache.set(
        nodeId,
        false,
      );

      return false;
    }

    if (ancestry.has(nodeId)) {
      visibilityCache.set(
        nodeId,
        false,
      );

      return false;
    }

    const nextAncestry =
      new Set(ancestry);

    nextAncestry.add(nodeId);

    const children =
      childrenByParent.get(nodeId) ??
      [];

    const visible =
      directlyPopulated.has(nodeId) ||
      children.some(
        (child) =>
          branchHasPublishedProduct(
            child.id,
            nextAncestry,
          ),
      );

    visibilityCache.set(
      nodeId,
      visible,
    );

    return visible;
  }

  function visibleChildren(
    parentId: string | null,
  ) {
    return (
      childrenByParent.get(parentId) ??
      []
    ).filter(
      (node) =>
        branchHasPublishedProduct(
          node.id,
        ),
    );
  }

  const requestedId =
    firstSearchParameter(
      requestedSubcategory,
    ).trim();

  const requestedNode =
    requestedId
      ? nodesById.get(
          requestedId,
        ) ?? null
      : null;

  const selectedNode =
    requestedNode &&
    isReachableFromRoot(
      requestedNode.id,
    ) &&
    branchHasPublishedProduct(
      requestedNode.id,
    )
      ? requestedNode
      : null;

  const currentChildren =
    visibleChildren(
      selectedNode?.id ?? null,
    );

  /*
   * Parents remain navigation nodes.
   * Only a visible leaf becomes the exact product filter.
   */
  const leafSubcategoryId =
    selectedNode &&
    currentChildren.length === 0
      ? selectedNode.id
      : "";

  /*
   * When the customer reaches a leaf, keep that leaf's sibling
   * selectors visible so they can switch Subcategories directly.
   *
   * Parent nodes still show their visible children.
   */
  const navigationNodes =
    leafSubcategoryId
      ? visibleChildren(
          selectedNode?.parent_subcategory_id ??
            null,
        )
      : currentChildren;

  const rootHref =
    `/shop/category/${encodeURIComponent(
      category.slug,
    )}`;

  const parentNode =
    selectedNode?.parent_subcategory_id
      ? nodesById.get(
          selectedNode
            .parent_subcategory_id,
        ) ?? null
      : null;

  const backHref =
    selectedNode
      ? parentNode
        ? `${rootHref}?subcategory=${encodeURIComponent(
            parentNode.id,
          )}`
        : rootHref
      : null;

  const backLabel =
    selectedNode
      ? parentNode?.name ??
        category.name
      : null;

  const items =
    navigationNodes.map(
      (
        node,
      ): StorefrontSubcategoryNavigation["items"][number] => ({
        id: node.id,
        name: node.name,

        href:
          `${rootHref}?subcategory=${encodeURIComponent(
            node.id,
          )}`,

        imageUrl:
          node.image_url ?? null,

        theme:
          node.homepage_theme ===
          "dark"
            ? "dark"
            : "light",

        hasChildren:
          visibleChildren(
            node.id,
          ).length > 0,
      }),
    );

  const navigation:
    | StorefrontSubcategoryNavigation
    | null =
    items.length > 0 ||
    selectedNode
      ? {
          eyebrow:
            "Explore the range",

          title:
            selectedNode?.name ??
            category.name,

          backHref,
          backLabel,
          items,
        }
      : null;

  return {
    navigation,
    leafSubcategoryId,
  };
}

const loadActiveCategories = unstable_cache(
  async (): Promise<CategoryRow[]> => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, description")
      .eq("is_active", true);

    if (error) {
      throw error;
    }

    return (data ?? []) as CategoryRow[];
  },
  ["stereophonie-active-category-pages-v1"],
  {
    revalidate: 3600,
    tags: [STOREFRONT_CATEGORY_CACHE_TAG],
  },
);

async function getCategoryBySlug(slug: string) {
  try {
    const categories = await loadActiveCategories();

    return {
      data:
        categories.find((category) => category.slug === slug) ??
        null,
      error: null,
    };
  } catch (error) {
    console.error(
      "Stereophonie category page lookup failed:",
      error,
    );

    return {
      data: null,
      error,
    };
  }
}

function categoryDescription(category: CategoryRow) {
  const description = category.description?.trim();

  if (description) {
    return description;
  }

  return `Shop ${category.name} at Stereophonie Store. Explore electronics and technology with delivery across Lebanon.`;
}

export async function generateMetadata({
  params,
}: Pick<CategoryPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;

  const { data: category } = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl = `${SITE_URL}/shop/category/${encodeURIComponent(
    category.slug,
  )}`;

  const title = category.name;

  const description = categoryDescription(category).slice(0, 160);

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: "Stereophonie Store",
      locale: "en_LB",
    },

    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;

  const { data: category, error } =
    await getCategoryBySlug(slug);

  if (error || !category) {
    notFound();
  }

  const parameters = await searchParams;

  const {
    navigation: subcategoryNavigation,
    leafSubcategoryId,
  } = await loadVisibleSubcategoryNavigation({
    category,
    requestedSubcategory:
      parameters.subcategory,
  });

  const categoryUrl = `${SITE_URL}/shop/category/${encodeURIComponent(
    category.slug,
  )}`;

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${SITE_URL}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: categoryUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      {await StereophonieShopPage({
        searchParams: Promise.resolve({
          ...parameters,
          category: category.name,
          subcategory: leafSubcategoryId || undefined,
        }),
        subcategoryNavigation,
        categoryContext: true,
      })}
    </>
  );
}
