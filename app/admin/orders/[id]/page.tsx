import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  ShoppingBag,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

import OrderStatusControls from "./order-status-controls";

type OrderDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
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
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_method: "delivery" | "pickup";
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_city: string;
  delivery_area: string;
  delivery_address: string | null;
  delivery_building: string | null;
  delivery_floor: string | null;
  delivery_notes: string | null;
  admin_notes: string | null;
  coupon_code: string | null;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  status_updated_at: string | null;
  order_items: OrderItem[];
};

const deliveryFulfilmentSteps: {
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
    label: "Out for delivery",
    icon: Truck,
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle2,
  },
];

const pickupFulfilmentSteps: {
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
    value: "ready_for_pickup",
    label: "Ready for pickup",
    icon: Package,
  },
  {
    value: "completed",
    label: "Completed",
    icon: CheckCircle2,
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusDetails(status: OrderStatus) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmed",
        icon: CheckCircle2,
        className: "border-blue-400/25 bg-blue-400/[0.08] text-blue-300",
      };

    case "preparing":
      return {
        label: "Preparing",
        icon: Package,
        className: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
      };

    case "out_for_delivery":
      return {
        label: "Out for delivery",
        icon: Truck,
        className: "border-violet-400/25 bg-violet-400/[0.08] text-violet-300",
      };
    case "ready_for_pickup":
      return {
        label: "Ready for pickup",
        icon: Package,
        className: "border-amber-300/30 bg-amber-300/[0.08] text-amber-200",
      };

    case "completed":
      return {
        label: "Completed",
        icon: CheckCircle2,
        className:
          "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        icon: XCircle,
        className: "border-red-400/25 bg-red-400/[0.08] text-red-300",
      };

    default:
      return {
        label: "Pending",
        icon: Clock3,
        className: "border-white/10 bg-white/[0.04] text-white/55",
      };
  }
}

function getCurrentStepIndex(
  status: OrderStatus,
  steps: { value: OrderStatus }[],
) {
  if (status === "cancelled") {
    return -1;
  }

  return steps.findIndex((step) => step.value === status);
}

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const { id } = await params;

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

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      status,
      payment_status,
        fulfillment_method,
      customer_first_name,
      customer_last_name,
      customer_email,
      customer_phone,
      delivery_city,
      delivery_area,
      delivery_address,
      delivery_building,
      delivery_floor,
      delivery_notes,
      admin_notes,
      coupon_code,
      subtotal,
      discount_amount,
      delivery_fee,
      total,
      created_at,
      status_updated_at,
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
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const order = data as Order;

  const statusDetails = getStatusDetails(order.status);

  const StatusIcon = statusDetails.icon;

  const fulfillmentMethod =
    order.fulfillment_method === "pickup" ? "pickup" : "delivery";

  const fulfilmentSteps =
    fulfillmentMethod === "pickup"
      ? pickupFulfilmentSteps
      : deliveryFulfilmentSteps;

  const currentStepIndex = getCurrentStepIndex(order.status, fulfilmentSteps);

  const totalQuantity = order.order_items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );

  const fullAddress = [
    order.delivery_address,
    order.delivery_building ? `Building: ${order.delivery_building}` : null,
    order.delivery_floor ? `Floor/apartment: ${order.delivery_floor}` : null,
    order.delivery_area,
    order.delivery_city,
    "Lebanon",
  ].filter(Boolean);

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Order details"
      pageDescription="Review customer information, purchased items, payment and fulfilment progress."
    >
      <div className="px-4 py-6 sm:px-7 sm:py-7">
        <div className="mx-auto max-w-[1540px]">
          <header className="border-b border-white/10 pb-8">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              All orders
            </Link>

            <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
                  Customer order
                </p>

                <h1 className="mt-3 break-all text-2xl font-semibold uppercase tracking-[-0.045em] sm:text-5xl xl:text-6xl">
                  {order.order_number}
                </h1>

                <p className="mt-4 text-sm text-white/40">
                  Submitted {formatDate(order.created_at)}
                </p>

                {order.status_updated_at && (
                  <p className="mt-1 text-xs text-white/25">
                    Last status update {formatDate(order.status_updated_at)}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <span
                  className={`inline-flex items-center gap-2 border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusDetails.className}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {statusDetails.label}
                </span>

                <span
                  className={`inline-flex items-center border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    fulfillmentMethod === "pickup"
                      ? "border-amber-300/30 bg-amber-300/[0.08] text-amber-200"
                      : "border-sky-300/25 bg-sky-300/[0.07] text-sky-200"
                  }`}
                >
                  {fulfillmentMethod === "pickup" ? "Store pickup" : "Delivery"}
                </span>

                <span
                  className={`border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    order.payment_status === "paid"
                      ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
                      : order.payment_status === "refunded"
                        ? "border-violet-400/25 bg-violet-400/[0.08] text-violet-300"
                        : "border-white/10 bg-white/[0.04] text-white/45"
                  }`}
                >
                  {order.payment_status}
                </span>
              </div>
            </div>
          </header>

          <section
            className="mt-5 overflow-x-auto border border-white/10 bg-[#0d0d0d] p-5"
            data-admin-order-roadmap="true"
          >
            {order.status === "cancelled" ? (
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-red-400/25 bg-red-400/[0.08]">
                  <XCircle className="h-5 w-5 text-red-300" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300">
                    Order cancelled
                  </p>

                  <p className="mt-1 text-sm text-white/40">
                    Fulfilment has been stopped for this order.
                  </p>
                </div>
              </div>
            ) : (
              <div className="min-w-[680px]">
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
                                ? "bg-emerald-400/60"
                                : "bg-white/10"
                            }`}
                          />
                        )}

                        <div
                          className={`relative z-10 flex h-10 w-10 items-center justify-center border ${
                            completed
                              ? "border-emerald-400/40 bg-emerald-400/[0.1] text-emerald-300"
                              : "border-white/10 bg-[#0d0d0d] text-white/25"
                          } ${current ? "ring-4 ring-emerald-400/[0.07]" : ""}`}
                        >
                          {index < currentStepIndex ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>

                        <p
                          className={`mt-3 text-[9px] font-semibold uppercase tracking-[0.13em] ${
                            completed ? "text-white/75" : "text-white/25"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              <section className="border border-white/10 bg-[#0d0d0d]">
                <header className="st-admin-order-products-header">
                  <ShoppingBag
                    className="st-admin-order-products-header__icon"
                    aria-hidden="true"
                  />

                  <div className="st-admin-order-products-header__copy">
                    <p>Purchased products</p>

                    <h2>
                      {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
                    </h2>
                  </div>
                </header>

                <div className="divide-y divide-white/10">
                  {order.order_items.map((item) => (
                    <article
                      key={item.id}
                      className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div>
                        <h3 className="text-lg font-semibold">
                          {item.product_name}
                        </h3>

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/40">
                          <span>Size {item.size}</span>

                          <span>Quantity {item.quantity}</span>

                          <span>
                            ${Number(item.unit_price).toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      <p className="text-xl font-semibold">
                        ${Number(item.line_total).toFixed(2)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="border border-white/10 bg-[#0d0d0d] p-5">
                  <div className="flex items-center gap-3">
                    <UserRound className="h-5 w-5 text-sky-300" />

                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      Customer
                    </p>
                  </div>

                  <h2 className="mt-6 text-2xl font-semibold">
                    {order.customer_first_name} {order.customer_last_name}
                  </h2>

                  <div className="mt-6 grid gap-3">
                    <a
                      href={`mailto:${order.customer_email}`}
                      className="flex min-h-11 items-center gap-3 border border-white/10 bg-white/[0.025] px-4 text-sm text-white/50 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
                    >
                      <Mail className="h-4 w-4 shrink-0" />

                      <span className="break-all">{order.customer_email}</span>
                    </a>

                    <a
                      href={`tel:${order.customer_phone}`}
                      className="flex min-h-11 items-center gap-3 border border-white/10 bg-white/[0.025] px-4 text-sm text-white/50 transition hover:border-white/25 hover:bg-white/[0.05] hover:text-white"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {order.customer_phone}
                    </a>
                  </div>
                </div>

                <div className="border border-white/10 bg-[#0d0d0d] p-5">
                  <div className="flex items-center gap-3">
                    <MapPin
                      className={`h-5 w-5 ${
                        fulfillmentMethod === "pickup"
                          ? "text-amber-200"
                          : "text-emerald-300"
                      }`}
                    />

                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      {fulfillmentMethod === "pickup"
                        ? "Store pickup"
                        : "Delivery address"}
                    </p>
                  </div>

                  {fulfillmentMethod === "pickup" ? (
                    <div className="mt-6">
                      <h2 className="text-xl font-semibold">
                        Stereophonie Store
                      </h2>

                      <p className="mt-2 text-sm text-white/45">
                        Mtaileb, Lebanon
                      </p>

                      <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-white/40">
                        This order will be collected directly from the store. No
                        customer delivery address is required.
                      </p>

                      <a
                        href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex min-h-11 items-center gap-2 border border-white/15 bg-white/[0.035] px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 transition hover:border-white/30 hover:text-white"
                      >
                        <MapPin className="h-4 w-4" />
                        Open store location
                      </a>
                    </div>
                  ) : (
                    <>
                      <div className="mt-6 space-y-2">
                        {fullAddress.map((line, index) => (
                          <p
                            key={`${line}-${index}`}
                            className={
                              index === 0
                                ? "text-lg font-semibold"
                                : "text-sm text-white/45"
                            }
                          >
                            {line}
                          </p>
                        ))}
                      </div>

                      {order.delivery_notes && (
                        <div className="mt-6 border-t border-white/10 pt-5">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                            Customer delivery notes
                          </p>

                          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/45">
                            {order.delivery_notes}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              <section className="st-admin-order-summary">
                <header className="st-admin-order-summary__header">
                  <span className="st-admin-order-summary__icon">
                    <ReceiptText aria-hidden="true" />
                  </span>

                  <div className="st-admin-order-summary__heading">
                    <p>Order total</p>
                    <h2>Payment summary</h2>
                  </div>
                </header>

                <div className="st-admin-order-summary__rows">
                  <div>
                    <span>Subtotal</span>
                    <strong>${Number(order.subtotal).toFixed(2)}</strong>
                  </div>

                  {Number(order.discount_amount) > 0 ? (
                    <div className="is-discount">
                      <span>
                        Discount
                        {order.coupon_code ? ` · ${order.coupon_code}` : ""}
                      </span>

                      <strong>
                        −${Number(order.discount_amount).toFixed(2)}
                      </strong>
                    </div>
                  ) : null}

                  <div>
                    <span>
                      {fulfillmentMethod === "pickup"
                        ? "Store pickup"
                        : "Delivery fee"}
                    </span>

                    <strong>
                      {fulfillmentMethod === "pickup"
                        ? "Free"
                        : `$${Number(order.delivery_fee).toFixed(2)}`}
                    </strong>
                  </div>
                </div>

                <footer className="st-admin-order-summary__total">
                  <div>
                    <span>Total</span>
                    <small>Taxes included</small>
                  </div>

                  <strong>${Number(order.total).toFixed(2)}</strong>
                </footer>
              </section>
            </div>

            <aside className="xl:sticky xl:top-6 xl:self-start">
              <OrderStatusControls
                orderId={order.id}
                currentStatus={order.status}
                fulfillmentMethod={fulfillmentMethod}
                currentPaymentStatus={order.payment_status}
                initialAdminNotes={order.admin_notes ?? ""}
              />
            </aside>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
