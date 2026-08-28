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

      <main className="st-retail-page st-retail-wishlist">
        <section className="st-retail-hero st-retail-wishlist__hero st-wishlist-hero-final">
          <div className="st-retail-hero__copy">
            <p className="st-retail-eyebrow">Saved products</p>
            <h1>Your wishlist.</h1>
            <p>
              Keep the products you are considering in one calm, useful place.
              Come back to compare them or move straight to the shop.
            </p>

            <div className="st-retail-hero__actions">
              <a
                href="#wishlist-products"
                className="st-retail-button st-retail-button--mustard"
              >
                View saved products
                <ArrowRight />
              </a>
              <Link
                href="/shop"
                className="st-retail-button st-retail-button--quiet"
              >
                Continue shopping
              </Link>
            </div>
          </div>

          <div
            className="st-retail-wishlist__summary st-wishlist-summary-final"
            aria-label="Wishlist summary"
          >
            <div className="st-retail-wishlist__summary-icon st-wishlist-counter-clean-v2">
              <Bookmark />
            </div>
            <p>Products saved</p>
            <strong>{String(visibleCount).padStart(2, "0")}</strong>
            <span>Your selection follows you across the store.</span>
          </div>
        </section>

        <section
          id="wishlist-products"
          className="st-retail-section st-retail-wishlist__library"
        >
          <div className="st-retail-section__heading">
            <div>
              <p className="st-retail-eyebrow">Your selection</p>
              <h2>Saved for later.</h2>
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
                <Trash2 />
                Clear wishlist
              </button>
            ) : null}
          </div>

          {!hydrated ? (
            <div className="st-retail-status-card" role="status">
              <span className="st-retail-spinner" />
              <div>
                <h3>Loading your wishlist</h3>
                <p>Your saved products will appear in a moment.</p>
              </div>
            </div>
          ) : products.length === 0 ? (
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
            <div className="st-retail-wishlist__grid st-product-grid-canonical">
              {products.map((product, index) => (
                <article key={product.id} className="st-retail-wishlist-card">
                  <StoreProductCard product={product} index={index} />
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    className="st-retail-wishlist-card__remove"
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    <Trash2 />
                    Remove from wishlist
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="st-retail-assistance">
          <div>
            <div>
              <p className="st-retail-eyebrow">Already placed an order?</p>
              <h2>See where it is now.</h2>
            </div>
          </div>
          <Link
            href="/track-order"
            className="st-retail-button st-retail-button--quiet"
          >
            Track your order
            <ArrowRight />
          </Link>
        </section>
      </main>

      <V3Footer />
    </div>
  );
}
