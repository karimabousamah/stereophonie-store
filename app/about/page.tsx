import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Gamepad2,
  Headphones,
  Laptop,
  MessagesSquare,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  CalendarDays,
} from "lucide-react";

import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";

export const metadata: Metadata = {
  title: "About Stereophonie",
  description:
    "Discover Stereophonie, a Lebanon-based destination for thoughtfully selected consumer technology and support.",
};

const values = [
  {
    icon: CheckCircle2,
    title: "Considered selection",
    description:
      "Useful technology chosen for quality, value, and the role it plays in everyday life.",
  },
  {
    icon: MessagesSquare,
    title: "Clear guidance",
    description:
      "Straightforward product information and responsive help when you need a human answer.",
  },
  {
    icon: ShieldCheck,
    title: "Confidence first",
    description:
      "A clear checkout, transparent policies, and secure account tools designed around trust.",
  },
  {
    icon: PackageCheck,
    title: "Local delivery",
    description:
      "Dependable delivery across Lebanon with a simple way to follow every active order.",
  },
];

const categories = [
  { icon: Smartphone, label: "Phones & wearables" },
  { icon: Laptop, label: "Computing" },
  { icon: Gamepad2, label: "Gaming" },
  { icon: Headphones, label: "Audio & accessories" },
];

export default function AboutPage() {
  return (
    <div className="st-retail-shell">
      <V3Header />

      <main className="st-retail-page st-support-page st-about-page">
        <section className="st-retail-hero st-about-page__hero">
          <div className="st-retail-hero__copy">
            <p className="st-retail-eyebrow">About Stereophonie</p>
            <h1>Technology, chosen with purpose.</h1>
            <p>
              Stereophonie is a Lebanon-based technology store built to make
              discovering, choosing, and receiving the right products feel
              simpler.
            </p>
            <div className="st-retail-hero__actions">
              <Link
                href="/shop"
                className="st-retail-button st-retail-button--mustard"
              >
                Explore the store
                <ArrowRight />
              </Link>
              <Link
                href="/delivery"
                className="st-retail-button st-retail-button--quiet"
              >
                How delivery works
              </Link>
            </div>
          </div>

          <div className="st-about-page__wordmark" aria-hidden="true">
            <img
              src="/brand/stereophonie-store-logo.png"
              alt="Stereophonie Store"
              className="h-auto w-[210px] max-w-[72%] object-contain sm:w-[245px]"
            />
          </div>
        </section>

        <section className="st-about-page__story">
          <div>
            <p className="st-retail-eyebrow">Why we exist</p>
            <h2>A better way to shop technology.</h2>
          </div>
          <div>
            <p>
              Buying electronics should not feel like decoding a catalogue. We
              bring phones, computing, gaming, audio, smart devices, and useful
              accessories into one considered storefront with clearer choices.
            </p>
            <p>
              Our aim is practical: strong products, honest information, an easy
              cart and checkout, attentive support, and dependable local
              delivery. Every part of the experience should help you decide with
              confidence.
            </p>
          </div>
        </section>

        <section className="st-retail-section st-about-page__values">
          <div className="st-retail-section__heading">
            <div>
              <p className="st-retail-eyebrow">What guides us</p>
              <h2>Built around the customer.</h2>
            </div>
          </div>
          <div className="st-about-page__value-grid">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <article key={value.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <Icon />
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="st-about-page__categories">
          <div>
            <p className="st-retail-eyebrow">What you will find</p>
            <h2>Technology for work, play, and everyday life.</h2>
            <p>
              A focused mix of products that are useful on their own and work
              even better together.
            </p>
          </div>
          <div className="st-about-page__category-list">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.label} href="/shop">
                  <Icon />
                  <span>{category.label}</span>
                  <ArrowRight />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ====================================================
          VISIT STEREOPHONIE
          Store location + opening hours
          ==================================================== */}

        <section
          className="st-about-visit"
          aria-labelledby="st-about-visit-title"
        >
          <div className="st-about-visit__inner">
            <header className="st-about-visit__heading">
              <div>
                <p className="st-retail-eyebrow">Visit Stereophonie</p>

                <h2 id="st-about-visit-title">Find us in Mtaileb.</h2>
              </div>

              <p className="st-about-visit__intro">
                Visit our store for personal assistance, product guidance and an
                in-person look at selected technology.
              </p>
            </header>

            <div className="st-about-visit__layout">
              {/* ================================
                LOCATION / MAP
                ================================ */}

              <div className="st-about-visit__map-shell">
                <iframe
                  className="st-about-visit__map"
                  src="https://www.google.com/maps?q=Stereophonie+Store+Mtaileb+Lebanon&output=embed"
                  title="Stereophonie Store location in Mtaileb"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />

                <div className="st-about-visit__map-label">
                  <span className="st-about-visit__map-signal">
                    <MapPin />
                  </span>

                  <div>
                    <small>Store location</small>
                    <strong>Mtaileb, Lebanon</strong>
                  </div>
                </div>
              </div>

              {/* ================================
                STORE DETAILS
                ================================ */}

              <div className="st-about-visit__details">
                <div className="st-about-visit__location">
                  <span className="st-about-visit__detail-icon">
                    <MapPin />
                  </span>

                  <div>
                    <p className="st-about-visit__label">Stereophonie Store</p>

                    <h3>Mtaileb</h3>

                    <p>Mount Lebanon, Lebanon</p>
                  </div>
                </div>

                <div className="st-about-visit__hours">
                  <div className="st-about-visit__hours-head">
                    <div>
                      <p className="st-about-visit__label">Opening hours</p>

                      <h3>When to visit</h3>
                    </div>

                    <Clock3 />
                  </div>

                  <div className="st-about-visit__schedule">
                    <div className="st-about-visit__schedule-row">
                      <span>Monday – Saturday</span>

                      <strong>10:00 AM – 8:00 PM</strong>
                    </div>

                    <div
                      className="
                    st-about-visit__schedule-row
                    st-about-visit__schedule-row--closed
                  "
                    >
                      <span>Sunday</span>

                      <strong>Closed</strong>
                    </div>
                  </div>
                </div>

                <div className="st-about-visit__notice">
                  <CalendarDays />

                  <p>
                    Store hours may vary on public holidays. Contact us before
                    visiting during holiday periods.
                  </p>
                </div>

                <a
                  href="https://www.google.com/maps/search/?api=1&query=Stereophonie+Store+Mtaileb+Lebanon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="st-about-visit__directions"
                >
                  <span>Get directions</span>

                  <Navigation />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="st-retail-assistance st-about-page__cta">
          <div>
            <div>
              <p className="st-retail-eyebrow">Ready to discover more?</p>
              <h2>Find your next everyday upgrade.</h2>
            </div>
          </div>
          <Link
            href="/shop"
            className="st-retail-button st-retail-button--mustard"
          >
            Shop all products
            <ArrowRight />
          </Link>
        </section>
      </main>

      <V3Footer />
    </div>
  );
}
