import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  ShoppingBag,
  Trophy,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrderItemRow = {
  product_name: string | null;
  quantity: number | string | null;
  line_total: number | string | null;
};

type OrderRow = {
  id: string;
  status: string;
  order_items: OrderItemRow[] | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  status: string | null;
  availability: string | null;
};

type BestSeller = {
  key: string;
  productName: string;
  unitsSold: number;
  orderIds: Set<string>;
  revenue: number;
  product: ProductRow | null;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeProductName(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default async function BestSellingPage() {
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

  const [ordersResult, productsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
        id,
        status,
        order_items (
          product_name,
          quantity,
          line_total
        )
      `,
      )
      .neq("status", "cancelled"),

    supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        status,
        availability
      `,
      ),
  ]);

  const dataError =
    ordersResult.error ||
    productsResult.error;

  const orders = (ordersResult.data ?? []) as OrderRow[];
  const products = (productsResult.data ?? []) as ProductRow[];

  const productsByName = new Map(
    products.map((product) => [
      normalizeProductName(product.name),
      product,
    ]),
  );

  const aggregate = new Map<string, BestSeller>();

  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      const productName = String(item.product_name ?? "").trim();

      if (!productName) {
        continue;
      }

      const quantity = Math.max(
        0,
        Number(item.quantity ?? 0) || 0,
      );

      if (quantity <= 0) {
        continue;
      }

      const key = normalizeProductName(productName);

      const current =
        aggregate.get(key) ??
        {
          key,
          productName,
          unitsSold: 0,
          orderIds: new Set<string>(),
          revenue: 0,
          product: productsByName.get(key) ?? null,
        };

      current.unitsSold += quantity;
      current.orderIds.add(order.id);
      current.revenue +=
        Number(item.line_total ?? 0) || 0;

      aggregate.set(key, current);
    }
  }

  const bestSellers = Array.from(aggregate.values())
    .filter((item) => item.unitsSold >= 2)
    .sort((first, second) => {
      if (second.unitsSold !== first.unitsSold) {
        return second.unitsSold - first.unitsSold;
      }

      if (second.revenue !== first.revenue) {
        return second.revenue - first.revenue;
      }

      return first.productName.localeCompare(second.productName);
    });

  const totalUnits = bestSellers.reduce(
    (total, item) => total + item.unitsSold,
    0,
  );

  const totalRevenue = bestSellers.reduce(
    (total, item) => total + item.revenue,
    0,
  );

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Best Selling"
      pageDescription="See which products are performing best based on real non-cancelled customer orders."
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1540px]">
          <header className="border-b border-black/[0.08] pb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
              Sales performance
            </p>

            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-[clamp(2.7rem,5vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-[#1d1d1f]">
                  Best Selling
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-500 sm:text-base">
                  Products appear here once at least two units have been sold.
                  Cancelled orders are excluded automatically.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                <Trophy className="h-3.5 w-3.5" />
                2+ units required
              </div>
            </div>
          </header>

          {dataError ? (
            <div className="mt-7 rounded-[22px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Best-selling information could not be loaded:{" "}
              {dataError.message}
            </div>
          ) : null}

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_40px_rgba(29,29,31,0.04)]">
              <BarChart3 className="h-5 w-5 text-neutral-500" />
              <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Best sellers
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                {bestSellers.length}
              </p>
            </div>

            <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_40px_rgba(29,29,31,0.04)]">
              <Boxes className="h-5 w-5 text-neutral-500" />
              <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Units sold
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                {totalUnits}
              </p>
            </div>

            <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_40px_rgba(29,29,31,0.04)]">
              <CircleDollarSign className="h-5 w-5 text-neutral-500" />
              <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Revenue
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                {money(totalRevenue)}
              </p>
            </div>

            <div className="rounded-[22px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_40px_rgba(29,29,31,0.04)]">
              <ShoppingBag className="h-5 w-5 text-neutral-500" />
              <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Top product
              </p>
              <p className="mt-2 truncate text-lg font-semibold">
                {bestSellers[0]?.productName ?? "Not enough sales yet"}
              </p>
            </div>
          </section>

          <section className="mt-7 overflow-hidden rounded-[24px] border border-black/[0.08] bg-white shadow-[0_18px_55px_rgba(29,29,31,0.045)]">
            {bestSellers.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff5df]">
                  <Trophy className="h-6 w-6 text-[#a86d09]" />
                </div>

                <h2 className="mt-6 text-2xl font-semibold tracking-[-0.04em]">
                  No best sellers yet
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-500">
                  A product will automatically appear here after customers have
                  purchased at least two units.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[90px_minmax(260px,1.6fr)_150px_150px_170px_180px] gap-4 border-b border-black/[0.07] bg-[#fafafa] px-6 py-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400 lg:grid">
                  <span>Rank</span>
                  <span>Product</span>
                  <span>Units sold</span>
                  <span>Orders</span>
                  <span>Revenue</span>
                  <span>Product</span>
                </div>

                <div className="divide-y divide-black/[0.07]">
                  {bestSellers.map((item, index) => {
                    const adminHref = item.product
                      ? `/admin/products/${item.product.id}`
                      : null;

                    const storefrontHref =
                      item.product?.slug &&
                      item.product.status === "published"
                        ? `/shop/${item.product.slug}`
                        : null;

                    return (
                      <article
                        key={item.key}
                        className="grid gap-5 px-6 py-6 transition hover:bg-[#fffaf0] lg:grid-cols-[90px_minmax(260px,1.6fr)_150px_150px_170px_180px] lg:items-center"
                      >
                        <div>
                          <span
                            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold ${
                              index === 0
                                ? "bg-[#fff0c9] text-[#8d5900]"
                                : "bg-[#f5f5f7] text-neutral-600"
                            }`}
                          >
                            #{index + 1}
                          </span>
                        </div>

                        <div>
                          <p className="text-base font-semibold tracking-[-0.02em]">
                            {item.productName}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.product ? (
                              <>
                                <span className="rounded-full border border-black/[0.08] bg-[#f7f7f8] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                                  {item.product.status ?? "Product"}
                                </span>

                                <span className="rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                                  {item.product.availability ?? "Unknown stock"}
                                </span>
                              </>
                            ) : (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                                Historical product
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 lg:hidden">
                            Units sold
                          </p>
                          <p className="mt-1 text-xl font-semibold lg:mt-0">
                            {item.unitsSold}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 lg:hidden">
                            Orders
                          </p>
                          <p className="mt-1 text-sm font-semibold lg:mt-0">
                            {item.orderIds.size}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-400 lg:hidden">
                            Revenue
                          </p>
                          <p className="mt-1 text-sm font-semibold lg:mt-0">
                            {money(item.revenue)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          {adminHref ? (
                            <Link
                              href={adminHref}
                              className="group inline-flex min-h-11 items-center justify-between rounded-xl border border-[#d4a13d]/45 bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#1d1d1f] transition hover:border-[#c58a1f] hover:bg-[#fff8e8]"
                            >
                              Open product
                              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                            </Link>
                          ) : (
                            <span className="inline-flex min-h-11 items-center rounded-xl border border-black/[0.07] bg-[#f7f7f8] px-4 text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                              Product unavailable
                            </span>
                          )}

                          {storefrontHref ? (
                            <Link
                              href={storefrontHref}
                              target="_blank"
                              className="text-center text-[9px] font-semibold uppercase tracking-[0.13em] text-neutral-400 transition hover:text-[#9a6507]"
                            >
                              View storefront ↗
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
