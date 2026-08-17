"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Eye,
  Gamepad2,
  Heart,
  ImageOff,
  PackageCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useWishlist } from "@/components/wishlist/wishlist-provider";
import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";

type Props = {
  product: StoreProductCardProduct;
  index: number;
};

function orderedImages(product: StoreProductCardProduct) {
  return [...product.images]
    .filter((image) => Boolean(image.image_url))
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }

      return a.position - b.position;
    });
}

function productPrice(product: StoreProductCardProduct) {
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
    .sort((a, b) => a.current - b.current);

  return prices[0] ?? null;
}

function productAvailability(product: StoreProductCardProduct) {
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

export default function V2ProductCard({ product, index }: Props) {
  const images = useMemo(() => orderedImages(product), [product]);
  const primaryImage = images[0] ?? null;

  const price = useMemo(() => productPrice(product), [product]);
  const available = useMemo(() => productAvailability(product), [product]);

  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const href = product.slug ? `/shop/${product.slug}` : "/shop";

  const { hydrated, isWishlisted, toggleProduct } = useWishlist();

  const wishlisted = hydrated && isWishlisted(product.id);

  useEffect(() => {
    if (!quickViewOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuickViewOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [quickViewOpen]);

  return (
    <>
      <article className="st-card-v14">
        <header className="st-card-v14__system">
          <div>
            <span className="st-card-v14__led" />
            SLOT {String(index + 1).padStart(2, "0")}
          </div>

          <span className={available ? "is-online" : "is-offline"}>
            {available ? "READY" : "OFFLINE"}
          </span>
        </header>

        <div className="st-card-v14__screen">
          <div className="st-card-v14__pixel-grid" />

          <span className="st-card-v14__screen-label">VISUAL / LIVE</span>

          <Link
            href={href}
            className="st-card-v14__image-link"
            aria-label={`Open ${product.name}`}
          >
            {primaryImage?.image_url ? (
              <img
                src={primaryImage.image_url}
                alt={primaryImage.alt_text ?? product.name}
                className="st-card-v14__image"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="st-card-v14__empty">
                <ImageOff />
                <span>NO SIGNAL</span>
              </div>
            )}
          </Link>

          <div className="st-card-v14__badge">
            <Gamepad2 />

            <span>
              <small>SYSTEM FLAG</small>
              <strong>
                {product.is_new_arrival
                  ? "NEW DROP"
                  : product.is_trending
                    ? "HOT SLOT"
                    : product.is_featured
                      ? "STAFF PICK"
                      : "LIVE"}
              </strong>
            </span>
          </div>

          <button
            type="button"
            disabled={!hydrated}
            aria-label={
              wishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            aria-pressed={wishlisted}
            onClick={() => toggleProduct(product)}
            className={`st-card-v14__wishlist ${wishlisted ? "is-active" : ""}`}
          >
            <Heart className={wishlisted ? "fill-current" : ""} />
            <span>{wishlisted ? "SAVED" : "SAVE"}</span>
          </button>

          <button
            type="button"
            className="st-card-v14__quick"
            onClick={() => setQuickViewOpen(true)}
          >
            <Eye />
            <span>QUICK VIEW</span>
          </button>
        </div>

        <div className="st-card-v14__body">
          <div className="st-card-v14__metadata">
            <span>{product.categoryName || "TECHNOLOGY"}</span>

            <span>
              {product.variants.length}{" "}
              {product.variants.length === 1 ? "CONFIG" : "CONFIGS"}
            </span>
          </div>

          <Link href={href} className="st-card-v14__name">
            {product.name}
          </Link>

          <div className="st-card-v14__price-line">
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

            <small>REF/{shortReference(product.id)}</small>
          </div>
        </div>

        <Link href={href} className="st-card-v14__open">
          <span>
            <small>PLAYER ACTION</small>
            OPEN PRODUCT
          </span>

          <ArrowRight />
        </Link>
      </article>

      {quickViewOpen ? (
        <div
          className="st-qv-v14"
          role="dialog"
          aria-modal="true"
          aria-label={`Quick view ${product.name}`}
        >
          <button
            type="button"
            className="st-qv-v14__backdrop"
            aria-label="Close quick view"
            onClick={() => setQuickViewOpen(false)}
          />

          <section className="st-qv-v14__console">
            <header className="st-qv-v14__topbar">
              <div>
                <span className="st-qv-v14__online-dot" />

                <span>
                  STEREOPHONIE OS
                  <strong>QUICK VIEW</strong>
                </span>
              </div>

              <div>
                <small>ESC / CLOSE</small>

                <button
                  type="button"
                  aria-label="Close quick view"
                  onClick={() => setQuickViewOpen(false)}
                >
                  <X />
                </button>
              </div>
            </header>

            <div className="st-qv-v14__layout">
              <div className="st-qv-v14__visual">
                <div className="st-qv-v14__grid" />

                <span className="st-qv-v14__visual-label">
                  PRODUCT VISUAL / SLOT {String(index + 1).padStart(2, "0")}
                </span>

                {primaryImage?.image_url ? (
                  <img
                    src={primaryImage.image_url}
                    alt={primaryImage.alt_text ?? product.name}
                  />
                ) : (
                  <div className="st-qv-v14__empty">
                    <ImageOff />
                    NO VISUAL DATA
                  </div>
                )}

                <div className="st-qv-v14__scanline" />
              </div>

              <div className="st-qv-v14__data">
                <div className="st-qv-v14__status">
                  <span className={available ? "is-online" : "is-offline"}>
                    <i />
                    {available ? "SYSTEM READY" : "SYSTEM OFFLINE"}
                  </span>

                  <small>REF/{shortReference(product.id)}</small>
                </div>

                <span className="st-qv-v14__category">
                  {product.categoryName || "TECHNOLOGY"}
                </span>

                <h2>{product.name}</h2>

                <div className="st-qv-v14__price">
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

                <div className="st-qv-v14__stats">
                  <div>
                    <small>CONFIGURATIONS</small>
                    <strong>{product.variants.length}</strong>
                  </div>

                  <div>
                    <small>INVENTORY</small>
                    <strong>{available ? "AVAILABLE" : "OFFLINE"}</strong>
                  </div>
                </div>

                {product.description ? (
                  <p>{product.description}</p>
                ) : (
                  <p>
                    Open the complete product page for technical information,
                    configurations and ordering options.
                  </p>
                )}

                <div className="st-qv-v14__actions">
                  <Link href={href}>
                    <span>
                      <small>CONTINUE</small>
                      VIEW FULL PRODUCT
                    </span>

                    <ArrowRight />
                  </Link>

                  <button
                    type="button"
                    disabled={!hydrated}
                    className={wishlisted ? "is-active" : ""}
                    onClick={() => toggleProduct(product)}
                  >
                    {wishlisted ? <Check /> : <Heart />}

                    {wishlisted ? "SAVED TO WISHLIST" : "ADD TO WISHLIST"}
                  </button>
                </div>

                <footer>
                  <PackageCheck />
                  LIVE PRODUCT DATABASE / SYNCHRONIZED
                </footer>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
