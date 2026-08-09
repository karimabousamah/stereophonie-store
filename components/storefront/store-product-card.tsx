"use client";

import Link from "next/link";
import { ArrowUpRight, Heart, ImageOff } from "lucide-react";
import { useMemo } from "react";

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

function imageForProduct(images: StoreProductImage[]) {
  const available = images
    .filter((image) => image.image_url)
    .sort((a, b) => a.position - b.position);

  return available.find((image) => image.is_primary) ?? available[0] ?? null;
}

function pricing(variants: StoreProductVariant[]) {
  const regular = variants
    .map((variant) => variant.regular_price)
    .filter((value): value is number => typeof value === "number");

  const sale = variants
    .map((variant) => variant.sale_price)
    .filter((value): value is number => typeof value === "number");

  return {
    regular: regular.length ? Math.min(...regular) : null,
    sale: sale.length ? Math.min(...sale) : null,
  };
}

function availability(variants: StoreProductVariant[]) {
  if (
    variants.some(
      (variant) =>
        variant.stock_quantity > 0 &&
        variant.availability_status === "in_stock",
    )
  ) {
    return "In stock";
  }

  if (
    variants.some(
      (variant) =>
        variant.stock_quantity > 0 &&
        variant.availability_status === "low_stock",
    )
  ) {
    return "Low stock";
  }

  if (
    variants.some((variant) => variant.availability_status === "coming_soon")
  ) {
    return "Coming soon";
  }

  return "Out of stock";
}

export default function StoreProductCard({
  product,
}: {
  product: StoreProductCardProduct;
}) {
  const { hydrated, isWishlisted, toggleProduct } = useWishlist();

  const image = useMemo(
    () => imageForProduct(product.images),
    [product.images],
  );

  const price = useMemo(() => pricing(product.variants), [product.variants]);

  const stock = useMemo(
    () => availability(product.variants),
    [product.variants],
  );

  const href = product.slug ? `/shop/${product.slug}` : "/shop";

  const saved = hydrated && isWishlisted(product.id);

  return (
    <article className="stereo-product-card">
      <div className="stereo-product-card__stage">
        <div className="stereo-product-card__badges">
          {product.is_new_arrival ? <span>NEW</span> : null}
          {price.sale !== null ? <span className="is-red">OFFER</span> : null}
        </div>

        <button
          type="button"
          className={`stereo-product-card__wishlist ${saved ? "is-saved" : ""}`}
          onClick={() => toggleProduct(product)}
          aria-label="Toggle wishlist"
        >
          <Heart className={saved ? "fill-current" : ""} />
        </button>

        <Link href={href} className="stereo-product-card__image-link">
          {image?.image_url ? (
            <img src={image.image_url} alt={image.alt_text ?? product.name} />
          ) : (
            <div className="stereo-product-card__placeholder">
              <ImageOff />
            </div>
          )}
        </Link>

        <Link href={href} className="stereo-product-card__view">
          View product
          <ArrowUpRight />
        </Link>
      </div>

      <div className="stereo-product-card__body">
        <div className="stereo-product-card__meta">
          <span>{product.categoryName}</span>

          <span
            className={
              stock === "Out of stock"
                ? "is-out"
                : stock === "Low stock"
                  ? "is-low"
                  : ""
            }
          >
            {stock}
          </span>
        </div>

        <Link href={href} className="stereo-product-card__name">
          {product.name}
        </Link>

        <div className="stereo-product-card__bottom">
          <div>
            {price.sale !== null ? (
              <>
                <strong>${price.sale.toFixed(2)}</strong>

                {price.regular !== null ? (
                  <del>${price.regular.toFixed(2)}</del>
                ) : null}
              </>
            ) : price.regular !== null ? (
              <strong>${price.regular.toFixed(2)}</strong>
            ) : (
              <span className="stereo-price-unavailable">Price on request</span>
            )}
          </div>

          <ArrowUpRight />
        </div>
      </div>
    </article>
  );
}
