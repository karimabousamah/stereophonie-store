"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  MapPin,
  Mail,
  Phone,
  ShoppingBag,
  User,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import CheckoutProgress from "@/components/checkout/checkout-progress";
import CartButton from "@/components/cart/cart-button";
import { type CartItem, useCart } from "@/components/cart/cart-provider";

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

type PaymentMethod = "cash_on_delivery";

type StoredCheckoutDetails = {
  customer: CustomerDetails;

  customerAccount?: CustomerAccountDetails;

  phoneCountry?: PhoneCountryDetails;

  coupon?: StoredCoupon | null;
  discountAmount?: number;

  paymentMethod?: PaymentMethod;

  cart: CartItem[];
  subtotal: number;
  deliveryFee: number;
  orderTotal: number;
};

type NormalizedCheckoutDetails = {
  customer: CustomerDetails;
  customerAccount: CustomerAccountDetails;
  phoneCountry: PhoneCountryDetails | null;
  coupon: StoredCoupon | null;
  discountAmount: number;
  paymentMethod: PaymentMethod | null;
  cart: CartItem[];
  subtotal: number;
  deliveryFee: number;
  orderTotal: number;
};

function normalizeCheckoutDetails(
  details: StoredCheckoutDetails,
): NormalizedCheckoutDetails {
  return {
    customer: details.customer,

    customerAccount: details.customerAccount ?? {
      signedIn: false,
      email: details.customer.email ?? "",
      savedAddressId: null,
    },

    phoneCountry: details.phoneCountry ?? null,

    coupon: details.coupon ?? null,

    discountAmount: Math.max(
      0,
      Number(details.discountAmount ?? details.coupon?.discountAmount ?? 0) ||
        0,
    ),

    paymentMethod:
      details.paymentMethod === "cash_on_delivery" ? "cash_on_delivery" : null,

    cart: details.cart,

    subtotal: Number(details.subtotal) || 0,

    deliveryFee: Number(details.deliveryFee) || 0,

    orderTotal: Number(details.orderTotal) || 0,
  };
}

function formatDeliveryLocation(customer: CustomerDetails) {
  return [customer.area, customer.city, customer.country]
    .filter(Boolean)
    .join(", ");
}

export default function CheckoutReviewPage() {
  const router = useRouter();

  const { items, subtotal, isCartReady } = useCart();

  const [checkoutDetails, setCheckoutDetails] =
    useState<NormalizedCheckoutDetails | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);

  useEffect(() => {
    try {
      const storedDetails = window.sessionStorage.getItem(
        "nita-style-checkout-details",
      );

      if (!storedDetails) {
        setErrorMessage("Your checkout information could not be found.");

        setIsLoading(false);
        return;
      }

      const parsedDetails = JSON.parse(storedDetails) as StoredCheckoutDetails;

      if (!parsedDetails?.customer || !Array.isArray(parsedDetails.cart)) {
        setErrorMessage("Your checkout information is incomplete.");

        setIsLoading(false);
        return;
      }

      const normalizedDetails = normalizeCheckoutDetails(parsedDetails);

      setCheckoutDetails(normalizedDetails);

      setSelectedPaymentMethod(normalizedDetails.paymentMethod);

      setIsLoading(false);
    } catch {
      setErrorMessage("Your checkout information could not be loaded.");

      setIsLoading(false);
    }
  }, []);

  const reviewItems = useMemo(() => {
    if (items.length > 0) {
      return items;
    }

    return checkoutDetails?.cart ?? [];
  }, [items, checkoutDetails]);

  const reviewSubtotal = useMemo(() => {
    if (items.length > 0) {
      return subtotal;
    }

    return checkoutDetails?.subtotal ?? 0;
  }, [items, subtotal, checkoutDetails]);

  const deliveryFee = checkoutDetails?.deliveryFee ?? 0;

  const couponSubtotalMatches =
    Math.abs(reviewSubtotal - (checkoutDetails?.subtotal ?? reviewSubtotal)) <
    0.009;

  const reviewCoupon = couponSubtotalMatches
    ? (checkoutDetails?.coupon ?? null)
    : null;

  const reviewDiscountAmount = reviewCoupon
    ? Math.max(
        0,
        Math.min(
          checkoutDetails?.discountAmount ?? reviewCoupon.discountAmount ?? 0,
          reviewSubtotal,
        ),
      )
    : 0;

  const reviewTotal = Math.max(
    0,
    reviewSubtotal - reviewDiscountAmount + deliveryFee,
  );

  const reviewItemCount = reviewItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  function continueToOrderSubmission() {
    if (!checkoutDetails) {
      setErrorMessage("Your checkout information is missing.");

      return;
    }

    if (reviewItems.length === 0) {
      setErrorMessage("Your cart is empty.");

      return;
    }

    if (!selectedPaymentMethod) {
      setErrorMessage("Please select Cash on Delivery before continuing.");

      document
        .getElementById("payment-methods")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });

      return;
    }

    const updatedCheckoutDetails: NormalizedCheckoutDetails = {
      ...checkoutDetails,

      customerAccount: {
        ...checkoutDetails.customerAccount,

        email:
          checkoutDetails.customerAccount.email ||
          checkoutDetails.customer.email,
      },

      coupon: reviewCoupon,
      discountAmount: reviewDiscountAmount,
      paymentMethod: selectedPaymentMethod,

      cart: reviewItems,
      subtotal: reviewSubtotal,
      deliveryFee,
      orderTotal: reviewTotal,
    };

    window.sessionStorage.setItem(
      "nita-style-checkout-details",
      JSON.stringify(updatedCheckoutDetails),
    );

    router.push("/checkout/place-order");
  }

  if (isLoading || !isCartReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-black">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black/15 border-t-black" />

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
            Loading order review
          </p>
        </div>
      </main>
    );
  }

  const customer = checkoutDetails?.customer;

  const customerAccount = checkoutDetails?.customerAccount;

  const isSavedAddress = Boolean(
    customerAccount?.signedIn && customerAccount.savedAddressId,
  );

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-black">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto grid min-h-[76px] max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-8 lg:px-12">
          <Link
            href="/checkout"
            className="inline-flex w-fit items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-black/50 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />

            <span className="hidden sm:inline">Edit checkout</span>
          </Link>

          <Link
            href="/"
            className="text-center text-lg font-semibold uppercase tracking-[0.22em] sm:text-xl"
          >
            Nita Style
          </Link>

          <div className="justify-self-end">
            <CartButton />
          </div>
        </div>
      </header>

      <CheckoutProgress currentStep={2} />

      <section className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        <div className="mb-8 border-b border-black/10 pb-8 sm:mb-12">
          <div className="flex items-center gap-2 text-emerald-700">
            <LockKeyhole className="h-4 w-4" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
              Secure order review
            </p>
          </div>

          <h1 className="mt-4 text-4xl font-semibold uppercase leading-none tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            Review your order
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-black/50 sm:text-base">
            Confirm your products, contact information, and delivery address
            before submitting the order.
          </p>
        </div>

        {errorMessage ? (
          <div
            role="alert"
            className="mb-8 border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        {!checkoutDetails || !customer ? (
          <div className="flex min-h-[440px] flex-col items-center justify-center border border-dashed border-black/15 bg-white px-6 text-center">
            <ShoppingBag className="h-9 w-9 text-black/25" />

            <h2 className="mt-6 text-2xl font-semibold">
              Checkout details unavailable
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-black/45">
              Return to checkout and enter your contact and delivery information
              again.
            </p>

            <Link
              href="/checkout"
              className="mt-7 border border-black bg-black px-7 py-4 text-xs font-semibold uppercase tracking-[0.17em] !text-white transition hover:bg-white hover:!text-black"
            >
              Return to checkout
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-10">
            <div className="min-w-0 space-y-6 sm:space-y-8">
              {customerAccount?.signedIn ? (
                <section className="border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Customer account linked
                      </p>

                      <h2 className="mt-2 text-lg font-semibold">
                        This order will be connected to your account
                      </h2>

                      <p className="mt-2 break-all text-sm text-emerald-900/60">
                        {customerAccount.email || customer.email}
                      </p>
                    </div>

                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  </div>
                </section>
              ) : (
                <section className="border border-black/10 bg-white">
                  <div className="px-5 py-5 sm:px-6">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/40">
                      Guest order
                    </p>

                    <p className="mt-2 text-sm leading-6 text-black/55">
                      This order is being submitted without a signed-in customer
                      account.
                    </p>
                  </div>
                </section>
              )}

              <section className="border border-black/10 bg-white">
                <div className="flex items-center justify-between border-b border-black/10 px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                      Customer
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
                      Contact information
                    </h2>
                  </div>

                  <User className="h-5 w-5 text-black/35" />
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="border border-black/10 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/40">
                      Full name
                    </p>

                    <p className="mt-3 font-semibold">
                      {customer.firstName} {customer.lastName}
                    </p>
                  </div>

                  <div className="border border-black/10 p-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-black/35" />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Email address
                      </p>
                    </div>

                    <p className="mt-3 break-all text-sm font-semibold">
                      {customer.email}
                    </p>
                  </div>

                  <div className="border border-black/10 p-4 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-black/35" />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-black/40">
                        Phone number
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{customer.phone}</p>

                      {checkoutDetails.phoneCountry ? (
                        <span className="border border-black/10 bg-black/[0.025] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-black/45">
                          {checkoutDetails.phoneCountry.flag}{" "}
                          {checkoutDetails.phoneCountry.country}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="border border-black/10 bg-white">
                <div className="flex items-center justify-between border-b border-black/10 px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                      Delivery
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
                      Delivery address
                    </h2>
                  </div>

                  <MapPin className="h-5 w-5 text-black/35" />
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div
                    className={`border p-5 ${
                      isSavedAddress ? "border-black" : "border-black/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
                        {customer.address}
                      </p>

                      <span
                        className={`px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] ${
                          isSavedAddress
                            ? "bg-black text-white"
                            : "border border-black/10 bg-black/[0.025] text-black/45"
                        }`}
                      >
                        {isSavedAddress
                          ? "Saved account address"
                          : "Order-only address"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-black/55">
                      {formatDeliveryLocation(customer)}
                    </p>

                    {customer.building || customer.floor ? (
                      <p className="mt-3 text-sm leading-6 text-black/55">
                        {customer.building ? (
                          <>Building: {customer.building}</>
                        ) : null}

                        {customer.building && customer.floor ? " · " : null}

                        {customer.floor ? (
                          <>Floor or apartment: {customer.floor}</>
                        ) : null}
                      </p>
                    ) : null}
                  </div>

                  {customer.deliveryNotes ? (
                    <div className="border border-black/10 bg-black/[0.02] p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
                        Delivery notes
                      </p>

                      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-black/60">
                        {customer.deliveryNotes}
                      </p>
                    </div>
                  ) : null}

                  <Link
                    href="/checkout"
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-black/45 transition hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Edit delivery information
                  </Link>
                </div>
              </section>

              <section
                id="payment-methods"
                className="scroll-mt-8 border border-black/10 bg-white"
              >
                <div className="border-b border-black/10 px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                    Payment
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
                    Choose a payment method
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-black/45">
                    Select how you want to pay for this order.
                  </p>
                </div>

                <div className="space-y-3 p-5 sm:p-6">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod("cash_on_delivery");
                      setErrorMessage("");
                    }}
                    aria-pressed={selectedPaymentMethod === "cash_on_delivery"}
                    className={`flex w-full items-center gap-4 border p-4 text-left transition sm:p-5 ${
                      selectedPaymentMethod === "cash_on_delivery"
                        ? "border-black bg-black/[0.025]"
                        : "border-black/15 hover:border-black/40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selectedPaymentMethod === "cash_on_delivery"
                          ? "border-black"
                          : "border-black/25"
                      }`}
                    >
                      {selectedPaymentMethod === "cash_on_delivery" ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-black" />
                      ) : null}
                    </span>

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-black text-white">
                      <Banknote className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        Cash on Delivery
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-black/45">
                        Pay in cash when your order is delivered.
                      </span>
                    </span>

                    <span className="hidden shrink-0 bg-black px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-white sm:block">
                      Available
                    </span>
                  </button>

                  <div
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center gap-4 border border-black/10 bg-black/[0.02] p-4 opacity-60 sm:p-5"
                  >
                    <span className="h-5 w-5 shrink-0 rounded-full border border-black/25" />

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-black/10 bg-white">
                      <WalletCards className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        Whish Money
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-black/45">
                        Pay through your Whish Money wallet.
                      </span>
                    </span>

                    <span className="hidden shrink-0 border border-black/10 bg-white px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/45 sm:block">
                      Coming soon
                    </span>
                  </div>

                  <div
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-center gap-4 border border-black/10 bg-black/[0.02] p-4 opacity-60 sm:p-5"
                  >
                    <span className="h-5 w-5 shrink-0 rounded-full border border-black/25" />

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-black/10 bg-white">
                      <CreditCard className="h-5 w-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        Credit or Debit Card
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-black/45">
                        Online Visa and Mastercard payments.
                      </span>
                    </span>

                    <span className="hidden shrink-0 border border-black/10 bg-white px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/45 sm:block">
                      Coming soon
                    </span>
                  </div>

                  {!selectedPaymentMethod ? (
                    <p className="text-xs font-medium text-amber-700">
                      Select Cash on Delivery to continue.
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="border border-black/10 bg-white">
                <div className="border-b border-black/10 px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                    Products
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
                    Order items
                  </h2>
                </div>

                <div className="divide-y divide-black/10">
                  {reviewItems.map((item) => (
                    <article
                      key={item.cartItemId}
                      className="grid grid-cols-[90px_minmax(0,1fr)] gap-5 p-5 sm:grid-cols-[110px_minmax(0,1fr)] sm:p-6"
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
                            <ShoppingBag className="h-6 w-6 text-black/20" />
                          </div>
                        )}
                      </Link>

                      <div className="flex min-w-0 flex-col justify-between gap-4">
                        <div>
                          <Link
                            href={`/shop/${item.slug}`}
                            className="text-base font-semibold transition hover:opacity-60"
                          >
                            {item.name}
                          </Link>

                          <p className="mt-2 text-sm text-black/45">
                            Size {item.size}
                          </p>

                          <p className="mt-1 text-sm text-black/45">
                            Quantity {item.quantity}
                          </p>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                          <p className="text-xs text-black/40">
                            ${item.unitPrice.toFixed(2)} each
                          </p>

                          <p className="text-base font-semibold">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <section className="overflow-hidden border border-black/10 bg-white">
                <div className="border-b border-black/10 px-5 py-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                    Final review
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">Order summary</h2>
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black/50">Products</span>

                    <span className="font-semibold">{reviewItemCount}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black/50">Subtotal</span>

                    <span className="font-semibold">
                      ${reviewSubtotal.toFixed(2)}
                    </span>
                  </div>

                  {reviewCoupon && reviewDiscountAmount > 0 ? (
                    <div className="flex items-center justify-between gap-4 text-sm text-emerald-700">
                      <span>
                        Coupon{" "}
                        <span className="font-mono font-semibold uppercase tracking-[0.08em]">
                          {reviewCoupon.code}
                        </span>
                      </span>

                      <span className="font-semibold">
                        −$
                        {reviewDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-black/50">Delivery</span>

                    <span className="text-right text-black/45">
                      Confirmed later
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-black/50">Payment</span>

                    <span className="text-right font-medium">
                      {selectedPaymentMethod === "cash_on_delivery"
                        ? "Cash on Delivery"
                        : "Not selected"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-black/10 pt-4">
                    <span className="font-semibold">Current total</span>

                    <span className="text-xl font-semibold">
                      ${reviewTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                      <p className="text-xs leading-5 text-emerald-800">
                        Your contact information, delivery address, and products
                        are ready for submission.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={continueToOrderSubmission}
                    disabled={!selectedPaymentMethod}
                    className="flex min-h-14 w-full items-center justify-center gap-3 bg-black px-6 py-5 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#242424] disabled:cursor-not-allowed disabled:bg-black/25"
                  >
                    Continue to place order
                    <CheckCircle2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-start justify-center gap-2 text-center text-[11px] leading-5 text-black/40">
                    <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                    <p>Cash will be collected when your order is delivered.</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
