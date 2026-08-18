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
  ShoppingBag,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

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
  variant_name: string | null;
  attributes: Record<string, string> | null;
  sku: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

type Props = {
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

const labels: Record<string, string> = {
  storage: "Storage",
  ram: "Memory",
  memory: "Memory",
  processor: "Processor",
  cpu: "Processor",
  gpu: "Graphics",
  graphics: "Graphics",
  color: "Colour",
  colour: "Colour",
  connectivity: "Connectivity",
  network: "Network",
  edition: "Edition",
  model: "Model",
  generation: "Generation",
  capacity: "Capacity",
  screen: "Display",
  display: "Display",
  battery: "Battery",
  os: "Operating system",
  operating_system: "Operating system",
};

function variantName(variant: ProductVariant) {
  return (
    String(variant.variant_name ?? "").trim() ||
    String(variant.size ?? "").trim() ||
    "Standard"
  );
}

function formatLabel(key: string) {
  const normalized = key.toLowerCase().trim();

  return (
    labels[normalized] ||
    key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function variantAttributes(variant: ProductVariant) {
  if (
    !variant.attributes ||
    typeof variant.attributes !== "object" ||
    Array.isArray(variant.attributes)
  ) {
    return [];
  }

  return Object.entries(variant.attributes)
    .map(([key, value]) => ({
      key,
      value: String(value ?? "").trim(),
    }))
    .filter((item) => item.key && item.value);
}

function purchasable(variant: ProductVariant) {
  return (
    variant.stock_quantity > 0 &&
    (variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock")
  );
}

function getPrice(variant: ProductVariant) {
  const regular =
    typeof variant.regular_price === "number" ? variant.regular_price : null;

  const sale =
    typeof variant.sale_price === "number" ? variant.sale_price : null;

  return {
    current: sale ?? regular ?? 0,
    regular,
    sale,
  };
}

function statusFor(variant: ProductVariant) {
  if (
    variant.availability_status === "out_of_stock" ||
    variant.stock_quantity < 1
  ) {
    return {
      className: "is-offline",
      title: "OUT OF STOCK",
      text: "Use the stock alert to be notified when it returns.",
    };
  }

  if (variant.availability_status === "coming_soon") {
    return {
      className: "is-waiting",
      title: "COMING SOON",
      text: "This configuration is not available for ordering yet.",
    };
  }

  if (
    variant.availability_status === "low_stock" ||
    variant.stock_quantity <= variant.low_stock_threshold
  ) {
    return {
      className: "is-low",
      title: "LOW STOCK",
      text: "Only a limited number of units remain.",
    };
  }

  return {
    className: "is-ready",
    title: "IN STOCK",
    text: "Ready to add to your cart.",
  };
}

function validEmail(value: string) {
  return (
    value.length >= 5 &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export default function ProductPurchaseControls({
  product,
  variants,
  openStockNotification = false,
}: Props) {
  const router = useRouter();

  const { addItem, openCart } = useCart();

  const {
    hydrated: wishlistReady,
    isWishlisted,
    toggleProduct,
  } = useWishlist();

  const ordered = useMemo(
    () =>
      [...variants].sort((first, second) =>
        variantName(first).localeCompare(variantName(second), undefined, {
          numeric: true,
        }),
      ),
    [variants],
  );

  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [notificationLoading, setNotificationLoading] = useState(false);

  const selected = ordered.find((variant) => variant.id === selectedId) ?? null;

  const selectedAvailable = selected ? purchasable(selected) : false;
  const selectedPrice = selected ? getPrice(selected) : null;
  const selectedStatus = selected ? statusFor(selected) : null;
  const attributes = selected ? variantAttributes(selected) : [];

  const maximumQuantity =
    selected && selectedAvailable ? Math.max(1, selected.stock_quantity) : 1;

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

  const wishlisted = wishlistReady && isWishlisted(product.id);

  useEffect(() => {
    if (selectedId || !ordered.length) {
      return;
    }

    const preferred =
      ordered.find((variant) => purchasable(variant)) ?? ordered[0];

    setSelectedId(preferred.id);
  }, [ordered, selectedId]);

  useEffect(() => {
    setQuantity(1);
    setMessage("");
    setMessageType("");
  }, [selectedId]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!openStockNotification) {
      return;
    }

    const unavailable = ordered.find((variant) => !purchasable(variant));

    if (unavailable) {
      setSelectedId(unavailable.id);
      setEmailOpen(true);
    }
  }, [openStockNotification, ordered]);

  function addSelected(openCheckout: boolean) {
    if (!selected || !selectedAvailable || !selectedPrice) {
      setMessage("Select an available configuration first.");
      setMessageType("error");
      return;
    }

    let success = true;
    let lastMessage = "";

    for (let index = 0; index < quantity; index += 1) {
      const result = addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl,
        size: variantName(selected),
        variantId: selected.id,
        unitPrice: selectedPrice.current,
        regularPrice: selectedPrice.regular,
        maximumQuantity: selected.stock_quantity,
      });

      if (!result.success) {
        success = false;
        lastMessage = result.message;
        break;
      }
    }

    if (!success) {
      setMessage(lastMessage || "Could not add the product.");
      setMessageType("error");
      return;
    }

    setMessage(
      `${quantity} ${quantity === 1 ? "item" : "items"} added successfully.`,
    );

    setMessageType("success");

    if (openCheckout) {
      router.push("/checkout");
    } else {
      openCart();
    }
  }

  async function requestNotification(address?: string) {
    if (!selected || purchasable(selected)) {
      setMessage("Select an unavailable configuration first.");
      setMessageType("error");
      return;
    }

    setNotificationLoading(true);
    setEmailError("");

    try {
      const response = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          variantId: selected.id,
          ...(address ? { email: address } : {}),
        }),
      });

      const data = (await response.json()) as StockAlertResponse;

      if (data.requiresEmail) {
        setEmailOpen(true);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Stock alert could not be created.");
      }

      setEmailOpen(false);
      setEmail("");

      setMessage(
        data.message ||
          "Stock alert enabled. We will email you when it returns.",
      );

      setMessageType("success");
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Stock alert could not be created.";

      if (address) {
        setEmailError(text);
      } else {
        setMessage(text);
        setMessageType("error");
      }
    } finally {
      setNotificationLoading(false);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalized = email.trim().toLowerCase();

    if (!validEmail(normalized)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    await requestNotification(normalized);
  }

  return (
    <>
      <section id="stock-notification-controls" className="st-buy17">
        <header className="st-buy17__header">
          <div>
            <span className="st-buy17__led" />
            ORDER CONSOLE
          </div>

          <small>PLAYER 1</small>
        </header>

        <div className="st-buy17__body">
          {ordered.length > 1 ? (
            <div className="st-buy17__section">
              <div className="st-buy17__section-title">
                <span>01</span>

                <div>
                  <strong>CHOOSE CONFIGURATION</strong>
                  <small>Select the exact version you want.</small>
                </div>
              </div>

              <div className="st-buy17__variants">
                {ordered.map((variant) => {
                  const active = variant.id === selectedId;
                  const ready = purchasable(variant);

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedId(variant.id)}
                      className={`${active ? "is-active" : ""} ${
                        ready ? "" : "is-unavailable"
                      }`}
                      aria-pressed={active}
                    >
                      <span>{variantName(variant)}</span>

                      {active ? <Check /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {selected && selectedPrice ? (
            <>
              <div className="st-buy17__selection">
                <div>
                  <small>SELECTED</small>
                  <strong>{variantName(selected)}</strong>

                  {selected.sku ? <span>SKU / {selected.sku}</span> : null}
                </div>

                <div className="st-buy17__selected-price">
                  <strong>${selectedPrice.current.toFixed(2)}</strong>

                  {selectedPrice.sale !== null &&
                  selectedPrice.regular !== null &&
                  selectedPrice.sale < selectedPrice.regular ? (
                    <del>${selectedPrice.regular.toFixed(2)}</del>
                  ) : null}
                </div>
              </div>

              {attributes.length ? (
                <div className="st-buy17__specs">
                  {attributes.map((attribute) => (
                    <div key={attribute.key}>
                      <small>{formatLabel(attribute.key)}</small>
                      <strong>{attribute.value}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedStatus ? (
                <div className={`st-buy17__status ${selectedStatus.className}`}>
                  <i />

                  <div>
                    <strong>{selectedStatus.title}</strong>
                    <span>{selectedStatus.text}</span>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {selectedAvailable ? (
            <div className="st-buy17__quantity">
              <div>
                <small>QUANTITY</small>

                <div className="st-buy17__stepper">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((value) => Math.max(1, value - 1))
                    }
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus />
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((value) =>
                        Math.min(maximumQuantity, value + 1),
                      )
                    }
                    disabled={quantity >= maximumQuantity}
                    aria-label="Increase quantity"
                  >
                    <Plus />
                  </button>
                </div>
              </div>

              <span>MAX {maximumQuantity}</span>
            </div>
          ) : null}

          {message ? (
            <div
              className={`st-buy17__message ${
                messageType === "success" ? "is-success" : "is-error"
              }`}
              role="status"
            >
              {messageType === "success" ? <CheckCircle2 /> : <Zap />}

              {message}
            </div>
          ) : null}

          <div className="st-buy17__actions">
            {selectedAvailable ? (
              <>
                <button
                  type="button"
                  className="st-buy17__cart"
                  onClick={() => addSelected(false)}
                >
                  <ShoppingBag />
                  <span>
                    <small>PRESS A</small>
                    ADD TO CART
                  </span>
                </button>

                <button
                  type="button"
                  className="st-buy17__buy"
                  onClick={() => addSelected(true)}
                >
                  <Zap />
                  <span>
                    <small>START</small>
                    BUY NOW
                  </span>
                </button>
              </>
            ) : selected ? (
              <button
                type="button"
                className="st-buy17__notify"
                disabled={notificationLoading}
                onClick={() => requestNotification()}
              >
                {notificationLoading ? (
                  <LoaderCircle className="is-spin" />
                ) : (
                  <Mail />
                )}
                ENABLE STOCK ALERT
              </button>
            ) : (
              <button type="button" className="st-buy17__disabled" disabled>
                <Package />
                SELECT A CONFIGURATION
              </button>
            )}

            <button
              type="button"
              className={`st-buy17__wishlist ${wishlisted ? "is-active" : ""}`}
              disabled={!wishlistReady}
              onClick={() => toggleProduct(wishlistProduct)}
              aria-pressed={wishlisted}
            >
              <Heart className={wishlisted ? "fill-current" : ""} />

              {wishlisted ? "SAVED TO WISHLIST" : "SAVE TO WISHLIST"}
            </button>
          </div>
        </div>
      </section>

      {emailOpen ? (
        <div
          className="st-buy17-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEmailOpen(false);
            }
          }}
        >
          <form className="st-buy17-modal__window" onSubmit={submitEmail}>
            <header>
              <div>
                <i />
                STOCK ALERT
              </div>

              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </header>

            <div className="st-buy17-modal__body">
              <Mail />

              <small>SYSTEM NOTIFICATION</small>

              <h2>GET A RESTOCK ALERT</h2>

              <p>
                Enter your email and Stereophonie will notify you when this
                configuration becomes available.
              </p>

              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError("");
                }}
              />

              {emailError ? (
                <span className="st-buy17-modal__error">{emailError}</span>
              ) : null}

              <button type="submit" disabled={notificationLoading}>
                {notificationLoading ? (
                  <LoaderCircle className="is-spin" />
                ) : (
                  <Mail />
                )}
                ENABLE ALERT
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
