import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, PackageOpen, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export default async function AdminProductsPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (!admin?.is_active) {
    redirect("/admin/login");
  }

  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      status,
      availability,
      is_featured,
      is_trending,
      is_new_arrival,
      created_at,
      categories (
        name
      ),
      product_variants (
        id,
        regular_price,
        sale_price,
        stock_quantity
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Products query error:", error);
  }

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="border border-white/10 bg-white/[0.035] px-5 py-5 backdrop-blur-xl sm:px-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>

              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
                Catalogue management
              </p>

              <h1 className="mt-3 text-5xl font-semibold uppercase tracking-[-0.05em] sm:text-7xl">
                Products
              </h1>
            </div>

            <Link
              href="/admin/products/new"
              className="group inline-flex items-center justify-center gap-3 border border-white bg-white px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-black transition duration-300 hover:bg-transparent hover:text-white"
            >
              <Plus className="h-4 w-4 transition duration-300 group-hover:rotate-90" />
              Add product
            </Link>
          </div>
        </header>

        <section className="mt-6 border border-white/10 bg-white/[0.025]">
          {!products?.length ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center border border-white/15 bg-white/[0.04]">
                <PackageOpen className="h-7 w-7 text-white/50" />
              </div>

              <h2 className="mt-7 text-3xl font-semibold uppercase tracking-[-0.03em]">
                No products yet
              </h2>

              <p className="mt-3 max-w-md leading-7 text-white/40">
                Create your first product with professional photographs,
                variants, sizes, prices, and inventory.
              </p>

              <Link
                href="/admin/products/new"
                className="mt-8 inline-flex items-center gap-3 border border-white/20 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] transition hover:border-white hover:bg-white hover:text-black"
              >
                Create first product
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {products.map((product) => {
                const variants = product.product_variants ?? [];

                const totalStock = variants.reduce(
                  (total, variant) =>
                    total + Number(variant.stock_quantity ?? 0),
                  0,
                );

                const prices = variants
                  .map((variant) => variant.sale_price ?? variant.regular_price)
                  .filter(
                    (price): price is number => typeof price === "number",
                  );

                const lowestPrice =
                  prices.length > 0 ? Math.min(...prices) : null;

                const category = product.categories?.[0]?.name ?? null;

                return (
                  <Link
                    key={product.id}
                    href={`/admin/products/${product.id}`}
                    className="group grid gap-6 px-5 py-6 transition duration-300 hover:bg-white/[0.045] sm:grid-cols-[1fr_auto] sm:items-center sm:px-7"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold uppercase tracking-[-0.02em]">
                          {product.name}
                        </h2>

                        <span className="border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                          {product.status}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
                        <span>{category ?? "No category"}</span>

                        <span>{variants.length} variants</span>

                        <span>{totalStock} units</span>

                        <span>
                          {lowestPrice === null
                            ? "No price"
                            : `$${lowestPrice.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <ArrowUpRight className="h-5 w-5 text-white/25 transition duration-300 group-hover:rotate-45 group-hover:text-white" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
