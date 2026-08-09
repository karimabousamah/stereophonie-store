import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  Boxes,
  CheckCircle2,
  ChevronRight,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NotificationItem = {
  title: string;
  description: string;
  count: number;
  href: string;
  action: string;
  icon: typeof PackageCheck;
  tone: "amber" | "red" | "blue" | "neutral";
};

export default async function AdminNotificationsPage() {
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
    redirect("/admin/login?error=This%20account%20is%20not%20authorized");
  }

  const [
    pendingOrdersResult,
    draftProductsResult,
    lowStockVariantsResult,
    pendingStockAlertsResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),

    supabase
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "draft"),

    supabase
      .from("product_variants")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("availability_status", ["low_stock", "out_of_stock"]),

    supabase
      .from("stock_alerts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending"),
  ]);

  const counts = {
    pendingOrders: pendingOrdersResult.count ?? 0,

    draftProducts: draftProductsResult.count ?? 0,

    lowStockVariants: lowStockVariantsResult.count ?? 0,

    pendingStockAlerts: pendingStockAlertsResult.count ?? 0,
  };

  const total =
    counts.pendingOrders +
    counts.draftProducts +
    counts.lowStockVariants +
    counts.pendingStockAlerts;

  const items: NotificationItem[] = [
    {
      title: "Pending orders",
      description:
        counts.pendingOrders === 1
          ? "One new order is waiting for confirmation and fulfilment."
          : `${counts.pendingOrders} orders are waiting for confirmation and fulfilment.`,
      count: counts.pendingOrders,
      href: "/admin/orders",
      action: "Review orders",
      icon: PackageCheck,
      tone: "amber",
    },
    {
      title: "Inventory warnings",
      description:
        counts.lowStockVariants === 1
          ? "One product variant is low in stock or unavailable."
          : `${counts.lowStockVariants} product variants are low in stock or unavailable.`,
      count: counts.lowStockVariants,
      href: "/admin/products",
      action: "Manage inventory",
      icon: AlertTriangle,
      tone: "red",
    },
    {
      title: "Customer stock requests",
      description:
        counts.pendingStockAlerts === 1
          ? "One customer is waiting to be notified about a restock."
          : `${counts.pendingStockAlerts} customers are waiting for restock notifications.`,
      count: counts.pendingStockAlerts,
      href: "/admin/stock-alerts",
      action: "Review requests",
      icon: BellRing,
      tone: "blue",
    },
    {
      title: "Draft products",
      description:
        counts.draftProducts === 1
          ? "One product is hidden from the customer storefront."
          : `${counts.draftProducts} products are hidden from the customer storefront.`,
      count: counts.draftProducts,
      href: "/admin/products",
      action: "Review drafts",
      icon: Boxes,
      tone: "neutral",
    },
  ];

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Notifications"
      pageDescription="Review live store activity and items requiring administrative attention."
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <section className="border-b border-white/10 pb-9">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
                Operational activity
              </p>

              <h2 className="mt-5 text-[clamp(3rem,7vw,6.5rem)] font-semibold uppercase leading-[0.84] tracking-[-0.065em]">
                Notification
                <br />
                centre
              </h2>

              <p className="mt-7 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
                Monitor pending orders, inventory warnings, customer stock
                requests and unpublished products from one place.
              </p>
            </div>

            <Link
              href="/admin/notifications"
              className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/15 px-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/60 transition hover:border-white hover:bg-white hover:text-black"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh activity
            </Link>
          </div>
        </section>

        <section className="grid gap-4 py-7 sm:grid-cols-2 xl:grid-cols-4">
          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Total attention
            </p>

            <p className="mt-4 text-4xl font-semibold">{total}</p>

            <p className="mt-2 text-xs text-white/35">
              Current operational items
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Orders
            </p>

            <p className="mt-4 text-4xl font-semibold">
              {counts.pendingOrders}
            </p>

            <p className="mt-2 text-xs text-white/35">Awaiting confirmation</p>
          </div>

          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Inventory
            </p>

            <p className="mt-4 text-4xl font-semibold">
              {counts.lowStockVariants}
            </p>

            <p className="mt-2 text-xs text-white/35">
              Variants requiring attention
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.025] p-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
              Customer demand
            </p>

            <p className="mt-4 text-4xl font-semibold">
              {counts.pendingStockAlerts}
            </p>

            <p className="mt-2 text-xs text-white/35">
              Pending restock requests
            </p>
          </div>
        </section>

        {total === 0 ? (
          <section className="flex min-h-[360px] flex-col items-center justify-center border border-emerald-400/20 bg-emerald-400/[0.035] px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center border border-emerald-400/25 bg-emerald-400/[0.07]">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            </div>

            <h3 className="mt-6 text-2xl font-semibold">
              Everything is up to date
            </h3>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">
              There are currently no pending orders, inventory warnings,
              customer stock requests or draft products requiring attention.
            </p>
          </section>
        ) : (
          <section className="divide-y divide-white/10 border-y border-white/10">
            {items
              .filter((item) => item.count > 0)
              .map((item) => {
                const Icon = item.icon;

                const iconClass =
                  item.tone === "amber"
                    ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-300"
                    : item.tone === "red"
                      ? "border-red-400/20 bg-red-400/[0.07] text-red-300"
                      : item.tone === "blue"
                        ? "border-sky-400/20 bg-sky-400/[0.07] text-sky-300"
                        : "border-white/10 bg-white/[0.04] text-white/55";

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group grid gap-5 py-6 transition hover:bg-white/[0.025] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center border ${iconClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{item.title}</h3>

                        <span className="flex min-h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-[10px] font-bold text-black">
                          {item.count}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-white/40">
                        {item.description}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition group-hover:text-white">
                      {item.action}

                      <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
          </section>
        )}

        <section className="mt-8 border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-start gap-4">
            <ShoppingBag className="mt-0.5 h-5 w-5 text-white/45" />

            <div>
              <h3 className="text-sm font-semibold">About this page</h3>

              <p className="mt-2 max-w-3xl text-xs leading-6 text-white/35">
                These notifications are generated from live store data. They
                disappear automatically when the corresponding order, inventory,
                stock request or product issue is resolved.
              </p>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
