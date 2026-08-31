"use client";

import Link from "next/link";
import { ArrowRight, Gamepad2, Bookmark, Trash2 } from "lucide-react";

import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import StoreProductCard from "@/components/storefront/store-product-card";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export default function WishlistPage() {
  const { products, productCount, hydrated, clearWishlist } = useWishlist();

  const memoryUsage = Math.min(productCount, 99);

  return (
    <main className="st-wishlist-v2">
      <StoreHeader />

      <section className="st-wishlist-boot">
        <div className="st-wishlist-boot__grid" />

        <div className="st-wishlist-shell">
          <div className="st-wishlist-boot__topline">
            <div>
              <span className="st-wishlist-led" />
              STEREOPHONIE ARCADE NETWORK / ONLINE
            </div>

            <div>PLAYER 01 / MEMORY CHANNEL</div>
          </div>

          <div className="st-wishlist-boot__layout">
            <div className="st-wishlist-boot__identity">
              <div className="st-wishlist-cartridge-icon">
                <Gamepad2 />
              </div>

              <p>PLAYER INVENTORY MODULE</p>

              <h1>
                SAVED
                <br />
                <span>MEMORY.</span>
              </h1>

              <div className="st-wishlist-boot__description">
                Products stored by the player for later retrieval, comparison
                and purchase.
              </div>
            </div>

            <div className="st-wishlist-memory-panel">
              <div className="st-wishlist-memory-panel__head">
                <div>
                  <span>MEMORY STATUS</span>
                  <strong>{hydrated ? "READY" : "SYNCING"}</strong>
                </div>

                <div>
                  <span>SAVED SLOTS</span>
                  <strong>
                    {String(hydrated ? productCount : 0).padStart(2, "0")}
                  </strong>
                </div>

                <div>
                  <span>CHANNEL</span>
                  <strong>01</strong>
                </div>
              </div>

              <div className="st-wishlist-memory-meter">
                <div className="st-wishlist-memory-meter__track">
                  <span
                    style={{
                      width: `${Math.max(
                        hydrated && memoryUsage > 0
                          ? Math.min(memoryUsage * 6, 100)
                          : 4,
                        4,
                      )}%`,
                    }}
                  />
                </div>

                <div className="st-wishlist-memory-meter__labels">
                  <span>LOCAL / CLOUD MEMORY</span>
                  <span>
                    {hydrated
                      ? `${String(productCount).padStart(2, "0")} OBJECTS STORED`
                      : "READING DATA..."}
                  </span>
                </div>
              </div>

              <div className="st-wishlist-memory-panel__commands">
                <Link href="/shop">
                  BROWSE STORE
                  <ArrowRight />
                </Link>

                {hydrated && productCount > 0 ? (
                  <button type="button" onClick={clearWishlist}>
                    <Trash2 />
                    ERASE MEMORY
                  </button>
                ) : (
                  <div className="st-wishlist-memory-panel__standby">
                    MEMORY CHANNEL STANDBY
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="st-wishlist-status">
        <div className="st-wishlist-shell">
          <div className="st-wishlist-status__item">
            <span className="st-wishlist-led" />
            MEMORY BUS / CONNECTED
          </div>

          <div className="st-wishlist-status__item">
            SLOT COUNT /
            <strong>
              {String(hydrated ? productCount : 0).padStart(2, "0")}
            </strong>
          </div>

          <div className="st-wishlist-status__item">AUTO SAVE / ENABLED</div>
        </div>
      </section>

      <section className="st-wishlist-content">
        <div className="st-wishlist-shell">
          {!hydrated ? (
            <div className="st-wishlist-loading">
              <div className="st-wishlist-loading__screen">
                <span className="st-wishlist-loading__cursor" />

                <strong>READING PLAYER MEMORY</strong>

                <p>SYNCHRONIZING SAVED PRODUCT DATA...</p>

                <div className="st-wishlist-loading__bar">
                  <span />
                </div>
              </div>
            </div>
          ) : null}

          {hydrated && productCount === 0 ? (
            <div className="st-wishlist-empty">
              <div className="st-wishlist-empty__screen">
                <div className="st-wishlist-empty__scanlines" />

                <div className="st-wishlist-empty__icon">
                  <Bookmark />
                </div>

                <p>MEMORY SLOT 00</p>

                <h2>
                  NO SAVED
                  <br />
                  DATA.
                </h2>

                <div className="st-wishlist-empty__terminal">
                  <span>&gt;</span>
                  PLAYER INVENTORY IS CURRENTLY EMPTY
                </div>

                <p className="st-wishlist-empty__copy">
                  Save a product from the store and it will be written to this
                  memory channel.
                </p>

                <Link href="/shop" className="st-wishlist-empty__command">
                  ENTER STORE
                  <ArrowRight />
                </Link>
              </div>

              <div className="st-wishlist-empty__footer">
                <span>INSERT PRODUCT DATA TO CONTINUE</span>
                <span>A / ENTER / STORE</span>
              </div>
            </div>
          ) : null}

          {hydrated && productCount > 0 ? (
            <>
              <div className="st-wishlist-library-head">
                <div>
                  <span>INVENTORY MEMORY / PLAYER 01</span>

                  <h2>SAVED CARTRIDGES</h2>
                </div>

                <div className="st-wishlist-library-head__counter">
                  <small>ACTIVE SLOTS</small>
                  <strong>{String(productCount).padStart(2, "0")}</strong>
                </div>
              </div>

              <div className="st-wishlist-grid">
                {products.map((product, index) => (
                  <article key={product.id} className="st-wishlist-slot">
                    <div className="st-wishlist-slot__hardware">
                      <div className="st-wishlist-slot__topline">
                        <span>SLOT {String(index + 1).padStart(2, "0")}</span>

                        <span className="st-wishlist-slot__status">
                          <i />
                          STORED
                        </span>
                      </div>

                      <div className="st-wishlist-slot__product">
                        <StoreProductCard product={product} />
                      </div>

                      <div className="st-wishlist-slot__footer">
                        <span>MEMORY OK</span>
                        <span>
                          PLAYER 01 / ITEM {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="st-wishlist-system-footer">
        <div className="st-wishlist-shell">
          <span>
            <i />
            STEREOPHONIE INVENTORY SYSTEM / ONLINE
          </span>

          <span>LOCAL MEMORY + CUSTOMER SYNC</span>

          <span>BEIRUT / LEBANON</span>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
