import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, PackageOpen, Plus } from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

import ProductSearch from "@/components/admin/product-search";
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    saved?: string;
    filter?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const savedState = resolvedSearchParams.saved ?? "";
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("role, is_active")
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
        variant_name,
        size,
        sku,
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
    <AdminShell
      role={admin.role}
      pageTitle="Products"
      pageDescription="Manage electronics, product images, configurations, pricing and inventory."
    >
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="mx-auto max-w-[1540px]">
          <header className="rounded-[18px] border border-white/10 bg-white/[0.035] px-5 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45 transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Link>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Product catalog
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  Products
                </h1>
              </div>

              <Link
                href="/admin/products/new"
                className="group inline-flex items-center justify-center gap-3 rounded-full border border-white bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-black transition duration-300 hover:bg-transparent hover:text-white"
              >
                <Plus className="h-4 w-4 transition duration-300 group-hover:rotate-90" />
                Add product
              </Link>
            </div>
          </header>

          {savedState === "draft" ? (
            <div className="mt-6 flex items-center justify-between gap-5 rounded-[18px] border border-emerald-500/20 bg-[#effbf5] px-5 py-4 text-[#16815d]">
              <div>
                <p className="text-sm font-semibold">
                  Draft saved successfully
                </p>

                <p className="mt-1 text-xs text-[#16815d]/70">
                  The product is saved in Draft products and remains hidden from
                  customers.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] shadow-sm">
                Draft
              </span>
            </div>
          ) : savedState === "published" ? (
            <div className="mt-6 flex items-center justify-between gap-5 rounded-[18px] border border-emerald-500/20 bg-[#effbf5] px-5 py-4 text-[#16815d]">
              <div>
                <p className="text-sm font-semibold">
                  Product published successfully
                </p>

                <p className="mt-1 text-xs text-[#16815d]/70">
                  The product is now live on the storefront.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] shadow-sm">
                Live
              </span>
            </div>
          ) : null}

          <section className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.025]">
            {!products?.length ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
                  <PackageOpen className="h-7 w-7 text-white/50" />
                </div>

                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
                  No products yet
                </h2>

                <p className="mt-3 max-w-md leading-7 text-white/40">
                  Create your first product with clear images, configurations,
                  pricing, specifications and inventory.
                </p>

                <Link
                  href="/admin/products/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:border-white hover:bg-white hover:text-black"
                >
                  Create first product
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                <ProductSearch
                  total={products.length}
                  liveTotal={
                    products.filter((product) => product.status === "published")
                      .length
                  }
                  draftTotal={
                    products.filter((product) => product.status === "draft")
                      .length
                  }
                  outOfStockTotal={
                    products.filter((product) => {
                      /*
                       * "Out of stock" is a storefront inventory state.
                       *
                       * Draft products are unfinished catalogue items,
                       * so they must stay exclusively inside Drafts,
                       * even when their temporary stock is zero.
                       */
                      if (product.status !== "published") {
                        return false;
                      }

                      const variants = product.product_variants ?? [];

                      if (variants.length === 0) {
                        return false;
                      }

                      return variants.every(
                        (variant) => Number(variant.stock_quantity ?? 0) <= 0,
                      );
                    }).length
                  }
                />

                {products.map((product) => {
                  const variants = product.product_variants ?? [];

                  const totalStock = variants.reduce(
                    (total, variant) =>
                      total + Number(variant.stock_quantity ?? 0),
                    0,
                  );

                  /*
                   * A product is considered out of stock when it has
                   * configurations but none of them has sellable stock.
                   */
                  const isOutOfStock =
                    product.status === "published" &&
                    variants.length > 0 &&
                    variants.every(
                      (variant) => Number(variant.stock_quantity ?? 0) <= 0,
                    );

                  const prices = variants
                    .map(
                      (variant) => variant.sale_price ?? variant.regular_price,
                    )
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
                      className="group grid gap-4 px-5 py-4 transition duration-300 hover:bg-white/[0.045] sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"

                      data-admin-product-search-card="true"
                      data-admin-product-status={product.status}
                      data-admin-product-out-of-stock={
                        isOutOfStock ? "true" : "false"
                      }
                      data-admin-product-search={[
                        product.name,
                        product.categories?.[0]?.name ?? "",
                        ...(product.product_variants ?? []).flatMap(
                          (variant) => [
                            variant.variant_name ?? "",
                            variant.size ?? "",
                            variant.sku ?? "",
                          ],
                        ),
                      ].join(" ")}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-semibold tracking-[-0.02em]">
                            {product.name}
                          </h2>

                          <span
                            className={`st-admin-product-status-badge ${
                              product.status === "draft"
                                ? "is-draft"
                                : "is-live"
                            }`}
                          >
                            <i aria-hidden="true" />
                            {product.status === "published" ? "Live" : "Draft"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/40">
                          <span>{category ?? "No category"}</span>

                          <span>{variants.length} configurations</span>

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
      </div>
    </AdminShell>
  );
}
