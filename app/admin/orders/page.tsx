import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  PackageOpen,
  Truck,
  XCircle,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

type OrderItem = {
  id: string;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Order = {
  id: string;
  order_number: string;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "completed"
    | "cancelled";
  payment_status: "unpaid" | "paid" | "refunded";
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_city: string;
  delivery_area: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
};

function getStatusDetails(status: Order["status"]) {
  if (status === "confirmed") {
    return {
      label: "Confirmed",
      icon: CheckCircle2,
      className: "border-blue-400/25 bg-blue-400/[0.08] text-blue-300",
    };
  }

  if (status === "preparing") {
    return {
      label: "Preparing",
      icon: PackageCheck,
      className: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
    };
  }

  if (status === "out_for_delivery") {
    return {
      label: "Out for delivery",
      icon: Truck,
      className: "border-violet-400/25 bg-violet-400/[0.08] text-violet-300",
    };
  }

  if (status === "completed") {
    return {
      label: "Completed",
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
    className: "border-white/10 bg-white/[0.04] text-white/55",
  };
}

function formatOrderDate(dateValue: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

export default async function AdminOrdersPage() {
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

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        payment_status,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        delivery_city,
        delivery_area,
        subtotal,
        delivery_fee,
        total,
        created_at,
        order_items (
          id,
          product_name,
          size,
          quantity,
          unit_price,
          line_total
        )
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  const orderList = (orders ?? []) as Order[];

  const pendingCount = orderList.filter(
    (order) => order.status === "pending",
  ).length;

  const activeCount = orderList.filter((order) =>
    ["confirmed", "preparing", "out_for_delivery"].includes(order.status),
  ).length;

  const completedCount = orderList.filter(
    (order) => order.status === "completed",
  ).length;

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Orders"
      pageDescription="Review customer orders, delivery details, payment status and fulfilment progress."
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[1540px]">
          <header className="border-b border-white/10 pb-8">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
              Commerce management
            </p>

            <h1 className="mt-3 text-5xl font-semibold uppercase tracking-[-0.055em] sm:text-7xl">
              Orders
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
              Manage newly submitted orders and follow each order from
              confirmation to delivery.
            </p>
          </header>

          <section className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Pending
              </p>

              <p className="mt-3 text-3xl font-semibold">{pendingCount}</p>

              <p className="mt-2 text-sm text-white/35">Awaiting review</p>
            </div>

            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Active
              </p>

              <p className="mt-3 text-3xl font-semibold">{activeCount}</p>

              <p className="mt-2 text-sm text-white/35">
                Being prepared or delivered
              </p>
            </div>

            <div className="border border-white/10 bg-[#0d0d0d] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Completed
              </p>

              <p className="mt-3 text-3xl font-semibold">{completedCount}</p>

              <p className="mt-2 text-sm text-white/35">
                Successfully fulfilled
              </p>
            </div>
          </section>

          {ordersError && (
            <div className="mt-7 border border-red-400/25 bg-red-400/[0.07] p-5 text-sm text-red-200">
              Orders could not be loaded: {ordersError.message}
            </div>
          )}

          <section className="mt-7 overflow-hidden border border-white/10 bg-[#0d0d0d]">
            {orderList.length === 0 ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center border border-white/15 bg-white/[0.04]">
                  <PackageOpen className="h-7 w-7 text-white/45" />
                </div>

                <h2 className="mt-7 text-3xl font-semibold">No orders yet</h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/40">
                  Customer orders will appear here after checkout is completed
                  successfully.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {orderList.map((order) => {
                  const statusDetails = getStatusDetails(order.status);

                  const StatusIcon = statusDetails.icon;

                  const itemQuantity = order.order_items.reduce(
                    (total, item) => total + Number(item.quantity),
                    0,
                  );

                  return (
                    <article
                      key={order.id}
                      className="grid gap-5 p-5 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-lg font-semibold">
                            {order.order_number}
                          </h2>

                          <span
                            className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusDetails.className}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusDetails.label}
                          </span>

                          <span
                            className={`border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                              order.payment_status === "paid"
                                ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                                : "border-white/10 bg-white/[0.04] text-white/45"
                            }`}
                          >
                            {order.payment_status}
                          </span>
                        </div>

                        <p className="mt-3 font-semibold">
                          {order.customer_first_name} {order.customer_last_name}
                        </p>

                        <p className="mt-1 text-sm text-white/40">
                          {order.customer_email}
                        </p>

                        <p className="mt-1 text-sm text-white/40">
                          {order.customer_phone}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-white/55">
                          {itemQuantity} {itemQuantity === 1 ? "item" : "items"}
                        </p>

                        <p className="mt-2 text-sm text-white/40">
                          {order.delivery_area}, {order.delivery_city}
                        </p>

                        <p className="mt-2 text-sm text-white/40">
                          {formatOrderDate(order.created_at)}
                        </p>

                        <p className="mt-3 text-xl font-semibold">
                          ${Number(order.total).toFixed(2)}
                        </p>
                      </div>

                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="group inline-flex items-center justify-center gap-3 border border-white/15 px-5 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-white/65 transition hover:border-white hover:bg-white hover:text-black"
                      >
                        View order
                        <ArrowUpRight className="h-4 w-4 transition group-hover:rotate-45" />
                      </Link>
                    </article>
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
