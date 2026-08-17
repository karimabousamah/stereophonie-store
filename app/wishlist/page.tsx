"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Database,
  Gamepad2,
  Heart,
  MemoryStick,
  Radio,
  RotateCw,
  Trash2,
  Wifi,
  Zap,
  ScanLine,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import V2Footer from "@/components/stereophonie-v2/layout/v2-footer";
import V2Header from "@/components/stereophonie-v2/layout/v2-header";
import StoreProductCard from "@/components/storefront/store-product-card";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

/* STEREOPHONIE PHASE 13 — CARTRIDGE PRICE MEMORY */
function getWishlistCartridgePrice(product: { variants: unknown[] }) {
  const prices = product.variants
    .map((variant) => {
      if (typeof variant !== "object" || variant === null) {
        return null;
      }

      const candidate = variant as {
        price?: number | string | null;
        sale_price?: number | string | null;
        salePrice?: number | string | null;
      };

      const raw =
        candidate.sale_price ?? candidate.salePrice ?? candidate.price ?? null;

      if (raw === null || raw === undefined || raw === "") {
        return null;
      }

      const value = Number(raw);

      return Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value !== null);

  if (prices.length === 0) {
    return "VIEW PRICE";
  }

  const lowest = Math.min(...prices);

  return `$${lowest.toFixed(2)}`;
}

export default function WishlistPage() {
  const { products, productCount, hydrated, removeProduct, clearWishlist } =
    useWishlist();

  const libraryRef = useRef<HTMLElement | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [memoryPulse, setMemoryPulse] = useState(0);

  const visibleCount = hydrated ? productCount : 0;

  function accessMemory() {
    libraryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scanMemory() {
    if (scanning) return;

    setScanning(true);
    setScanComplete(false);

    window.setTimeout(() => {
      setScanning(false);
      setScanComplete(true);
    }, 1200);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMemoryPulse((current) => (current + 1) % 6);
    }, 460);

    function handlePlayerCommand(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.key.toLowerCase() === "a") {
        scanMemory();
      }

      if (event.key.toLowerCase() === "m") {
        accessMemory();
      }
    }

    window.addEventListener("keydown", handlePlayerCommand);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", handlePlayerCommand);
    };
  }, [scanning]);

  return (
    <>
      <V2Header />

      <main className="st-wishlist-v3">
        <section className="st-wishlist-v3-hero">
          <div className="st-wishlist-v3-grid" aria-hidden="true" />
          <div
            className="st-wishlist-v3-orbit st-wishlist-v3-orbit--one"
            aria-hidden="true"
          />
          <div
            className="st-wishlist-v3-orbit st-wishlist-v3-orbit--two"
            aria-hidden="true"
          />

          <div className="st-wishlist-v3-shell">
            <div className="st-wishlist-v3-copy">
              <div className="st-wishlist-v3-system">
                <span className="st-wishlist-v3-led" />
                INVENTORY MEMORY / PLAYER 01
              </div>

              <p className="st-wishlist-v3-eyebrow">SAVED EQUIPMENT SYSTEM</p>

              <h1>
                PLAYER
                <br />
                MEMORY<span>.</span>
              </h1>

              <p className="st-wishlist-v3-description">
                Store equipment, recover saved products and reload selected
                Stereophonie hardware directly from your player memory.
              </p>

              <div className="st-wishlist-v3-commands">
                <button
                  type="button"
                  onClick={accessMemory}
                  className="st-wishlist-v3-command st-wishlist-v3-command--primary"
                >
                  <span className="st-wishlist-v3-command-key">01</span>

                  <span>
                    <small>MEMORY COMMAND</small>
                    <strong>ACCESS MEMORY</strong>
                  </span>

                  <ArrowDown />
                </button>

                <Link
                  href="/shop"
                  className="st-wishlist-v3-command st-wishlist-v3-command--secondary"
                >
                  <span className="st-wishlist-v3-command-key">02</span>

                  <span>
                    <small>STORE COMMAND</small>
                    <strong>RETURN TO SHOP</strong>
                  </span>

                  <ArrowRight />
                </Link>
              </div>

              <div
                className="st-wishlist-v3-shortcuts"
                aria-label="Player memory keyboard shortcuts"
              >
                <span>
                  <kbd>A</kbd>
                  SCAN MEMORY
                </span>

                <span>
                  <kbd>M</kbd>
                  OPEN LIBRARY
                </span>

                <span className="st-wishlist-v3-shortcuts__status">
                  <i />
                  INPUT CHANNEL READY
                </span>
              </div>

              <button
                type="button"
                className="st-wishlist-v3-discovery"
                onClick={accessMemory}
              >
                <span className="st-wishlist-v3-discovery-rail">
                  <i />
                </span>

                <span>
                  <small>PLAYER STORAGE AVAILABLE BELOW</small>
                  OPEN MEMORY LIBRARY
                </span>

                <ArrowDown />
              </button>
            </div>

            <div
              className={[
                "st-wishlist-v3-console",
                scanning ? "is-scanning" : "",
                scanComplete ? "is-complete" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="st-wishlist-v3-console-scanlines" />

              <div className="st-wishlist-v3-console-top">
                <span>
                  <span className="st-wishlist-v3-led" />
                  MEMORY BANK
                </span>

                <strong>
                  {scanning
                    ? "SCANNING"
                    : scanComplete
                      ? "COMPLETE"
                      : hydrated
                        ? "READY"
                        : "SYNC"}
                </strong>
              </div>

              <div className="st-wishlist-v3-console-screen">
                <div className="st-wishlist-v3-console-bus" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <i />
                </div>

                <MemoryStick />

                <small>SAVED CARTRIDGES</small>

                <strong className="st-wishlist-v3-count">
                  {String(visibleCount).padStart(2, "0")}
                </strong>

                <span>
                  {String(visibleCount).padStart(2, "0")} MEMORY SLOTS OCCUPIED
                </span>

                <div
                  className="st-wishlist-v3-meter"
                  aria-label="Player memory signal"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <i
                      key={index}
                      className={index <= memoryPulse ? "is-active" : ""}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="st-wishlist-v3-scan"
                onClick={scanMemory}
                disabled={scanning}
              >
                <span
                  className="st-wishlist-scan-icon-force"
                  aria-hidden="true"
                >
                  <ScanLine />
                </span>

                <span>
                  <small>MEMORY COMMAND</small>

                  <strong>
                    {scanning
                      ? "SCANNING STORAGE..."
                      : scanComplete
                        ? `${String(visibleCount).padStart(2, "0")} CARTRIDGES FOUND`
                        : "SCAN PLAYER MEMORY"}
                  </strong>
                </span>

                <RotateCw />
              </button>

              <div className="st-wishlist-v3-diagnostics">
                <div>
                  <Database />

                  <span>
                    <small>STORAGE</small>
                    <strong>{hydrated ? "LINKED" : "SYNCING"}</strong>
                  </span>
                </div>

                <div>
                  <Radio />

                  <span>
                    <small>CHANNEL</small>
                    <strong>ONLINE</strong>
                  </span>
                </div>

                <div>
                  <Gamepad2 />

                  <span>
                    <small>PROFILE</small>
                    <strong>PLAYER 01</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="st-wishlist-v3-edge-code" aria-hidden="true">
            PLAYER 01 / MEMORY BUS / 8-BIT CHANNEL
          </div>
        </section>

        <section
          ref={libraryRef}
          id="memory-library"
          className="st-wishlist-v3-library"
        >
          <div className="st-wishlist-v3-library-shell">
            <header className="st-wishlist-v3-library-header">
              <div>
                <p>PLAYER STORAGE / SLOT INVENTORY</p>

                <h2 className="st-wishlist-library-title-force">
                  MEMORY
                  <br />
                  LIBRARY<span>.</span>
                </h2>
              </div>

              <div className="st-wishlist-v3-active-slots">
                <Heart />
                <span>
                  <small>ACTIVE SLOTS</small>
                  <strong>{String(visibleCount).padStart(2, "0")}</strong>
                </span>
              </div>
            </header>

            {!hydrated ? (
              <div className="st-wishlist-v3-loading">
                <div className="st-wishlist-v3-loading-icon">
                  <Zap />
                </div>

                <p>SYNCING PLAYER MEMORY</p>

                <div>
                  {Array.from({ length: 6 }, (_, index) => (
                    <span
                      key={index}
                      style={{
                        animationDelay: `${index * 90}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {hydrated && visibleCount === 0 ? (
              <div className="st-memory-v4-vault">
                <section className="st-memory-v4-terminal">
                  <div className="st-memory-v4-terminal__top">
                    <span>
                      <i className="st-memory-v4-led" />
                      PLAYER MEMORY TERMINAL
                    </span>

                    <span>PORT / 01</span>
                  </div>

                  <div className="st-memory-v4-terminal__screen">
                    <div
                      className="st-memory-v4-terminal__scanner"
                      aria-hidden="true"
                    />

                    <div className="st-memory-v4-empty-icon">
                      <Heart />
                    </div>

                    <p className="st-memory-v4-kicker">
                      CARTRIDGE STORAGE / EMPTY
                    </p>

                    <h3>
                      MEMORY
                      <br />
                      AVAILABLE<span>.</span>
                    </h3>

                    <p className="st-memory-v4-description">
                      No equipment is currently stored in Player Memory.
                      Activate the heart control on any product to insert it
                      into an available cartridge slot.
                    </p>

                    <Link href="/shop" className="st-memory-v4-load">
                      <span className="st-memory-v4-load__key">A</span>

                      <span className="st-memory-v4-load__copy">
                        <small>LOAD COMMAND</small>
                        <strong>EXPLORE PRODUCTS</strong>
                      </span>

                      <ArrowRight />
                    </Link>
                  </div>

                  <div className="st-memory-v4-terminal__bottom">
                    <span>
                      <i className="st-memory-v4-led" />
                      MEMORY BUS READY
                    </span>

                    <span>PLAYER 01</span>
                  </div>
                </section>

                <section className="st-memory-v4-array">
                  <div className="st-memory-v4-array__header">
                    <div>
                      <small>PHYSICAL STORAGE ARRAY</small>
                      <strong>CARTRIDGE SLOTS</strong>
                    </div>

                    <span>00 / 06 OCCUPIED</span>
                  </div>

                  <div className="st-memory-v4-array__slots">
                    {Array.from({ length: 6 }, (_, index) => (
                      <div
                        className={`st-memory-v4-slot st-memory-v4-slot--${
                          index + 1
                        }`}
                        key={index}
                      >
                        <div className="st-memory-v4-slot__header">
                          <span>SLOT {String(index + 1).padStart(2, "0")}</span>

                          <i />
                        </div>

                        <div className="st-memory-v4-slot__connector">
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>

                        <div className="st-memory-v4-slot__center">
                          <MemoryStick />
                        </div>

                        <div className="st-memory-v4-slot__footer">
                          <small>STATE</small>
                          <strong>EMPTY</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="st-memory-v4-bus">
                    <span>
                      <i className="st-memory-v4-led" />
                      STORAGE BUS
                    </span>

                    <div className="st-memory-v4-bus__meter">
                      {Array.from({ length: 6 }, (_, index) => (
                        <i key={index} />
                      ))}
                    </div>

                    <span>WAITING</span>
                  </div>
                </section>

                <aside className="st-memory-v4-status">
                  <div className="st-memory-v4-status__head">
                    <span>
                      <i className="st-memory-v4-led" />
                      SYSTEM LINK
                    </span>

                    <small>LIVE</small>
                  </div>

                  <div>
                    <small>MEMORY BANK</small>
                    <strong>00 / EMPTY</strong>
                  </div>

                  <div>
                    <small>DATABASE</small>
                    <strong>CONNECTED</strong>
                  </div>

                  <div>
                    <small>NETWORK</small>
                    <strong>ONLINE</strong>
                  </div>

                  <div>
                    <small>REGION</small>
                    <strong>LEBANON</strong>
                  </div>

                  <div>
                    <small>PROFILE</small>
                    <strong>PLAYER 01</strong>
                  </div>

                  <div className="st-memory-v4-status__secret">
                    <small>INPUT BUFFER</small>
                    <span>↑ ↑ ↓ ↓ ← → ← → B A</span>
                  </div>
                </aside>
              </div>
            ) : null}

            {/* STEREOPHONIE PHASE 13 — OCCUPIED CARTRIDGE BANK */}
            {hydrated && visibleCount > 0 ? (
              <div className="st-memory-p13">
                <div className="st-memory-p13__toolbar">
                  <div className="st-memory-p13__toolbar-status">
                    <span className="st-wishlist-v3-led" />

                    <span>
                      <small>PLAYER MEMORY / ACTIVE BANK</small>
                      <strong>
                        {String(visibleCount).padStart(2, "0")} SAVED{" "}
                        {visibleCount === 1 ? "CARTRIDGE" : "CARTRIDGES"}
                      </strong>
                    </span>
                  </div>

                  <div className="st-memory-p13__toolbar-actions">
                    <span>
                      BANK 01 /{" "}
                      {String(Math.min(visibleCount, 6)).padStart(2, "0")} OF 06
                    </span>

                    <button type="button" onClick={clearWishlist}>
                      <Trash2 />
                      CLEAR MEMORY
                    </button>
                  </div>
                </div>

                <div className="st-memory-p13__bank">
                  {Array.from({ length: 6 }, (_, slotIndex) => {
                    const product = products[slotIndex];

                    if (!product) {
                      return (
                        <article
                          key={`empty-slot-${slotIndex}`}
                          className="st-memory-p13__slot is-empty"
                        >
                          <div className="st-memory-p13__slot-head">
                            <span>
                              SLOT {String(slotIndex + 1).padStart(2, "0")}
                            </span>

                            <i />
                          </div>

                          <div className="st-memory-p13__empty-core">
                            <MemoryStick />
                            <span>AVAILABLE</span>
                          </div>

                          <div className="st-memory-p13__slot-footer">
                            <span>STATE / EMPTY</span>
                            <strong>WAITING</strong>
                          </div>
                        </article>
                      );
                    }

                    const image = product.images[0];
                    const href = product.slug
                      ? `/shop/${product.slug}`
                      : "/shop";

                    return (
                      <article
                        key={product.id}
                        className="st-memory-p13__slot is-loaded"
                      >
                        <div className="st-memory-p13__slot-head">
                          <span>
                            SLOT {String(slotIndex + 1).padStart(2, "0")}
                          </span>

                          <span className="st-memory-p13__loaded-state">
                            <i />
                            LOADED
                          </span>
                        </div>

                        <div className="st-memory-p13__product">
                          <Link
                            href={href}
                            className="st-memory-p13__media"
                            aria-label={`Open ${product.name}`}
                          >
                            {image?.image_url ? (
                              <img
                                src={image.image_url}
                                alt={image.alt_text ?? product.name}
                              />
                            ) : (
                              <div className="st-memory-p13__media-fallback">
                                <MemoryStick />
                              </div>
                            )}

                            <span className="st-memory-p13__scanline" />
                          </Link>

                          <div className="st-memory-p13__product-copy">
                            <small>
                              {product.categoryName || "STEREOPHONIE EQUIPMENT"}
                            </small>

                            <h3>{product.name}</h3>

                            <div className="st-memory-p13__price">
                              <span>MEMORY VALUE</span>
                              <strong>
                                {getWishlistCartridgePrice(product)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="st-memory-p13__commands">
                          <Link href={href} className="st-memory-p13__load">
                            <span>
                              <small>COMMAND A</small>
                              LOAD PRODUCT
                            </span>

                            <ArrowRight />
                          </Link>

                          <button
                            type="button"
                            className="st-memory-p13__eject"
                            onClick={() => removeProduct(product.id)}
                            aria-label={`Remove ${product.name} from wishlist`}
                          >
                            <Trash2 />

                            <span>
                              <small>COMMAND B</small>
                              EJECT
                            </span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="st-memory-p13__bus">
                  <div>
                    <span className="st-wishlist-v3-led" />
                    MEMORY BUS
                  </div>

                  <div className="st-memory-p13__bus-meter">
                    {Array.from({ length: 6 }, (_, index) => (
                      <i
                        key={index}
                        className={
                          index < Math.min(visibleCount, 6)
                            ? "is-active"
                            : undefined
                        }
                      />
                    ))}
                  </div>

                  <strong>
                    {String(Math.min(visibleCount, 6)).padStart(2, "0")} / 06
                    OCCUPIED
                  </strong>
                </div>

                {products.length > 6 ? (
                  <section className="st-memory-p13__expansion">
                    <header>
                      <div>
                        <small>EXPANSION MEMORY BANK</small>
                        <h3>
                          BANK 02<span>.</span>
                        </h3>
                      </div>

                      <strong>
                        {String(products.length - 6).padStart(2, "0")} EXTRA
                        CARTRIDGES
                      </strong>
                    </header>

                    <div className="st-memory-p13__overflow-grid">
                      {products.slice(6).map((product, index) => (
                        <article
                          key={product.id}
                          className="st-memory-p13__overflow"
                        >
                          <div className="st-memory-p13__overflow-number">
                            SLOT {String(index + 7).padStart(2, "0")}
                          </div>

                          <div className="st-memory-p13__overflow-card">
                            <StoreProductCard product={product} />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeProduct(product.id)}
                          >
                            <Trash2 />
                            EJECT CARTRIDGE
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="st-wishlist-v3-system-strip">
          <span>
            <Wifi />
            CUSTOMER NETWORK / ONLINE
          </span>

          <span>INVENTORY MEMORY / PLAYER 01</span>

          <span>BEIRUT / LEBANON</span>
        </section>
      </main>

      <V2Footer />
    </>
  );
}
