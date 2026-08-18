"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Heart,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
  PackageSearch,
} from "lucide-react";
import { FormEvent, useState } from "react";

import BrandLogo from "@/components/storefront/brand-logo";
import { useCart } from "@/components/cart/cart-provider";

const departments = [
  "Phones",
  "Laptops",
  "Gaming",
  "Audio",
  "TV & Displays",
  "Accessories",
];

export default function V2Header() {
  const router = useRouter();
  const pathname = usePathname();

  const isTrackOrderPage =
    pathname === "/track-order" || pathname.startsWith("/track-order/");

  const { totalItems, isCartReady, openCart } = useCart();

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = query.trim();

    router.push(value ? `/shop?search=${encodeURIComponent(value)}` : "/shop");
  }

  return (
    <>
      <header className="st-v2-header">
        <div className="st-v2-header__signal">
          <div className="st-v2-container st-v2-header__signal-inner">
            <div>
              <span className="st-v2-led" />
              <span>SYSTEM ONLINE</span>
            </div>

            <div className="st-v2-header__signal-right">
              <Link
                href="/track-order"
                className="st-v2-header__track-order"
                aria-label="Track your order"
              >
                <PackageSearch />
                TRACK ORDER
              </Link>

              <span>DELIVERY / LEBANON</span>
              <span>STORE PICKUP / AVAILABLE</span>
            </div>
          </div>
        </div>

        <div className="st-v2-header__main">
          <div className="st-v2-container st-v2-header__main-inner">
            <Link href="/" className="st-v2-header__logo">
              <BrandLogo className="w-[190px] md:w-[225px]" priority />
            </Link>

            <form
              className="st-v2-header__search"
              onSubmit={submitSearch}
              role="search"
            >
              <Search />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, brands, models..."
                aria-label="Search products"
              />

              <button type="submit">
                GO
                <ChevronRight />
              </button>
            </form>

            <div className="st-v2-header__actions">
              <Link
                href="/track-order"
                className={`st-v2-header__track-main ${
                  isTrackOrderPage ? "is-track-order-active" : ""
                }`}
                aria-current={isTrackOrderPage ? "page" : undefined}
                aria-label="Track your order"
              >
                <PackageSearch />
                <span>TRACK ORDER</span>
              </Link>

              <Link href="/account" aria-label="Account">
                <UserRound />
              </Link>

              <Link href="/wishlist" aria-label="Wishlist">
                <Heart />
              </Link>

              <button
                type="button"
                onClick={openCart}
                className="st-v2-header__cart-trigger"
                aria-label={`Open cart terminal with ${totalItems} ${
                  totalItems === 1 ? "item" : "items"
                }`}
              >
                <ShoppingCart />

                {isCartReady && totalItems > 0 ? (
                  <span className="st-v2-header__cart-count">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                className="st-v2-header__menu-button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu />
              </button>
            </div>
          </div>
        </div>

        <div className="st-v2-header__departments">
          <div className="st-v2-container st-v2-header__departments-inner">
            <Link href="/shop" className="is-primary">
              ALL PRODUCTS
            </Link>

            {departments.map((department) => (
              <Link
                key={department}
                href={`/shop?category=${encodeURIComponent(department)}`}
              >
                {department.toUpperCase()}
              </Link>
            ))}

            <Link href="/shop?offers=true" className="is-offer">
              OFFERS
            </Link>
          </div>
        </div>
      </header>

      <div className={`st-v2-menu ${menuOpen ? "st-v2-menu--open" : ""}`}>
        <button
          type="button"
          className="st-v2-menu__backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />

        <aside className="st-v2-menu__panel">
          <div className="st-v2-menu__top">
            <div>
              <span className="st-v2-led" />
              <span>MENU / PLAYER 01</span>
            </div>

            <button type="button" onClick={() => setMenuOpen(false)}>
              <X />
            </button>
          </div>

          <BrandLogo className="mt-8 w-[210px]" />

          <nav className="st-v2-menu__nav">
            <Link href="/shop" onClick={() => setMenuOpen(false)}>
              <span>01</span>
              SHOP
              <ChevronRight />
            </Link>

            <Link href="/account" onClick={() => setMenuOpen(false)}>
              <span>02</span>
              ACCOUNT
              <ChevronRight />
            </Link>

            <Link href="/wishlist" onClick={() => setMenuOpen(false)}>
              <span>03</span>
              WISHLIST
              <ChevronRight />
            </Link>

            <Link href="/track-order" onClick={() => setMenuOpen(false)}>
              <span>04</span>
              TRACK ORDER
              <ChevronRight />
            </Link>

            <Link href="/about" onClick={() => setMenuOpen(false)}>
              <span>05</span>
              ABOUT
              <ChevronRight />
            </Link>
          </nav>

          <a
            href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
            target="_blank"
            rel="noreferrer"
            className="st-v2-menu__location"
          >
            <MapPin />
            VISIT STEREOPHONIE
          </a>
        </aside>
      </div>
    </>
  );
}
