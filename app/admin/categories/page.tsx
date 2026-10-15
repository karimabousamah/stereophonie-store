import CategoryActionNotice from "@/components/admin/category-action-notice";
import CategoryAddButton from "@/components/admin/category-add-button";
import { redirect } from "next/navigation";
import { CheckCircle2, FolderPlus, Layers3, Package, Tags } from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import CategorySearch from "@/components/admin/category-search";
import CategoryTreeManager, {
  type CategoryTreeNode,
  type CategoryTreeRoot,
} from "@/components/admin/category-tree-manager";
import { createClient } from "@/lib/supabase/server";


type CategoriesPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type ProductLink = {
  category_id: string | null;
  subcategory_id: string | null;
};

export default async function AdminCategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const query = await searchParams;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: administrator, error: administratorError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (administratorError || !administrator?.is_active) {
    redirect("/admin/login");
  }

  const [categoriesResult, subcategoriesResult, productsResult] =
    await Promise.all([
      supabase
        .from("categories")
        .select(
          "id,name,slug,description,image_url,show_on_homepage,homepage_theme,sort_order,is_active",
        )
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("subcategories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase.from("products").select("category_id,subcategory_id"),
    ]);

  const products = (productsResult.data ?? []) as ProductLink[];

  const rootProductCounts = new Map<string, number>();
  const nodeProductCounts = new Map<string, number>();

  for (const product of products) {
    if (product.category_id) {
      rootProductCounts.set(
        product.category_id,
        (rootProductCounts.get(product.category_id) ?? 0) + 1,
      );
    }

    if (product.subcategory_id) {
      nodeProductCounts.set(
        product.subcategory_id,
        (nodeProductCounts.get(product.subcategory_id) ?? 0) + 1,
      );
    }
  }

  const moviesSeriesSlugs = new Set([
    "movies-series",
    "movies-and-series",
    "films-series",
    "films-and-series",
  ]);

  const categories: CategoryTreeRoot[] = (categoriesResult.data ?? [])
    .map((category) => ({
      ...category,
      homepage_theme: (
        category.homepage_theme === "dark" ? "dark" : "light"
      ) as "light" | "dark",
      productCount: rootProductCounts.get(category.id) ?? 0,
    }))
    .sort((a, b) => {
      /*
       * Keep Category Structure aligned with the real storefront homepage:
       *
       * 1. Categories that actually appear on the homepage come first.
       *    The storefront requires BOTH is_active and show_on_homepage.
       *
       * 2. Homepage categories follow their normal sort_order / name order.
       *
       * 3. Movies & Series stays at the end of the homepage group,
       *    matching the special storefront rule in app/page.tsx.
       *
       * 4. All remaining categories follow underneath using their normal
       *    sort_order / name order.
       *
       * This affects only Admin Category Structure display order.
       * It does not modify category data or storefront ordering.
       */
      const aOnHomepage = a.is_active && a.show_on_homepage;
      const bOnHomepage = b.is_active && b.show_on_homepage;

      if (aOnHomepage !== bOnHomepage) {
        return aOnHomepage ? -1 : 1;
      }

      if (aOnHomepage && bOnHomepage) {
        const aIsMoviesSeries = moviesSeriesSlugs.has(a.slug);
        const bIsMoviesSeries = moviesSeriesSlugs.has(b.slug);

        if (aIsMoviesSeries !== bIsMoviesSeries) {
          return aIsMoviesSeries ? 1 : -1;
        }
      }

      return (
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name)
      );
    });

  const subcategories: CategoryTreeNode[] = (
    subcategoriesResult.data ?? []
  ).map((subcategory) => ({
    ...subcategory,
    homepage_theme:
      (
        subcategory as typeof subcategory & {
          homepage_theme?: string | null;
        }
      ).homepage_theme === "dark"
        ? "dark"
        : "light",
    productCount: nodeProductCounts.get(subcategory.id) ?? 0,
  }));

  const activeRoots = categories.filter(
    (category) => category.is_active,
  ).length;

  return (
    <AdminShell
      role={administrator.role}
      pageTitle="Categories"
      pageDescription="Build and manage the storefront category hierarchy."
    >
      <main className="st-category-admin">
        <div className="st-category-admin__toolbar">
          <CategoryAddButton />
        </div>

        {query.success ? (
          <CategoryActionNotice
            variant="success"
            message={query.success}
          />
        ) : null}

        {query.error ? (
          <CategoryActionNotice
            variant="error"
            message={query.error}
          />
        ) : null}

        {categoriesResult.error ||
        subcategoriesResult.error ||
        productsResult.error ? (
          <div className="st-category-admin__notice is-error">
            <span>
              Some category information could not be loaded. The hierarchy
              migration may still need to be applied.
            </span>
          </div>
        ) : null}

        <div className="st-category-directory">
          <CategorySearch
            categoryCount={categories.length}
            subcategoryCount={subcategories.length}
          />

          <CategoryTreeManager
            categories={categories}
            subcategories={subcategories}
          />
        </div>
      </main>
    </AdminShell>
  );
}
