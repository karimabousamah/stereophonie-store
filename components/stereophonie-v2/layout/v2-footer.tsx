import Link from "next/link";
import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa6";

import BrandLogo from "@/components/storefront/brand-logo";

export default function V2Footer() {
  return (
    <footer className="st-v2-footer">
      <div className="st-v2-container">
        <div className="st-v2-footer__status">
          <span>
            <i className="st-v2-led" />
            STEREOPHONIE SYSTEM / ONLINE
          </span>

          <span>BEIRUT / LEBANON</span>
        </div>

        <div className="st-v2-footer__main">
          <div className="st-v2-footer__brand">
            <BrandLogo variant="dark" className="w-[240px]" />

            <p>
              Consumer electronics, gaming, mobile, computing, audio and
              connected technology.
            </p>

            <div className="st-v2-footer__socials">
              <a
                href="https://www.instagram.com/stereophoniestore?igsh=azJyaXBlMmI0OWwz"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>

              <a
                href="https://www.tiktok.com/@stereophoniestore?_r=1&_t=ZS-98jTbFPraRc"
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
              >
                <FaTiktok />
              </a>

              <a
                href="https://www.facebook.com/stereophoniestore"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
            </div>
          </div>

          <div className="st-v2-footer__column">
            <span>STORE</span>
            <Link href="/shop">Shop all</Link>
            <Link href="/wishlist">Wishlist</Link>
            <Link href="/track-order">Track order</Link>
            <Link href="/account">My account</Link>
          </div>

          <div className="st-v2-footer__column">
            <span>SUPPORT</span>
            <Link href="/delivery">Delivery</Link>
            <Link href="/returns">Returns</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>

          <div className="st-v2-footer__column">
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
              Directions
            </a>
          </div>
        </div>

        <div className="st-v2-footer__system-strip">
          <span>
            <i className="st-v2-footer__system-led" />
            STORE SYSTEM ONLINE
          </span>

          <span>STEREOPHONIE / RETAIL TERMINAL</span>

          <span>LEBANON / EST. SYSTEM ACTIVE</span>
        </div>

        <div className="st-v2-footer__bottom">
          <span>© {new Date().getFullYear()} Stereophonie Store</span>

          <Link href="/about">
            STORE INFO
            <ArrowUpRight />
          </Link>
        </div>
      </div>
    </footer>
  );
}
