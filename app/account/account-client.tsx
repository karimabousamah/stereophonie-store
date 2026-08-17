"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type OrderItem = {
  id: string | number;
  product_name: string;
  size: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type CustomerOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  delivery_city: string | null;
  delivery_area: string | null;
  coupon_code: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  status_updated_at: string | null;
  items: OrderItem[];
};

type AccountClientProps = {
  orders: CustomerOrder[];
};

type OrderTab = "ongoing" | "previous";

const roadmap = [
  {
    value: "pending",
    label: "Submitted",
    description: "Your order was received.",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    description: "Stereophonie confirmed your order.",
  },
  {
    value: "preparing",
    label: "Preparing",
    description: "Your items are being prepared.",
  },
  {
    value: "out_for_delivery",
    label: "Out for delivery",
    description: "Your order is on its way.",
  },
  {
    value: "completed",
    label: "Delivered",
    description: "Your order was delivered.",
  },
];

function normalizeStatus(status: string) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");

  if (normalized === "new" || normalized === "new_order") {
    return "pending";
  }

  if (normalized === "packing") {
    return "preparing";
  }

  if (normalized === "delivered") {
    return "completed";
  }

  return normalized || "pending";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    out_for_delivery: "Out for delivery",
    completed: "Delivered",
    cancelled: "Cancelled",
  };

  return labels[normalizeStatus(status)] ?? status;
}

function paymentStatusLabel(status: string | null) {
  const normalized = String(status ?? "unpaid")
    .trim()
    .toLowerCase();

  const labels: Record<string, string> = {
    unpaid: "Unpaid",
    paid: "Paid",
    refunded: "Refunded",
  };

  return labels[normalized] ?? status ?? "Unpaid";
}

function formatMoney(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function OrderRoadmap({ status }: { status: string }) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "cancelled") {
    return (
      <div className="mt-7 border border-red-200 bg-red-50 px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700">
          Order cancelled
        </p>

        <p className="mt-2 text-sm leading-6 text-red-700/75">
          This order is no longer being prepared or delivered.
        </p>
      </div>
    );
  }

  const currentIndex = roadmap.findIndex(
    (step) => step.value === normalizedStatus,
  );

  return (
    <div className="mt-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Delivery roadmap
      </p>

      <div className="mt-5 grid gap-0 md:grid-cols-5">
        {roadmap.map((step, index) => {
          const completed = currentIndex >= index && currentIndex !== -1;

          const current = currentIndex === index;

          return (
            <div key={step.value} className="relative pb-7 md:pb-0">
              {index < roadmap.length - 1 ? (
                <>
                  <div className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-neutral-200 md:left-8 md:top-[15px] md:h-px md:w-[calc(100%-32px)]" />

                  <div
                    className={`absolute left-[15px] top-8 h-[calc(100%-20px)] w-px md:left-8 md:top-[15px] md:h-px md:w-[calc(100%-32px)] ${
                      currentIndex > index ? "bg-black" : "bg-transparent"
                    }`}
                  />
                </>
              ) : null}

              <div className="relative flex gap-4 md:block md:pr-4">
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] font-semibold ${
                    completed
                      ? "border-black bg-black text-white"
                      : "border-neutral-300 bg-white text-neutral-400"
                  } ${current ? "ring-4 ring-neutral-100" : ""}`}
                >
                  {completed ? "✓" : index + 1}
                </div>

                <div className="md:mt-4">
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.1em] ${
                      completed ? "text-black" : "text-neutral-400"
                    }`}
                  >
                    {step.label}
                  </p>

                  <p className="mt-2 max-w-[180px] text-xs leading-5 text-neutral-400">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const deliveryLocation = [order.delivery_area, order.delivery_city]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="border border-neutral-200 bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-5 border-b border-neutral-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Order
          </p>

          <h3 className="mt-2 text-xl font-semibold uppercase tracking-[-0.02em]">
            {order.order_number}
          </h3>

          <p className="mt-2 text-sm text-neutral-500">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            {statusLabel(order.status)}
          </span>

          <span className="border border-neutral-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-600">
            {paymentStatusLabel(order.payment_status)}
          </span>
        </div>
      </div>

      <OrderRoadmap status={order.status} />

      <div className="mt-8 grid gap-8 border-t border-neutral-100 pt-7 lg:grid-cols-[1fr_280px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Purchased items
          </p>

          <div className="mt-4 divide-y divide-neutral-100">
            {order.items.length ? (
              order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-5 py-4 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.03em]">
                      {item.product_name}
                    </p>

                    <p className="mt-1 text-xs text-neutral-500">
                      {item.size ? `Size ${item.size} · ` : ""}
                      Quantity {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold">
                    {formatMoney(item.line_total)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">
                No product details are available for this order.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Order summary
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-5 text-neutral-500">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal)}</span>
            </div>

            {order.discount_amount > 0 ? (
              <div className="flex justify-between gap-5 text-emerald-700">
                <span>
                  Discount
                  {order.coupon_code ? ` (${order.coupon_code})` : ""}
                </span>

                <span className="font-semibold">
                  −{formatMoney(order.discount_amount)}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between gap-5 text-neutral-500">
              <span>Delivery</span>
              <span>{formatMoney(order.delivery_fee)}</span>
            </div>

            <div className="flex justify-between gap-5 border-t border-neutral-200 pt-4 text-base font-semibold">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>

          {deliveryLocation ? (
            <div className="mt-6 border-t border-neutral-100 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                Delivery location
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {deliveryLocation}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function AccountClient({ orders }: AccountClientProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>("ongoing");

  const ongoingOrders = useMemo(
    () =>
      orders.filter((order) => {
        const status = normalizeStatus(order.status);

        return status !== "completed" && status !== "cancelled";
      }),
    [orders],
  );

  const previousOrders = useMemo(
    () =>
      orders.filter((order) => {
        const status = normalizeStatus(order.status);

        return status === "completed" || status === "cancelled";
      }),
    [orders],
  );

  const visibleOrders =
    activeTab === "ongoing" ? ongoingOrders : previousOrders;

  return (
    <section
      id="customer-orders"
      className="border border-neutral-200 bg-white"
    >
      <div className="border-b border-neutral-200 px-6 py-6 sm:px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Purchase history
        </p>

        <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[-0.035em]">
          Your orders
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
          Follow ongoing deliveries and review completed or cancelled orders.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <div className="flex overflow-x-auto border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab("ongoing")}
            className={`shrink-0 border-b-2 px-1 pb-4 pr-7 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              activeTab === "ongoing"
                ? "border-black text-black"
                : "border-transparent text-neutral-400 hover:text-black"
            }`}
          >
            Ongoing orders ({ongoingOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("previous")}
            className={`shrink-0 border-b-2 px-1 pb-4 text-xs font-semibold uppercase tracking-[0.14em] transition ${
              activeTab === "previous"
                ? "border-black text-black"
                : "border-transparent text-neutral-400 hover:text-black"
            }`}
          >
            Previous orders ({previousOrders.length})
          </button>
        </div>

        <div className="mt-7 space-y-6">
          {visibleOrders.length ? (
            visibleOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))
          ) : (
            <div className="st-player-order-empty border border-dashed border-neutral-300 px-6 py-16 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.12em]">
                {activeTab === "ongoing"
                  ? "No ongoing orders"
                  : "No previous orders"}
              </p>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-500">
                {activeTab === "ongoing"
                  ? "New orders placed with this customer account will appear here."
                  : "Delivered and cancelled orders will appear here."}
              </p>

              <Link
                href="/shop"
                className="st-player-command-button st-player-command-button--primary mt-7"
              >
                Continue shopping
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
