"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCart } from "./cart-provider";

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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCart();
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
  }, [isCartOpen, closeCart]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[2147483005] ${
        isCartOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isCartOpen}
    >
      <button
        type="button"
        onClick={closeCart}
        aria-label="Close shopping cart"
        className={`fixed inset-0 h-full w-full bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed inset-y-0 right-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-black shadow-[0_0_90px_rgba(0,0,0,0.22)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:max-w-[520px] ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex min-h-[104px] shrink-0 items-center justify-between border-b border-black/10 px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
              Shopping bag
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">
              Your cart
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-black/15 bg-white text-black transition duration-300 hover:border-black hover:bg-black/5 hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {!isCartReady ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="text-center">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-black/15 border-t-black" />

              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-black/40">
                Loading cart
              </p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center border border-black/10 bg-black/[0.025]">
              <ShoppingBag className="h-7 w-7 text-black/35" />
            </div>

            <h3 className="mt-6 text-2xl font-semibold">Your cart is empty</h3>

            <p className="mt-3 max-w-sm text-sm leading-6 text-black/45">
              Add a product and select a size to begin your order.
            </p>

            <Link
              href="/shop"
              onClick={closeCart}
              className="mt-7 inline-flex min-h-14 items-center justify-center bg-black px-7 py-4 text-xs font-semibold uppercase tracking-[0.16em] !text-white transition hover:bg-[#242424]"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="divide-y divide-black/10">
                {items.map((item) => (
                  <article
                    key={item.cartItemId}
                    className="grid grid-cols-[100px_minmax(0,1fr)] gap-4 px-5 py-6 sm:grid-cols-[112px_minmax(0,1fr)] sm:px-7"
                  >
                    <Link
                      href={`/shop/${item.slug}`}
                      onClick={closeCart}
                      className="aspect-[4/5] overflow-hidden bg-neutral-100"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-black/20" />
                        </div>
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/shop/${item.slug}`}
                            onClick={closeCart}
                            className="block truncate text-base font-semibold text-black transition hover:text-black/55"
                          >
                            {item.name}
                          </Link>

                          <p className="mt-1 text-sm text-black/45">
                            Size {item.size}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId)}
                          aria-label={`Remove ${item.name}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center text-black/30 transition hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex h-11 items-center border border-black/15">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                            className="flex h-full w-11 items-center justify-center bg-white text-black transition hover:bg-black hover:text-white disabled:opacity-25"
                          >
                            <Minus className="h-4 w-4" />
                          </button>

                          <span className="flex h-full min-w-12 items-center justify-center border-x border-black/15 px-3 text-sm font-semibold leading-none">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId, item.quantity + 1)
                            }
                            disabled={item.quantity >= item.maximumQuantity}
                            aria-label="Increase quantity"
                            className="flex h-full w-11 items-center justify-center bg-white text-black transition hover:bg-black hover:text-white disabled:opacity-25"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-base font-semibold">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <footer className="shrink-0 border-t border-black/10 bg-white px-5 py-6 sm:px-7">
              <div className="flex items-end justify-between gap-5">
                <p className="text-sm text-black/50">
                  Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
                </p>

                <p className="text-2xl font-semibold tracking-[-0.025em]">
                  ${subtotal.toFixed(2)}
                </p>
              </div>

              <p className="mt-3 text-xs leading-5 text-black/40">
                Delivery fees and final availability will be confirmed during
                checkout.
              </p>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-5 flex min-h-14 w-full items-center justify-center bg-black px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] !text-white transition duration-300 hover:bg-[#242424] hover:!text-white"
              >
                Proceed to checkout
              </Link>

              <button
                type="button"
                onClick={clearCart}
                className="mt-3 min-h-12 w-full bg-white py-3 text-xs font-semibold uppercase tracking-[0.17em] text-black/40 transition hover:text-red-600"
              >
                Clear cart
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
