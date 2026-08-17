"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

import { submitOrder } from "./actions";

import CheckoutProgress from "@/components/checkout/checkout-progress";

type CustomerDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  address: string;
  building: string;
  floor: string;
  deliveryNotes: string;
};

type CustomerAccountDetails = {
  signedIn: boolean;
  email: string;
  savedAddressId: string | null;
};

type PhoneCountryDetails = {
  country: string;
  code: string;
  flag: string;
};

type StoredCoupon = {
  code: string;
  name: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
};

type StoredCartItem = {
  cartItemId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  size: string;
  variantId: string;
  unitPrice: number;
  regularPrice: number | null;
  quantity: number;
  maximumQuantity: number;
};

type PaymentMethod = "cash_on_delivery";

type StoredCheckoutDetails = {
  customer: CustomerDetails;
  customerAccount?: CustomerAccountDetails;
  phoneCountry?: PhoneCountryDetails;
  coupon?: StoredCoupon | null;
  discountAmount?: number;
  paymentMethod?: PaymentMethod;
  cart: StoredCartItem[];
  subtotal: number;
  deliveryFee: number;
  orderTotal: number;
};

type OrderResult = {
  success: true;
  order_id: string;
  order_number: string;
  subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  total: number;
  coupon_code: string | null;
  confirmation_email_sent?: boolean;
  confirmation_email_message?: string;
};

type SavedOrderSnapshot = {
  result: OrderResult;
  customer: CustomerDetails;
  customerAccount?: CustomerAccountDetails;
  phoneCountry?: PhoneCountryDetails;
  cart: StoredCartItem[];
  createdAt: string;
};

type SubmitOrderResponse = Awaited<ReturnType<typeof submitOrder>>;

let activeOrderSubmission: Promise<SubmitOrderResponse> | null = null;

function money(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

function readStoredOrder() {
  try {
    const storedOrder = window.sessionStorage.getItem(
      "stereophonie-last-order",
    );

    if (!storedOrder) {
      return null;
    }

    return JSON.parse(storedOrder) as SavedOrderSnapshot;
  } catch {
    return null;
  }
}

function readCheckoutDetails(storedCheckout: string) {
  try {
    return JSON.parse(storedCheckout) as StoredCheckoutDetails;
  } catch {
    return null;
  }
}

export default function PlaceOrderPage() {
  const router = useRouter();

  const { clearCart, isCartReady } = useCart();

  const { removeProduct } = useWishlist();

  const submissionStarted = useRef(false);

  const [isSubmitting, setIsSubmitting] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [confirmedOrder, setConfirmedOrder] =
    useState<SavedOrderSnapshot | null>(null);

  useEffect(() => {
    if (!isCartReady || submissionStarted.current) {
      return;
    }

    submissionStarted.current = true;

    async function placeOrder() {
      const storedCheckout = window.sessionStorage.getItem(
        "stereophonie-checkout-details",
      );

      const previousOrder = readStoredOrder();

      const submissionStatus = window.sessionStorage.getItem(
        "stereophonie-order-submission-status",
      );

      /*
       * A completed order may only be reopened when
       * there is no new checkout waiting to be submitted.
       */
      if (!storedCheckout) {
        if (submissionStatus === "completed" && previousOrder) {
          setConfirmedOrder(previousOrder);

          setIsSubmitting(false);
          return;
        }

        setErrorMessage(
          "Your checkout information could not be found. Please return to checkout.",
        );

        setIsSubmitting(false);
        return;
      }

      const checkoutDetails = readCheckoutDetails(storedCheckout);

      if (!checkoutDetails) {
        window.sessionStorage.setItem(
          "stereophonie-order-submission-status",
          "failed",
        );

        setErrorMessage(
          "Your checkout information could not be read. Please return to checkout.",
        );

        setIsSubmitting(false);
        return;
      }

      if (
        !checkoutDetails.customer ||
        !Array.isArray(checkoutDetails.cart) ||
        checkoutDetails.cart.length === 0
      ) {
        window.sessionStorage.setItem(
          "stereophonie-order-submission-status",
          "failed",
        );

        setErrorMessage(
          "Your checkout information is incomplete or your cart is empty.",
        );

        setIsSubmitting(false);
        return;
      }

      try {
        /*
         * A new checkout always replaces the previous
         * completed status.
         */
        window.sessionStorage.setItem(
          "stereophonie-order-submission-status",
          "submitting",
        );

        if (!activeOrderSubmission) {
          activeOrderSubmission = submitOrder({
            customer: checkoutDetails.customer,

            customerAccount: checkoutDetails.customerAccount,

            couponCode: checkoutDetails.coupon?.code ?? null,

            paymentMethod: checkoutDetails.paymentMethod,

            items: checkoutDetails.cart.map((item) => ({
              variantId: item.variantId,

              quantity: item.quantity,

              name: item.name,

              size: item.size,

              imageUrl: item.imageUrl,

              unitPrice: item.unitPrice,
            })),
          });
        }

        const result = await activeOrderSubmission;

        activeOrderSubmission = null;

        if (!result.success || !result.order_id || !result.order_number) {
          window.sessionStorage.setItem(
            "stereophonie-order-submission-status",
            "failed",
          );

          setErrorMessage(
            result.message || "The order could not be submitted.",
          );

          setIsSubmitting(false);
          return;
        }

        const confirmedResult: OrderResult = {
          success: true,

          order_id: result.order_id,

          order_number: result.order_number,

          subtotal: Number(result.subtotal ?? 0),

          discount_amount: Number(result.discount_amount ?? 0),

          delivery_fee: Number(result.delivery_fee ?? 0),

          total: Number(result.total ?? 0),

          coupon_code: result.coupon_code ?? null,

          confirmation_email_sent: result.confirmation_email_sent,

          confirmation_email_message: result.confirmation_email_message,
        };

        const snapshot: SavedOrderSnapshot = {
          result: confirmedResult,

          customer: checkoutDetails.customer,

          customerAccount: checkoutDetails.customerAccount,

          phoneCountry: checkoutDetails.phoneCountry,

          cart: checkoutDetails.cart,

          createdAt: new Date().toISOString(),
        };

        window.sessionStorage.setItem(
          "stereophonie-last-order",
          JSON.stringify(snapshot),
        );

        window.sessionStorage.setItem(
          "stereophonie-order-submission-status",
          "completed",
        );

        window.sessionStorage.removeItem("stereophonie-checkout-details");

        const purchasedProductIds = Array.from(
          new Set(checkoutDetails.cart.map((item) => item.productId)),
        );

        purchasedProductIds.forEach((productId) => {
          removeProduct(productId);
        });

        clearCart();

        setConfirmedOrder(snapshot);
        setIsSubmitting(false);
      } catch (error) {
        activeOrderSubmission = null;

        window.sessionStorage.setItem(
          "stereophonie-order-submission-status",
          "failed",
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while submitting your order.",
        );

        setIsSubmitting(false);
      }
    }

    void placeOrder();
  }, [clearCart, isCartReady, removeProduct]);

  function returnToCheckout() {
    window.sessionStorage.removeItem("stereophonie-order-submission-status");

    router.push("/checkout");
  }

  if (!isCartReady || isSubmitting) {
    return (
      <main className="st-order-transmission">
        <div className="st-order-transmission__terminal">
          <div className="st-order-transmission__top">
            <span>ORDER TRANSMISSION / ACTIVE</span>
            <span>SECURE BUS / CHANNEL 03</span>
          </div>

          <div className="st-order-transmission__screen">
            <div className="st-order-transmission__spinner">
              <Loader2 className="animate-spin" />
            </div>

            <small>CHECKOUT MODULE / STEP 03</small>

            <h1>
              TRANSMITTING
              <br />
              ORDER.
            </h1>

            <p>
              Verifying inventory, customer data, delivery coordinates, coupon
              state and Cash on Delivery configuration. Do not close this
              window.
            </p>

            <div className="st-order-transmission__bar">
              <span />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-[#f6f5f2] text-black">
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex min-h-[78px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <Link
              href="/"
              className="text-lg font-semibold uppercase tracking-[0.22em]"
            >
              Stereophonie
            </Link>

            <Link
              href="/shop"
              className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45 transition hover:text-black"
            >
              Return to shop
            </Link>
          </div>
        </header>

        <CheckoutProgress currentStep={3} />

        <section className="mx-auto flex min-h-[calc(100vh-79px)] max-w-[1000px] items-center justify-center px-5 py-14 sm:px-8">
          <div className="w-full border border-red-200 bg-white p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,0.06)] sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center border border-red-200 bg-red-50">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>

            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-600">
              Order not submitted
            </p>

            <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[-0.04em] sm:text-5xl">
              Something needs
              <br />
              your attention
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-black/55">
              {errorMessage}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={returnToCheckout}
                className="min-h-14 bg-black px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition hover:bg-[#242424]"
              >
                Return to checkout
              </button>

              <Link
                href="/shop"
                className="inline-flex min-h-14 items-center justify-center border border-black/15 px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-black transition hover:border-black"
              >
                RETURN TO STORE
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!confirmedOrder) {
    return null;
  }

  const { result, customer, customerAccount, phoneCountry, cart } =
    confirmedOrder;

  const accountLinked = customerAccount?.signedIn === true;

  const emailFailed = result.confirmation_email_sent === false;

  const fullAddress = [
    customer.address,

    customer.building ? `Building: ${customer.building}` : null,

    customer.floor ? `Floor/apartment: ${customer.floor}` : null,

    customer.area,

    customer.city,

    customer.country || "Lebanon",
  ].filter(Boolean);

  const totalQuantity = cart.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );

  return (
    <main className="st-order-success-v2 min-h-screen bg-[#f6f5f2] text-black">
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
            className="group inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45 transition hover:text-black"
          >
            RETURN TO STORE
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </header>

      <section className="border-b border-black/10 bg-[#0a0a0a] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <div className="flex h-16 w-16 items-center justify-center border border-emerald-400/25 bg-emerald-400/[0.08]">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Order received
              </p>

              <h1 className="mt-4 text-5xl font-semibold uppercase leading-[0.9] tracking-[-0.06em] sm:text-7xl lg:text-8xl">
                Thank
                <br />
                you
              </h1>

              <p className="mt-7 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">
                Your order was submitted successfully. Stereophonie will review
                the details and contact you to confirm delivery and payment.
              </p>

              {accountLinked ? (
                <div className="mt-7 flex max-w-2xl items-start gap-4 border border-emerald-300/20 bg-emerald-300/[0.06] p-5">
                  <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                      Customer account connected
                    </p>

                    <p className="mt-2 text-sm leading-6 text-white/50">
                      This order was saved using your signed-in customer email
                      and is available in your account order history.
                    </p>
                  </div>
                </div>
              ) : null}

              {emailFailed ? (
                <div className="mt-4 flex max-w-2xl items-start gap-4 border border-amber-300/25 bg-amber-300/[0.07] p-5">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                      Confirmation email delayed
                    </p>

                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Your order was saved, but the confirmation email could not
                      be sent.
                      {result.confirmation_email_message
                        ? ` ${result.confirmation_email_message}`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border border-white/15 bg-white/[0.045] p-6 backdrop-blur-md sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                TRANSACTION ID
              </p>

              <p className="st-order-success-number mt-3 break-all text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                {result.order_number}
              </p>

              <div className="mt-6 flex items-start gap-3 border-t border-white/10 pt-5">
                <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-white/40" />

                <p className="text-xs leading-6 text-white/45">
                  Keep this order number for any communication about your
                  purchase.
                </p>
              </div>

              {accountLinked ? (
                <Link
                  href="/account"
                  className="st-order-success-command mt-6 flex min-h-13 w-full items-center justify-center gap-3 border border-white bg-white px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-black transition hover:bg-transparent hover:text-white"
                >
                  View my account orders
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-8">
            <section className="border border-black/10 bg-white">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                    Purchased products
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
                    {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
                  </h2>
                </div>

                <ShoppingBag className="h-5 w-5 text-black/35" />
              </div>

              <div className="divide-y divide-black/10">
                {cart.map((item) => (
                  <article
                    key={item.cartItemId}
                    className="grid grid-cols-[86px_minmax(0,1fr)] gap-4 p-5 sm:grid-cols-[105px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                  >
                    <Link
                      href={`/shop/${item.slug}`}
                      className="aspect-[4/5] overflow-hidden bg-neutral-100"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-black/20" />
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0">
                      <Link
                        href={`/shop/${item.slug}`}
                        className="block truncate font-semibold transition hover:text-black/55"
                      >
                        {item.name}
                      </Link>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/45">
                        <span>CONFIGURATION {item.size}</span>

                        <span>Quantity {item.quantity}</span>
                      </div>

                      <p className="mt-3 text-sm font-semibold sm:hidden">
                        {money(item.unitPrice * item.quantity)}
                      </p>
                    </div>

                    <p className="hidden text-base font-semibold sm:block">
                      {money(item.unitPrice * item.quantity)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="border border-black/10 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-black/35" />

                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                    Contact
                  </p>
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  {customer.firstName} {customer.lastName}
                </h2>

                <p className="mt-4 break-all text-sm text-black/50">
                  {customer.email}
                </p>

                <div className="mt-3 flex items-center gap-2 text-sm text-black/50">
                  <Phone className="h-4 w-4 shrink-0" />

                  <span>{customer.phone}</span>
                </div>

                {phoneCountry ? (
                  <p className="mt-3 text-xs text-black/40">
                    {phoneCountry.flag} {phoneCountry.country}
                  </p>
                ) : null}
              </div>

              <div className="border border-black/10 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-black/35" />

                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                    Delivery address
                  </p>
                </div>

                <div className="mt-6 space-y-2">
                  {fullAddress.map((line, index) => (
                    <p
                      key={`${line}-${index}`}
                      className={
                        index === 0 ? "font-semibold" : "text-sm text-black/50"
                      }
                    >
                      {line}
                    </p>
                  ))}
                </div>

                {customer.deliveryNotes ? (
                  <div className="mt-5 border-t border-black/10 pt-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
                      Delivery notes
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-black/50">
                      {customer.deliveryNotes}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <section className="border border-black/10 bg-white">
              <div className="border-b border-black/10 px-5 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                  Payment summary
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  FINAL SYSTEM TOTAL
                </h2>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-black/50">Subtotal</span>

                  <span className="font-semibold">
                    {money(result.subtotal)}
                  </span>
                </div>

                {Number(result.discount_amount ?? 0) > 0 ? (
                  <div className="flex items-center justify-between gap-4 text-sm text-emerald-700">
                    <span>
                      Discount
                      {result.coupon_code ? ` (${result.coupon_code})` : ""}
                    </span>

                    <span className="font-semibold">
                      −{money(Number(result.discount_amount))}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-black/50">Delivery</span>

                  <span className="text-right text-black/45">
                    Confirmed later
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-black/10 pt-4">
                  <span className="font-semibold">Current total</span>

                  <span className="text-2xl font-semibold">
                    {money(result.total)}
                  </span>
                </div>

                <div className="border border-black/10 bg-[#f7f7f5] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                    What happens next?
                  </p>

                  <div className="mt-4 space-y-4">
                    {[
                      "Stereophonie reviews your order.",
                      "You are contacted to confirm delivery.",
                      "Payment arrangements are confirmed.",
                    ].map((step, index) => (
                      <div key={step} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-[9px] font-semibold text-white">
                          {index + 1}
                        </span>

                        <p className="text-xs leading-6 text-black/50">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {accountLinked ? (
                  <Link
                    href="/account"
                    className="flex min-h-14 w-full items-center justify-center gap-3 border border-black bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                  >
                    View my orders
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}

                <Link
                  href="/shop"
                  className="flex min-h-14 w-full items-center justify-center gap-3 bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#242424]"
                >
                  RETURN TO STORE
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
