import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Truck } from "lucide-react";
import { FaInstagram, FaWhatsapp } from "react-icons/fa6";

const exploreLinks = [
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "About Nita Style", href: "/about" },
  { label: "Track Order", href: "/track-order" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "My Account", href: "/account" },
];

const customerCareLinks = [
  { label: "Delivery Information", href: "/delivery" },
  { label: "No Returns Policy", href: "/returns" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms and Conditions", href: "/terms" },
];

export default function StoreFooter() {
  return (
    <footer className="bg-black text-white">
      <section className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr] lg:gap-10">
          <div>
            <Link
              href="/"
              aria-label="Nita Style homepage"
              className="inline-flex items-center"
            >
              <Image
                src="/brand/nita-style-logo-white.png"
                alt="Nita Style"
                width={1200}
                height={400}
                className="h-auto w-[280px] object-contain sm:w-[325px] lg:w-[360px]"
              />
            </Link>

            <p className="mt-8 max-w-sm text-sm leading-7 text-white/50">
              A Lebanon-based online boutique founded by Nicole and Tania,
              offering a curated selection of Italian apparel for modern women.
            </p>

            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Curated Italian apparel
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Explore
            </p>

            <nav className="mt-6 space-y-4">
              {exploreLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-white/65 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Customer care
            </p>

            <nav className="mt-6 space-y-4">
              {customerCareLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-white/65 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
              Contact
            </p>

            <div className="mt-6 space-y-5 text-sm text-white/65">
              <a
                href="https://www.instagram.com/thenitastyle/"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 transition hover:text-white"
              >
                <FaInstagram className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                <span>@thenitastyle</span>
              </a>

              <a
                href="https://wa.me/96176992206"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 transition hover:text-white"
              >
                <FaWhatsapp className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                <span>+961 76 99 22 06</span>
              </a>

              <a
                href="mailto:thenitastyle@gmail.com"
                className="flex items-center gap-3 break-all transition hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span>thenitastyle@gmail.com</span>
              </a>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Online store based in Lebanon</span>
              </div>
            </div>

            <div className="mt-8 border border-white/10 p-5">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Delivery across Lebanon
                  </p>

                  <p className="mt-2 text-xs leading-6 text-white/45">
                    $5 delivery · Free above $150 · Estimated delivery within
                    3–4 working days.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-6 text-[10px] uppercase tracking-[0.14em] text-white/30">
          <p>
            © {new Date().getFullYear()} NITA STYLE. ALL RIGHTS RESERVED.
            <span className="mx-2 text-white/20">|</span>
            <span className="normal-case tracking-normal">
              Developed by{" "}
              <span className="font-semibold uppercase tracking-[0.12em] text-white/50">
                CODEVIQ
              </span>
            </span>
          </p>
        </div>
      </section>
    </footer>
  );
}
