"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

import { trackOrder } from "./actions";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

type PaymentStatus = "unpaid" | "paid" | "refunded";

type TrackedOrder = {
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  customer_first_name: string;
  customer_last_name: string;
  delivery_city: string;
  delivery_area: string;
  coupon_code: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  status_updated_at: string | null;
  items: {
    id: string;
    product_name: string;
    size: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
};

const fulfilmentSteps: {
  value: OrderStatus;
  label: string;
  icon: typeof Clock3;
}[] = [
  {
    value: "pending",
    label: "Pending",
    icon: Clock3,
  },
  {
    value: "confirmed",
    label: "Confirmed",
    icon: CheckCircle2,
  },
  {
    value: "preparing",
    label: "Preparing",
    icon: Package,
  },
  {
    value: "out_for_delivery",
    label: "Delivery",
    icon: Truck,
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle2,
  },
];

function money(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCurrentStepIndex(status: OrderStatus) {
  if (status === "cancelled") {
    return -1;
  }

  return fulfilmentSteps.findIndex((step) => step.value === status);
}

function getStatusLabel(status: OrderStatus) {
  if (status === "out_for_delivery") {
    return "Out for delivery";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");

  const [email, setEmail] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();

    setErrorMessage("");
    setOrder(null);

    startTransition(async () => {
      const result = await trackOrder(orderNumber, email);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setOrder(result.order);
    });
  }

  const currentStepIndex = order ? getCurrentStepIndex(order.status) : -1;

  const totalQuantity = order
    ? order.items.reduce((sum, item) => sum + Number(item.quantity), 0)
    : 0;

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-black">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex min-h-[78px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="text-lg font-semibold uppercase tracking-[0.22em] sm:text-xl"
          >
            Stereophonie
          </Link>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to shop
          </Link>
        </div>
      </header>

      <section className="border-b border-black/10 bg-[#0a0a0a] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Customer service
          </p>

          <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.9] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
            Track
            <br />
            your order
          </h1>

          <p className="mt-7 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
            Enter your order number and the email address used during checkout
            to view the latest status.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={submit}
            className="h-fit border border-black/10 bg-white p-5 sm:p-7 xl:sticky xl:top-6"
          >
            <div className="flex h-12 w-12 items-center justify-center border border-black/10 bg-[#f7f7f5]">
              <Search className="h-5 w-5 text-black/45" />
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">
              Find your order
            </h2>

            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                  Order number
                </span>

                <input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="Example: NITA-000123"
                  className="mt-2 h-14 w-full border border-black/15 bg-white px-4 text-sm outline-none transition placeholder:text-black/25 focus:border-black"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                  Email address
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 h-14 w-full border border-black/15 bg-white px-4 text-sm outline-none transition placeholder:text-black/25 focus:border-black"
                />
              </label>
            </div>

            {errorMessage && (
              <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#242424] disabled:cursor-wait disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching
                </>
              ) : (
                <>
                  Track order
                  <Search className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="min-w-0">
            {!order && !isPending && (
              <div className="flex min-h-[520px] items-center justify-center border border-black/10 bg-white p-8 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center border border-black/10 bg-[#f7f7f5]">
                    <ShoppingBag className="h-7 w-7 text-black/25" />
                  </div>

                  <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
                    Your order details will appear here
                  </h2>

                  <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-black/45">
                    Use the exact order number shown on your confirmation page
                    and the same email address entered during checkout.
                  </p>
                </div>
              </div>
            )}

            {order && (
              <div className="space-y-7">
                <section className="border border-black/10 bg-white">
                  <div className="flex flex-col gap-5 border-b border-black/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                        Order number
                      </p>

                      <h2 className="mt-2 break-all text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                        {order.order_number}
                      </h2>

                      <p className="mt-2 text-xs text-black/40">
                        Submitted {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="border border-black/10 bg-[#f7f7f5] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.13em]">
                        {getStatusLabel(order.status)}
                      </span>

                      <span className="border border-black/10 bg-[#f7f7f5] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.13em]">
                        {order.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    {order.status === "cancelled" ? (
                      <div className="flex items-start gap-4 border border-red-200 bg-red-50 p-4">
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                        <div>
                          <p className="font-semibold text-red-700">
                            Order cancelled
                          </p>

                          <p className="mt-1 text-sm leading-6 text-red-700/70">
                            This order is no longer being fulfilled. Contact
                            Stereophonie for assistance.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="min-w-[650px]">
                          <div className="grid grid-cols-5">
                            {fulfilmentSteps.map((step, index) => {
                              const Icon = step.icon;

                              const completed = index <= currentStepIndex;

                              const current = index === currentStepIndex;

                              return (
                                <div
                                  key={step.value}
                                  className="relative flex flex-col items-center text-center"
                                >
                                  {index < fulfilmentSteps.length - 1 && (
                                    <div
                                      className={`absolute left-1/2 top-5 h-px w-full ${
                                        index < currentStepIndex
                                          ? "bg-black"
                                          : "bg-black/10"
                                      }`}
                                    />
                                  )}

                                  <div
                                    className={`relative z-10 flex h-10 w-10 items-center justify-center border ${
                                      completed
                                        ? "border-black bg-black text-white"
                                        : "border-black/10 bg-white text-black/25"
                                    } ${
                                      current ? "ring-4 ring-black/[0.05]" : ""
                                    }`}
                                  >
                                    {index < currentStepIndex ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <Icon className="h-4 w-4" />
                                    )}
                                  </div>

                                  <p
                                    className={`mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] ${
                                      completed
                                        ? "text-black/75"
                                        : "text-black/25"
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {order.status_updated_at && (
                      <p className="mt-5 text-center text-xs text-black/35">
                        Last updated {formatDate(order.status_updated_at)}
                      </p>
                    )}
                  </div>
                </section>

                <section className="border border-black/10 bg-white">
                  <div className="border-b border-black/10 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                      Purchased products
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold">
                      {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
                    </h2>
                  </div>

                  <div className="divide-y divide-black/10">
                    {order.items.map((item) => (
                      <article
                        key={item.id}
                        className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
                      >
                        <div>
                          <h3 className="font-semibold">{item.product_name}</h3>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/45">
                            <span>Size {item.size}</span>

                            <span>Quantity {item.quantity}</span>

                            <span>{money(item.unit_price)} each</span>
                          </div>
                        </div>

                        <p className="font-semibold">
                          {money(item.line_total)}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="grid gap-5 md:grid-cols-2">
                  <div className="border border-black/10 bg-white p-5 sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                      Customer
                    </p>

                    <h2 className="mt-4 text-2xl font-semibold">
                      {order.customer_first_name} {order.customer_last_name}
                    </h2>
                  </div>

                  <div className="border border-black/10 bg-white p-5 sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                      Delivery location
                    </p>

                    <h2 className="mt-4 text-2xl font-semibold">
                      {order.delivery_area}
                    </h2>

                    <p className="mt-2 text-sm text-black/45">
                      {order.delivery_city}, Lebanon
                    </p>
                  </div>
                </section>

                <section className="border border-black/10 bg-white">
                  <div className="border-b border-black/10 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                      Payment summary
                    </p>
                  </div>

                  <div className="space-y-4 p-5 sm:p-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black/45">Subtotal</span>

                      <span>{money(order.subtotal)}</span>
                    </div>

                    {Number(order.discount_amount) > 0 ? (
                      <div className="flex items-center justify-between gap-4 text-sm text-emerald-700">
                        <span>
                          Discount
                          {order.coupon_code ? ` (${order.coupon_code})` : ""}
                        </span>

                        <span className="font-semibold">
                          −{money(order.discount_amount)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-black/45">Delivery fee</span>

                      <span>{money(order.delivery_fee)}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-black/10 pt-4">
                      <span className="font-semibold">Total</span>

                      <span className="text-2xl font-semibold">
                        {money(order.total)}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
