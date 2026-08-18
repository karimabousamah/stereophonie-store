import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import BrandLogo from "@/components/storefront/brand-logo";

import NeedHelpChoosing from "@/components/stereophonie-v2/layout/need-help-choosing";
export default function StoreFooter() {
  return (
    <>
      <>
        <NeedHelpChoosing />

        <footer className="stereo-footer">
          <div className="stereo-container">
            <div className="stereo-footer__top">
              <div className="stereo-footer__brand">
                <BrandLogo variant="dark" className="w-[230px]" />

                <p>
                  Electronics, mobile, computing, gaming, audio and technology
                  from Stereophonie Store.
                </p>

                <div className="stereo-footer__socials">
                  <a
                    href="https://www.instagram.com/stereophoniestore?igsh=azJyaXBlMmI0OWwz"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram"
                  >
                    IG
                  </a>

                  <a
                    href="https://www.tiktok.com/@stereophoniestore?_r=1&_t=ZS-98jTbFPraRc"
                    target="_blank"
                    rel="noreferrer"
                  >
                    TikTok
                  </a>

                  <a
                    href="https://www.facebook.com/stereophoniestore"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Facebook"
                  >
                    FB
                  </a>
                </div>
              </div>

              <div className="stereo-footer__column">
                <span>SHOP</span>
                <Link href="/shop">All products</Link>
                <Link href="/collections">Collections</Link>
                <Link href="/wishlist">Wishlist</Link>
                <Link href="/track-order">Track order</Link>
              </div>

              <div className="stereo-footer__column">
                <span>SUPPORT</span>
                <Link href="/delivery">Delivery</Link>
                <Link href="/returns">Returns & exchange</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
              </div>

              <div className="stereo-footer__contact">
                <span>CONTACT</span>

                <a href="tel:+9613161285">
                  <Phone />
                  +961 3 161 285
                </a>

                <a
                  href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin />
                  Get directions
                </a>
              </div>
            </div>

            <div className="stereo-footer__statement">
              <span>TECHNOLOGY</span>
              <strong>STEREOPHONIE</strong>
              <span>LEBANON</span>
            </div>

            <div className="stereo-footer__bottom">
              <span>
                © {new Date().getFullYear()} Stereophonie Store. All rights
                reserved.
              </span>

              <Link href="/about">
                About Stereophonie
                <ArrowUpRight />
              </Link>
            </div>
          </div>
        </footer>
      </>
    </>
  );
}
