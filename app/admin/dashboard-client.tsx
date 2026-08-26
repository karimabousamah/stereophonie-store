"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Boxes,
  CircleDollarSign,
  Eye,
  PackageCheck,
  ShoppingBag,
  TicketPercent,
  Users,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";

type DashboardStatistics = {
  liveProducts: number;
  draftProducts: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: number;
  lowStockVariants: number;
  pendingStockAlerts: number;
};

type DashboardClientProps = {
  role: string;
  statistics: DashboardStatistics;
};

const dashboardItems = [
  {
    title: "Products",
    description:
      "Create products, upload imagery, control publishing, pricing, sizes and inventory.",
    icon: ShoppingBag,
    href: "/admin/products",
    number: "01",
  },
  {
    title: "Orders",
    description:
      "Review purchases, delivery information and fulfilment progress.",
    icon: PackageCheck,
    href: "/admin/orders",
    number: "02",
  },
  {
    title: "Customers",
    description:
      "View customer accounts, saved addresses and complete order activity.",
    icon: Users,
    href: "/admin/customers",
    number: "03",
  },
  {
    title: "Stock alerts",
    description:
      "Review customer demand for unavailable sizes and manage notification progress.",
    icon: BellRing,
    href: "/admin/stock-alerts",
    number: "04",
  },
  {
    title: "Coupons",
    description:
      "Create promotional campaigns, scheduled discounts and first-order offers.",
    icon: TicketPercent,
    href: "/admin/coupons",
    number: "05",
  },
];

function formatRevenue(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DashboardClient({
  role,
  statistics,
}: DashboardClientProps) {
  const actionCount =
    statistics.pendingOrders +
    statistics.draftProducts +
    statistics.lowStockVariants +
    statistics.pendingStockAlerts;

  const hasUrgentActions = actionCount > 0;

  const actionHref =
    statistics.pendingOrders > 0
      ? "/admin/orders"
      : statistics.pendingStockAlerts > 0
        ? "/admin/stock-alerts"
        : "/admin/products";

  const statisticItems = [
    {
      label: "Live products",
      value: String(statistics.liveProducts),
      detail: "Visible on the storefront",
      status: "live",
      icon: Eye,
      href: "/admin/products",
    },
    {
      label: "Draft products",
      value: String(statistics.draftProducts),
      detail: "Hidden from customers",
      status: "draft",
      icon: Boxes,
      href: "/admin/products",
    },
    {
      label: "Orders",
      value: String(statistics.pendingOrders),
      detail: "Awaiting admin action",
      status: "attention",
      icon: PackageCheck,
      href: "/admin/orders",
    },
    {
      label: "Stock alerts",
      value: String(statistics.pendingStockAlerts),
      detail: "Customers waiting for stock",
      status: "demand",
      icon: BellRing,
      href: "/admin/stock-alerts",
    },
    {
      label: "Revenue",
      value: formatRevenue(statistics.revenue),
      detail: "Recorded paid revenue",
      status: "neutral",
      icon: CircleDollarSign,
      href: "/admin/orders",
    },
  ];

  return (
    <AdminShell
      role={role}
      pageTitle="Dashboard"
      pageDescription="Monitor products, orders, customers, stock and store activity."
    >
      <div className="st3-admin-dashboard px-5 py-5 sm:px-7 sm:py-7">
        <section className="st3-admin-dashboard__welcome mb-6 flex flex-col gap-5 rounded-[18px] border border-black/[0.07] bg-white p-6 shadow-[0_18px_55px_rgba(29,29,31,0.05)] sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a6500]">
              Store overview
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
              Everything in one place.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/50">
              Monitor products, orders, customers and stock without leaving the
              dashboard.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-[#f7f7f8] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div>
              <p className="text-sm font-semibold capitalize">{role}</p>
              <p className="text-xs text-black/40">
                Administrator account active
              </p>
            </div>
          </div>
        </section>

        <section
          className={`mb-7 flex flex-col gap-4 rounded-[20px] border p-5 sm:flex-row sm:items-center sm:justify-between ${
            hasUrgentActions
              ? "border-amber-300/55 bg-[#fff8e9]"
              : "border-emerald-200 bg-emerald-50/70"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                hasUrgentActions
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
                Action centre
              </p>
              <h3 className="mt-1 text-lg font-semibold">
                {hasUrgentActions
                  ? `${actionCount} ${actionCount === 1 ? "item needs" : "items need"} attention`
                  : "Everything is up to date"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-black/45">
                {hasUrgentActions
                  ? [
                      statistics.pendingOrders > 0
                        ? `${statistics.pendingOrders} pending ${statistics.pendingOrders === 1 ? "order" : "orders"}`
                        : null,
                      statistics.pendingStockAlerts > 0
                        ? `${statistics.pendingStockAlerts} stock ${statistics.pendingStockAlerts === 1 ? "alert" : "alerts"}`
                        : null,
                      statistics.draftProducts > 0
                        ? `${statistics.draftProducts} draft ${statistics.draftProducts === 1 ? "product" : "products"}`
                        : null,
                      statistics.lowStockVariants > 0
                        ? `${statistics.lowStockVariants} stock ${statistics.lowStockVariants === 1 ? "warning" : "warnings"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "New orders, stock warnings and unpublished products will appear here."}
              </p>
            </div>
          </div>

          {hasUrgentActions ? (
            <Link
              href={actionHref}
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#f5b335] px-5 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#eaaa2b]"
            >
              Review actions
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-xs font-semibold text-emerald-700">
              All clear
            </span>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
                Key metrics
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                Today at a glance
              </h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {statisticItems.map((item) => {
              const Icon = item.icon;

              const statusStyles = {
                live: "bg-emerald-50 text-emerald-700",
                draft: "bg-sky-50 text-sky-700",
                attention: "bg-amber-50 text-amber-700",
                demand: "bg-rose-50 text-rose-700",
                neutral: "bg-violet-50 text-violet-700",
              };

              return (
                <article
                  key={item.label}
                  className="group overflow-hidden rounded-[18px] border border-black/[0.07] bg-white transition duration-300 hover:-translate-y-0.5 hover:border-[#f5b335]/40 hover:shadow-[0_18px_45px_rgba(29,29,31,0.07)]"
                >
                  <Link href={item.href} className="block h-full p-5">
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${statusStyles[item.status as keyof typeof statusStyles]}`}
                      >
                        <Icon strokeWidth={1.8} className="h-5 w-5" />
                      </div>

                      <ArrowUpRight className="h-4 w-4 text-black/20 transition group-hover:text-[#9a6500]" />
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-medium text-black/45">
                        {item.label}
                      </p>

                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                        {item.value}
                      </p>

                      <p className="mt-2 text-xs leading-5 text-black/40">
                        {item.detail}
                      </p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="pb-16 pt-10">
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
              Quick access
            </p>

            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
              Manage the store
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboardItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title}>
                  <Link
                    href={item.href}
                    className="group flex h-full min-h-[155px] flex-col justify-between rounded-[20px] border border-black/[0.07] bg-white p-6 transition duration-300 hover:-translate-y-0.5 hover:border-[#f5b335]/40 hover:shadow-[0_18px_45px_rgba(29,29,31,0.07)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3da] text-[#8a5800]">
                        <Icon className="h-5 w-5" />
                      </div>

                      <span className="text-xs font-semibold text-black/20">
                        {item.number}
                      </span>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-xl font-semibold tracking-[-0.02em]">
                          {item.title}
                        </h3>
                        <ArrowUpRight className="h-4 w-4 text-black/20 transition group-hover:text-[#9a6500]" />
                      </div>

                      <p className="mt-2 max-w-md text-sm leading-6 text-black/45">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
