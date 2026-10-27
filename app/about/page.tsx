import type { Metadata } from "next";
import {
  MessagesSquare,
  PackageCheck,
  ShieldCheck,
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
    "Learn about Stereophonie, a Lebanese electronics store established in 2008.",
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

export default function AboutPage() {
  return (
    <div className="st-retail-shell">
      <V3Header />

      <main className="st-retail-page st-retail-compact-v1 st-support-page st-about-page">


        <section className="st-about-page__story">
          <div>
            <p className="st-retail-eyebrow">About our store</p>
            <h1>Stereophonie</h1>
            <p className="st-about-page__established">
              Established in 2008
            </p>
          </div>
          <div>
            <p>
              Since 2008, Stereophonie has served customers in Lebanon
              with a wide range of electronics, including smartphones,
              computers, gaming products, audio equipment and accessories.
            </p>
            <p>
              Visit our store in Mtaileb to explore products in person
              and receive assistance, or shop online with delivery
              available across Lebanon.
            </p>
          </div>
        </section>

        <section className="st-retail-section st-about-page__values">
          <div className="st-retail-section__heading">
            <div>
              <p className="st-retail-eyebrow">What guides us</p>
              <h2>How we work.</h2>
            </div>
          </div>
          <div className="st-about-page__value-grid">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <article key={value.title}>
                  <div className="st-about-page__value-title">
                    <Icon aria-hidden="true" />
                    <h3>{value.title}</h3>
                  </div>
                  <p>{value.description}</p>
                </article>
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


              </div>

              {/* ================================
                STORE DETAILS
                ================================ */}

              <div className="st-about-visit__details">
                <div className="st-about-visit__location">
                  <span className="st-about-visit__detail-icon">
                    <MapPin aria-hidden="true" />
                  </span>

                  <div>
                    <p className="st-about-visit__label">Store location</p>
                    <h3>Stereophonie Store</h3>
                    <p>Mtaileb, Mount Lebanon, Lebanon</p>
                  </div>
                </div>

                <div className="st-about-visit__hours">
                  <div className="st-about-visit__hours-head">
                    <Clock3 aria-hidden="true" />

                    <div>
                      <p className="st-about-visit__label">Opening hours</p>
                      <h3>When to visit</h3>
                    </div>
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


      </main>

      <V3Footer />
    </div>
  );
}
