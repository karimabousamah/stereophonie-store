"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  PackageSearch,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { type FormEvent, useRef, useState, useTransition } from "react";

import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import { trackOrder } from "./actions";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

type TrackedOrder = {
  order_number: string;
  status: OrderStatus;
  payment_status: "unpaid" | "paid" | "refunded";
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

const progressSteps: {
  value: Exclude<OrderStatus, "cancelled">;
  label: string;
  description: string;
  icon: typeof Package;
}[] = [
  {
    value: "pending",
    label: "Order received",
    description: "Your order is safely in our system.",
    icon: ReceiptText,
  },
  {
    value: "confirmed",
    label: "Order confirmed",
    description: "The details and availability are confirmed.",
    icon: Check,
  },
  {
    value: "preparing",
    label: "Preparing",
    description: "Your products are being prepared for dispatch.",
    icon: Package,
  },
  {
    value: "out_for_delivery",
    label: "On the way",
    description: "The courier is delivering your order.",
    icon: Truck,
  },
  {
    value: "completed",
    label: "Delivered",
    description: "Your order has reached its destination.",
    icon: PackageCheck,
  },
];

const statusLabels: Record<OrderStatus, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  completed: "Delivered",
  cancelled: "Cancelled",
};

function money(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-LB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const resultRef = useRef<HTMLElement | null>(null);
  const orderInputRef = useRef<HTMLInputElement | null>(null);

  const currentStepIndex =
    order && order.status !== "cancelled"
      ? progressSteps.findIndex((step) => step.value === order.status)
      : -1;

  function submitTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanOrder = orderNumber.trim();
    const cleanEmail = email.trim();

    if (!cleanOrder || !cleanEmail) {
      setError("Enter both your order number and checkout email address.");
      return;
    }

    setError("");
    setOrder(null);

    startTransition(async () => {
      try {
        const result = await trackOrder(cleanOrder, cleanEmail);

        if (!result.success) {
          setError(result.message);
          return;
        }

        setOrder(result.order);
        window.setTimeout(() => {
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
      } catch {
        setError("We could not retrieve the order. Please try again.");
      }
    });
  }

  function resetTracking() {
    setOrder(null);
    setError("");
    setOrderNumber("");
    window.setTimeout(() => orderInputRef.current?.focus(), 0);
  }

  return (
    <div className="st-retail-shell">
      <V3Header />

      <main className="st-retail-page st-retail-track">
        <section className="st-retail-hero st-retail-track__hero">
          <div className="st-retail-hero__copy">
            <p className="st-retail-eyebrow">Delivery status</p>
            <h1>Track your order.</h1>
            <p>
              Enter the order number from your confirmation and the matching
              checkout email to see the latest status.
            </p>
          </div>
        </section>

        <section className="st-retail-track__lookup">
          <div className="st-retail-track__form-card">
            <div className="st-retail-section__heading">
              <div>
                <p className="st-retail-eyebrow">Secure order lookup</p>
                <h2>Where is your order?</h2>
                <p>Both fields must match the details used at checkout.</p>
              </div>
              <PackageSearch />
            </div>

            <form onSubmit={submitTracking} noValidate>
              <label>
                <span>Order number</span>
                <div className="st-retail-field">
                  <Package />
                  <input
                    ref={orderInputRef}
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    placeholder="e.g. ST-1024"
                    autoComplete="off"
                    disabled={isPending}
                  />
                </div>
              </label>

              <label>
                <span>Checkout email address</span>
                <div className="st-retail-field">
                  <Mail />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isPending}
                  />
                </div>
              </label>

              {error ? (
                <div className="st-retail-track__error" role="alert">
                  <CircleAlert />
                  <p>
                    <strong>We could not find that order.</strong>
                    <span>{error}</span>
                  </p>
                </div>
              ) : null}

              <button
                type="submit"
                className="st-retail-button st-retail-button--mustard st-retail-track__submit"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="st-retail-spin" />
                    Looking up your order…
                  </>
                ) : (
                  <>
                    Track order
                    <ArrowRight />
                  </>
                )}
              </button>
            </form>
          </div>

          <aside className="st-retail-track__help-card">
            <p className="st-retail-eyebrow">What you will need</p>
            <h2>Two details. One clear answer.</h2>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>Your order number</strong>
                  <p>Find it in the confirmation shown after checkout.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Your checkout email</strong>
                  <p>Use the exact address attached to the order.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Need personal help?</strong>
                  <p>
                    Our support team can assist if the details do not match.
                  </p>
                </div>
              </li>
            </ol>
            <Link href="/delivery" className="st-retail-text-link">
              Read about delivery
              <ArrowRight />
            </Link>
          </aside>
        </section>

        {order ? (
          <section ref={resultRef} className="st-retail-track__result">
            <div className="st-retail-track__result-head">
              <div>
                <p className="st-retail-eyebrow">Order found</p>
                <h2>{order.order_number}</h2>
                <p>Placed {formatDate(order.created_at)}</p>
              </div>
              <div className="st-retail-track__result-actions">
                <span
                  className={`st-retail-track__status st-retail-track__status--${order.status}`}
                >
                  {statusLabels[order.status]}
                </span>
                <button
                  type="button"
                  onClick={resetTracking}
                  className="st-retail-button st-retail-button--quiet"
                >
                  <RotateCcw />
                  Track another
                </button>
              </div>
            </div>

            {order.status === "cancelled" ? (
              <div className="st-retail-track__cancelled">
                <CircleAlert />
                <div>
                  <h3>This order was cancelled.</h3>
                  <p>
                    Contact support if you need more information about this
                    order.
                  </p>
                </div>
              </div>
            ) : (
              <div className="st-retail-track__timeline">
                {progressSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isComplete = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div
                      key={step.value}
                      className={`st-retail-track-step ${
                        isComplete ? "is-complete" : ""
                      } ${isCurrent ? "is-current" : ""}`}
                    >
                      <div className="st-retail-track-step__marker">
                        {isComplete ? <Check /> : <Icon />}
                      </div>
                      <div>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <h3>{step.label}</h3>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="st-retail-track__details">
              <div className="st-retail-track__items">
                <div className="st-retail-track__details-title">
                  <div>
                    <p className="st-retail-eyebrow">Order contents</p>
                    <h3>Your products</h3>
                  </div>
                  <span>{order.items.length}</span>
                </div>

                {order.items.map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <span>
                        {item.size} · Quantity {item.quantity}
                      </span>
                    </div>
                    <strong>{money(item.line_total)}</strong>
                  </article>
                ))}
              </div>

              <aside className="st-retail-track__summary">
                <p className="st-retail-eyebrow">Delivery summary</p>
                <h3>
                  {order.customer_first_name} {order.customer_last_name}
                </h3>
                <p className="st-retail-track__address">
                  <MapPin />
                  {order.delivery_area}, {order.delivery_city}
                </p>

                <dl>
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{money(order.subtotal)}</dd>
                  </div>
                  {order.discount_amount > 0 ? (
                    <div>
                      <dt>Discount</dt>
                      <dd>−{money(order.discount_amount)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Delivery</dt>
                    <dd>
                      {order.delivery_fee ? money(order.delivery_fee) : "Free"}
                    </dd>
                  </div>
                  <div className="is-total">
                    <dt>Total</dt>
                    <dd>{money(order.total)}</dd>
                  </div>
                </dl>

                <p className="st-retail-track__payment">
                  Payment status: <strong>{order.payment_status}</strong>
                </p>
              </aside>
            </div>
          </section>
        ) : null}
      </main>

      <V3Footer />
    </div>
  );
}
