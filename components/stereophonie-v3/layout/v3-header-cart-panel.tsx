"use client";

import Link from "next/link";
import {
  ArrowRight,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function V3HeaderCartPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const {
    items,
    totalItems,
    subtotal,
    isCartReady,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart();

  if (!isCartReady) {
    return (
      <section
        className="st3-utility-cart st3-utility-cart--loading"
        role="status"
      >
        <span className="st3-utility-cart__loader" />
        <p>Preparing your bag…</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="st3-utility-cart st3-utility-cart--empty">
        <div className="st3-utility-cart__empty-copy">
          <p className="st3-utility-label">Your bag</p>
          <h2>Your bag is empty.</h2>
          <p>
            Save products to your wishlist or explore the store to get started.
          </p>
          <Link href="/shop" onClick={onClose}>
            Start shopping
            <ArrowRight />
          </Link>
        </div>

        <div className="st3-utility-cart__profile">
          <p>My Stereophonie</p>
          <nav aria-label="Customer shortcuts">
            <Link href="/account" onClick={onClose}>
              <UserRound />
              My account
            </Link>
            <Link href="/wishlist" onClick={onClose}>
              <ShoppingBag />
              Wishlist
            </Link>
            <Link href="/track-order" onClick={onClose}>
              <Package />
              Track an order
            </Link>
          </nav>
        </div>
      </section>
    );
  }

  return (
    <section className="st3-utility-cart st3-utility-cart--filled">
      <div className="st3-utility-cart__main">
        <div className="st3-utility-cart__heading">
          <div>
            <p className="st3-utility-label">Your bag</p>
            <h2>
              {totalItems} {totalItems === 1 ? "item" : "items"} in your bag.
            </h2>
          </div>
          <button type="button" onClick={clearCart}>
            Clear bag
          </button>
        </div>

        <div className="st3-utility-cart__items">
          {items.map((item) => {
            const atMaximum = item.quantity >= item.maximumQuantity;

            return (
              <article key={item.cartItemId} className="st3-utility-cart-item">
                <Link
                  href={`/shop/${item.slug}`}
                  onClick={onClose}
                  className="st3-utility-cart-item__image"
                >
                  {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="eager"
                        decoding="async"
                        draggable={false}
                      />
                  ) : (
                    <ShoppingBag />
                  )}
                </Link>

                <div className="st3-utility-cart-item__copy">
                  <p>{item.size}</p>
                  <Link href={`/shop/${item.slug}`} onClick={onClose}>
                    {item.name}
                  </Link>
                  <div className="st3-utility-cart-item__controls">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity <= 1) {
                            removeItem(item.cartItemId);
                            return;
                          }

                          updateQuantity(
                            item.cartItemId,
                            item.quantity - 1,
                          );
                        }}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.cartItemId, item.quantity + 1)
                        }
                        disabled={atMaximum}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus />
                      </button>
                    </div>
                    <strong>{money(item.unitPrice * item.quantity)}</strong>
                  </div>
                </div>

              </article>
            );
          })}
        </div>
      </div>

      <aside className="st3-utility-cart__summary">
        <p className="st3-utility-label">Order summary</p>
        <div>
          <span>Subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>
        <p>Delivery fees and discounts are confirmed at checkout.</p>
        <Link href="/checkout" onClick={onClose}>
          Review and checkout
          <ArrowRight />
        </Link>
        <Link href="/shop" onClick={onClose} className="is-secondary">
          Continue shopping
        </Link>
      </aside>
    </section>
  );
}
