"use client";

import Link from "next/link";
import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa6";

import { V3BrandLogo } from "@/components/stereophonie-v3/shared/v3-brand-logo";
import { useStoreSettings } from "@/components/storefront/store-settings-provider";
import { MapPin } from "lucide-react";

export default function V3Footer() {
  const { instagramHandle } = useStoreSettings();

  const instagramUsername = instagramHandle.replace(/^@/, "").trim();

  const instagramHref = instagramUsername
    ? `https://www.instagram.com/${instagramUsername}`
    : "https://www.instagram.com/stereophoniestore";

  return (
    <footer className="st3-footer">
      <div className="st3-footer__inner">
        <div className="st3-footer__support">
          <div>
            <p className="st3-footer__support-eyebrow">Stereophonie</p>

            <h2>Technology made simpler.</h2>

            <p>
              Discover products, manage your account and get help whenever you
              need it.
            </p>
          </div>

          <div className="st3-footer__support-actions">
            <Link
              href="/shop"
              className="st3-footer__primary-action st3-footer__primary-cta"
            >
              Explore store
            </Link>

            <Link href="/track-order" className="st3-footer__secondary-action">
              Track an order
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>

        <div className="st3-footer__top">
          <div className="st3-footer__identity">
            <Link
              href="/"
              className="st3-footer__brand"
              aria-label="Stereophonie home"
            >
              <V3BrandLogo />
            </Link>

            <p className="st3-footer__tagline">Technology, made simple.</p>

            <div
              className="st3-footer__socials"
              aria-label="Stereophonie social media"
            >
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Stereophonie on Instagram"
              >
                <FaInstagram />
              </a>

              <a
                href="https://www.tiktok.com/@stereophoniestore?_r=1&_t=ZS-98jTbFPraRc"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Stereophonie on TikTok"
              >
                <FaTiktok />
              </a>

              <a
                href="https://www.facebook.com/stereophoniestore"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Stereophonie on Facebook"
              >
                <FaFacebookF />
              </a>
            </div>

            <a
              href="https://maps.google.com/?q=Stereophonie"
              target="_blank"
              rel="noopener noreferrer"
              className="st3-footer__store-location"
              aria-label="Open Stereophonie store location"
            >
              <span
                className="st3-footer__store-location-icon"
                aria-hidden="true"
              >
                <MapPin />
              </span>

              <span>Store location</span>

              <svg
                className="st3-footer__store-location-arrow"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </div>

          <div className="st3-footer__columns">
            <div className="st3-footer__column">
              <p className="st3-footer__title">Shop</p>

              <Link href="/shop">All products</Link>

              <Link href="/shop?sort=newest">New arrivals</Link>

              <Link href="/shop?offers=true">Offers</Link>

              <Link href="/wishlist">Wishlist</Link>
            </div>

            <div className="st3-footer__column">
              <p className="st3-footer__title">Account</p>

              <Link href="/account">My account</Link>

              <Link href="/track-order">Track order</Link>

              <Link href="/checkout">Shopping bag</Link>
            </div>

            <div className="st3-footer__column">
              <p className="st3-footer__title">Support</p>

              <Link href="/delivery">Delivery</Link>

              <Link href="/returns">Returns</Link>

              <Link href="/about">About Stereophonie</Link>
            </div>

            <div className="st3-footer__column">
              <p className="st3-footer__title">Legal</p>

              <Link href="/privacy">Privacy</Link>

              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>

        <div className="st3-footer__bottom">
          <span>
            © {new Date().getFullYear()} Stereophonie. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
