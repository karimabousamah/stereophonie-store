"use client";

import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

type RecentlyViewedProduct = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  price: number | null;
  categoryName: string;
};

type RecentlyViewedProductsProps = {
  currentProduct: RecentlyViewedProduct;
};

const STORAGE_KEY = "nita-style-recently-viewed-v1";
const MAXIMUM_STORED_PRODUCTS = 8;

function isRecentlyViewedProduct(
  value: unknown,
): value is RecentlyViewedProduct {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const product = value as Partial<RecentlyViewedProduct>;

  return (
    typeof product.id === "string" &&
    typeof product.name === "string" &&
    typeof product.slug === "string" &&
    typeof product.categoryName === "string" &&
    (product.imageUrl === null || typeof product.imageUrl === "string") &&
    (product.price === null || typeof product.price === "number")
  );
}

function readRecentlyViewedProducts() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isRecentlyViewedProduct);
  } catch {
    return [];
  }
}

export default function RecentlyViewedProducts({
  currentProduct,
}: RecentlyViewedProductsProps) {
  const [products, setProducts] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    const existingProducts = readRecentlyViewedProducts();

    const previousProducts = existingProducts.filter(
      (product) => product.id !== currentProduct.id,
    );

    setProducts(previousProducts.slice(0, 4));

    const nextProducts = [currentProduct, ...previousProducts].slice(
      0,
      MAXIMUM_STORED_PRODUCTS,
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProducts));
    } catch {
      // Recently viewed is an optional enhancement.
    }
  }, [currentProduct]);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-black/10 bg-[#f5f4f1]">
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
              Continue exploring
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
              Recently viewed
            </h2>
          </div>

          <Link
            href="/shop"
            className="group inline-flex items-center gap-3 border-b border-black pb-1 text-[10px] font-semibold uppercase tracking-[0.17em] transition hover:opacity-50"
          >
            View shop
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.slug}`}
              className="group w-[72vw] max-w-[320px] shrink-0 snap-start sm:w-[38vw] lg:w-auto lg:max-w-none"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-white">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageOff className="h-8 w-8 text-black/20" />
                  </div>
                )}
              </div>

              <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.17em] text-black/40">
                {product.categoryName}
              </p>

              <h3 className="mt-2 text-sm font-semibold transition group-hover:text-black/55 sm:text-base">
                {product.name}
              </h3>

              {product.price !== null ? (
                <p className="mt-2 text-sm font-semibold">
                  ${product.price.toFixed(2)}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
