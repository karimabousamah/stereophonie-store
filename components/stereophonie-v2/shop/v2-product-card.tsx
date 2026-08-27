"use client";

import Link from "next/link";
import { Check, Eye, Bookmark, ImageOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";
import { isNewDropActive, newDropRemainingMs } from "@/lib/storefront/new-drop";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

type Props = {
  product: StoreProductCardProduct;
  index?: number;
};

/*
 * Product-card photography follows the FIRST storefront
 * configuration, not the old global photograph ordering.
 *
 * Example:
 *
 * Black   display_position 0
 * Navy    display_position 1
 * Orange  display_position 2
 *
 * The Shop card therefore shows:
 *
 * Black variant_position 0 -> normal card photograph
 * Black variant_position 1 -> hover photograph
 *
 * Changing Black's photograph order in Admin immediately changes
 * the card and hover ordering.
 *
 * Legacy products without variant_id continue using the old
 * is_primary / position behaviour.
 */
function orderedImages(product: StoreProductCardProduct) {
  const availableImages = [...product.images].filter((image) =>
    Boolean(image.image_url),
  );

  const orderedVariants = [...product.variants]
    .filter((variant) => variant.is_active !== false)
    .sort((first, second) => {
      const firstPosition = Number(first.display_position ?? 0);

      const secondPosition = Number(second.display_position ?? 0);

      if (firstPosition !== secondPosition) {
        return firstPosition - secondPosition;
      }

      return String(first.variant_name ?? first.size ?? "").localeCompare(
        String(second.variant_name ?? second.size ?? ""),
        undefined,
        {
          numeric: true,
        },
      );
    });

  /*
   * The first configuration controls catalogue-card photography.
   */
  const firstVariant = orderedVariants[0] ?? null;

  if (firstVariant?.id) {
    const configurationImages = availableImages
      .filter((image) => image.variant_id === firstVariant.id)
      .sort((first, second) => {
        /*
         * Explicit Main wins even if legacy data contains
         * imperfect positions.
         */
        if (
          Boolean(first.is_variant_primary) !==
          Boolean(second.is_variant_primary)
        ) {
          return first.is_variant_primary ? -1 : 1;
        }

        const firstPosition = Number(
          first.variant_position ?? first.position ?? 0,
        );

        const secondPosition = Number(
          second.variant_position ?? second.position ?? 0,
        );

        if (firstPosition !== secondPosition) {
          return firstPosition - secondPosition;
        }

        return Number(first.position ?? 0) - Number(second.position ?? 0);
      });

    if (configurationImages.length) {
      return configurationImages;
    }
  }

  /*
   * Legacy / shared-photo compatibility.
   */
  return availableImages.sort((first, second) => {
    if (first.is_primary !== second.is_primary) {
      return first.is_primary ? -1 : 1;
    }

    return Number(first.position ?? 0) - Number(second.position ?? 0);
  });
}

function getPrice(product: StoreProductCardProduct) {
  const prices = product.variants
    .map((variant) => {
      const regular = Number(variant.regular_price ?? 0);
      const sale = Number(variant.sale_price ?? 0);

      if (sale > 0 && regular > 0 && sale < regular) {
        return {
          current: sale,
          regular,
          sale: true,
        };
      }

      if (regular > 0) {
        return {
          current: regular,
          regular,
          sale: false,
        };
      }

      return null;
    })
    .filter(
      (
        item,
      ): item is {
        current: number;
        regular: number;
        sale: boolean;
      } => Boolean(item),
    )
    .sort((first, second) => first.current - second.current);

  return prices[0] ?? null;
}

function isAvailable(product: StoreProductCardProduct) {
  return product.variants.some(
    (variant) =>
      Number(variant.stock_quantity ?? 0) > 0 &&
      (variant.availability_status === "in_stock" ||
        variant.availability_status === "low_stock"),
  );
}

function isLowStockProduct(product: StoreProductCardProduct) {
  const purchasableVariants = product.variants.filter(
    (variant) =>
      Number(variant.stock_quantity ?? 0) > 0 &&
      (variant.availability_status === "in_stock" ||
        variant.availability_status === "low_stock"),
  );

  if (!purchasableVariants.length) {
    return false;
  }

  /*
   * A product is LOW STOCK when at least one currently purchasable
   * configuration is explicitly marked low_stock.
   *
   * We deliberately use the persisted availability state here so
   * the product card matches the administrator and product page.
   */
  return purchasableVariants.some(
    (variant) => variant.availability_status === "low_stock",
  );
}

function badgeFor(product: StoreProductCardProduct, now: number) {
  /*
   * Stock urgency has the highest merchandising priority.
   *
   * A low-stock product should never hide its stock warning behind
   * NEW / TRENDING / FEATURED.
   */
  if (isLowStockProduct(product)) {
    return "Low Stock";
  }

  if (
    product.is_new_arrival &&
    isNewDropActive(product.new_drop_started_at, now)
  ) {
    return "New";
  }

  if (product.is_trending) {
    return "Trending";
  }

  if (product.is_featured) {
    return "Featured";
  }

  return null;
}

function productCardBadgeClass(badge: string | null) {
  const classes = ["st-retail-card__badge", "nita-merch-badge"];

  if (badge === "New") {
    classes.push("nita-merch-badge--new");
  }

  if (badge === "Low Stock") {
    classes.push("nita-merch-badge--low-stock");
  }

  if (badge === "Trending") {
    classes.push("nita-merch-badge--trending");
  }

  return classes.join(" ");
}

export default function V2ProductCard({ product }: Props) {
  const images = useMemo(() => orderedImages(product), [product]);

  const primaryImage = images[0] ?? null;
  const secondaryImage = images[1] ?? null;

  const price = useMemo(() => getPrice(product), [product]);
  const available = useMemo(() => isAvailable(product), [product]);
  const lowStock = useMemo(() => isLowStockProduct(product), [product]);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    if (!product.is_new_arrival || !product.new_drop_started_at) {
      return;
    }

    const remaining = newDropRemainingMs(product.new_drop_started_at);

    if (remaining <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setClock(Date.now());
    }, remaining + 250);

    return () => window.clearTimeout(timer);
  }, [product.is_new_arrival, product.new_drop_started_at]);

  const badge = badgeFor(product, clock);

  const href = product.slug ? `/shop/${product.slug}` : "/shop";

  const { hydrated, isWishlisted, toggleProduct } = useWishlist();

  const wishlisted = hydrated && isWishlisted(product.id);

  const [quickViewMounted, setQuickViewMounted] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const quickViewTrigger = useRef<HTMLButtonElement>(null);
  const quickViewClose = useRef<HTMLButtonElement>(null);

  const openQuickView = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    setQuickViewOpen(true);
    setQuickViewMounted(true);
  }, []);

  const closeQuickView = useCallback(() => {
    setQuickViewOpen(false);

    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }

    closeTimer.current = window.setTimeout(() => {
      setQuickViewMounted(false);
      closeTimer.current = null;
      quickViewTrigger.current?.focus();
    }, 420);
  }, []);

  const finishQuickViewAnimation = useCallback(
    (event: React.AnimationEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || quickViewOpen) {
        return;
      }

      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }

      setQuickViewMounted(false);
      quickViewTrigger.current?.focus();
    },
    [quickViewOpen],
  );

  useEffect(() => {
    if (!quickViewMounted) {
      return;
    }

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeQuickView();
      }
    }

    window.addEventListener("keydown", escape);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [closeQuickView, quickViewMounted]);

  useEffect(() => {
    if (quickViewOpen) {
      quickViewClose.current?.focus();
    }
  }, [quickViewOpen]);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  return (
    <>
      <article className="st-retail-card st-product-card-canonical">
        <div className="st-retail-card__visual">
          <Link
            href={href}
            className="st-retail-card__image-link"
            aria-label={`View ${product.name}`}
          >
            {primaryImage?.image_url ? (
              <>
                <img
                  src={primaryImage.image_url}
                  alt={primaryImage.alt_text ?? product.name}
                  className="st-retail-card__image st-retail-card__image--primary"
                  loading="lazy"
                  decoding="async"
                />

                {secondaryImage?.image_url ? (
                  <img
                    src={secondaryImage.image_url}
                    alt=""
                    aria-hidden="true"
                    className="st-retail-card__image st-retail-card__image--secondary"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </>
            ) : (
              <div className="st-retail-card__empty">
                <ImageOff />
                <span>Image unavailable</span>
              </div>
            )}
          </Link>

          <div className="st-retail-card__top">
            <div className="st-retail-card__badges">
              {badge ? (
                <span
                  className={
                    badge === "New" || badge === "Low Stock"
                      ? "st-retail-card__badge st-retail-card__badge--new"
                      : "st-retail-card__badge"
                  }
                  data-product-card-badge={badge}
                >
                  {badge === "New" || badge === "Low Stock" ? (
                    <i
                      className="st-retail-card__new-pulse"
                      aria-hidden="true"
                    />
                  ) : null}

                  <b>{badge}</b>
                </span>
              ) : null}

              {price?.sale ? (
                <span className="st-retail-card__badge st-retail-card__badge--sale">
                  <i
                    className="st-retail-card__sale-pulse"
                    aria-hidden="true"
                  />

                  <b>Sale</b>
                </span>
              ) : null}

              {!available ? (
                <span className="is-muted">Out of stock</span>
              ) : null}
            </div>

            <button
              type="button"
              className={`st-retail-card__wishlist ${
                wishlisted ? "is-active" : ""
              }`}
              disabled={!hydrated}
              onClick={() => toggleProduct(product)}
              aria-pressed={wishlisted}
              aria-label={
                wishlisted
                  ? `Remove ${product.name} from wishlist`
                  : `Add ${product.name} to wishlist`
              }
            >
              <Bookmark className={wishlisted ? "fill-current" : ""} />
            </button>
          </div>

          <button
            ref={quickViewTrigger}
            type="button"
            className="st-retail-card__quick"
            onClick={openQuickView}
          >
            <Eye />
            Quick view
          </button>
        </div>

        <div className="st-retail-card__content">
          <div className="st-retail-card__category">
            {product.categoryName || "Technology"}
          </div>

          <Link href={href} className="st-retail-card__name">
            {product.name}
          </Link>

          {(() => {
            const colours = Array.from(
              new Map(
                product.variants.flatMap((variant) => {
                  const attributes =
                    variant.attributes && typeof variant.attributes === "object"
                      ? variant.attributes
                      : {};

                  const name = String(
                    attributes.color_name ??
                      attributes.color ??
                      attributes.colour ??
                      "",
                  ).trim();

                  const hex = String(attributes.color_hex ?? "").trim();

                  const validColour =
                    /^#[0-9a-fA-F]{6}$/.test(hex) ||
                    hex.toLowerCase() === "transparent";

                  return name && validColour
                    ? [[`${name}-${hex}`, { name, hex }]]
                    : [];
                }),
              ).values(),
            );

            return colours.length > 0 ? (
              <div
                className="st-retail-card__colors"
                aria-label="Available colours"
              >
                {colours.slice(0, 6).map((colour) => (
                  <span
                    key={`${colour.name}-${colour.hex}`}
                    title={colour.name}
                    style={
                      colour.hex === "transparent"
                        ? {
                            backgroundColor: "#ffffff",
                            backgroundImage:
                              "linear-gradient(45deg, #c7c7cc 25%, transparent 25%), linear-gradient(-45deg, #c7c7cc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c7c7cc 75%), linear-gradient(-45deg, transparent 75%, #c7c7cc 75%)",
                            backgroundSize: "6px 6px",
                            backgroundPosition:
                              "0 0, 0 3px, 3px -3px, -3px 0px",
                          }
                        : { backgroundColor: colour.hex }
                    }
                  />
                ))}

                {colours.length > 6 ? (
                  <small>+{colours.length - 6}</small>
                ) : null}
              </div>
            ) : null;
          })()}

          <div className="st-retail-card__footer">
            <div className="st-retail-card__price">
              {price ? (
                <>
                  <strong>${price.current.toFixed(2)}</strong>

                  {price.sale ? <del>${price.regular.toFixed(2)}</del> : null}
                </>
              ) : (
                <strong>Contact us</strong>
              )}
            </div>

            <span
              className={
                lowStock ? "is-low-stock" : available ? "is-available" : ""
              }
            >
              {lowStock ? "Low Stock" : available ? "In stock" : "Unavailable"}
            </span>
          </div>
        </div>
      </article>

      {quickViewMounted && typeof document !== "undefined"
        ? createPortal(
            <div
              className={`st-retail-qv ${
                quickViewOpen ? "is-open" : "is-closing"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label={`Quick view ${product.name}`}
              onAnimationEnd={finishQuickViewAnimation}
            >
              <button
                type="button"
                className="st-retail-qv__backdrop"
                onClick={closeQuickView}
                aria-label="Close quick view"
              />

              <section className="st-retail-qv__window">
                <button
                  ref={quickViewClose}
                  type="button"
                  className="st-retail-qv__close"
                  onClick={closeQuickView}
                  aria-label="Close quick view"
                >
                  <X />
                </button>

                <div className="st-retail-qv__visual">
                  {primaryImage?.image_url ? (
                    <img
                      src={primaryImage.image_url}
                      alt={primaryImage.alt_text ?? product.name}
                    />
                  ) : (
                    <ImageOff />
                  )}
                </div>

                <div className="st-retail-qv__info">
                  <span className="st-retail-qv__category">
                    {product.categoryName || "Technology"}
                  </span>

                  <h2>{product.name}</h2>

                  <div className="st-retail-qv__price">
                    {price ? (
                      <>
                        <strong>${price.current.toFixed(2)}</strong>

                        {price.sale ? (
                          <del>${price.regular.toFixed(2)}</del>
                        ) : null}
                      </>
                    ) : (
                      <strong>Contact us</strong>
                    )}
                  </div>

                  <div
                    className={`st-retail-qv__availability ${
                      available ? "is-available" : ""
                    }`}
                  >
                    <i />
                    {available ? "Available" : "Currently unavailable"}
                  </div>

                  {product.description ? <p>{product.description}</p> : null}

                  <Link href={href} className="st-retail-qv__primary">
                    View product
                  </Link>

                  <button
                    type="button"
                    className={`st-retail-qv__save ${
                      wishlisted ? "is-active" : ""
                    }`}
                    disabled={!hydrated}
                    onClick={() => toggleProduct(product)}
                  >
                    {wishlisted ? <Check /> : <Bookmark />}

                    {wishlisted ? "Saved" : "Add to wishlist"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
