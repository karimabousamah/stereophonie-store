"use client";

import Link from "next/link";
import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa6";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import { useStoreSettings } from "@/components/storefront/store-settings-provider";
import V3HeaderCartPanel from "@/components/stereophonie-v3/layout/v3-header-cart-panel";
import V3HeaderSearchPanel from "@/components/stereophonie-v3/layout/v3-header-search-panel";
import { V3BrandLogo } from "@/components/stereophonie-v3/shared/v3-brand-logo";

function WishlistIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.25 4.75h7.5c.83 0 1.5.67 1.5 1.5v13.1c0 .35-.4.55-.68.34L12 16.45l-4.57 3.24c-.28.21-.68.01-.68-.34V6.25c0-.83.67-1.5 1.5-1.5Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function VisitUsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.15 6-11a6 6 0 1 0-12 0c0 5.85 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

function TrackOrderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 7.5 12 3.5l7.5 4v8.8L12 20.5l-7.5-4.2V7.5Z" />
      <path d="m4.8 7.7 7.2 4.1 7.2-4.1M12 11.8v8.4" />
      <path d="M15.5 14.8h4m-1.7-1.7 1.7 1.7-1.7 1.7" />
    </svg>
  );
}

type HeaderCategory = {
  id: string;
  name: string;
  slug?: string | null;
};

type HeaderPanel =
  "store" | "support" | "search" | "cart" | `category:${string}` | null;

type OpenHeaderPanel = Exclude<HeaderPanel, null>;

export function V3Header() {
  const { instagramHandle } = useStoreSettings();

  const instagramUsername = instagramHandle.replace(/^@/, "").trim();

  const instagramHref = instagramUsername
    ? `https://www.instagram.com/${instagramUsername}`
    : "https://www.instagram.com/stereophoniestore";

  const pathname = usePathname();
  const [categories, setCategories] = useState<HeaderCategory[]>([]);
  const [activePanel, setActivePanel] = useState<HeaderPanel>(null);
  const [renderedPanel, setRenderedPanel] = useState<HeaderPanel>(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const { totalItems, isCartReady, isCartOpen, openCart, closeCart } =
    useCart();

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/storefront/header-categories", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const nextCategories = Array.isArray(data)
          ? data
          : Array.isArray(data.categories)
            ? data.categories
            : [];

        if (!cancelled) {
          setCategories(nextCategories);
        }
      } catch {
        // The fixed navigation remains usable if categories cannot load.
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openPanel = useCallback(
    (panel: OpenHeaderPanel) => {
      cancelClose();
      closeCart();
      setPanelClosing(false);
      setRenderedPanel(panel);
      setActivePanel(panel);
    },
    [cancelClose, closeCart],
  );

  const closePanel = useCallback(() => {
    cancelClose();

    const currentPanel = isCartOpen ? "cart" : (activePanel ?? renderedPanel);

    if (!currentPanel) {
      return;
    }

    setRenderedPanel(currentPanel);
    setPanelClosing(true);
    setActivePanel(null);
    closeCart();

    closeTimer.current = window.setTimeout(() => {
      setRenderedPanel(null);
      setPanelClosing(false);
      closeTimer.current = null;
    }, 430);
  }, [activePanel, cancelClose, closeCart, isCartOpen, renderedPanel]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(closePanel, 180);
  }, [cancelClose, closePanel]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePanel]);

  useEffect(() => {
    return () => cancelClose();
  }, [cancelClose]);

  /*
   * Do not silently hide catalogue categories.
   *
   * The header receives the live active category collection.
   * Every category is now allowed into the V3 navigation instead
   * of arbitrarily cutting the catalogue at 12 categories and
   * then cutting the visible navigation again at 6.
   */
  const visibleCategories = categories.slice(0, 12);
  const topCategories = visibleCategories.slice(0, 6);
  const panelForContent: HeaderPanel = isCartOpen
    ? "cart"
    : (activePanel ?? renderedPanel);
  const panelIsOpen = isCartOpen || activePanel !== null;
  const utilityPanel =
    panelForContent === "search" || panelForContent === "cart";
  const activeCategory = panelForContent?.startsWith("category:")
    ? (categories.find(
        (category) => `category:${category.id}` === panelForContent,
      ) ?? null)
    : null;

  function toggleSearch() {
    if (panelIsOpen && panelForContent === "search") {
      closePanel();
      return;
    }

    openPanel("search");
  }

  function toggleCart() {
    cancelClose();

    if (isCartOpen) {
      closePanel();
      return;
    }

    setActivePanel(null);
    setRenderedPanel("cart");
    setPanelClosing(false);
    openCart();
  }

  return (
    <>
      <header
        className="st3-header"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="st3-header__bar">
          <div className="st3-header__inner">
            <a
              href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
              target="_blank"
              rel="noopener noreferrer"
              className="st3-header__visit-us"
              aria-label="Stereophonie store location"
              title="Store location"
              onMouseEnter={closePanel}
              onFocus={closePanel}
            >
              <VisitUsIcon />
              <span>Store location</span>
            </a>

            <div className="st3-header__visit-divider" aria-hidden="true" />

            <Link
              href="/"
              className="st3-header__logo"
              onMouseEnter={closePanel}
              onFocus={closePanel}
            >
              <V3BrandLogo priority />
            </Link>

            <nav className="st3-header__nav" aria-label="Main navigation">
              <button
                type="button"
                className={`st3-header__nav-item ${
                  activePanel === "store" ? "st3-header__nav-item--active" : ""
                }`}
                onMouseEnter={() => openPanel("store")}
                onFocus={() => openPanel("store")}
                onClick={() => openPanel("store")}
                aria-expanded={activePanel === "store"}
              >
                Store
              </button>

              {topCategories.map((category) => {
                const panel: OpenHeaderPanel = `category:${category.id}`;
                const active = activePanel === panel;

                return (
                  <Link
                    key={category.id}
                    href={`/shop?category=${encodeURIComponent(category.name)}`}
                    className={`st3-header__nav-item ${
                      active ? "st3-header__nav-item--active" : ""
                    }`}
                    onMouseEnter={() => openPanel(panel)}
                    onFocus={() => openPanel(panel)}
                    aria-expanded={active}
                  >
                    {category.name}
                  </Link>
                );
              })}

              <button
                type="button"
                className={`st3-header__nav-item ${
                  activePanel === "support"
                    ? "st3-header__nav-item--active"
                    : ""
                }`}
                onMouseEnter={() => openPanel("support")}
                onFocus={() => openPanel("support")}
                onClick={() => openPanel("support")}
                aria-expanded={activePanel === "support"}
              >
                Support
              </button>
            </nav>

            <div className="st3-header__right-zone">
              <div className="st3-header__utility-divider" aria-hidden="true" />

              <div className="st3-header__actions">
                <button
                  type="button"
                  className={`st3-header__icon ${
                    panelIsOpen && panelForContent === "search"
                      ? "is-active"
                      : ""
                  }`}
                  aria-label="Search products"
                  aria-expanded={panelIsOpen && panelForContent === "search"}
                  aria-controls="st3-header-panel"
                  onMouseEnter={cancelClose}
                  onClick={toggleSearch}
                >
                  <SearchIcon />
                </button>

                <Link
                  href="/wishlist"
                  className={`st3-header__icon st3-header__desktop-only ${
                    pathname.startsWith("/wishlist") ? "is-active" : ""
                  }`}
                  aria-label="Wishlist"
                  aria-current={
                    pathname.startsWith("/wishlist") ? "page" : undefined
                  }
                  onMouseEnter={closePanel}
                >
                  <WishlistIcon />
                </Link>

                <Link
                  href="/account"
                  className={`st3-header__icon st3-header__desktop-only ${
                    pathname.startsWith("/account") ? "is-active" : ""
                  }`}
                  aria-label="Account"
                  aria-current={
                    pathname.startsWith("/account") ? "page" : undefined
                  }
                  onMouseEnter={closePanel}
                >
                  <UserIcon />
                </Link>

                <button
                  type="button"
                  className={`st3-header__icon st3-header__cart-icon ${
                    isCartOpen ? "is-active" : ""
                  }`}
                  aria-label={`Shopping bag with ${totalItems} ${
                    totalItems === 1 ? "item" : "items"
                  }`}
                  aria-expanded={isCartOpen}
                  aria-controls="st3-header-panel"
                  onMouseEnter={cancelClose}
                  onClick={toggleCart}
                >
                  <BagIcon />
                  {isCartReady && totalItems > 0 ? (
                    <span className="st3-header__cart-count">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  ) : null}
                </button>

                <Link
                  href="/track-order"
                  className={`st3-header__icon st3-header__track-icon ${
                    pathname.startsWith("/track-order") ? "is-active" : ""
                  }`}
                  aria-label="Track your order"
                  aria-current={
                    pathname.startsWith("/track-order") ? "page" : undefined
                  }
                  onMouseEnter={closePanel}
                >
                  <TrackOrderIcon />
                </Link>
              </div>

              <div
                className="st3-header__socials"
                aria-label="Stereophonie social media"
              >
                <a
                  href={instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <FaInstagram />
                </a>

                <a
                  href="https://www.tiktok.com/@stereophoniestore?_r=1&_t=ZS-98jTbFPraRc"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  title="TikTok"
                >
                  <FaTiktok />
                </a>

                <a
                  href="https://www.facebook.com/stereophoniestore"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  title="Facebook"
                >
                  <FaFacebookF />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          id="st3-header-panel"
          className={`st3-mega ${
            panelIsOpen
              ? "st3-mega--open"
              : panelClosing
                ? "st3-mega--closing"
                : "st3-mega--closed"
          } ${utilityPanel ? "st3-mega--utility" : ""} ${
            panelForContent === "search" ? "st3-mega--search" : ""
          } ${panelForContent === "cart" ? "st3-mega--cart" : ""}`}
          aria-hidden={!panelIsOpen}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {panelForContent ? (
            <div
              key={panelForContent}
              className={`st3-mega__inner st3-mega__inner--switch ${
                utilityPanel ? "st3-mega__inner--utility" : ""
              }`}
            >
              {panelForContent === "search" ? (
                <V3HeaderSearchPanel onClose={closePanel} />
              ) : panelForContent === "cart" ? (
                <V3HeaderCartPanel onClose={closePanel} />
              ) : panelForContent === "store" ? (
                <>
                  <div>
                    <p className="st3-mega__eyebrow">Shop</p>
                    <div className="st3-mega__links">
                      <Link
                        href="/shop"
                        className="st3-mega__primary-link"
                        onClick={closePanel}
                      >
                        Shop All
                      </Link>
                      <Link
                        href="/shop?offers=true"
                        className="st3-mega__primary-link st3-mega__accent"
                        onClick={closePanel}
                      >
                        Offers
                      </Link>
                      {visibleCategories.map((category) => (
                        <Link
                          key={category.id}
                          href={`/shop?category=${encodeURIComponent(category.name)}`}
                          className="st3-mega__primary-link"
                          onClick={closePanel}
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="st3-mega__secondary">
                    <p className="st3-mega__eyebrow">Quick Links</p>
                    <div className="st3-mega__secondary-links">
                      <Link
                        href="/wishlist"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Wishlist
                      </Link>
                      <Link
                        href="/account"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Your account
                      </Link>
                      <Link
                        href="/track-order"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Track your order
                      </Link>
                      <Link
                        href="/delivery"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Delivery
                      </Link>
                    </div>
                  </div>
                </>
              ) : panelForContent === "support" ? (
                <>
                  <div>
                    <p className="st3-mega__eyebrow">Support</p>
                    <div className="st3-mega__links">
                      <Link
                        href="/track-order"
                        className="st3-mega__primary-link"
                        onClick={closePanel}
                      >
                        Track your order
                      </Link>
                      <Link
                        href="/delivery"
                        className="st3-mega__primary-link"
                        onClick={closePanel}
                      >
                        Delivery
                      </Link>
                      <Link
                        href="/returns"
                        className="st3-mega__primary-link"
                        onClick={closePanel}
                      >
                        Returns
                      </Link>
                      <Link
                        href="/about"
                        className="st3-mega__primary-link"
                        onClick={closePanel}
                      >
                        About Stereophonie
                      </Link>
                    </div>
                  </div>
                  <div className="st3-mega__secondary">
                    <p className="st3-mega__eyebrow">Information</p>
                    <div className="st3-mega__secondary-links">
                      <Link
                        href="/privacy"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Privacy
                      </Link>
                      <Link
                        href="/terms"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Terms
                      </Link>
                      <Link
                        href="/account"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Your account
                      </Link>
                    </div>
                  </div>
                </>
              ) : activeCategory ? (
                <>
                  <div>
                    <p className="st3-mega__eyebrow">Explore</p>
                    <div className="st3-mega__links">
                      <Link
                        href={`/shop?category=${encodeURIComponent(activeCategory.name)}`}
                        className="st3-mega__primary-link"
                        onClick={closePanel}
                      >
                        {activeCategory.name}
                      </Link>
                      <Link
                        href={`/shop?category=${encodeURIComponent(activeCategory.name)}&sort=newest`}
                        className="st3-mega__primary-link"
                        onClick={closePanel}
                      >
                        Newest
                      </Link>
                      <Link
                        href={`/shop?category=${encodeURIComponent(activeCategory.name)}&offers=true`}
                        className="st3-mega__primary-link st3-mega__accent"
                        onClick={closePanel}
                      >
                        Offers
                      </Link>
                    </div>
                  </div>
                  <div className="st3-mega__secondary">
                    <p className="st3-mega__eyebrow">{activeCategory.name}</p>
                    <div className="st3-mega__secondary-links">
                      <Link
                        href={`/shop?category=${encodeURIComponent(activeCategory.name)}`}
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        View all products
                      </Link>
                      <Link
                        href="/wishlist"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Wishlist
                      </Link>
                      <Link
                        href="/track-order"
                        className="st3-mega__secondary-link"
                        onClick={closePanel}
                      >
                        Track an order
                      </Link>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {(panelIsOpen || panelClosing) && (
        <button
          type="button"
          className={`st3-header__scrim st3-header__scrim--v3 ${
            panelClosing
              ? "st3-header__scrim--closing"
              : "st3-header__scrim--open"
          }`}
          aria-label="Close header panel"
          onMouseEnter={scheduleClose}
          onClick={closePanel}
        />
      )}
    </>
  );
}
