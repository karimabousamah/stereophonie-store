"use client";

import {
  Check,
  CheckCircle2,
  Heart,
  LoaderCircle,
  Mail,
  Minus,
  Package,
  Plus,
  Ruler,
  ShoppingBag,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import {
  type WishlistProduct,
  useWishlist,
} from "@/components/wishlist/wishlist-provider";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type ProductVariant = {
  id: string;
  size: string;
  sku: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

type ProductPurchaseControlsProps = {
  product: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    description: string | null;
    categoryName: string;
    is_featured: boolean | null;
    is_trending: boolean | null;
    is_new_arrival: boolean | null;
    images: WishlistProduct["images"];
    variants: WishlistProduct["variants"];
  };
  variants: ProductVariant[];
  openStockNotification?: boolean;
};

type StockAlertResponse = {
  success?: boolean;
  requiresEmail?: boolean;
  message?: string;
};

function variantIsPurchasable(variant: ProductVariant) {
  return (
    (variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock") &&
    variant.stock_quantity > 0
  );
}

function isWholeProductMode(variants: ProductVariant[]) {
  if (variants.length === 0) {
    return true;
  }

  if (variants.length !== 1) {
    return false;
  }

  const normalized = variants[0].size
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  return [
    "",
    "os",
    "onesize",
    "onesizefitsall",
    "universal",
    "nosize",
    "na",
    "none",
  ].includes(normalized);
}

function isValidEmail(value: string) {
  return (
    value.length >= 5 &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function getStatus(variant: ProductVariant) {
  if (variant.availability_status === "coming_soon") {
    return {
      label: "Coming soon",
      detail: "This option will be available soon.",
      dot: "bg-sky-600",
      text: "text-sky-700",
      panel: "border-sky-200 bg-sky-50",
    };
  }

  if (
    variant.availability_status === "out_of_stock" ||
    variant.stock_quantity < 1
  ) {
    return {
      label: "Out of stock",
      detail: "Request a notification when it returns.",
      dot: "bg-red-600",
      text: "text-red-700",
      panel: "border-red-200 bg-red-50",
    };
  }

  if (
    variant.availability_status === "low_stock" ||
    variant.stock_quantity <= variant.low_stock_threshold
  ) {
    return {
      label: "Limited availability",
      detail: "Stock is limited.",
      dot: "bg-amber-500",
      text: "text-amber-700",
      panel: "border-amber-200 bg-amber-50",
    };
  }

  return {
    label: "Available",
    detail: "Ready to order.",
    dot: "bg-emerald-600",
    text: "text-emerald-700",
    panel: "border-emerald-200 bg-emerald-50",
  };
}

function getPrice(variant: ProductVariant) {
  const regularPrice =
    typeof variant.regular_price === "number" ? variant.regular_price : null;

  const salePrice =
    typeof variant.sale_price === "number" ? variant.sale_price : null;

  return {
    unitPrice: salePrice ?? regularPrice ?? 0,
    regularPrice,
    salePrice,
  };
}

export default function ProductPurchaseControls({
  product,
  variants,
  openStockNotification = false,
}: ProductPurchaseControlsProps) {
  const { addItem } = useCart();

  const {
    hydrated: wishlistHydrated,
    isWishlisted,
    toggleProduct,
  } = useWishlist();

  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [quantity, setQuantity] = useState(1);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [notificationLoading, setNotificationLoading] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [guestEmail, setGuestEmail] = useState("");

  const [guestEmailError, setGuestEmailError] = useState("");

  const notifyLinkHandled = useRef(false);

  const orderedVariants = useMemo(() => {
    const sizeOrder = [
      "XXS",
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "XXXL",
      "ONE SIZE",
    ];

    return [...variants].sort((first, second) => {
      const firstSize = first.size.trim().toUpperCase();

      const secondSize = second.size.trim().toUpperCase();

      const firstIndex = sizeOrder.indexOf(firstSize);

      const secondIndex = sizeOrder.indexOf(secondSize);

      if (firstIndex === -1 && secondIndex === -1) {
        return firstSize.localeCompare(secondSize, undefined, {
          numeric: true,
        });
      }

      if (firstIndex === -1) {
        return 1;
      }

      if (secondIndex === -1) {
        return -1;
      }

      return firstIndex - secondIndex;
    });
  }, [variants]);

  const wholeProductMode = useMemo(
    () => isWholeProductMode(orderedVariants),
    [orderedVariants],
  );

  const selectedVariant =
    orderedVariants.find((variant) => variant.id === selectedVariantId) ?? null;

  const selectedIsPurchasable = selectedVariant
    ? variantIsPurchasable(selectedVariant)
    : false;

  const selectedPrice = selectedVariant ? getPrice(selectedVariant) : null;

  const maximumQuantity =
    selectedVariant && selectedIsPurchasable
      ? Math.max(1, selectedVariant.stock_quantity)
      : 1;

  const productIsUnavailable =
    orderedVariants.length === 0 ||
    orderedVariants.every((variant) => !variantIsPurchasable(variant));

  const wishlistProduct: WishlistProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: product.categoryName,
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    images: product.images,
    variants: product.variants,
  };

  const wishlisted = wishlistHydrated && isWishlisted(product.id);

  useEffect(() => {
    if (orderedVariants.length === 1 && !selectedVariantId) {
      setSelectedVariantId(orderedVariants[0].id);
    }
  }, [orderedVariants, selectedVariantId]);

  useEffect(() => {
    setQuantity(1);
    setMessage("");
    setMessageType("");
  }, [selectedVariantId]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    const modalOpen = emailModalOpen || sizeGuideOpen;

    if (!modalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setEmailModalOpen(false);
      setSizeGuideOpen(false);
      setGuestEmailError("");
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [emailModalOpen, sizeGuideOpen]);

  useEffect(() => {
    if (!openStockNotification || notifyLinkHandled.current) {
      return;
    }

    notifyLinkHandled.current = true;

    const unavailableVariant = orderedVariants.find(
      (variant) => !variantIsPurchasable(variant),
    );

    if (!wholeProductMode && unavailableVariant) {
      setSelectedVariantId(unavailableVariant.id);
    }

    window.setTimeout(() => {
      document.getElementById("stock-notification-controls")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);

    if (wholeProductMode && !productIsUnavailable) {
      setMessage("This product is currently available.");
      setMessageType("success");
      return;
    }

    if (!wholeProductMode && !unavailableVariant) {
      setMessage("All available sizes can currently be purchased.");
      setMessageType("success");
      return;
    }

    setEmailModalOpen(true);
  }, [
    openStockNotification,
    orderedVariants,
    productIsUnavailable,
    wholeProductMode,
  ]);

  function selectVariant(variant: ProductVariant) {
    setSelectedVariantId(variant.id);
  }

  function addToCart() {
    if (!selectedVariant || !selectedIsPurchasable) {
      setMessage(
        wholeProductMode
          ? "This product is currently unavailable."
          : "Please select an available size.",
      );
      setMessageType("error");
      return;
    }

    const price = getPrice(selectedVariant);

    let lastResult = {
      success: false,
      message: "The product could not be added.",
    };

    for (let index = 0; index < quantity; index += 1) {
      lastResult = addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl,
        size: selectedVariant.size,
        variantId: selectedVariant.id,
        unitPrice: price.unitPrice,
        regularPrice: price.regularPrice,
        maximumQuantity: selectedVariant.stock_quantity,
      });

      if (!lastResult.success) {
        break;
      }
    }

    setMessage(
      lastResult.success
        ? `${quantity} ${quantity === 1 ? "item" : "items"} added to your cart.`
        : lastResult.message,
    );

    setMessageType(lastResult.success ? "success" : "error");
  }

  async function requestNotification(email?: string) {
    if (!wholeProductMode && !selectedVariant) {
      setMessage("Please select an unavailable size first.");
      setMessageType("error");
      return;
    }

    if (selectedVariant && variantIsPurchasable(selectedVariant)) {
      setMessage("This size is currently available.");
      setMessageType("error");
      return;
    }

    setNotificationLoading(true);
    setGuestEmailError("");

    try {
      const requestBody: {
        productId: string;
        variantId: string | null;
        email?: string;
      } = {
        productId: product.id,
        variantId: wholeProductMode ? null : (selectedVariant?.id ?? null),
      };

      if (email) {
        requestBody.email = email;
      }

      const response = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = (await response.json()) as StockAlertResponse;

      if (data.requiresEmail) {
        setEmailModalOpen(true);
        setMessage("");
        setMessageType("");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? "The notification request could not be submitted.",
        );
      }

      setEmailModalOpen(false);
      setGuestEmail("");
      setGuestEmailError("");

      setMessage(
        data.message ??
          "You will be notified when this product becomes available.",
      );

      setMessageType("success");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "The notification request could not be submitted.";

      if (email) {
        setGuestEmailError(errorMessage);
      } else {
        setMessage(errorMessage);
        setMessageType("error");
      }
    } finally {
      setNotificationLoading(false);
    }
  }

  async function submitGuestEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = guestEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setGuestEmailError("Please enter a valid email address.");
      return;
    }

    await requestNotification(normalizedEmail);
  }

  return (
    <>
      <div
        id="stock-notification-controls"
        className="border-b border-black/10 py-7"
      >
        {!wholeProductMode ? (
          <>
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Select size
                </p>

                <p className="mt-2 text-xs leading-5 text-black/40">
                  Select a size to view its exact price and availability.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="flex shrink-0 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45 underline underline-offset-4 transition hover:text-black"
              >
                <Ruler className="h-3.5 w-3.5" />
                Size guide
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:flex sm:flex-wrap">
              {orderedVariants.map((variant) => {
                const purchasable = variantIsPurchasable(variant);

                const selected = selectedVariantId === variant.id;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => selectVariant(variant)}
                    aria-pressed={selected}
                    className={`relative min-h-14 min-w-0 border px-4 py-3 text-center transition duration-300 sm:min-w-[82px] ${
                      selected
                        ? "border-black bg-black text-white"
                        : purchasable
                          ? "border-black/15 bg-white text-black hover:border-black"
                          : "border-black/15 bg-black/[0.025] text-black/40 hover:border-black hover:text-black"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2 text-sm font-semibold">
                      {variant.size}

                      {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>

                    {!purchasable && !selected ? (
                      <span className="absolute left-2 right-2 top-1/2 h-px -rotate-12 bg-black/20" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">
              Availability
            </p>

            <p className="mt-2 text-xs leading-5 text-black/40">
              This product does not require a size selection.
            </p>
          </div>
        )}

        {selectedVariant && selectedPrice ? (
          <div className="mt-5 border-y border-black/10 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
              Selected option
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                {!wholeProductMode ? (
                  <p className="text-sm font-semibold">
                    Size {selectedVariant.size}
                  </p>
                ) : (
                  <p className="text-sm font-semibold">One size</p>
                )}

                {selectedVariant.sku ? (
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-black/35">
                    SKU {selectedVariant.sku}
                  </p>
                ) : null}
              </div>

              <div className="flex items-end gap-3">
                <p className="text-2xl font-semibold tracking-[-0.025em]">
                  ${selectedPrice.unitPrice.toFixed(2)}
                </p>

                {selectedPrice.salePrice !== null &&
                selectedPrice.regularPrice !== null &&
                selectedPrice.salePrice < selectedPrice.regularPrice ? (
                  <p className="pb-0.5 text-sm text-black/35 line-through">
                    ${selectedPrice.regularPrice.toFixed(2)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {selectedVariant ? (
          <div
            className={`mt-4 border px-4 py-3 ${
              getStatus(selectedVariant).panel
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  getStatus(selectedVariant).dot
                }`}
              />

              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  getStatus(selectedVariant).text
                }`}
              >
                {getStatus(selectedVariant).label}
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-black/50">
              {getStatus(selectedVariant).detail}
            </p>
          </div>
        ) : wholeProductMode ? (
          <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700">
              Currently unavailable
            </p>
          </div>
        ) : null}

        {selectedIsPurchasable ? (
          <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">
                Quantity
              </p>

              <div className="mt-3 flex h-12 items-center border border-black/15">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-full w-12 items-center justify-center transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="flex h-full min-w-14 items-center justify-center border-x border-black/15 px-4 text-sm font-semibold">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(maximumQuantity, current + 1),
                    )
                  }
                  disabled={quantity >= maximumQuantity}
                  aria-label="Increase quantity"
                  className="flex h-full w-12 items-center justify-center transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="pb-1 text-xs text-black/40">
              Maximum {maximumQuantity}
            </p>
          </div>
        ) : null}

        {message ? (
          <div
            role="status"
            className={`mt-4 flex items-center gap-3 border px-4 py-3 text-sm ${
              messageType === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : null}

            {message}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {wholeProductMode && productIsUnavailable ? (
            <button
              type="button"
              onClick={() => requestNotification()}
              disabled={notificationLoading}
              className="flex min-h-14 w-full items-center justify-center gap-3 border border-black bg-white px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              {notificationLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}

              {notificationLoading
                ? "Submitting..."
                : "Notify me when available"}
            </button>
          ) : selectedIsPurchasable ? (
            <button
              type="button"
              onClick={addToCart}
              className="flex min-h-14 w-full items-center justify-center gap-3 bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition duration-300 hover:bg-[#242424]"
            >
              <ShoppingBag className="h-4 w-4" />
              Add {quantity > 1 ? `${quantity} items` : "to cart"}
            </button>
          ) : !selectedVariant ? (
            <button
              type="button"
              disabled
              className="flex min-h-14 w-full cursor-not-allowed items-center justify-center gap-3 bg-black/10 px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-black/40"
            >
              <Package className="h-4 w-4" />
              Select a size
            </button>
          ) : (
            <button
              type="button"
              onClick={() => requestNotification()}
              disabled={notificationLoading}
              className="flex min-h-14 w-full items-center justify-center gap-3 border border-black bg-white px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              {notificationLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}

              {notificationLoading ? "Submitting..." : "Notify me"}
            </button>
          )}

          <button
            type="button"
            disabled={!wishlistHydrated}
            onClick={() => toggleProduct(wishlistProduct)}
            aria-pressed={wishlisted}
            className={`flex min-h-14 w-full items-center justify-center gap-3 border px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] transition duration-300 disabled:cursor-wait disabled:opacity-50 ${
              wishlisted
                ? "border-black bg-black text-white hover:bg-[#242424]"
                : "border-black/15 bg-white text-black hover:border-black hover:bg-black hover:text-white"
            }`}
          >
            <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />

            {wishlisted ? "Saved to wishlist" : "Add to wishlist"}
          </button>
        </div>
      </div>

      {sizeGuideOpen ? (
        <div
          className="fixed inset-0 z-[2147483010] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSizeGuideOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="size-guide-title"
            className="relative w-full max-w-2xl bg-white p-6 shadow-2xl sm:p-9"
          >
            <button
              type="button"
              onClick={() => setSizeGuideOpen(false)}
              aria-label="Close size guide"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center border border-black/10 transition hover:border-black hover:bg-black hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <Ruler className="h-6 w-6" />

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
              Fit information
            </p>

            <h2
              id="size-guide-title"
              className="mt-3 text-3xl font-semibold tracking-[-0.04em]"
            >
              Size guide
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-6 text-black/50">
              Measurements are general guidelines. Individual products may fit
              differently depending on their material and cut.
            </p>

            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-y border-black/15">
                    <th className="px-3 py-4 text-[10px] uppercase tracking-[0.14em]">
                      Size
                    </th>
                    <th className="px-3 py-4 text-[10px] uppercase tracking-[0.14em]">
                      Bust
                    </th>
                    <th className="px-3 py-4 text-[10px] uppercase tracking-[0.14em]">
                      Waist
                    </th>
                    <th className="px-3 py-4 text-[10px] uppercase tracking-[0.14em]">
                      Hips
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/10 text-black/55">
                  {[
                    ["XS", "80–84", "62–66", "86–90"],
                    ["S", "84–88", "66–70", "90–94"],
                    ["M", "88–92", "70–74", "94–98"],
                    ["L", "92–98", "74–80", "98–104"],
                    ["XL", "98–104", "80–86", "104–110"],
                  ].map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, index) => (
                        <td
                          key={cell}
                          className={`px-3 py-4 ${
                            index === 0 ? "font-semibold text-black" : ""
                          }`}
                        >
                          {cell}
                          {index > 0 ? " cm" : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-5 text-xs leading-5 text-black/40">
              For the most accurate recommendation, compare these measurements
              with a similar item that fits you well.
            </p>
          </div>
        </div>
      ) : null}

      {emailModalOpen ? (
        <div
          className="fixed inset-0 z-[2147483010] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEmailModalOpen(false);
              setGuestEmailError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-alert-title"
            className="relative w-full max-w-md bg-white p-6 shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => {
                setEmailModalOpen(false);
                setGuestEmailError("");
              }}
              disabled={notificationLoading}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center border border-black/10 text-black/50 transition hover:border-black hover:text-black disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center bg-black text-white">
              <Mail className="h-5 w-5" />
            </div>

            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
              Stock notification
            </p>

            <h2
              id="stock-alert-title"
              className="mt-3 pr-10 text-3xl font-semibold tracking-[-0.04em]"
            >
              Enter your email
            </h2>

            <p className="mt-4 text-sm leading-6 text-black/50">
              We will email you when{" "}
              <span className="font-semibold text-black">{product.name}</span>
              {wholeProductMode
                ? " becomes available again."
                : ` in size ${
                    selectedVariant?.size ?? ""
                  } becomes available again.`}
            </p>

            <form onSubmit={submitGuestEmail} className="mt-7">
              <label
                htmlFor="stock-alert-email"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50"
              >
                Email address
              </label>

              <input
                id="stock-alert-email"
                type="email"
                autoFocus
                autoComplete="email"
                required
                value={guestEmail}
                onChange={(event) => {
                  setGuestEmail(event.target.value);
                  setGuestEmailError("");
                }}
                placeholder="you@example.com"
                className="mt-3 min-h-14 w-full border border-black/15 bg-white px-4 text-sm outline-none transition placeholder:text-black/25 focus:border-black"
              />

              {guestEmailError ? (
                <p className="mt-3 text-sm text-red-600">{guestEmailError}</p>
              ) : null}

              <button
                type="submit"
                disabled={notificationLoading}
                className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 bg-black px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#242424] disabled:cursor-wait disabled:opacity-60"
              >
                {notificationLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}

                {notificationLoading ? "Submitting..." : "Notify me"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs leading-5 text-black/35">
              No account is required. Your email will only be used for this
              stock notification.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
