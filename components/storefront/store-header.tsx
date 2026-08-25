"use client";

import Link from "next/link";
import {
  useRouter } from "next/navigation";
import {
  MapPin,
  Menu,
  Search,
  UserRound,
  X,
  ChevronRight,
  Phone,
} from "lucide-react";
import { FormEvent, useState } from "react";

import BrandLogo from "@/components/storefront/brand-logo";


function HeaderSaveIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      data-st-header-save
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7.25 4.75C7.25 3.7835 8.0335 3 9 3H15C15.9665 3 16.75 3.7835 16.75 4.75V20L12 16.55L7.25 20V4.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const categories = [
  "Phones",
  "Laptops",
  "Gaming",
  "Audio",
  "TV & Displays",
  "Accessories",
  "Networking",
  "Smart Home",
];

export default function StoreHeader() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      router.push("/shop");
      return;
    }

    router.push(`/shop?search=${encodeURIComponent(query)}`);
  }

  return (
    <>
      <header className="stereo-header">
        <div className="stereo-utility">
          <div className="stereo-container stereo-utility__inner">
            <div className="stereo-utility__left">
              <a href="tel:+9613161285">
                <Phone size={12} />
                +961 3 161 285
              </a>

              <a
                href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={12} />
                Visit our store
              </a>
            </div>

            <div className="stereo-utility__right">
              <span>Delivery across Lebanon</span>
              <span className="stereo-red-dot" />
              <span>Store pickup available</span>
            </div>
          </div>
        </div>

        <div className="stereo-mainnav">
          <div className="stereo-container stereo-mainnav__inner">
            <Link href="/" className="stereo-mainnav__logo">
              <BrandLogo className="w-[190px] sm:w-[220px]" priority />
            </Link>

            <form
              className="stereo-search"
              onSubmit={submitSearch}
              role="search"
            >
              <Search size={18} />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search phones, laptops, gaming, audio..."
                aria-label="Search products"
              />

              <button type="submit">Search</button>
            </form>

            <div className="stereo-mainnav__actions">
              <Link href="/account" aria-label="Account">
                <UserRound />
                <span>Account</span>
              </Link>

              <Link href="/wishlist" aria-label="Wishlist">
                <HeaderSaveIcon />
                <span>Wishlist</span>
              </Link>

              <Link href="/checkout" className="stereo-cart-link">
                <span>Cart</span>
                <ChevronRight size={15} />
              </Link>

              <button
                type="button"
                className="stereo-mobile-trigger"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu />
              </button>
            </div>
          </div>
        </div>

        <nav className="stereo-category-nav">
          <div className="stereo-container stereo-category-nav__inner">
            <Link href="/shop" className="stereo-category-nav__all">
              All products
            </Link>

            {categories.map((category) => (
              <Link
                key={category}
                href={`/shop?category=${encodeURIComponent(category)}`}
              >
                {category}
              </Link>
            ))}

            <Link
              href="/shop?offers=true"
              className="stereo-category-nav__sale"
            >
              Offers
            </Link>
          </div>
        </nav>
      </header>

      <div
        className={`stereo-mobile-menu ${
          mobileOpen ? "stereo-mobile-menu--open" : ""
        }`}
      >
        <div
          className="stereo-mobile-menu__backdrop"
          onClick={() => setMobileOpen(false)}
        />

        <aside className="stereo-mobile-menu__panel">
          <div className="stereo-mobile-menu__top">
            <BrandLogo className="w-[175px]" />

            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X />
            </button>
          </div>

          <form className="stereo-mobile-search" onSubmit={submitSearch}>
            <Search size={18} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
            />
          </form>

          <div className="stereo-mobile-menu__links">
            <Link href="/shop" onClick={() => setMobileOpen(false)}>
              All products
              <ChevronRight />
            </Link>

            {categories.map((category) => (
              <Link
                key={category}
                href={`/shop?category=${encodeURIComponent(category)}`}
                onClick={() => setMobileOpen(false)}
              >
                {category}
                <ChevronRight />
              </Link>
            ))}
          </div>

          <div className="stereo-mobile-menu__secondary">
            <Link href="/account">Account</Link>
            <Link href="/wishlist">Wishlist</Link>
            <Link href="/track-order">Track order</Link>
            <Link href="/about">About Stereophonie</Link>
          </div>

          <a
            className="stereo-mobile-location"
            href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
            target="_blank"
            rel="noreferrer"
          >
            <MapPin />
            Visit Stereophonie Store
          </a>
        </aside>
      </div>
    </>
  );
}
