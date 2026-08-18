"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type HeaderCategory = {
  id: string;
  name: string;
  slug?: string | null;
};

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

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 8.8c0 5-8 10-8 10s-8-5-8-10A4.3 4.3 0 0 1 12 6.5a4.3 4.3 0 0 1 8 2.3Z" />
    </svg>
  );
}

function MenuIcon({
  open,
}: {
  open: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M5 8h14" />
          <path d="M5 16h14" />
        </>
      )}
    </svg>
  );
}

export function V3Header() {
  const [categories, setCategories] =
    useState<HeaderCategory[]>([]);

  const [megaOpen, setMegaOpen] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const closeTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch(
          "/api/storefront/header-categories",
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        const nextCategories =
          Array.isArray(data)
            ? data
            : Array.isArray(data.categories)
              ? data.categories
              : [];

        if (!cancelled) {
          setCategories(nextCategories);
        }
      } catch {
        // Header stays usable even if category loading fails.
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMega() {
    cancelClose();
    setMegaOpen(true);
  }

  function scheduleClose() {
    cancelClose();

    closeTimer.current = setTimeout(() => {
      setMegaOpen(false);
    }, 120);
  }

  const visibleCategories =
    categories.slice(0, 12);

  return (
    <header
      className="st3-header"
      onMouseLeave={scheduleClose}
    >
      <div className="st3-header__bar">
        <div className="st3-header__inner">
          <Link
            href="/"
            className="st3-header__logo"
            onMouseEnter={scheduleClose}
          >
            Stereophonie
          </Link>

          <nav
            className="st3-header__nav"
            aria-label="Main navigation"
          >
            <button
              type="button"
              className="st3-header__nav-item"
              onMouseEnter={openMega}
              onFocus={openMega}
              aria-expanded={megaOpen}
            >
              Store
            </button>

            {visibleCategories
              .slice(0, 6)
              .map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${encodeURIComponent(
                    category.name,
                  )}`}
                  className="st3-header__nav-item"
                  onMouseEnter={openMega}
                >
                  {category.name}
                </Link>
              ))}

            <Link
              href="/about"
              className="st3-header__nav-item"
              onMouseEnter={openMega}
            >
              Support
            </Link>
          </nav>

          <div className="st3-header__actions">
            <Link
              href="/shop"
              className="st3-header__icon"
              aria-label="Search"
            >
              <SearchIcon />
            </Link>

            <Link
              href="/wishlist"
              className="st3-header__icon st3-header__desktop-only"
              aria-label="Wishlist"
            >
              <HeartIcon />
            </Link>

            <Link
              href="/account"
              className="st3-header__icon st3-header__desktop-only"
              aria-label="Account"
            >
              <UserIcon />
            </Link>

            <Link
              href="/checkout"
              className="st3-header__icon"
              aria-label="Shopping bag"
            >
              <BagIcon />
            </Link>

            <button
              type="button"
              className="st3-header__icon st3-header__menu-button"
              aria-label={
                mobileOpen
                  ? "Close navigation"
                  : "Open navigation"
              }
              aria-expanded={mobileOpen}
              onClick={() =>
                setMobileOpen((value) => !value)
              }
            >
              <MenuIcon open={mobileOpen} />
            </button>
          </div>
        </div>
      </div>

      {megaOpen && (
        <>
          <div
            className="st3-mega"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="st3-mega__inner">
              <div>
                <p className="st3-mega__eyebrow">
                  Shop
                </p>

                <div className="st3-mega__links">
                  <Link
                    href="/shop"
                    className="st3-mega__primary-link"
                    onClick={() =>
                      setMegaOpen(false)
                    }
                  >
                    Shop All
                  </Link>

                  <Link
                    href="/shop?offers=true"
                    className="st3-mega__primary-link st3-mega__accent"
                    onClick={() =>
                      setMegaOpen(false)
                    }
                  >
                    Offers
                  </Link>

                  {visibleCategories.map(
                    (category) => (
                      <Link
                        key={category.id}
                        href={`/shop?category=${encodeURIComponent(
                          category.name,
                        )}`}
                        className="st3-mega__primary-link"
                        onClick={() =>
                          setMegaOpen(false)
                        }
                      >
                        {category.name}
                      </Link>
                    ),
                  )}
                </div>
              </div>

              <div className="st3-mega__secondary">
                <p className="st3-mega__eyebrow">
                  Quick Links
                </p>

                <div className="st3-mega__secondary-links">
                  <Link
                    href="/track-order"
                    className="st3-mega__secondary-link"
                  >
                    Track your order
                  </Link>

                  <Link
                    href="/account"
                    className="st3-mega__secondary-link"
                  >
                    Your account
                  </Link>

                  <Link
                    href="/wishlist"
                    className="st3-mega__secondary-link"
                  >
                    Wishlist
                  </Link>

                  <Link
                    href="/delivery"
                    className="st3-mega__secondary-link"
                  >
                    Delivery
                  </Link>

                  <Link
                    href="/about"
                    className="st3-mega__secondary-link"
                  >
                    About Stereophonie
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="st3-header__scrim"
            aria-label="Close menu"
            onClick={() => setMegaOpen(false)}
          />
        </>
      )}

      {mobileOpen && (
        <div className="st3-mobile">
          <div className="st3-mobile__inner">
            <p className="st3-mobile__label">
              Shop
            </p>

            <div className="st3-mobile__links">
              <Link
                href="/shop"
                className="st3-mobile__link"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                Shop All
              </Link>

              <Link
                href="/shop?offers=true"
                className="st3-mobile__link st3-mega__accent"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                Offers
              </Link>

              {visibleCategories.map(
                (category) => (
                  <Link
                    key={category.id}
                    href={`/shop?category=${encodeURIComponent(
                      category.name,
                    )}`}
                    className="st3-mobile__link"
                    onClick={() =>
                      setMobileOpen(false)
                    }
                  >
                    {category.name}
                  </Link>
                ),
              )}
            </div>

            <div className="st3-mobile__utility">
              <Link
                href="/account"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                Account
              </Link>

              <Link
                href="/wishlist"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                Wishlist
              </Link>

              <Link
                href="/track-order"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                Track order
              </Link>

              <Link
                href="/about"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
