"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Trash2 } from "lucide-react";

import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import StoreProductCard from "@/components/storefront/store-product-card";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export default function WishlistPage() {
  const { products, productCount, hydrated, removeProduct, clearWishlist } =
    useWishlist();
  const visibleCount = hydrated ? productCount : 0;

  return (
    <div className="st-retail-shell">
      <V3Header />

      <main className="st-retail-page st-retail-compact-v1 st-retail-wishlist">


        <section
          id="wishlist-products"
          className="st-retail-section st-retail-wishlist__library"
        >
          <div className="st-retail-section__heading">
            <div>
              <p className="st-retail-eyebrow">Your selection</p>
              <h1>Your wishlist</h1>
              <p>
                {visibleCount} {visibleCount === 1 ? "product" : "products"} in
                your wishlist
              </p>
            </div>

            {hydrated && productCount > 0 ? (
              <button
                type="button"
                className="st-retail-button st-retail-button--quiet st-retail-button--danger"
                onClick={clearWishlist}
              >
                Clear wishlist
                <Trash2 aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {!hydrated ? null : products.length === 0 ? (
            <div className="st-retail-empty-card">
              <div className="st-retail-empty-card__icon">
                <Bookmark />
              </div>
              <p className="st-retail-eyebrow">Ready when you are</p>
              <h3>No saved products yet.</h3>
              <p>
                Tap the bookmark on any product to build a shortlist you can
                return to anytime.
              </p>
              <Link
                href="/shop"
                className="st-retail-button st-retail-button--mustard"
              >
                Explore the store
                <ArrowRight />
              </Link>
            </div>
          ) : (
            <div className="st-retail-wishlist__grid st3-shop-v4__grid st-product-grid-canonical">
              {products.map((product, index) => (
                <article key={product.id} className="st-retail-wishlist-card">
                  <StoreProductCard product={product} index={index} />
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    className="st-retail-wishlist-card__remove"
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    Remove
                    <Trash2 aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>


      </main>

      <V3Footer />
    </div>
  );
}
