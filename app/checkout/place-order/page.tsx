"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Printer,
  FileDown,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

import { getConfirmationExtras, submitOrder } from "./actions";

import CheckoutProgress from "@/components/checkout/checkout-progress";
import "./confirmation-v4.css";

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

type FulfillmentMethod = "delivery" | "pickup";
type PaymentMethod = "cash_on_delivery";

type StoredCheckoutDetails = {
  fulfillmentMethod?: FulfillmentMethod;
  customer: CustomerDetails;
  customerAccount?: CustomerAccountDetails;
  phoneCountry?: PhoneCountryDetails;
  coupon?: StoredCoupon | null;
  discountAmount?: number;
  paymentMethod?: PaymentMethod;
  giftWrappingRequested?: boolean;
  cart: StoredCartItem[];
  subtotal: number;
  deliveryFee: number;
  orderTotal: number;
};

type OrderResult = {
  success: true;
  order_id: string;
  order_number: string;
  receipt_token?: string | null;
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
  fulfillmentMethod: FulfillmentMethod;
  giftWrappingRequested?: boolean;
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

  /* ST_CONFIRMATION_VARIANTS_RECEIPTS_V1 */
  const [configurationCounts, setConfigurationCounts] =
    useState<Record<string, number>>({});

  const [recoveredReceiptTokens, setRecoveredReceiptTokens] =
    useState<Record<string, string>>({});

  useEffect(() => {
    if (!confirmedOrder) {
      return;
    }

    let cancelled = false;

    const orderId = confirmedOrder.result.order_id;
    const variantIds = confirmedOrder.cart.map(
      (item) => item.variantId,
    );

    void getConfirmationExtras(orderId, variantIds)
      .then((extras) => {
        if (cancelled) {
          return;
        }

        setConfigurationCounts(extras.variantCounts);

        if (
          extras.receiptToken &&
          /^[a-f0-9]{64}$/i.test(extras.receiptToken)
        ) {
          setRecoveredReceiptTokens((previous) => ({
            ...previous,
            [orderId]: extras.receiptToken!,
          }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(
            "Confirmation details could not be refreshed:",
            error instanceof Error
              ? error.message
              : "Unknown error",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [confirmedOrder]);

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

            fulfillmentMethod:
              checkoutDetails.fulfillmentMethod === "pickup"
                ? "pickup"
                : "delivery",

            customerAccount: checkoutDetails.customerAccount,

            couponCode: checkoutDetails.coupon?.code ?? null,

            paymentMethod: checkoutDetails.paymentMethod,

            giftWrappingRequested:
              checkoutDetails.giftWrappingRequested === true,

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
          receipt_token: result.receipt_token ?? null,

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

          fulfillmentMethod:
            checkoutDetails.fulfillmentMethod === "pickup"
              ? "pickup"
              : "delivery",

          customerAccount: checkoutDetails.customerAccount,

          phoneCountry: checkoutDetails.phoneCountry,

          cart: checkoutDetails.cart,

          giftWrappingRequested:
            checkoutDetails.giftWrappingRequested === true,

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

  const {
    result,
    customer,
    customerAccount,
    cart,
    fulfillmentMethod,
    giftWrappingRequested,
  } = confirmedOrder;

  const accountLinked = customerAccount?.signedIn === true;

  const emailFailed = result.confirmation_email_sent === false;


  const totalQuantity = cart.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );
  // Only link a correctly formed receipt token.
  const receiptToken =
    [result.receipt_token, recoveredReceiptTokens[result.order_id]]
      .find(
        (value): value is string =>
          typeof value === "string" &&
          /^[a-f0-9]{64}$/i.test(value),
      ) ?? null;

  const receiptUrl = receiptToken
    ? `/order-receipt/${receiptToken}`
    : null;


  return (
    <>
      <V3Header />

      {/* ST_CONFIRMATION_CLEAN_V4 */}
      <main className="st-confirmation-v4">
        <div className="st-confirmation-v4__container">

          <section className="st-confirmation-v4__card st-confirmation-v4__welcome">
            <p className="st-confirmation-v4__eyebrow">
              Order confirmed
            </p>

            <h1>
              Thank you for your order, {customer.firstName}!
            </h1>

            <p className="st-confirmation-v4__description">
              {fulfillmentMethod === "pickup"
                ? "Your order has been placed successfully. We will contact you when it is ready for pickup."
                : "Your order has been placed successfully. Our team will contact you to arrange delivery."}
            </p>

            <div className="st-confirmation-v4__reference">
              <span>Order number</span>
              <strong>{result.order_number}</strong>
            </div>

            {accountLinked ? (
              <div className="st-confirmation-v4__account" role="status">
                {/* ST_CONFIRMATION_ACCOUNT_BADGE_V1 */}
                <span
                  className="st-confirmation-v4__account-badge"
                  aria-hidden="true"
                >
                  <UserRoundCheck />
                </span>
                <div>
                  <strong>Account connected</strong>
                  <p>
                    This order is available in your account history.
                  </p>
                </div>
              </div>
            ) : null}

            {emailFailed ? (
              <div className="st-confirmation-v4__email-warning" role="status">
                <strong>Confirmation email delayed</strong>
                <p>
                  Your order was saved, but the confirmation email
                  could not be sent.
                  {result.confirmation_email_message
                    ? ` ${result.confirmation_email_message}`
                    : ""}
                </p>
              </div>
            ) : null}
          </section>

          <section
            className="st-confirmation-v4__card st-confirmation-v4__summary"
            aria-labelledby="st-confirmation-summary-heading"
          >
            <div className="st-confirmation-v4__heading">
              <h2 id="st-confirmation-summary-heading">
                Order summary
              </h2>
              <span>
                {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="st-confirmation-v4__products">
              {cart.map((item) => (
                <article
                  key={item.cartItemId}
                  className="st-confirmation-v4__product"
                >
                  <Link
                    href={`/shop/${item.slug}`}
                    className="st-confirmation-v4__photo"
                    aria-label={`View ${item.name}`}
                  >
                    {item.imageUrl ? (
                      <img
                        className="st-confirmation-v4__photo-image"
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="st-confirmation-v4__photo-empty">
                        No image
                      </span>
                    )}
                  </Link>

                  <div className="st-confirmation-v4__product-info">
                    <Link
                      href={`/shop/${item.slug}`}
                      className="st-confirmation-v4__product-name"
                    >
                      {item.name}
                    </Link>

                    {item.size &&
                    (configurationCounts[item.variantId] ?? 0) > 1 ? (
                      <p className="st-confirmation-v4__configuration">
                        {item.size}
                      </p>
                    ) : null}

                    <div className="st-confirmation-v4__product-bottom">
                      <span>Quantity: {item.quantity}</span>
                      <strong>
                        {money(item.unitPrice * item.quantity)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>


            {/* ST_CONFIRMATION_FULFILLMENT_SUMMARY_V2 */}
            <div className="st-confirmation-v4__fulfillment">

              {giftWrappingRequested === true ? (
                <div className="st-confirmation-v4__detail-row">
                  <span>Gift wrapping</span>
                  <strong>Requested</strong>
                </div>
              ) : null}

              <div className="st-confirmation-v4__detail-row">
                <span>
                  {fulfillmentMethod === "pickup"
                    ? "Pickup in store"
                    : "Delivery fee"}
                </span>
                <strong>
                  {fulfillmentMethod === "pickup"
                    ? "Free"
                    : money(result.delivery_fee)}
                </strong>
              </div>

              {fulfillmentMethod === "delivery" ? (
                <div className="st-confirmation-v4__address">
                  <strong>Delivery address</strong>

                  <p className="st-confirmation-v4__street">
                    {customer.address}
                  </p>

                  {customer.building ? (
                    <p>Building: {customer.building}</p>
                  ) : null}

                  {customer.floor ? (
                    <p>Floor/apartment: {customer.floor}</p>
                  ) : null}

                  <p>
                    {[
                      customer.area,
                      customer.city,
                      customer.country || "Lebanon",
                    ].filter(Boolean).join(", ")}
                  </p>

                  {customer.deliveryNotes ? (
                    <p className="st-confirmation-v4__delivery-notes">
                      Delivery notes: {customer.deliveryNotes}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {Number(result.discount_amount) > 0 ? (
                <div className="st-confirmation-v4__detail-row">
                  <span>Discount</span>
                  <strong>
                    -{money(result.discount_amount)}
                  </strong>
                </div>
              ) : null}

            </div>


            <div className="st-confirmation-v4__total">
              <span>Order total</span>
              <strong>{money(result.total)}</strong>
            </div>

            {/* ST_CONFIRMATION_RECEIPT_VAT_POLISH_V1 */}
            <div className="st-confirmation-v4__vat-wrap">
              <div className="st-confirmation-v4__vat-notice">
                <ShieldCheck aria-hidden="true" />
                <p>
                  11% VAT is already included in the price of every item.
                  No additional VAT will be charged at checkout.
                </p>
              </div>
            </div>

            {receiptUrl ? (
              <div className="st-confirmation-v4__receipt-actions">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  <span>Print receipt</span>
                  <Printer aria-hidden="true" />
                </a>

                <a
                  href={`${receiptUrl}?download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                >
                  <span>Download receipt</span>
                  <FileDown aria-hidden="true" />
                </a>
              </div>
            ) : null}

            <div className="st-confirmation-v4__actions">
              <Link
                href={accountLinked ? "/account" : "/track-order"}
                className="st-confirmation-v4__button st-confirmation-v4__button--white"
              >
                <span>View my order</span>
                <ArrowRight aria-hidden="true" />
              </Link>

              <Link
                href="/shop"
                className="st-confirmation-v4__button st-confirmation-v4__button--mustard"
              >
                <span>Continue shopping</span>
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
