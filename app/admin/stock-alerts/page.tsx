import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Mail,
  PackageOpen,
  RefreshCcw,
  Trash2,
  XCircle,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

import {
  cancelStockAlert,
  deleteStockAlert,
  markStockAlertNotified,
  reopenStockAlert,
} from "./actions";

type AlertStatus = "pending" | "notified" | "cancelled";

type ProductRelation =
  | {
      name: string;
      slug: string;
    }
  | {
      name: string;
      slug: string;
    }[]
  | null;

type VariantRelation =
  | {
      size: string;
      sku: string | null;
      availability_status:
        "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";
      stock_quantity: number;
    }
  | {
      size: string;
      sku: string | null;
      availability_status:
        "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";
      stock_quantity: number;
    }[]
  | null;

type StockAlert = {
  id: string;
  email: string;
  status: AlertStatus;
  requested_at: string;
  notified_at: string | null;
  product: ProductRelation;
  variant: VariantRelation;
};

type StockAlertsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
  }>;
};

function getSingleParameter(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getSelectedStatus(value: string): AlertStatus | "all" {
  if (value === "pending" || value === "notified" || value === "cancelled") {
    return value;
  }

  return "all";
}

function getRelation<T>(relation: T | T[] | null) {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusDetails(status: AlertStatus) {
  if (status === "notified") {
    return {
      label: "Notified",
      icon: CheckCircle2,
      className: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      icon: XCircle,
      className: "border-red-400/25 bg-red-400/[0.08] text-red-300",
    };
  }

  return {
    label: "Pending",
    icon: Clock3,
    className: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
  };
}

function getAvailabilityLabel(value: string) {
  if (value === "in_stock") {
    return "In stock";
  }

  if (value === "low_stock") {
    return "Low stock";
  }

  if (value === "coming_soon") {
    return "Coming soon";
  }

  return "Out of stock";
}

function filterClass(active: boolean) {
  return active
    ? "border-white bg-white text-black"
    : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/30 hover:text-white";
}

export default async function AdminStockAlertsPage({
  searchParams,
}: StockAlertsPageProps) {
  const parameters = await searchParams;

  const selectedStatus = getSelectedStatus(
    getSingleParameter(parameters.status).toLowerCase(),
  );

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

  const { data: alerts, error: alertsError } = await supabase
    .from("stock_alerts")
    .select(
      `
      id,
      email,
      status,
      requested_at,
      notified_at,
      product:products!stock_alerts_product_id_fkey (
        name,
        slug
      ),
      variant:product_variants!stock_alerts_variant_id_fkey (
        size,
        sku,
        availability_status,
        stock_quantity
      )
    `,
    )
    .order("requested_at", {
      ascending: false,
    });

  const alertList = (alerts ?? []) as unknown as StockAlert[];

  const visibleAlerts =
    selectedStatus === "all"
      ? alertList
      : alertList.filter((alert) => alert.status === selectedStatus);

  const pendingCount = alertList.filter(
    (alert) => alert.status === "pending",
  ).length;

  const notifiedCount = alertList.filter(
    (alert) => alert.status === "notified",
  ).length;

  const cancelledCount = alertList.filter(
    (alert) => alert.status === "cancelled",
  ).length;

  const filters: {
    label: string;
    value: AlertStatus | "all";
    count: number;
  }[] = [
    {
      label: "All",
      value: "all",
      count: alertList.length,
    },
    {
      label: "Pending",
      value: "pending",
      count: pendingCount,
    },
    {
      label: "Notified",
      value: "notified",
      count: notifiedCount,
    },
    {
      label: "Cancelled",
      value: "cancelled",
      count: cancelledCount,
    },
  ];

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Stock alerts"
      pageDescription="Review customer restock requests and manage notification progress."
    >
      <div className="px-5 py-5 sm:px-7 sm:py-7">
        <div className="mx-auto max-w-[1540px]">
          <header className="border-b border-white/10 pb-8">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
              Customer demand
            </p>

            <h1 className="mt-3 text-2xl font-semibold uppercase tracking-[-0.045em] sm:text-4xl">
              Stock alerts
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
              See which products and sizes customers want, then track whether
              each customer has been notified.
            </p>
          </header>

          <section className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="border border-amber-400/20 bg-amber-400/[0.05] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">
                Pending
              </p>

              <p className="mt-3 text-2xl font-semibold">{pendingCount}</p>

              <p className="mt-2 text-sm text-white/35">
                Waiting for availability
              </p>
            </div>

            <div className="border border-emerald-400/20 bg-emerald-400/[0.05] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                Notified
              </p>

              <p className="mt-3 text-2xl font-semibold">{notifiedCount}</p>

              <p className="mt-2 text-sm text-white/35">Customer contacted</p>
            </div>

            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Cancelled
              </p>

              <p className="mt-3 text-2xl font-semibold">{cancelledCount}</p>

              <p className="mt-2 text-sm text-white/35">No longer active</p>
            </div>
          </section>

          <nav className="mt-5 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const href =
                filter.value === "all"
                  ? "/admin/stock-alerts"
                  : `/admin/stock-alerts?status=${filter.value}`;

              return (
                <Link
                  key={filter.value}
                  href={href}
                  className={`inline-flex min-h-11 items-center gap-3 border px-4 text-[10px] font-semibold uppercase tracking-[0.15em] transition ${filterClass(
                    selectedStatus === filter.value,
                  )}`}
                >
                  {filter.label}

                  <span
                    className={
                      selectedStatus === filter.value
                        ? "text-black/45"
                        : "text-white/30"
                    }
                  >
                    {filter.count}
                  </span>
                </Link>
              );
            })}
          </nav>

          {alertsError ? (
            <div className="mt-5 border border-red-400/25 bg-red-400/[0.07] p-5 text-sm text-red-200">
              Stock alerts could not be loaded: {alertsError.message}
            </div>
          ) : null}

          <section className="mt-5 overflow-hidden border border-white/10 bg-[#0d0d0d]">
            {!alertsError && visibleAlerts.length === 0 ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center border border-white/15 bg-white/[0.04]">
                  <PackageOpen className="h-7 w-7 text-white/45" />
                </div>

                <h2 className="mt-5 text-2xl font-semibold">No stock alerts</h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                  Customer restock requests matching this status will appear
                  here.
                </p>
              </div>
            ) : null}

            {!alertsError && visibleAlerts.length > 0 ? (
              <div className="divide-y divide-white/10">
                {visibleAlerts.map((alert) => {
                  const product = getRelation(alert.product);

                  const variant = getRelation(alert.variant);

                  const statusDetails = getStatusDetails(alert.status);

                  const StatusIcon = statusDetails.icon;

                  return (
                    <article
                      key={alert.id}
                      className="grid gap-5 p-5 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusDetails.className}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />

                            {statusDetails.label}
                          </span>

                          <span className="text-xs text-white/30">
                            Requested {formatDate(alert.requested_at)}
                          </span>
                        </div>

                        <h2 className="mt-4 text-xl font-semibold">
                          {product?.name ?? "Deleted product"}
                        </h2>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/45">
                          <span>Size {variant?.size ?? "Unknown"}</span>

                          {variant?.sku ? (
                            <>
                              <span className="text-white/15">•</span>

                              <span>SKU {variant.sku}</span>
                            </>
                          ) : null}
                        </div>

                        {product?.slug ? (
                          <Link
                            href={`/shop/${product.slug}`}
                            target="_blank"
                            className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40 transition hover:text-white"
                          >
                            View product
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                      </div>

                      <div>
                        <a
                          href={`mailto:${alert.email}`}
                          className="inline-flex items-center gap-3 text-sm font-semibold text-white transition hover:text-white/65"
                        >
                          <Mail className="h-4 w-4 text-white/40" />

                          {alert.email}
                        </a>

                        {variant ? (
                          <div className="mt-4 border border-white/10 bg-white/[0.025] px-4 py-3">
                            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                              Current stock
                            </p>

                            <p className="mt-2 text-sm text-white/60">
                              {getAvailabilityLabel(
                                variant.availability_status,
                              )}{" "}
                              · {variant.stock_quantity} available
                            </p>
                          </div>
                        ) : null}

                        {alert.notified_at ? (
                          <p className="mt-3 text-xs text-emerald-300/60">
                            Marked notified {formatDate(alert.notified_at)}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-[220px] lg:justify-end">
                        {alert.status === "pending" ? (
                          <>
                            <form action={markStockAlertNotified}>
                              <input
                                type="hidden"
                                name="alertId"
                                value={alert.id}
                              />

                              <button
                                type="submit"
                                className="inline-flex min-h-11 items-center gap-2 border border-emerald-400/30 bg-emerald-400/[0.08] px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300 transition hover:border-emerald-300 hover:bg-emerald-400/[0.14]"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Mark notified
                              </button>
                            </form>

                            <form action={cancelStockAlert}>
                              <input
                                type="hidden"
                                name="alertId"
                                value={alert.id}
                              />

                              <button
                                type="submit"
                                className="inline-flex min-h-11 items-center gap-2 border border-white/10 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 transition hover:border-white/30 hover:text-white"
                              >
                                <XCircle className="h-4 w-4" />
                                Cancel
                              </button>
                            </form>
                          </>
                        ) : (
                          <form action={reopenStockAlert}>
                            <input
                              type="hidden"
                              name="alertId"
                              value={alert.id}
                            />

                            <button
                              type="submit"
                              className="inline-flex min-h-11 items-center gap-2 border border-white/10 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45 transition hover:border-white/30 hover:text-white"
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Reopen
                            </button>
                          </form>
                        )}

                        <form action={deleteStockAlert}>
                          <input
                            type="hidden"
                            name="alertId"
                            value={alert.id}
                          />

                          <button
                            type="submit"
                            aria-label={`Delete stock alert for ${alert.email}`}
                            className="flex h-11 w-11 items-center justify-center border border-red-400/20 text-red-300/60 transition hover:border-red-400/50 hover:bg-red-400/[0.08] hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>

          <div className="mt-5 flex items-start gap-4 border border-white/10 bg-white/[0.025] p-5">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-white/40" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em]">
                Notification status
              </p>

              <p className="mt-2 text-sm leading-6 text-white/40">
                “Mark notified” currently records that the customer has been
                contacted. Automatic restock emails will be connected in the
                next development step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
