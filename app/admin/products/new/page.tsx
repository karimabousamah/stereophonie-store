import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PackagePlus, ShieldCheck } from "lucide-react";

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

  const [categoriesResult, brandsResult, collectionsResult] = await Promise.all([
    supabase.from("categories").select("id, name").order("name", {
      ascending: true,
    }),

    supabase
      .from("brands")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase.from("collections").select("id, name").order("name", {
      ascending: true,
    }),
  ]);

  const resolvedSearchParams = await searchParams;

  const loadingError =
    categoriesResult.error || brandsResult.error || collectionsResult.error;

  const errorMessage =
    resolvedSearchParams.error ??
    (loadingError
      ? "Categories or collections could not be loaded."
      : undefined);

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Add product"
      pageDescription="Create product information, independent size inventory and storefront visibility."
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1540px]">
          <header className="mb-8 border-b border-white/10 pb-8">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to products
            </Link>

            <div className="mt-8 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <PackagePlus className="h-5 w-5 text-white/55" />

                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/40">
                    Catalogue management
                  </p>
                </div>

                <h1 className="mt-5 text-5xl font-semibold uppercase tracking-[-0.055em] sm:text-7xl">
                  Create product
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-white/45">
                  Select the product sizes first, then configure stock and
                  availability independently for every selected size.
                </p>
              </div>

              <div className="flex max-w-md items-start gap-3 border border-emerald-400/20 bg-emerald-400/[0.05] px-5 py-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    Controlled publishing
                  </p>

                  <p className="mt-1 text-sm leading-6 text-white/45">
                    Saving as draft keeps the product hidden. Only Publish Live
                    makes it visible.
                  </p>
                </div>
              </div>
            </div>
          </header>

          <ProductForm
            categories={categoriesResult.data ?? []}
            brands={brandsResult.data ?? []}
            collections={collectionsResult.data ?? []}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </AdminShell>
  );
}
