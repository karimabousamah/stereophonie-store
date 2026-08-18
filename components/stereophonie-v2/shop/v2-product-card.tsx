"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Eye,
  Gamepad2,
  Heart,
  ImageOff,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

type Props = {
  product: StoreProductCardProduct;
  index: number;
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

function shortReference(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function systemBadge(product: StoreProductCardProduct) {
  if (product.is_new_arrival) {
    return {
      code: "01",
      title: "NEW DROP",
    };
  }

  if (product.is_trending) {
    return {
      code: "02",
      title: "HOT ITEM",
    };
  }

  if (product.is_featured) {
    return {
      code: "03",
      title: "FEATURED",
    };
  }

  return null;
}

export default function V2ProductCard({ product, index }: Props) {
  const images = useMemo(() => orderedImages(product), [product]);
  const primaryImage = images[0] ?? null;
  const secondaryImage = images[1] ?? null;
  const price = useMemo(() => getPrice(product), [product]);
  const available = useMemo(() => isAvailable(product), [product]);
  const badge = systemBadge(product);

  const href = product.slug ? `/shop/${product.slug}` : "/shop";

  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const { hydrated, isWishlisted, toggleProduct } = useWishlist();

  const wishlisted = hydrated && isWishlisted(product.id);

  useEffect(() => {
    if (!quickViewOpen) {
      return;
    }

    const oldOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setQuickViewOpen(false);
      }
    };

    window.addEventListener("keydown", escape);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", escape);
    };
  }, [quickViewOpen]);

  return (
    <>
      <article
        className={`st-card17 ${
          secondaryImage?.image_url ? "has-secondary-image" : ""
        }`}
      >
        <div className="st-card17__topbar">
          <span>
            <i />
            SLOT {String(index + 1).padStart(2, "0")}
          </span>

          <strong className={available ? "is-ready" : "is-offline"}>
            {available ? "READY" : "OFFLINE"}
          </strong>
        </div>

        <div className="st-card17__media">
          <div className="st-card17__grid" />

          <span className="st-card17__visual-label">PRODUCT VISUAL</span>

          <Link
            href={href}
            className="st-card17__image-link"
            aria-label={`View ${product.name}`}
          >
            {primaryImage?.image_url ? (
              <>
                <img
                  src={primaryImage.image_url}
                  alt={primaryImage.alt_text ?? product.name}
                  className="st-card17__image st-card17__image--primary"
                  loading="lazy"
                  decoding="async"
                />

                {secondaryImage?.image_url ? (
                  <img
                    src={secondaryImage.image_url}
                    alt=""
                    aria-hidden="true"
                    className="st-card17__image st-card17__image--secondary"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </>
            ) : (
              <div className="st-card17__empty">
                <ImageOff />
                <span>NO VISUAL SIGNAL</span>
              </div>
            )}
          </Link>

          {badge ? (
            <div className="st-card17__badge">
              <span className="st-card17__badge-icon">
                <Gamepad2 />
              </span>

              <span>
                <small>SYSTEM FLAG / {badge.code}</small>
                <strong>{badge.title}</strong>
              </span>
            </div>
          ) : null}

          <button
            type="button"
            className={`st-card17__wishlist ${wishlisted ? "is-active" : ""}`}
            disabled={!hydrated}
            onClick={() => toggleProduct(product)}
            aria-pressed={wishlisted}
            aria-label={
              wishlisted
                ? `Remove ${product.name} from wishlist`
                : `Save ${product.name} to wishlist`
            }
          >
            <Heart className={wishlisted ? "fill-current" : ""} />

            <span>{wishlisted ? "SAVED" : "SAVE"}</span>
          </button>

          <button
            type="button"
            className="st-card17__quick"
            onClick={() => setQuickViewOpen(true)}
          >
            <Eye />
            <span>QUICK VIEW</span>
            <small>PRESS A</small>
          </button>
        </div>

        <div className="st-card17__content">
          <div className="st-card17__meta">
            <span>{product.categoryName || "TECHNOLOGY"}</span>

            <span>
              {product.variants.length}{" "}
              {product.variants.length === 1 ? "OPTION" : "OPTIONS"}
            </span>
          </div>

          <Link href={href} className="st-card17__name">
            {product.name}
          </Link>

          <div className="st-card17__price">
            <div>
              {price ? (
                <>
                  <strong>${price.current.toFixed(2)}</strong>

                  {price.sale ? <del>${price.regular.toFixed(2)}</del> : null}
                </>
              ) : (
                <strong>CONTACT STORE</strong>
              )}
            </div>

            <small>REF / {shortReference(product.id)}</small>
          </div>

          <Link href={href} className="st-card17__open">
            <span>VIEW PRODUCT</span>
            <ArrowRight />
          </Link>
        </div>
      </article>

      {quickViewOpen ? (
        <div
          className="st-qv17"
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view ${product.name}`}
        >
          <button
            type="button"
            className="st-qv17__backdrop"
            onClick={() => setQuickViewOpen(false)}
            aria-label="Close quick view"
          />

          <section className="st-qv17__window">
            <header className="st-qv17__header">
              <div>
                <i />

                <span>
                  STEREOPHONIE OS
                  <strong>QUICK VIEW</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQuickViewOpen(false)}
                aria-label="Close quick view"
              >
                <X />
              </button>
            </header>

            <div className="st-qv17__layout">
              <div className="st-qv17__visual">
                <div className="st-qv17__grid" />

                {primaryImage?.image_url ? (
                  <img
                    src={primaryImage.image_url}
                    alt={primaryImage.alt_text ?? product.name}
                  />
                ) : (
                  <ImageOff />
                )}
              </div>

              <div className="st-qv17__info">
                <div className="st-qv17__online">
                  <i />

                  {available ? "AVAILABLE NOW" : "CURRENTLY OFFLINE"}
                </div>

                <p>{product.categoryName || "TECHNOLOGY"}</p>

                <h2>{product.name}</h2>

                <div className="st-qv17__price">
                  {price ? (
                    <>
                      <strong>${price.current.toFixed(2)}</strong>

                      {price.sale ? (
                        <del>${price.regular.toFixed(2)}</del>
                      ) : null}
                    </>
                  ) : (
                    <strong>CONTACT STORE</strong>
                  )}
                </div>

                <div className="st-qv17__stats">
                  <div>
                    <small>CONFIGURATIONS</small>
                    <strong>{product.variants.length}</strong>
                  </div>

                  <div>
                    <small>STATUS</small>
                    <strong>{available ? "READY" : "OFFLINE"}</strong>
                  </div>
                </div>

                {product.description ? (
                  <p className="st-qv17__description">{product.description}</p>
                ) : null}

                <div className="st-qv17__actions">
                  <Link href={href}>
                    VIEW FULL PRODUCT
                    <ArrowRight />
                  </Link>

                  <button
                    type="button"
                    disabled={!hydrated}
                    className={wishlisted ? "is-active" : ""}
                    onClick={() => toggleProduct(product)}
                  >
                    {wishlisted ? <Check /> : <Heart />}

                    {wishlisted ? "SAVED" : "SAVE PRODUCT"}
                  </button>
                </div>

                <footer>
                  <Zap />
                  LIVE CATALOG / REF {shortReference(product.id)}
                </footer>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
