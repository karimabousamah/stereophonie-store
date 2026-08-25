"use client";

import Link from "next/link";
import {
  Check,
  Eye,
  Bookmark,
  ImageOff,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";
import {
  isNewDropActive,
  newDropRemainingMs,
} from "@/lib/storefront/new-drop";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

type Props = {
  product: StoreProductCardProduct;
  index?: number;
};

function orderedImages(product: StoreProductCardProduct) {
  return [...product.images]
    .filter((image) => Boolean(image.image_url))
    .sort((first, second) => {
      if (first.is_primary !== second.is_primary) {
        return first.is_primary ? -1 : 1;
      }

      return first.position - second.position;
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

function badgeFor(product: StoreProductCardProduct, now: number) {
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

export default function V2ProductCard({ product }: Props) {
  const images = useMemo(() => orderedImages(product), [product]);

  const primaryImage = images[0] ?? null;
  const secondaryImage = images[1] ?? null;

  const price = useMemo(() => getPrice(product), [product]);
  const available = useMemo(() => isAvailable(product), [product]);

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
  }, [
    product.is_new_arrival,
    product.new_drop_started_at,
  ]);

  const badge = badgeFor(product, clock);

  const href = product.slug
    ? `/shop/${product.slug}`
    : "/shop";

  const {
    hydrated,
    isWishlisted,
    toggleProduct,
  } = useWishlist();

  const wishlisted =
    hydrated && isWishlisted(product.id);

  const [quickViewMounted, setQuickViewMounted] =
    useState(false);
  const [quickViewOpen, setQuickViewOpen] =
    useState(false);
  const closeTimer = useRef<number | null>(null);
  const quickViewTrigger = useRef<HTMLButtonElement>(null);
  const quickViewClose = useRef<HTMLButtonElement>(null);

  const openQuickView = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    setQuickViewMounted(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setQuickViewOpen(true);
      });
    });
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
    }, 260);
  }, []);

  useEffect(() => {
    if (!quickViewMounted) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeQuickView();
      }
    }

    window.addEventListener("keydown", escape);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener(
        "keydown",
        escape,
      );
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
      <article className="st-retail-card">
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
                  alt={
                    primaryImage.alt_text ??
                    product.name
                  }
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
                    badge === "New"
                      ? "st-retail-card__badge st-retail-card__badge--new"
                      : "st-retail-card__badge"
                  }
                >
                  {badge === "New" ? (
                    <i
                      className="st-retail-card__new-pulse"
                      aria-hidden="true"
                    />
                  ) : null}

                  <b>{badge}</b>
                </span>
              ) : null}

              {!available ? (
                <span className="is-muted">
                  Out of stock
                </span>
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
              <Bookmark
                className={
                  wishlisted
                    ? "fill-current"
                    : ""
                }
              />
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
            {product.categoryName ||
              "Technology"}
          </div>

          <Link
            href={href}
            className="st-retail-card__name"
          >
            {product.name}
          </Link>

          <div className="st-retail-card__footer">
            <div className="st-retail-card__price">
              {price ? (
                <>
                  <strong>
                    ${price.current.toFixed(2)}
                  </strong>

                  {price.sale ? (
                    <del>
                      ${price.regular.toFixed(2)}
                    </del>
                  ) : null}
                </>
              ) : (
                <strong>Contact us</strong>
              )}
            </div>

            <span
              className={
                available
                  ? "is-available"
                  : ""
              }
            >
              {available
                ? "In stock"
                : "Unavailable"}
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
                  alt={
                    primaryImage.alt_text ??
                    product.name
                  }
                />
              ) : (
                <ImageOff />
              )}
            </div>

            <div className="st-retail-qv__info">
              <span className="st-retail-qv__category">
                {product.categoryName ||
                  "Technology"}
              </span>

              <h2>{product.name}</h2>

              <div className="st-retail-qv__price">
                {price ? (
                  <>
                    <strong>
                      ${price.current.toFixed(2)}
                    </strong>

                    {price.sale ? (
                      <del>
                        ${price.regular.toFixed(2)}
                      </del>
                    ) : null}
                  </>
                ) : (
                  <strong>Contact us</strong>
                )}
              </div>

              <div
                className={`st-retail-qv__availability ${
                  available
                    ? "is-available"
                    : ""
                }`}
              >
                <i />
                {available
                  ? "Available"
                  : "Currently unavailable"}
              </div>

              {product.description ? (
                <p>
                  {product.description}
                </p>
              ) : null}

              <Link
                href={href}
                className="st-retail-qv__primary"
              >
                View product
              </Link>

              <button
                type="button"
                className={`st-retail-qv__save ${
                  wishlisted
                    ? "is-active"
                    : ""
                }`}
                disabled={!hydrated}
                onClick={() =>
                  toggleProduct(product)
                }
              >
                {wishlisted ? (
                  <Check />
                ) : (
                  <Bookmark />
                )}

                {wishlisted
                  ? "Saved"
                  : "Add to wishlist"}
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
