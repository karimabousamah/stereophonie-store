"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCart } from "./cart-provider";

function money(value: number) {
  return `$${value.toFixed(2)}`;
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

  const configurationCount = items.length;

  return createPortal(
    <div
      className={`st-cart-os ${isCartOpen ? "st-cart-os--open" : ""}`}
      aria-hidden={!isCartOpen}
    >
      <button
        type="button"
        className="st-cart-os__backdrop"
        onClick={closeCart}
        aria-label="Close cart"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="st-cart-terminal"
      >
        <div className="st-cart-terminal__top">
          <div className="st-cart-terminal__identity">
            <div className="st-cart-terminal__signal">
              <span />
            </div>

            <div>
              <p>CART MODULE / PLAYER 01</p>
              <h2>LOADOUT TERMINAL</h2>
            </div>
          </div>

          <div className="st-cart-terminal__diagnostics">
            <div>
              <span>ITEMS</span>
              <strong>{String(totalItems).padStart(2, "0")}</strong>
            </div>

            <div>
              <span>CONFIGS</span>
              <strong>{String(configurationCount).padStart(2, "0")}</strong>
            </div>

            <div className="st-cart-terminal__status">
              <span>STATUS</span>
              <strong>{items.length ? "LOADED" : "EMPTY"}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="st-cart-terminal__close"
            aria-label="Close cart"
          >
            <X />
            <span>EXIT</span>
          </button>
        </div>

        <div className="st-cart-terminal__screen">
          <div className="st-cart-terminal__screen-bar">
            <span>STEREOPHONIE INVENTORY SYSTEM</span>
            <span>MEMORY OK</span>
          </div>

          {!isCartReady ? (
            <div className="st-cart-loading">
              <div className="st-cart-loading__disc" />

              <p>READING CARTRIDGE MEMORY...</p>

              <div className="st-cart-loading__bar">
                <span />
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="st-cart-empty">
              <div className="st-cart-empty__icon">
                <ShoppingBag />
              </div>

              <p className="st-cart-empty__code">SLOT STATUS / 000</p>

              <h3>NO CARTRIDGES LOADED</h3>

              <p className="st-cart-empty__copy">
                Your loadout is currently empty. Insert a product configuration
                to begin checkout.
              </p>

              <Link
                href="/shop"
                onClick={closeCart}
                className="st-cart-command st-cart-command--primary"
              >
                <span className="st-cart-command__key">A</span>

                <span>
                  <small>COMMAND</small>
                  CONTINUE SHOPPING
                </span>
              </Link>
            </div>
          ) : (
            <div className="st-cart-inventory">
              <div className="st-cart-inventory__heading">
                <span>LOADED CARTRIDGES</span>
                <span>{configurationCount} ACTIVE</span>
              </div>

              <div className="st-cart-inventory__list">
                {items.map((item, index) => {
                  const atMaximum = item.quantity >= item.maximumQuantity;

                  return (
                    <article
                      key={item.cartItemId}
                      className="st-cart-cartridge"
                    >
                      <div className="st-cart-cartridge__index">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <Link
                        href={`/shop/${item.slug}`}
                        onClick={closeCart}
                        className="st-cart-cartridge__image"
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} />
                        ) : (
                          <div>
                            <ShoppingBag />
                          </div>
                        )}

                        <span>PRODUCT FEED</span>
                      </Link>

                      <div className="st-cart-cartridge__body">
                        <div className="st-cart-cartridge__header">
                          <div>
                            <p className="st-cart-cartridge__slot">
                              CARTRIDGE {String(index + 1).padStart(2, "0")}
                            </p>

                            <Link
                              href={`/shop/${item.slug}`}
                              onClick={closeCart}
                              className="st-cart-cartridge__name"
                            >
                              {item.name}
                            </Link>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.cartItemId)}
                            className="st-cart-cartridge__eject"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 />
                            <span>EJECT</span>
                          </button>
                        </div>

                        <div className="st-cart-cartridge__data">
                          <div>
                            <span>CONFIGURATION</span>
                            <strong>{item.size}</strong>
                          </div>

                          <div>
                            <span>UNIT PRICE</span>
                            <strong>{money(item.unitPrice)}</strong>
                          </div>

                          <div>
                            <span>STOCK LIMIT</span>
                            <strong>
                              {String(item.maximumQuantity).padStart(2, "0")}
                            </strong>
                          </div>
                        </div>

                        <div className="st-cart-cartridge__controls">
                          <div className="st-cart-quantity">
                            <span className="st-cart-quantity__label">
                              QUANTITY
                            </span>

                            <div className="st-cart-quantity__hardware">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.cartItemId,
                                    item.quantity - 1,
                                  )
                                }
                                disabled={item.quantity <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus />
                              </button>

                              <strong>{item.quantity}</strong>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.cartItemId,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={atMaximum}
                                aria-label="Increase quantity"
                              >
                                <Plus />
                              </button>
                            </div>
                          </div>

                          <div
                            className={`st-cart-stock ${
                              atMaximum ? "is-locked" : ""
                            }`}
                          >
                            <span className="st-cart-stock__led" />

                            <div>
                              <small>INVENTORY</small>
                              <strong>
                                {atMaximum
                                  ? "MAX LOAD"
                                  : `${item.maximumQuantity - item.quantity} REMAIN`}
                              </strong>
                            </div>
                          </div>

                          <div className="st-cart-cartridge__total">
                            <span>LINE TOTAL</span>
                            <strong>
                              {money(item.unitPrice * item.quantity)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {isCartReady && items.length > 0 ? (
          <footer className="st-cart-terminal__footer">
            <div className="st-cart-terminal__summary">
              <div className="st-cart-terminal__summary-label">
                <span>ORDER BUFFER</span>
                <small>
                  {totalItems} {totalItems === 1 ? "UNIT" : "UNITS"} /{" "}
                  {configurationCount}{" "}
                  {configurationCount === 1 ? "CONFIG" : "CONFIGS"}
                </small>
              </div>

              <div className="st-cart-terminal__subtotal">
                <span>SUBTOTAL</span>
                <strong>{money(subtotal)}</strong>
              </div>
            </div>

            <div className="st-cart-terminal__commands">
              <Link
                href="/shop"
                onClick={closeCart}
                className="st-cart-command st-cart-command--secondary"
              >
                <span className="st-cart-command__key">B</span>

                <span>
                  <small>RETURN</small>
                  CONTINUE SHOPPING
                </span>
              </Link>

              <button
                type="button"
                onClick={clearCart}
                className="st-cart-command st-cart-command--clear"
              >
                <Trash2 />

                <span>
                  <small>MEMORY</small>
                  CLEAR CART
                </span>
              </button>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="st-cart-command st-cart-command--checkout"
              >
                <span className="st-cart-command__start">START</span>

                <span>
                  <small>SECURE ROUTE</small>
                  CHECKOUT
                </span>
              </Link>
            </div>

            <div className="st-cart-terminal__legal">
              <span>PAYMENT / CASH ON DELIVERY</span>
              <span>AVAILABILITY VERIFIED AT CHECKOUT</span>
            </div>
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
