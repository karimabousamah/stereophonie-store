import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  History,
  Gift,
  PackageCheck,
  PackageOpen,
  Plus,
  RotateCcw,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import OrderSearch from "@/components/admin/order-search";
import OrderCopyValue from "@/components/admin/order-copy-value";
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
  gift_wrapping_requested: boolean;
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
        gift_wrapping_requested,
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
      <main className="st-admin-orders-v4">
        <div className="st-admin-orders-v4__page-actions">
          <Link
            href="/admin/orders/new"
            className="st-admin-orders-v4__create-order"
          >
            <Plus aria-hidden="true" />
            <span>Create order</span>
          </Link>
        </div>

        <div className="st-admin-orders-v4__inner">
          {ordersError ? (
            <div className="st-admin-orders-v4__error">
              Orders could not be loaded:{" "}
              {ordersError.message}
            </div>
          ) : null}

          <section
            className="st-admin-orders-v4__toolbar"
            aria-label="Order directory controls"
          >
            <OrderSearch
              total={visibleOrders.length}
            />

            <nav
              className="st-admin-orders-v4__queue-filters"
              aria-label="Order queues"
            >
              {operationFilters.map(
                (filter) => {
                  const Icon =
                    filter.icon;

                  return (
                    <Link
                      key={filter.value}
                      href={`/admin/orders?filter=${filter.value}`}
                      className={
                        selectedFilter ===
                        filter.value
                          ? "is-active"
                          : undefined
                      }
                      title={
                        filter.description
                      }
                    >
                      <Icon
                        aria-hidden="true"
                      />

                      <span>
                        {filter.label}
                      </span>

                      <small>
                        {filter.count}
                      </small>
                    </Link>
                  );
                },
              )}
            </nav>
          </section>

          <nav
            className="st-admin-orders-v4__workflow"
            aria-label="Order workflow status"
          >
            {workflowFilters.map(
              (filter) => {
                const Icon =
                  filter.icon;

                return (
                  <Link
                    key={filter.value}
                    href={`/admin/orders?filter=${filter.value}`}
                    className={
                      selectedFilter ===
                      filter.value
                        ? "is-active"
                        : undefined
                    }
                  >
                    <Icon
                      aria-hidden="true"
                    />

                    <span>
                      {filter.label}
                    </span>

                    <small>
                      {filter.count}
                    </small>
                  </Link>
                );
              },
            )}
          </nav>

          <section className="st-admin-orders-v4__directory">
            <header className="st-admin-orders-v4__directory-head">
              <div>
                <strong>
                  {filterTitle(
                    selectedFilter,
                  )}
                </strong>

                <span>
                  {filterDescription(
                    selectedFilter,
                  )}
                </span>
              </div>

              <div className="st-admin-orders-v4__directory-count">
                <strong>
                  {visibleOrders.length}
                </strong>

                <span>
                  {visibleOrders.length ===
                  1
                    ? "order"
                    : "orders"}
                </span>
              </div>
            </header>

            {visibleOrders.length === 0 ? (
              <div className="st-admin-orders-v4__empty">
                <Archive
                  aria-hidden="true"
                />

                <strong>
                  No matching orders
                </strong>

                <span>
                  There are currently no
                  orders in this view.
                </span>
              </div>
            ) : (
              <>
                <div
                  className="st-admin-orders-v4__columns"
                  aria-hidden="true"
                >
                  <span>
                    Order number
                  </span>

                  <span>
                    Customer
                  </span>

                  <span>
                    Phone
                  </span>

                  <span>
                    Fulfilment
                  </span>

                  <span>
                    Gift wrap
                  </span>

                  <span>
                    Items
                  </span>

                  <span>
                    Status
                  </span>

                  <span>
                    Payment
                  </span>

                  <span>
                    Total
                  </span>

                  <span>
                    Date
                  </span>

                  <span>
                    Action
                  </span>
                </div>

                <div className="st-admin-orders-v4__list">
                  {visibleOrders.map(
                    (order) => {
                      const statusDetails =
                        getStatusDetails(
                          order.status,
                        );

                      const StatusIcon =
                        statusDetails.icon;

                      const itemQuantity =
                        order.order_items.reduce(
                          (
                            total,
                            item,
                          ) =>
                            total +
                            Number(
                              item.quantity,
                            ),
                          0,
                        );

                      const customerName =
                        `${order.customer_first_name} ${order.customer_last_name}`.trim();

                      const location =
                        order.fulfillment_method ===
                        "pickup"
                          ? "Stereophonie Store · Mtaileb"
                          : `${order.delivery_area}, ${order.delivery_city}`;

                      return (
                        <article
                          key={order.id}
                          data-admin-order-search-card="true"
                          data-admin-order-search={[
                            order.order_number,
                            order.status,
                            order.payment_status,
                            order.fulfillment_method,
                            order.gift_wrapping_requested
                              ? "gift wrapping requested"
                              : "",
                            order.customer_first_name,
                            order.customer_last_name,
                            order.customer_email,
                            order.customer_phone,
                            order.delivery_city,
                            order.delivery_area,
                            ...(order.order_items ??
                              []).flatMap(
                              (item) => [
                                item.product_name,
                                item.size,
                              ],
                            ),
                          ].join(" ")}
                          className="st-admin-orders-v4__row"
                        >
                          <div className="st-admin-orders-v4__order-cell">
                            <OrderCopyValue
                              value={order.order_number}
                              label="order number"
                            />
                          </div>

                          <div className="st-admin-orders-v4__customer-cell">
                            <OrderCopyValue
                              value={customerName}
                              label="customer name"
                            />
                          </div>

                          <div className="st-admin-orders-v4__phone-cell">
                            <OrderCopyValue
                              value={order.customer_phone}
                              label="phone number"
                            />
                          </div>

                          <div className="st-admin-orders-v4__fulfilment">

                            <span
                              className={`st-admin-orders-v4__fulfilment-pill ${
                                order.fulfillment_method ===
                                "pickup"
                                  ? "is-pickup"
                                  : "is-delivery"
                              }`}
                            >
                              {order.fulfillment_method ===
                              "pickup" ? (
                                <Store
                                  aria-hidden="true"
                                />
                              ) : (
                                <Truck
                                  aria-hidden="true"
                                />
                              )}

                              {order.fulfillment_method ===
                              "pickup"
                                ? "Pickup"
                                : "Delivery"}
                            </span>

                            <small>
                              {location}
                            </small>
                          </div>

                          <div className="st-admin-orders-v4__gift-cell">
                            {order.gift_wrapping_requested ? (
                              <span className="st-admin-orders-v4__gift-badge">
                                <Gift
                                  aria-hidden="true"
                                />

                                <span>
                                  Gift wrap
                                </span>
                              </span>
                            ) : (
                              <span className="st-admin-orders-v4__gift-none">
                                No
                              </span>
                            )}
                          </div>

                          <div className="st-admin-orders-v4__items-cell">
                            <strong>
                              {itemQuantity}
                            </strong>

                            <span>
                              {itemQuantity === 1
                                ? "item"
                                : "items"}
                            </span>
                          </div>

                          <div className="st-admin-orders-v4__status-cell">
                            <span
                              className={`st-admin-orders-v4__status ${statusDetails.tone}`}
                            >
                              <StatusIcon
                                aria-hidden="true"
                              />

                              {
                                statusDetails.label
                              }
                            </span>
                          </div>

                          <div className="st-admin-orders-v4__payment-cell">
                            <span
                              className={`st-admin-orders-v4__payment is-${order.payment_status}`}
                            >
                              {
                                order.payment_status
                              }
                            </span>
                          </div>

                          <div className="st-admin-orders-v4__total">
                            <strong>
                              $
                              {Number(
                                order.total,
                              ).toFixed(
                                2,
                              )}
                            </strong>
                          </div>

                          <div className="st-admin-orders-v4__date">
                            <span>
                              {formatOrderDate(
                                order.created_at,
                              )}
                            </span>
                          </div>

                          <div className="st-admin-orders-v4__action-cell st-admin-products-directory__preview">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="st-admin-products-directory__preview-link"
                              title="View order"
                              aria-label={`View order ${order.order_number}`}
                            >
                              <span>
                                View
                              </span>

                              <ArrowUpRight
                                aria-hidden="true"
                              />
                            </Link>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </AdminShell>
  );
}
