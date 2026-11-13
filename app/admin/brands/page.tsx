import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import CategoryActionNotice from "@/components/admin/category-action-notice";
import BrandDirectoryManager, {
  type BrandDirectoryItem,
} from "@/components/admin/brand-directory-manager";
import { createClient } from "@/lib/supabase/server";

type BrandsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

type ProductBrandLink = {
  brand_id: string | null;
};

export default async function AdminBrandsPage({
  searchParams,
}: BrandsPageProps) {
  const query = await searchParams;

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: administrator, error: administratorError } =
    await supabase
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", userId)
      .single();

  if (administratorError || !administrator?.is_active) {
    redirect("/admin/login");
  }

  const [brandsResult, productLinksResult] = await Promise.all([
    supabase
      .from("brands")
      .select(
        `
          id,
          name,
          slug,
          description,
          is_active
        `,
      )
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("products")
      .select("brand_id"),
  ]);

  const rawBrands = (brandsResult.data ?? []) as BrandRow[];

  /*
   * Brands are deliberately alphabetical.
   *
   * Manual display order no longer belongs to the Brands workflow.
   * localeCompare is retained as a final client-independent authority
   * in addition to the database ORDER BY name.
   */
  const brands = [...rawBrands].sort((first, second) =>
    first.name.localeCompare(
      second.name,
      undefined,
      {
        sensitivity: "base",
        numeric: true,
      },
    ),
  );

  const productLinks =
    (productLinksResult.data ?? []) as ProductBrandLink[];

  const productCounts =
    new Map<string, number>();

  for (const product of productLinks) {
    if (!product.brand_id) {
      continue;
    }

    productCounts.set(
      product.brand_id,
      (productCounts.get(product.brand_id) ?? 0) + 1,
    );
  }

  const directoryBrands: BrandDirectoryItem[] =
    brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      isActive: brand.is_active,
      productCount:
        productCounts.get(brand.id) ?? 0,
    }));

  const totalAssignedProducts =
    productLinks.filter((product) =>
      Boolean(product.brand_id),
    ).length;

  return (
    <AdminShell
      role={administrator.role}
      pageTitle="Brands"
      pageDescription="Manage the brands used across the storefront catalogue."
    >
      <main className="st-admin-brands-v3">
        <div className="st-admin-brands-v3__inner">
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

          {brandsResult.error || productLinksResult.error ? (
            <div
              className="st-admin-brand-v3__notice is-error"
              role="alert"
            >
              Brand information could not be loaded completely.
            </div>
          ) : null}

          <BrandDirectoryManager
            brands={directoryBrands}
            totalAssignedProducts={totalAssignedProducts}
          />
        </div>
      </main>
    </AdminShell>
  );
}
