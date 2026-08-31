"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { useCart } from "./cart-provider";

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function subscribeToClient() {
  return () => undefined;
}

export default function CartDrawer() {
  const {
    items,
    totalItems,
    subtotal,
    isCartOpen,
    isCartReady,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart();

  const mounted = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isCartOpen) {
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

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    }, 260);

    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
      }
    }

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyboard);
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollPosition);
    };
  }, [isCartOpen, closeCart]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`st-retail-cart ${isCartOpen ? "st-retail-cart--open" : ""}`}
      aria-hidden={!isCartOpen}
    >
      <button
        type="button"
        className="st-retail-cart__backdrop"
        onClick={closeCart}
        aria-label="Close shopping cart"
        tabIndex={isCartOpen ? 0 : -1}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="st-retail-cart-title"
        className="st-retail-cart__drawer"
      >
        <header className="st-retail-cart__header">
          <div>
            <p className="st-retail-eyebrow">Your selection</p>
            <h2 id="st-retail-cart-title">Your cart.</h2>
            <p>
              {totalItems} {totalItems === 1 ? "item" : "items"} ready for
              checkout
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeCart}
            className="st-retail-cart__close"
            aria-label="Close cart"
            tabIndex={isCartOpen ? 0 : -1}
          >
            <X />
          </button>
        </header>

        <div className="st-retail-cart__content">
          {!isCartReady ? (
            <div className="st-retail-cart__loading" role="status">
              <span />
              <p>Preparing your cart…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="st-retail-cart__empty">
              <div className="st-retail-cart__empty-icon">
                <ShoppingBag />
              </div>
              <p className="st-retail-eyebrow">Nothing here yet</p>
              <h3>Your cart is ready for something new.</h3>
              <p>
                Explore the store and add the technology that fits your day.
              </p>
              <Link
                href="/shop"
                onClick={closeCart}
                className="st-retail-button st-retail-button--mustard"
                tabIndex={isCartOpen ? 0 : -1}
              >
                Browse products
                <ArrowRight />
              </Link>
            </div>
          ) : (
            <div className="st-retail-cart__items">
              {items.map((item) => {
                const atMaximum = item.quantity >= item.maximumQuantity;
                const isOnSale =
                  item.regularPrice !== null &&
                  item.regularPrice > item.unitPrice;

                return (
                  <article
                    key={item.cartItemId}
                    className="st-retail-cart-item"
                  >
                    <Link
                      href={`/shop/${item.slug}`}
                      onClick={closeCart}
                      className="st-retail-cart-item__image"
                      tabIndex={isCartOpen ? 0 : -1}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={160}
                          height={180}
                          sizes="122px"
                        />
                      ) : (
                        <ShoppingBag />
                      )}
                    </Link>

                    <div className="st-retail-cart-item__body">
                      <div className="st-retail-cart-item__top">
                        <div>
                          <p>{item.size}</p>
                          <Link
                            href={`/shop/${item.slug}`}
                            onClick={closeCart}
                            tabIndex={isCartOpen ? 0 : -1}
                          >
                            {item.name}
                          </Link>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId)}
                          aria-label={`Remove ${item.name}`}
                          tabIndex={isCartOpen ? 0 : -1}
                        >
                          <Trash2 />
                        </button>
                      </div>

                      <div className="st-retail-cart-item__bottom">
                        <div className="st-retail-cart-item__quantity">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            aria-label={`Decrease ${item.name} quantity`}
                            tabIndex={isCartOpen ? 0 : -1}
                          >
                            <Minus />
                          </button>
                          <span aria-label={`Quantity ${item.quantity}`}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity + 1)
                            }
                            disabled={atMaximum}
                            aria-label={`Increase ${item.name} quantity`}
                            tabIndex={isCartOpen ? 0 : -1}
                          >
                            <Plus />
                          </button>
                        </div>

                        <div className="st-retail-cart-item__price">
                          {isOnSale ? (
                            <del>
                              {money(item.regularPrice! * item.quantity)}
                            </del>
                          ) : null}
                          <strong>
                            {money(item.unitPrice * item.quantity)}
                          </strong>
                        </div>
                      </div>

                      {atMaximum ? (
                        <p className="st-retail-cart-item__limit">
                          Maximum available quantity selected
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {isCartReady && items.length > 0 ? (
          <footer className="st-retail-cart__footer">
            <div className="st-retail-cart__assurance">
              <PackageCheck />
              <p>
                <strong>Delivery across Lebanon</strong>
                <span>Calculated at checkout · Cash on delivery available</span>
              </p>
            </div>

            <div className="st-retail-cart__subtotal">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>

            <p className="st-retail-cart__note">
              Delivery fees and discounts are confirmed at checkout.
            </p>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="st-retail-button st-retail-button--mustard st-retail-cart__checkout"
              tabIndex={isCartOpen ? 0 : -1}
            >
              Continue to checkout
              <ArrowRight />
            </Link>

            <div className="st-retail-cart__footer-actions">
              <Link
                href="/shop"
                onClick={closeCart}
                tabIndex={isCartOpen ? 0 : -1}
              >
                Continue shopping
              </Link>
              <button
                type="button"
                onClick={clearCart}
                tabIndex={isCartOpen ? 0 : -1}
              >
                Clear cart
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
