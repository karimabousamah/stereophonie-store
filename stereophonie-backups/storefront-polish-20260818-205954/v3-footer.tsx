import Link from "next/link";

import { V3BrandLogo } from "@/components/stereophonie-v3/shared/v3-brand-logo";
export default function V3Footer() {
  return (
    <footer className="st3-footer">
      <div className="st3-footer__inner">
        <div className="st3-footer__top">
          <div>
            <Link
              href="/"
              className="st3-footer__brand"
            >
<V3BrandLogo />
</Link>

            <p className="st3-footer__tagline">
              Technology, made simple.
            </p>
          </div>

          <div className="st3-footer__columns">
            <div>
              <p className="st3-footer__title">
                Shop
              </p>

              <Link href="/shop">
                All products
              </Link>

              <Link href="/shop?offers=true">
                Offers
              </Link>

              <Link href="/wishlist">
                Wishlist
              </Link>
            </div>

            <div>
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

            <div>
              <p className="st3-footer__title">
                Stereophonie
              </p>

              <Link href="/about">
                About
              </Link>

              <Link href="/delivery">
                Delivery
              </Link>

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
        </div>
      </div>
    </footer>
  );
}
