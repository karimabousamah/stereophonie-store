"use client";

import Link from "next/link";
import { ArrowRight, Heart, Trash2 } from "lucide-react";

import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import StoreProductCard from "@/components/storefront/store-product-card";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export default function WishlistPage() {
  const { products, productCount, hydrated, clearWishlist } = useWishlist();

  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <section className="border-b border-black/10 bg-[#f5f4f1]">
        <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
                Your saved selection
              </p>

              <h1 className="mt-5 text-6xl font-semibold uppercase leading-[0.9] tracking-[-0.06em] sm:text-8xl lg:text-9xl">
                Wishlist
              </h1>
            </div>

            <div className="flex flex-col items-start gap-4 lg:items-end">
              <p className="max-w-xl text-sm leading-7 text-black/50 sm:text-base lg:text-right">
                Save your favorite Stereophonie products and return to them
                whenever you are ready.
              </p>

              {hydrated && productCount > 0 ? (
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="inline-flex min-h-11 items-center gap-2 border border-black/15 px-4 text-[9px] font-semibold uppercase tracking-[0.15em] transition hover:border-black hover:bg-black hover:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear wishlist
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-5 py-5 sm:px-8 lg:px-12">
          <Heart className="h-4 w-4" />

          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
            {hydrated ? productCount : 0}{" "}
            {productCount === 1 ? "saved product" : "saved products"}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        {!hydrated ? (
          <div className="min-h-[420px] animate-pulse bg-black/[0.025]" />
        ) : null}

        {hydrated && productCount === 0 ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center border border-dashed border-black/15 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center border border-black/10 bg-black/[0.025]">
              <Heart className="h-7 w-7 text-black/30" />
            </div>

            <h2 className="mt-7 text-3xl font-semibold">
              Your wishlist is empty
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-black/45">
              Tap the heart on any product to save it here for later.
            </p>

            <Link
              href="/shop"
              className="group mt-7 inline-flex min-h-12 items-center gap-4 border border-black bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#242424]"
            >
              Explore the collection
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        ) : null}

        {hydrated && productCount > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-16">
            {products.map((product) => (
              <StoreProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>

      <StoreFooter />
    </main>
  );
}
