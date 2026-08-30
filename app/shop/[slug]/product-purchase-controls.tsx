"use client";

import {
  canonicalizeProductColorwayName,
  productColorwayHex,
} from "@/lib/product-colorways";

import {
  Check,
  CheckCircle2,
  Bookmark,
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
  display_position?: number | null;
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

const configurationHierarchyKey = "__configuration_hierarchy";

const hiddenConfigurationAttributeKeys = new Set([
  configurationHierarchyKey,
  "color_hex",
  "colour_hex",
  "color_name",
  "colour_name",
  "band_color",
  "band_colour",
  "swatch",
  "swatch_hex",
  "hex",
  "image",
  "image_url",
]);

const attributePriority = [
  "color",
  "colour",
  "screen_size",
  "display_size",
  "size",
  "storage",
  "capacity",
  "memory",
  "ram",
  "processor",
  "connectivity",
  "sim",
  "edition",
  "model",
  "generation",
];

function normalizedAttributeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function attributesRecord(variant: ProductVariant) {
  if (
    !variant.attributes ||
    typeof variant.attributes !== "object" ||
    Array.isArray(variant.attributes)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(variant.attributes).map(([key, value]) => [
      normalizedAttributeKey(key),
      value,
    ]),
  );
}

function optionIdentity(value: string) {
  return value.trim().toLocaleLowerCase();
}

function persistedConfigurationHierarchy(variants: ProductVariant[]) {
  for (const variant of variants) {
    const record = attributesRecord(variant);

    const raw = record[configurationHierarchyKey];

    if (raw === null || raw === undefined || raw === "") {
      continue;
    }

    let parsed: unknown = raw;

    /*
     * Admin-created products historically stored the hierarchy as
     * a JSON string, while supplier-imported products can store it
     * directly as a JSON array.
     *
     * Support both representations so every product uses the same
     * storefront configurator.
     */
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
    }

    if (!Array.isArray(parsed)) {
      continue;
    }

    const keys = parsed
      .map((value) => normalizedAttributeKey(String(value ?? "")))
      .filter(
        (key, index, allKeys) =>
          Boolean(key) &&
          !hiddenConfigurationAttributeKeys.has(key) &&
          allKeys.indexOf(key) === index,
      );

    if (keys.length > 0) {
      return keys;
    }
  }

  return [];
}

function configurationSelectionsForVariant(
  variant: ProductVariant,
  configurationKeys: string[],
) {
  const record = attributesRecord(variant);

  return Object.fromEntries(
    configurationKeys
      .map((key) => [key, record[key] ?? ""] as const)
      .filter(([, value]) => Boolean(value)),
  );
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
  /*
   * Explicit admin statuses always take priority over stock quantity.
   * A Coming Soon configuration normally has zero stock, but zero stock
   * must never convert Coming Soon into Out of Stock.
   */
  if (variant.availability_status === "coming_soon") {
    return {
      className: "is-waiting",
      title: "COMING SOON",
      text: "This configuration is not available for ordering yet.",
    };
  }

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

/*
 * Storefront product-colour resolver.
 *
 * The actual colour is applied directly to the swatch element.
 * This deliberately avoids depending on old global CSS colour
 * rules, which previously caused the colour to appear only as
 * a narrow stripe inside a white circle.
 */
function storefrontColourHex(value: string) {
  return productColorwayHex(value) ?? "#8e8e93";
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
      [...variants].sort((first, second) => {
        const firstPosition = Number(first.display_position ?? 0);

        const secondPosition = Number(second.display_position ?? 0);

        if (firstPosition !== secondPosition) {
          return firstPosition - secondPosition;
        }

        return variantName(first).localeCompare(
          variantName(second),
          undefined,
          {
            numeric: true,
          },
        );
      }),
    [variants],
  );

  /*
   * ==========================================================
   * CUSTOMER-FACING CONFIGURATION OPTIONS
   * ==========================================================
   *
   * The purchase area is intentionally minimal.
   *
   * Only attributes that represent an actual choice between
   * sellable configurations are shown here.
   *
   * Things such as:
   *   processor
   *   battery
   *   MagSafe
   *   material
   *   protection
   *   finish
   *   camera
   *   display
   *
   * remain product specifications and therefore belong in the
   * Specifications section farther down the product page.
   */
  const legacyPurchaseAttributePriority = [
    "color",
    "colour",
    "screen_size",
    "display_size",
    "size",
    "storage",
    "capacity",
    "memory",
    "ram",
  ] as const;

  const configurationAttributeKeys = useMemo(() => {
    /*
     * Products created with the new Admin configurator carry
     * their exact customer-facing hierarchy explicitly.
     *
     * Example:
     *   Colour → Screen Size → Storage → RAM
     *
     * This means the storefront never has to guess whether
     * technical metadata such as processor or battery is a
     * purchasing option.
     */
    const persisted = persistedConfigurationHierarchy(ordered);

    if (persisted.length > 0) {
      /*
       * The admin-defined hierarchy is authoritative.
       *
       * Do NOT remove a level simply because it currently has one
       * choice. If the admin configured:
       *
       *   Color -> Size -> Storage
       *
       * the storefront must display those three steps in that exact
       * order, one underneath the previous step.
       */
      return persisted.filter((attributeKey) =>
        ordered.some((variant) =>
          Boolean(String(attributesRecord(variant)[attributeKey] ?? "").trim()),
        ),
      );
    }

    /*
     * Backwards-compatible fallback for products that existed
     * before explicit hierarchy metadata was introduced, and
     * for Shopify rows until the importer writes the metadata.
     */
    return legacyPurchaseAttributePriority.filter((attributeKey) => {
      const values = new Set(
        ordered
          .map((variant) =>
            optionIdentity(
              String(attributesRecord(variant)[attributeKey] ?? ""),
            ),
          )
          .filter(Boolean),
      );

      return values.size > 1;
    });
  }, [ordered]);

  const structuredConfigurator = configurationAttributeKeys.length > 0;

  const [selectedId, setSelectedId] = useState("");

  /*
   * Customer-facing selections are attribute based:
   * Colour → Storage → RAM → etc.
   *
   * The selected attributes resolve back to one exact database
   * product_variant.
   */
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});

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

    if (structuredConfigurator) {
      setSelectedAttributes(
        configurationSelectionsForVariant(
          preferred,
          configurationAttributeKeys,
        ),
      );
    }
  }, [ordered, selectedId, structuredConfigurator, configurationAttributeKeys]);

  useEffect(() => {
    setQuantity(1);
    setMessage("");
    setMessageType("");
  }, [selectedId]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("stereophonie:product-configuration", {
        detail: {
          variantId: selected.id,
          variantName: variantName(selected),
          attributes: attributesRecord(selected),
        },
      }),
    );
  }, [selected]);

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

  function variantsMatchingSelections(
    selections: Record<string, string>,
    ignoreKey?: string,
  ) {
    return ordered.filter((variant) => {
      const record = attributesRecord(variant);

      return Object.entries(selections).every(([key, requestedValue]) => {
        if (key === ignoreKey || !requestedValue) {
          return true;
        }

        return (
          optionIdentity(String(record[key] ?? "")) ===
          optionIdentity(requestedValue)
        );
      });
    });
  }

  function optionsForAttribute(attributeKey: string) {
    /*
     * Hierarchical configuration logic.
     *
     * Each level is constrained ONLY by the choices that appear
     * before it.
     *
     * Example:
     *
     * Colour -> Storage
     *
     * Colour must always show every colour that exists on the
     * product. Storage is then filtered by the selected colour.
     *
     * This prevents a later selection such as 1TB from hiding
     * another colour that does not offer 1TB.
     */
    const attributeIndex = configurationAttributeKeys.findIndex(
      (key) => key === attributeKey,
    );

    const previousSelections = Object.fromEntries(
      configurationAttributeKeys
        .slice(0, Math.max(0, attributeIndex))
        .map((key) => [key, selectedAttributes[key] ?? ""])
        .filter(([, value]) => Boolean(value)),
    );

    const candidates = variantsMatchingSelections(previousSelections);

    const values = new Map<
      string,
      {
        value: string;
        available: boolean;
      }
    >();

    for (const variant of candidates) {
      const record = attributesRecord(variant);

      const rawValue = record[attributeKey];

      const value =
        rawValue === null || rawValue === undefined ? "" : String(rawValue);

      if (!value) {
        continue;
      }

      const identity = optionIdentity(value);

      const existing = values.get(identity);

      values.set(identity, {
        value: existing?.value ?? value,
        /*
         * A real configuration remains selectable even when it is
         * currently out of stock. Stock controls purchasing only.
         */
        available: true,
      });
    }

    return Array.from(values.values());
  }

  function chooseAttribute(attributeKey: string, value: string) {
    const nextSelections = {
      ...selectedAttributes,
      [attributeKey]: value,
    };

    /*
     * Later selections may become impossible after an earlier
     * choice changes. Remove only the selections that no longer
     * correspond to a real configuration.
     */
    const keyIndex = configurationAttributeKeys.findIndex(
      (key) => key === attributeKey,
    );

    for (
      let index = keyIndex + 1;
      index < configurationAttributeKeys.length;
      index += 1
    ) {
      delete nextSelections[configurationAttributeKeys[index]];
    }

    let candidates = variantsMatchingSelections(nextSelections);

    if (candidates.length === 0) {
      return;
    }

    /*
     * Fill deterministic values for remaining attributes so the
     * customer always lands on a complete real configuration.
     */
    for (
      let index = keyIndex + 1;
      index < configurationAttributeKeys.length;
      index += 1
    ) {
      const key = configurationAttributeKeys[index];

      const availableCandidate =
        candidates.find((variant) => {
          const record = attributesRecord(variant);

          return (
            Boolean(String(record[key] ?? "").trim()) && purchasable(variant)
          );
        }) ??
        candidates.find((variant) =>
          Boolean(String(attributesRecord(variant)[key] ?? "").trim()),
        );

      const nextValue = availableCandidate
        ? String(attributesRecord(availableCandidate)[key] ?? "")
        : "";

      if (nextValue) {
        nextSelections[key] = nextValue;

        candidates = variantsMatchingSelections(nextSelections);
      }
    }

    const exact =
      candidates.find((variant) => purchasable(variant)) ?? candidates[0];

    setSelectedAttributes(nextSelections);

    if (exact) {
      setSelectedId(exact.id);
    }
  }

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
      <section id="stock-notification-controls" className="st-purchase-v6">
        {ordered.length > 1 ? (
          structuredConfigurator ? (
            <div
              className="st-purchase-apple"
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              {configurationAttributeKeys.map(
                (attributeKey, attributeIndex) => {
                  const options = optionsForAttribute(attributeKey);

                  if (options.length === 0) {
                    return null;
                  }

                  const selectedValue = selectedAttributes[attributeKey] ?? "";

                  const isColour =
                    attributeKey === "color" || attributeKey === "colour";

                  return (
                    <section
                      key={attributeKey}
                      className={`st-purchase-apple__group ${
                        isColour ? "is-colour" : ""
                      }`}
                      style={{
                        width: "100%",
                        marginTop: attributeIndex === 0 ? undefined : "24px",
                      }}
                    >
                      <header className="st-purchase-apple__heading">
                        <strong>
                          {formatLabel(attributeKey)}

                          {selectedValue ? (
                            <>
                              <span aria-hidden="true"> – </span>
                              <em>
                                {isColour
                                  ? canonicalizeProductColorwayName(
                                      selectedValue,
                                    )
                                  : selectedValue}
                              </em>
                            </>
                          ) : null}
                        </strong>
                      </header>

                      <div className="st-purchase-apple__options">
                        {options.map((option) => {
                          const active =
                            optionIdentity(selectedValue) ===
                            optionIdentity(option.value);

                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={active}
                              aria-label={
                                isColour
                                  ? `${formatLabel(attributeKey)} ${canonicalizeProductColorwayName(
                                      option.value,
                                    )}`
                                  : undefined
                              }
                              title={
                                isColour
                                  ? canonicalizeProductColorwayName(
                                      option.value,
                                    )
                                  : undefined
                              }
                              className={`st-purchase-apple__option ${
                                isColour ? "is-colour" : "is-value"
                              } ${active ? "is-active" : ""} ${
                                option.available ? "" : "is-unavailable"
                              }`}
                              onClick={() =>
                                chooseAttribute(attributeKey, option.value)
                              }
                            >
                              {isColour ? (
                                <span className="st-purchase-apple__colour-shell">
                                  <i
                                    className="st-purchase-v7__colour-dot st-purchase-apple__colour"
                                    data-colour-name={canonicalizeProductColorwayName(
                                      option.value,
                                    )}
                                    style={{
                                      backgroundColor: storefrontColourHex(
                                        option.value,
                                      ),
                                    }}
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : (
                                <span>{option.value}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                },
              )}
            </div>
          ) : (
            <div className="st-purchase-v6__variants">
              <div className="st-purchase-v6__label-row">
                <div>
                  <span>Configuration</span>

                  <strong>Choose your option</strong>
                </div>
              </div>

              <div className="st-purchase-v6__variant-list">
                {ordered.map((variant) => {
                  const active = variant.id === selectedId;

                  const ready = purchasable(variant);

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(variant.id);

                        setSelectedAttributes(
                          configurationSelectionsForVariant(
                            variant,
                            configurationAttributeKeys,
                          ),
                        );
                      }}
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
          )
        ) : null}

        {selectedStatus ? (
          <div className={`st-purchase-v6__status ${selectedStatus.className}`}>
            <i />

            <div>
              <strong>{selectedStatus.title}</strong>
              <span>{selectedStatus.text}</span>
            </div>
          </div>
        ) : null}

        {message ? (
          <div
            data-st-product-message={messageType || undefined}
            className={`st-purchase-v6__message ${
              messageType === "success" ? "is-success" : "is-error"
            }`}
            role="status"
          >
            {messageType === "success" ? <CheckCircle2 /> : <Zap />}

            <span>{message}</span>
          </div>
        ) : null}

        {selectedAvailable ? (
          <div className="st-purchase-v6__commerce">
            <div className="st-purchase-v6__quantity">
              <span>Quantity</span>

              <div className="st-purchase-v6__stepper">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus />
                </button>

                <strong>{quantity}</strong>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(maximumQuantity, value + 1))
                  }
                  disabled={quantity >= maximumQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus />
                </button>
              </div>
            </div>

            <div className="st-purchase-v6__primary-actions">
              <button
                type="button"
                className="st-purchase-v6__cart"
                onClick={() => addSelected(false)}
              >
                <ShoppingBag />

                <span>Add to bag</span>
              </button>

              <button
                type="button"
                className="st-purchase-v6__buy"
                onClick={() => addSelected(true)}
              >
                <Zap />

                <span>Buy now</span>
              </button>
            </div>
          </div>
        ) : selected ? (
          <button
            type="button"
            className="st-purchase-v6__notify"
            disabled={notificationLoading}
            onClick={() => requestNotification()}
          >
            {notificationLoading ? (
              <LoaderCircle className="is-spin" />
            ) : (
              <Mail />
            )}

            <span>Notify me when available</span>
          </button>
        ) : (
          <button type="button" className="st-purchase-v6__disabled" disabled>
            <Package />

            <span>Select a configuration</span>
          </button>
        )}

        <button
          type="button"
          className={`st-purchase-v6__save ${wishlisted ? "is-active" : ""}`}
          disabled={!wishlistReady}
          onClick={() => toggleProduct(wishlistProduct)}
          aria-pressed={wishlisted}
        >
          <Bookmark className={wishlisted ? "fill-current" : ""} />

          <span>{wishlisted ? "Saved" : "Save for later"}</span>
        </button>
      </section>

      {emailOpen ? (
        <div
          className="st-purchase-v6-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEmailOpen(false);
            }
          }}
        >
          <form className="st-purchase-v6-modal__window" onSubmit={submitEmail}>
            <header>
              <div>
                <Mail />
                <strong>Stock notification</strong>
              </div>

              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </header>

            <div className="st-purchase-v6-modal__body">
              <span>Restock alert</span>

              <h2>Notify me when available.</h2>

              <p>
                Enter your email and Stereophonie will notify you when this
                configuration returns.
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
                <span className="st-purchase-v6-modal__error">
                  {emailError}
                </span>
              ) : null}

              <button type="submit" disabled={notificationLoading}>
                {notificationLoading ? (
                  <LoaderCircle className="is-spin" />
                ) : (
                  <Mail />
                )}

                <span>Notify me</span>
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
