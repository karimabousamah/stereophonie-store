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
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
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
      <>
        <V3Header />
        <main className="st-order-transmission">
          <div className="st-order-transmission__card">
            <div className="st-order-transmission__spinner">
              <Loader2 className="animate-spin" />
            </div>

            <small>Secure checkout</small>
            <h1>Placing your order</h1>
            <p>
              We are securely confirming your products, delivery information,
              discount and payment choice. This should only take a moment.
            </p>
            <div className="st-order-transmission__bar">
              <span />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (errorMessage) {
    return (
      <>
        <V3Header />
        <main className="st-checkout-error-v2 min-h-screen bg-[#f6f5f2] text-black">
          <CheckoutProgress currentStep={3} />

          <section className="mx-auto flex max-w-[760px] items-center justify-center px-5 py-10 sm:px-8">
            <div className="w-full rounded-[24px] border border-red-200 bg-white p-7 text-center shadow-[0_18px_55px_rgba(29,29,31,0.06)] sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-200 bg-red-50">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>

              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">
                Order not submitted
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                We need one more look
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-black/55">
                {errorMessage}
              </p>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={returnToCheckout}
                  className="min-h-12 rounded-full bg-[#f5b335] px-7 py-3 text-sm font-semibold text-black transition hover:bg-[#eaaa2b]"
                >
                  Return to checkout
                </button>
                <Link
                  href="/shop"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-7 py-3 text-sm font-semibold text-black transition hover:border-black"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </section>
        </main>
      </>
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
    <>
      <V3Header />
      <main className="st-order-success-v2 min-h-screen bg-[#f6f5f2] text-black">
        <CheckoutProgress currentStep={3} />

        <section className="st-checkout-success-head">
          <div className="st-checkout-success-head__message">
            <div className="st-checkout-success-head__icon">
              <CheckCircle2 />
            </div>
            <div>
              <p className="st-checkout-success-head__eyebrow">
                Order confirmed
              </p>
              <h1>Thank you, {customer.firstName}.</h1>
              <p>
                Your order is safely recorded. The Stereophonie team will
                contact you to confirm delivery.
              </p>
            </div>
          </div>

          <div className="st-checkout-success-head__number">
            <span>Order number</span>
            <strong>{result.order_number}</strong>
            <p>
              <PackageCheck />
              Keep this number for questions about your purchase.
            </p>
            {accountLinked ? (
              <Link href="/account">
                View my account orders
                <ArrowRight />
              </Link>
            ) : null}
          </div>

          {accountLinked || emailFailed ? (
            <div className="st-checkout-success-head__notices">
              {accountLinked ? (
                <div className="is-success">
                  <UserRound />
                  <p>
                    <strong>Account connected</strong>
                    This order is available in your account history.
                  </p>
                </div>
              ) : null}
              {emailFailed ? (
                <div className="is-warning">
                  <AlertCircle />
                  <p>
                    <strong>Confirmation email delayed</strong>
                    Your order is saved, but the email could not be sent.
                    {result.confirmation_email_message
                      ? ` ${result.confirmation_email_message}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="st-checkout-content mx-auto max-w-[1180px] px-5 py-8 sm:px-6 sm:py-10">
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
                          <span>Configuration {item.size}</span>

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
                          index === 0
                            ? "font-semibold"
                            : "text-sm text-black/50"
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

                  <h2 className="mt-2 text-2xl font-semibold">Order total</h2>
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
                    Continue shopping
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
