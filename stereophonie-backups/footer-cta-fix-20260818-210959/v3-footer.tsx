import Link from "next/link";

import { V3BrandLogo } from "@/components/stereophonie-v3/shared/v3-brand-logo";

export default function V3Footer() {
  return (
    <footer className="st3-footer">
      <div className="st3-footer__inner">

        <div className="st3-footer__support">
          <div>
            <p className="st3-footer__support-eyebrow">
              Stereophonie
            </p>

            <h2>
              Technology made simpler.
            </h2>

            <p>
              Discover products, manage your account
              and get help whenever you need it.
            </p>
          </div>

          <div className="st3-footer__support-actions">
            <Link
              href="/shop"
              className="st3-footer__primary-action"
            >
              Explore store
            </Link>

            <Link
              href="/track-order"
              className="st3-footer__secondary-action"
            >
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

            <p className="st3-footer__tagline">
              Technology, made simple.
            </p>
          </div>


          <div className="st3-footer__columns">

            <div className="st3-footer__column">
              <p className="st3-footer__title">
                Shop
              </p>

              <Link href="/shop">
                All products
              </Link>

              <Link href="/shop?sort=newest">
                New arrivals
              </Link>

              <Link href="/shop?offers=true">
                Offers
              </Link>

              <Link href="/wishlist">
                Wishlist
              </Link>
            </div>


            <div className="st3-footer__column">
              <p className="st3-footer__title">
                Account
              </p>

              <Link href="/account">
                My account
              </Link>

              <Link href="/track-order">
                Track order
              </Link>

              <Link href="/checkout">
                Shopping bag
              </Link>
            </div>


            <div className="st3-footer__column">
              <p className="st3-footer__title">
                Support
              </p>

              <Link href="/delivery">
                Delivery
              </Link>

              <Link href="/returns">
                Returns
              </Link>

              <Link href="/about">
                About Stereophonie
              </Link>
            </div>


            <div className="st3-footer__column">
              <p className="st3-footer__title">
                Legal
              </p>

              <Link href="/privacy">
                Privacy
              </Link>

              <Link href="/terms">
                Terms
              </Link>
            </div>

          </div>
        </div>


        <div className="st3-footer__bottom">
          <span>
            © {new Date().getFullYear()} Stereophonie.
            All rights reserved.
          </span>

          <span className="st3-footer__location">
            Lebanon
          </span>
        </div>

      </div>
    </footer>
  );
}
