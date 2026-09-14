import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

import ProductForm from "./product-form";

type NewProductPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login");
  }

  const [categoriesResult, subcategoriesResult, brandsResult] =
    await Promise.all([
      supabase.from("categories").select("id, name").order("name", {
        ascending: true,
      }),

      supabase
        .from("subcategories")
        .select("id, category_id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("brands")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  const resolvedSearchParams = await searchParams;

  const loadingError =
    categoriesResult.error || subcategoriesResult.error || brandsResult.error;

  const errorMessage =
    resolvedSearchParams.error ??
    (loadingError ? "Categories or brands could not be loaded." : undefined);

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Add product"
      pageDescription="Add product information, configurations and store placement, then manage product images."
    >
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto max-w-[1540px]">

          <ProductForm
            categories={categoriesResult.data ?? []}
            brands={brandsResult.data ?? []}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </AdminShell>
  );
}
