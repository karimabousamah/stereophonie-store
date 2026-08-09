"use client";

import Link from "next/link";
import { ArrowRight, Eye, Heart, ImageOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useWishlist } from "@/components/wishlist/wishlist-provider";

export type StoreProductImage = {
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

export type StoreProductVariant = {
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  size?: string | null;
  is_active?: boolean | null;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
};

export type StoreProductCardProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categoryName: string;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  images: StoreProductImage[];
  variants: StoreProductVariant[];
};

type StoreProductCardProps = {
  product: StoreProductCardProduct;
};

function getOrderedImages(images: StoreProductImage[]) {
  const usableImages = [...images]
    .filter((image) => Boolean(image.image_url))
    .sort((first, second) => first.position - second.position);

  const primaryImage = usableImages.find((image) => image.is_primary) ?? null;

  if (!primaryImage) {
    return usableImages;
  }

  return [
    primaryImage,
    ...usableImages.filter((image) => image !== primaryImage),
  ];
}

function getProductPrice(variants: StoreProductVariant[]) {
  const regularPrices = variants
    .map((variant) => variant.regular_price)
    .filter((price): price is number => typeof price === "number");

  const salePrices = variants
    .map((variant) => variant.sale_price)
    .filter((price): price is number => typeof price === "number");

  return {
    regularPrice: regularPrices.length > 0 ? Math.min(...regularPrices) : null,

    salePrice: salePrices.length > 0 ? Math.min(...salePrices) : null,
  };
}

function getAvailability(variants: StoreProductVariant[]) {
  const hasInStock = variants.some(
    (variant) =>
      variant.availability_status === "in_stock" && variant.stock_quantity > 0,
  );

  const hasLowStock = variants.some(
    (variant) =>
      variant.availability_status === "low_stock" && variant.stock_quantity > 0,
  );

  const hasComingSoon = variants.some(
    (variant) => variant.availability_status === "coming_soon",
  );

  if (hasInStock) {
    return {
      label: "In stock",
      className: "text-emerald-700",
      dotClass: "bg-emerald-600",
      badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (hasLowStock) {
    return {
      label: "Low stock",
      className: "text-amber-700",
      dotClass: "bg-amber-500",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (hasComingSoon) {
    return {
      label: "Coming soon",
      className: "text-sky-700",
      dotClass: "bg-sky-600",
      badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: "Out of stock",
    className: "text-red-700",
    dotClass: "bg-red-600",
    badgeClass: "border-red-200 bg-red-50 text-red-700",
  };
}

function ProductPrice({
  regularPrice,
  salePrice,
  large = false,
}: {
  regularPrice: number | null;
  salePrice: number | null;
  large?: boolean;
}) {
  const priceClass = large ? "text-3xl" : "text-sm";

  if (salePrice !== null) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className={`${priceClass} font-semibold`}>
          ${salePrice.toFixed(2)}
        </span>

        {regularPrice !== null ? (
          <span
            className={`${
              large ? "text-base" : "text-sm"
            } text-black/35 line-through`}
          >
            ${regularPrice.toFixed(2)}
          </span>
        ) : null}
      </div>
    );
  }

  if (regularPrice !== null) {
    return (
      <span className={`${priceClass} font-semibold`}>
        ${regularPrice.toFixed(2)}
      </span>
    );
  }

  return <span className="text-sm text-black/40">Price unavailable</span>;
}

export default function StoreProductCard({ product }: StoreProductCardProps) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  const {
    hydrated: wishlistHydrated,
    isWishlisted,
    toggleProduct,
  } = useWishlist();

  const wishlisted = wishlistHydrated && isWishlisted(product.id);

  const orderedImages = useMemo(
    () => getOrderedImages(product.images),
    [product.images],
  );

  const mainImage = orderedImages[0] ?? null;

  const secondImage = orderedImages[1] ?? null;

  const { regularPrice, salePrice } = useMemo(
    () => getProductPrice(product.variants),
    [product.variants],
  );

  const availability = useMemo(
    () => getAvailability(product.variants),
    [product.variants],
  );

  const productHref = product.slug ? `/shop/${product.slug}` : "/shop";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!quickViewOpen) {
      return;
    }

    const body = document.body;

    const html = document.documentElement;

    const scrollPosition = window.scrollY;

    const previousBodyPosition = body.style.position;

    const previousBodyTop = body.style.top;

    const previousBodyWidth = body.style.width;

    const previousBodyOverflow = body.style.overflow;

    const previousHtmlOverflow = html.style.overflow;

    body.style.position = "fixed";

    body.style.top = `-${scrollPosition}px`;

    body.style.width = "100%";

    body.style.overflow = "hidden";

    html.style.overflow = "hidden";

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuickViewOpen(false);
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      body.style.position = previousBodyPosition;

      body.style.top = previousBodyTop;

      body.style.width = previousBodyWidth;

      body.style.overflow = previousBodyOverflow;

      html.style.overflow = previousHtmlOverflow;

      window.removeEventListener("keydown", closeWithEscape);

      window.scrollTo(0, scrollPosition);
    };
  }, [quickViewOpen]);

  function toggleWishlist() {
    toggleProduct(product);
  }

  const quickViewModal = quickViewOpen ? (
    <div
      className="fixed inset-0 z-[2147482500] flex items-center justify-center overflow-y-auto bg-black/65 p-3 backdrop-blur-[3px] sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setQuickViewOpen(false);
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view for ${product.name}`}
        className="relative my-auto grid max-h-[calc(100dvh-1.5rem)] w-full max-w-[1080px] overflow-y-auto bg-white shadow-[0_40px_140px_rgba(0,0,0,0.42)] lg:grid-cols-[1.05fr_0.95fr]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setQuickViewOpen(false)}
          aria-label="Close quick view"
          className="absolute right-4 top-4 z-30 flex h-11 w-11 items-center justify-center border border-black/10 bg-white/95 text-black backdrop-blur transition hover:border-black hover:bg-black hover:text-white sm:right-5 sm:top-5"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative min-h-[390px] overflow-hidden bg-[#f2f1ee] sm:min-h-[520px] lg:min-h-[650px]">
          {mainImage?.image_url ? (
            <img
              src={mainImage.image_url}
              alt={mainImage.alt_text ?? product.name}
              className="nita-product-photo absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[390px] items-center justify-center">
              <ImageOff className="h-10 w-10 text-black/20" />
            </div>
          )}

          {orderedImages.length > 1 ? (
            <div className="absolute bottom-4 left-4 border border-white/25 bg-black/55 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-white backdrop-blur">
              {orderedImages.length} photographs
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-between p-6 pt-20 sm:p-9 sm:pt-20 lg:p-12 lg:pt-14">
          <div>
            <p className="pr-16 text-[10px] font-semibold uppercase tracking-[0.21em] text-black/40">
              {product.categoryName}
            </p>

            <div
              className={`mt-4 inline-flex items-center gap-2.5 border px-3.5 py-2.5 ${availability.badgeClass}`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${availability.dotClass}`}
              />

              <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                {availability.label}
              </span>
            </div>

            <h2 className="mt-5 pr-4 text-4xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-5xl">
              {product.name}
            </h2>

            <div className="mt-7">
              <ProductPrice
                regularPrice={regularPrice}
                salePrice={salePrice}
                large
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {product.is_new_arrival ? (
                <span className="bg-black px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-white">
                  New arrival
                </span>
              ) : null}

              {product.is_featured ? (
                <span className="border border-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.15em]">
                  Featured
                </span>
              ) : null}

              {product.is_trending ? (
                <span className="border border-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.15em]">
                  Trending
                </span>
              ) : null}

              {salePrice !== null ? (
                <span className="border border-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.15em]">
                  Sale
                </span>
              ) : null}
            </div>

            <div className="mt-8 border-y border-black/10 py-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                Product overview
              </p>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-black/55">
                {product.description?.trim() ||
                  "Open the complete product page to view available sizes and full product information."}
              </p>
            </div>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <Link
              href={productHref}
              onClick={() => setQuickViewOpen(false)}
              className="group inline-flex min-h-14 items-center justify-between gap-6 bg-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] !text-white transition hover:bg-[#242424] hover:!text-white"
            >
              View full product
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <button
              type="button"
              onClick={toggleWishlist}
              aria-pressed={wishlisted}
              className={`inline-flex min-h-14 items-center justify-center gap-3 border px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] transition ${
                wishlisted
                  ? "border-black bg-black text-white hover:bg-[#242424]"
                  : "border-black/15 bg-white text-black hover:border-black hover:bg-black hover:text-white"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`}
              />

              {wishlisted ? "Saved" : "Add to wishlist"}
            </button>

            <button
              type="button"
              onClick={() => setQuickViewOpen(false)}
              className="min-h-14 border border-black/15 bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-black transition hover:border-black hover:bg-black hover:text-white sm:col-span-2"
            >
              Continue browsing
            </button>
          </div>
        </div>
      </section>
    </div>
  ) : null;

  return (
    <>
      <article className="group relative">
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
          <Link
            href={productHref}
            aria-label={`View ${product.name}`}
            className="absolute inset-0 block"
          >
            {mainImage?.image_url ? (
              <>
                <img
                  src={mainImage.image_url}
                  alt={mainImage.alt_text ?? product.name}
                  className={`absolute inset-0 h-full w-full object-cover transition duration-700 ease-out ${
                    secondImage?.image_url
                      ? "opacity-100 group-hover:scale-[1.025] group-hover:opacity-0 group-focus-within:scale-[1.025] group-focus-within:opacity-0"
                      : "group-hover:scale-[1.035] group-focus-within:scale-[1.035]"
                  }`}
                />

                {secondImage?.image_url ? (
                  <img
                    src={secondImage.image_url}
                    alt={
                      secondImage.alt_text ?? `${product.name} alternate view`
                    }
                    className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-0 transition duration-700 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
                  />
                ) : null}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-8 w-8 text-black/20" />
              </div>
            )}
          </Link>

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-2">
            {product.is_new_arrival ? (
              <span className="bg-black px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
                New
              </span>
            ) : null}

            {salePrice !== null ? (
              <span className="bg-white px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-black shadow-sm">
                Sale
              </span>
            ) : null}

            {product.is_trending ? (
              <span className="bg-white px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-black shadow-sm">
                Trending
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={
              wishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            aria-pressed={wishlisted}
            className={`absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center border shadow-sm backdrop-blur transition duration-300 ${
              wishlisted
                ? "border-black bg-black text-white"
                : "border-black/10 bg-white/90 text-black hover:border-black hover:bg-black hover:text-white"
            }`}
          >
            <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            aria-label={`Quick view ${product.name}`}
            className="absolute inset-x-3 bottom-3 z-20 flex min-h-12 translate-y-4 items-center justify-between gap-4 bg-black px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white opacity-0 transition duration-300 hover:bg-[#242424] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
          >
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Quick view
            </span>

            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-black/40">
              {product.categoryName}
            </p>

            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${availability.dotClass}`}
              />

              <span
                className={`text-[9px] font-medium uppercase tracking-[0.11em] ${availability.className}`}
              >
                {availability.label}
              </span>
            </div>
          </div>

          <Link
            href={productHref}
            className="mt-2 block text-sm font-semibold tracking-[-0.01em] transition hover:text-black/55 sm:text-base"
          >
            {product.name}
          </Link>

          <div className="mt-3">
            <ProductPrice regularPrice={regularPrice} salePrice={salePrice} />
          </div>
        </div>
      </article>

      {mounted && quickViewModal
        ? createPortal(quickViewModal, document.body)
        : null}
    </>
  );
}
