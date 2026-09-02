import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  History,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import OrderSearch from "@/components/admin/order-search";
import { createClient } from "@/lib/supabase/server";

type OrderItem = {
  id: string;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

type PaymentStatus = "unpaid" | "paid" | "refunded";

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  fulfillment_method: "delivery" | "pickup";
  payment_status: PaymentStatus;
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

type OrderFilter =
  | "active"
  | "pickup"
  | "delivery"
  | "history"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled"
  | "refunded";

type AdminOrdersPageProps = {
  searchParams: Promise<{
    filter?: string;
  }>;
};

const activeStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
];

const validFilters = new Set<OrderFilter>([
  "active",
  "pickup",
  "delivery",
  "history",
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
]);

function isActiveOrder(order: Order) {
  return activeStatuses.includes(order.status);
}

function getStatusDetails(status: OrderStatus) {
  if (status === "confirmed") {
    return {
      label: "Confirmed",
      icon: CheckCircle2,
      tone: "is-confirmed",
    };
  }

  if (status === "preparing") {
    return {
      label: "Preparing",
      icon: PackageCheck,
      tone: "is-preparing",
    };
  }

  if (status === "out_for_delivery") {
    return {
      label: "Out for delivery",
      icon: Truck,
      tone: "is-delivery-progress",
    };
  }

  if (status === "ready_for_pickup") {
    return {
      label: "Ready for pickup",
      icon: Store,
      tone: "is-ready",
    };
  }

  if (status === "completed") {
    return {
      label: "Completed",
      icon: CheckCircle2,
      tone: "is-completed",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      icon: XCircle,
      tone: "is-cancelled",
    };
  }

  return {
    label: "Pending",
    icon: Clock3,
    tone: "is-pending",
  };
}

function formatOrderDate(dateValue: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function orderMatchesFilter(order: Order, filter: OrderFilter) {
  if (filter === "active") {
    return isActiveOrder(order);
  }

  if (filter === "pickup") {
    return order.fulfillment_method === "pickup" && isActiveOrder(order);
  }

  if (filter === "delivery") {
    return order.fulfillment_method === "delivery" && isActiveOrder(order);
  }

  if (filter === "history") {
    return order.status === "completed" || order.status === "cancelled";
  }

  if (filter === "refunded") {
    return order.payment_status === "refunded";
  }

  return order.status === filter;
}

function filterTitle(filter: OrderFilter) {
  if (filter === "pickup") return "Pick up in store";
  if (filter === "delivery") return "Delivery";
  if (filter === "history") return "Past orders";
  if (filter === "ready_for_pickup") return "Ready for pickup";
  if (filter === "out_for_delivery") return "Out for delivery";
  if (filter === "refunded") return "Refunded";
  if (filter === "active") return "Active orders";

  return filter.charAt(0).toUpperCase() + filter.slice(1);
}

function filterDescription(filter: OrderFilter) {
  if (filter === "active") {
    return "All live orders that still require operational attention.";
  }

  if (filter === "pickup") {
    return "Active orders customers will collect directly from Stereophonie.";
  }

  if (filter === "delivery") {
    return "Active orders that still need to move through delivery fulfilment.";
  }

  if (filter === "history") {
    return "Completed and cancelled orders are stored here automatically.";
  }

  if (filter === "refunded") {
    return "Orders whose payment status has been marked as refunded.";
  }

  return `Orders currently marked as ${filterTitle(filter).toLowerCase()}.`;
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const resolvedSearchParams = await searchParams;

  const requestedFilter = resolvedSearchParams.filter as
    OrderFilter | undefined;

  const selectedFilter =
    requestedFilter && validFilters.has(requestedFilter)
      ? requestedFilter
      : "active";

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
        fulfillment_method,
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

  const counts = {
    active: orderList.filter(isActiveOrder).length,

    pickup: orderList.filter(
      (order) => order.fulfillment_method === "pickup" && isActiveOrder(order),
    ).length,

    delivery: orderList.filter(
      (order) =>
        order.fulfillment_method === "delivery" && isActiveOrder(order),
    ).length,

    history: orderList.filter(
      (order) => order.status === "completed" || order.status === "cancelled",
    ).length,

    pending: orderList.filter((order) => order.status === "pending").length,

    confirmed: orderList.filter((order) => order.status === "confirmed").length,

    preparing: orderList.filter((order) => order.status === "preparing").length,

    ready_for_pickup: orderList.filter(
      (order) => order.status === "ready_for_pickup",
    ).length,

    out_for_delivery: orderList.filter(
      (order) => order.status === "out_for_delivery",
    ).length,

    completed: orderList.filter((order) => order.status === "completed").length,

    cancelled: orderList.filter((order) => order.status === "cancelled").length,

    refunded: orderList.filter((order) => order.payment_status === "refunded")
      .length,
  };

  const visibleOrders = orderList.filter((order) =>
    orderMatchesFilter(order, selectedFilter),
  );

  const operationFilters: {
    value: OrderFilter;
    label: string;
    description: string;
    count: number;
    icon: typeof Clock3;
  }[] = [
    {
      value: "active",
      label: "Active",
      description: "Live workload",
      count: counts.active,
      icon: PackageOpen,
    },
    {
      value: "pickup",
      label: "Pick up in store",
      description: "Active pickup",
      count: counts.pickup,
      icon: Store,
    },
    {
      value: "delivery",
      label: "Delivery",
      description: "Active delivery",
      count: counts.delivery,
      icon: Truck,
    },
    {
      value: "history",
      label: "Past orders",
      description: "Completed + cancelled",
      count: counts.history,
      icon: History,
    },
  ];

  const workflowFilters: {
    value: OrderFilter;
    label: string;
    count: number;
    icon: typeof Clock3;
  }[] = [
    {
      value: "pending",
      label: "Pending",
      count: counts.pending,
      icon: Clock3,
    },
    {
      value: "confirmed",
      label: "Confirmed",
      count: counts.confirmed,
      icon: CheckCircle2,
    },
    {
      value: "preparing",
      label: "Preparing",
      count: counts.preparing,
      icon: PackageCheck,
    },
    {
      value: "ready_for_pickup",
      label: "Ready for pickup",
      count: counts.ready_for_pickup,
      icon: Store,
    },
    {
      value: "out_for_delivery",
      label: "Out for delivery",
      count: counts.out_for_delivery,
      icon: Truck,
    },
    {
      value: "completed",
      label: "Completed",
      count: counts.completed,
      icon: CheckCircle2,
    },
    {
      value: "cancelled",
      label: "Cancelled",
      count: counts.cancelled,
      icon: XCircle,
    },
    {
      value: "refunded",
      label: "Refunded",
      count: counts.refunded,
      icon: RotateCcw,
    },
  ];

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Orders"
      pageDescription="Review customer orders, delivery details, payment status and fulfilment progress."
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
              Commerce management
            </p>

            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Orders
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-white/45">
              Manage live fulfilment first, then move through individual order
              statuses or historical records when needed.
            </p>
          </header>

          {ordersError && (
            <div className="mt-5 border border-red-400/25 bg-red-400/[0.07] p-5 text-sm text-red-700">
              Orders could not be loaded: {ordersError.message}
            </div>
          )}

          <OrderSearch total={visibleOrders.length} />

          <section className="st-admin-order-hub">
            <div className="st-admin-order-hub__section">
              <header className="st-admin-order-hub__section-title">
                <div>
                  <span>Operations</span>
                  <strong>Live order queues</strong>
                </div>

                <small>Completed orders do not inflate live counters</small>
              </header>

              <nav
                className="st-admin-order-hub__operations"
                aria-label="Order operation filters"
              >
                {operationFilters.map((filter) => {
                  const Icon = filter.icon;

                  return (
                    <Link
                      key={filter.value}
                      href={`/admin/orders?filter=${filter.value}`}
                      className={`st-admin-order-hub__operation ${
                        selectedFilter === filter.value ? "is-active" : ""
                      }`}
                    >
                      <span className="st-admin-order-hub__operation-icon">
                        <Icon aria-hidden="true" />
                      </span>

                      <span className="st-admin-order-hub__operation-copy">
                        <strong>{filter.label}</strong>
                        <small>{filter.description}</small>
                      </span>

                      <span className="st-admin-order-hub__counter">
                        {filter.count}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="st-admin-order-hub__section">
              <header className="st-admin-order-hub__section-title">
                <div>
                  <span>Workflow</span>
                  <strong>Quick status access</strong>
                </div>

                <small>Open any stage immediately</small>
              </header>

              <nav
                className="st-admin-order-hub__workflow"
                aria-label="Order status filters"
              >
                {workflowFilters.map((filter) => {
                  const Icon = filter.icon;

                  return (
                    <Link
                      key={filter.value}
                      href={`/admin/orders?filter=${filter.value}`}
                      className={`st-admin-order-hub__workflow-item ${
                        selectedFilter === filter.value ? "is-active" : ""
                      }`}
                    >
                      <Icon aria-hidden="true" />

                      <span>{filter.label}</span>

                      <strong>{filter.count}</strong>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </section>

          <section className="st-admin-order-directory-v3">
            <header className="st-admin-order-directory-v3__header">
              <div>
                <p>Current view</p>

                <h2>{filterTitle(selectedFilter)}</h2>

                <span>{filterDescription(selectedFilter)}</span>
              </div>

              <div className="st-admin-order-directory-v3__result">
                <strong>{visibleOrders.length}</strong>
                <span>{visibleOrders.length === 1 ? "order" : "orders"}</span>
              </div>
            </header>

            {visibleOrders.length === 0 ? (
              <div className="st-admin-order-directory-v3__empty">
                <Archive aria-hidden="true" />

                <h3>No matching orders</h3>

                <p>
                  There are currently no orders in the{" "}
                  {filterTitle(selectedFilter).toLowerCase()} view.
                </p>
              </div>
            ) : (
              <div className="st-admin-order-directory-v3__list">
                {visibleOrders.map((order) => {
                  const statusDetails = getStatusDetails(order.status);
                  const StatusIcon = statusDetails.icon;

                  const itemQuantity = order.order_items.reduce(
                    (total, item) => total + Number(item.quantity),
                    0,
                  );

                  return (
                    <article
                      key={order.id}
                      data-admin-order-search-card="true"
                      data-admin-order-search={[
                        order.order_number,
                        order.status,
                        order.payment_status,
                        order.fulfillment_method,
                        order.customer_first_name,
                        order.customer_last_name,
                        order.customer_email,
                        order.customer_phone,
                        order.delivery_city,
                        order.delivery_area,
                        ...(order.order_items ?? []).flatMap((item) => [
                          item.product_name,
                          item.size,
                        ]),
                      ].join(" ")}
                      className="st-admin-order-row-v3"
                    >
                      <div className="st-admin-order-row-v3__main">
                        <div className="st-admin-order-row-v3__heading">
                          <h3>{order.order_number}</h3>

                          <div className="st-admin-order-row-v3__badges">
                            <span
                              className={`st-admin-order-chip ${statusDetails.tone}`}
                            >
                              <StatusIcon aria-hidden="true" />
                              {statusDetails.label}
                            </span>

                            <span
                              className={`st-admin-order-chip ${
                                order.fulfillment_method === "pickup"
                                  ? "is-pickup"
                                  : "is-delivery"
                              }`}
                            >
                              {order.fulfillment_method === "pickup" ? (
                                <Store aria-hidden="true" />
                              ) : (
                                <Truck aria-hidden="true" />
                              )}

                              {order.fulfillment_method === "pickup"
                                ? "Store pickup"
                                : "Delivery"}
                            </span>

                            <span
                              className={`st-admin-order-chip ${
                                order.payment_status === "paid"
                                  ? "is-paid"
                                  : order.payment_status === "refunded"
                                    ? "is-refunded"
                                    : "is-unpaid"
                              }`}
                            >
                              {order.payment_status}
                            </span>
                          </div>
                        </div>

                        <p className="st-admin-order-row-v3__customer">
                          {order.customer_first_name} {order.customer_last_name}
                        </p>

                        <div className="st-admin-order-row-v3__contact">
                          <span>{order.customer_email}</span>
                          <span>{order.customer_phone}</span>
                        </div>
                      </div>

                      <div className="st-admin-order-row-v3__details">
                        <span>
                          {itemQuantity} {itemQuantity === 1 ? "item" : "items"}
                        </span>

                        <span>
                          {order.fulfillment_method === "pickup"
                            ? "Stereophonie Store · Mtaileb"
                            : `${order.delivery_area}, ${order.delivery_city}`}
                        </span>

                        <span>{formatOrderDate(order.created_at)}</span>

                        <strong>${Number(order.total).toFixed(2)}</strong>
                      </div>

                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="st-admin-order-row-v3__open"
                      >
                        View order
                        <ArrowUpRight aria-hidden="true" />
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
