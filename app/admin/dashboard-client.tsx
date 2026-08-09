"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Boxes,
  CircleDollarSign,
  Eye,
  PackageCheck,
  ShoppingBag,
  Diamond,
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
      <div className="relative px-5 py-8 sm:px-8 sm:py-10">
        <section className="grid gap-8 pb-10 pt-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <motion.div
            initial={{
              opacity: 0,
              y: 28,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="flex items-center gap-3">
              <Diamond className="h-4 w-4 text-white/70" />

              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
                Commerce control centre
              </p>
            </div>

            <h2 className="mt-7 max-w-5xl text-[clamp(3.2rem,8vw,7.5rem)] font-semibold uppercase leading-[0.82] tracking-[-0.07em]">
              Store
              <br />
              overview
            </h2>

            <p className="mt-8 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">
              Understand what is live, what is hidden, what requires attention
              and what is happening across the store.
            </p>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.94,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 0.18,
              duration: 0.65,
            }}
            className="min-w-[220px] border border-white/10 bg-white/[0.045] px-6 py-5 backdrop-blur-xl"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
              Access level
            </p>

            <p className="mt-2 text-lg font-semibold uppercase tracking-[0.08em]">
              {role}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <span className="text-xs text-white/45">
                Administrator account active
              </span>
            </div>
          </motion.div>
        </section>

        <motion.section
          initial={{
            opacity: 0,
            y: 22,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.24,
            duration: 0.65,
          }}
          className={`mb-6 border ${
            hasUrgentActions
              ? "border-amber-400/25 bg-amber-400/[0.065]"
              : "border-emerald-400/20 bg-emerald-400/[0.045]"
          }`}
        >
          <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center border ${
                  hasUrgentActions
                    ? "border-amber-400/25 bg-amber-400/[0.08]"
                    : "border-emerald-400/25 bg-emerald-400/[0.07]"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    hasUrgentActions ? "text-amber-300" : "text-emerald-300"
                  }`}
                />
              </div>

              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                    hasUrgentActions ? "text-amber-300" : "text-emerald-300"
                  }`}
                >
                  Action centre
                </p>

                <h3 className="mt-2 text-lg font-semibold">
                  {hasUrgentActions
                    ? `${actionCount} ${
                        actionCount === 1 ? "item requires" : "items require"
                      } attention`
                    : "No urgent actions at the moment"}
                </h3>

                <p className="mt-1 text-sm leading-6 text-white/40">
                  {hasUrgentActions
                    ? [
                        statistics.pendingOrders > 0
                          ? `${statistics.pendingOrders} pending ${
                              statistics.pendingOrders === 1
                                ? "order"
                                : "orders"
                            }`
                          : null,

                        statistics.pendingStockAlerts > 0
                          ? `${statistics.pendingStockAlerts} pending stock ${
                              statistics.pendingStockAlerts === 1
                                ? "alert"
                                : "alerts"
                            }`
                          : null,

                        statistics.draftProducts > 0
                          ? `${statistics.draftProducts} draft ${
                              statistics.draftProducts === 1
                                ? "product"
                                : "products"
                            }`
                          : null,

                        statistics.lowStockVariants > 0
                          ? `${statistics.lowStockVariants} stock ${
                              statistics.lowStockVariants === 1
                                ? "warning"
                                : "warnings"
                            }`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Stock warnings, customer alerts, unpublished products and pending orders will appear here."}
                </p>
              </div>
            </div>

            {hasUrgentActions ? (
              <Link
                href={actionHref}
                className="inline-flex w-fit items-center gap-2 border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-400/[0.12]"
              >
                Review actions
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex w-fit items-center border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                All clear
              </span>
            )}
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.08,
                delayChildren: 0.28,
              },
            },
          }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"
        >
          {statisticItems.map((item) => {
            const Icon = item.icon;

            const statusStyles = {
              live: "text-emerald-300",
              draft: "text-sky-300",
              attention: "text-amber-300",
              demand: "text-rose-300",
              neutral: "text-violet-300",
            };

            return (
              <motion.article
                key={item.label}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                  },
                }}
                transition={{
                  duration: 0.55,
                }}
                whileHover={{
                  y: -5,
                }}
                className="group relative min-h-[245px] overflow-hidden border border-white/10 bg-[#0d0d0d] transition duration-500 hover:border-white/25 hover:bg-[#141414] hover:shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
              >
                <Link href={item.href} className="block h-full p-6">
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/[0.025] blur-3xl transition duration-700 group-hover:bg-white/[0.055]" />

                  <div className="relative flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/[0.04] transition duration-500 group-hover:scale-105 group-hover:border-white/25 group-hover:bg-white/[0.075]">
                      <Icon
                        strokeWidth={1.8}
                        className={`h-5 w-5 ${
                          statusStyles[item.status as keyof typeof statusStyles]
                        }`}
                      />
                    </div>

                    <ArrowUpRight className="h-4 w-4 translate-y-1 text-white/20 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:rotate-45 group-hover:opacity-100" />
                  </div>

                  <div className="relative mt-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                      {item.label}
                    </p>

                    <p className="mt-3 text-5xl font-semibold tracking-[-0.05em]">
                      {item.value}
                    </p>

                    <p className="mt-3 text-sm text-white/35">{item.detail}</p>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-white/70 transition-transform duration-500 group-hover:scale-x-100" />
                </Link>
              </motion.article>
            );
          })}
        </motion.section>

        <section className="pb-24 pt-14">
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              delay: 0.6,
              duration: 0.7,
            }}
            className="mb-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
              Quick access
            </p>

            <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[-0.03em] sm:text-5xl">
              Manage the store
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.56,
                },
              },
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            {dashboardItems.map((item) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 30,
                    },
                    visible: {
                      opacity: 1,
                      y: 0,
                    },
                  }}
                  transition={{
                    duration: 0.65,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    y: -5,
                  }}
                >
                  <Link
                    href={item.href}
                    className="group relative block min-h-[280px] overflow-hidden border border-white/10 bg-white/[0.035] p-7 backdrop-blur-xl transition duration-500 hover:border-white/25 hover:bg-white/[0.065] hover:shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-9"
                  >
                    <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/[0.02] blur-3xl transition duration-700 group-hover:bg-white/[0.055]" />

                    <div className="absolute right-5 top-1 text-[7rem] font-semibold tracking-[-0.08em] text-white/[0.025] transition duration-700 group-hover:text-white/[0.06]">
                      {item.number}
                    </div>

                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div className="flex h-12 w-12 items-center justify-center border border-white/15 bg-white/[0.04] transition duration-500 group-hover:scale-105 group-hover:border-white/30 group-hover:bg-white/[0.09]">
                          <Icon className="h-5 w-5" />
                        </div>

                        <ArrowUpRight className="h-5 w-5 text-white/25 transition duration-500 group-hover:rotate-45 group-hover:text-white" />
                      </div>

                      <div className="mt-16">
                        <h3 className="text-3xl font-semibold uppercase tracking-[-0.04em] sm:text-4xl">
                          {item.title}
                        </h3>

                        <p className="mt-4 max-w-md leading-7 text-white/40 transition duration-500 group-hover:text-white/65">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 h-px w-0 bg-white/70 transition-all duration-700 group-hover:w-full" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </section>
      </div>
    </AdminShell>
  );
}
