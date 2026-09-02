import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Banknote,
  Box,
  CalendarClock,
  Check,
  MapPin,
  PackageCheck,
  Truck,
  WalletCards,
} from "lucide-react";

import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import { getPublicStoreSettings } from "@/lib/store-settings";

export const metadata: Metadata = {
  title: "Delivery",
  description:
    "Learn about Stereophonie delivery coverage, timing, fees, and payment options across Lebanon.",
};

function createDeliveryFacts(
  settings: Awaited<ReturnType<typeof getPublicStoreSettings>>,
) {
  return [
    {
      icon: MapPin,
      label: "Coverage",
      value: settings.deliveryCountry,
      description: `Delivery is currently configured for ${settings.deliveryCountry}.`,
    },
    {
      icon: BadgeDollarSign,
      label: `Orders below $${settings.freeDeliveryThreshold}`,
      value: `$${settings.deliveryFee} delivery`,
      description: "A flat delivery fee is added at checkout.",
    },
    {
      icon: PackageCheck,
      label: `Orders from $${settings.freeDeliveryThreshold}`,
      value: "Free delivery",
      description: "Qualifying orders are delivered without a shipping fee.",
    },
    {
      icon: CalendarClock,
      label: "Estimated timing",
      value: settings.deliveryEstimate,
      description:
        "Timing may vary by location, weekend, and courier availability.",
    },
  ];
}

const deliverySteps = [
  {
    title: "Place your order",
    description: "Confirm your products, address, and active Lebanese number.",
    icon: Box,
  },
  {
    title: "We prepare it",
    description: "Our team confirms availability and prepares the package.",
    icon: Check,
  },
  {
    title: "The courier delivers",
    description: "Your order travels to the address provided at checkout.",
    icon: Truck,
  },
];

export default async function DeliveryPage() {
  const settings = await getPublicStoreSettings();

  const deliveryFacts = createDeliveryFacts(settings);

  return (
    <div className="st-retail-shell">
      <V3Header />

      <main className="st-retail-page st-support-page st-delivery-page">
        <section className="st-retail-hero st-delivery-page__hero">
          <div className="st-retail-hero__copy">
            <p className="st-retail-eyebrow">Shipping across Lebanon</p>
            <h1>Delivery, made clear.</h1>
            <p>
              Straightforward fees, realistic timing, and a simple way to follow
              your order from confirmation to arrival.
            </p>
            <div className="st-retail-hero__actions">
              <Link
                href="/track-order"
                className="st-retail-button st-retail-button--mustard"
              >
                Track your order
                <ArrowRight />
              </Link>
              <Link
                href="/shop"
                className="st-retail-button st-retail-button--quiet"
              >
                Shop products
              </Link>
            </div>
          </div>

          <div className="st-delivery-page__hero-mark" aria-hidden="true">
            <Truck />
          </div>
        </section>

        <section className="st-retail-section st-delivery-page__facts">
          <div className="st-retail-section__heading">
            <div>
              <p className="st-retail-eyebrow">At a glance</p>
              <h2>What to expect.</h2>
            </div>
          </div>

          <div className="st-delivery-page__fact-grid">
            {deliveryFacts.map((fact) => {
              const Icon = fact.icon;
              return (
                <article key={fact.label}>
                  <Icon />
                  <p>{fact.label}</p>
                  <h3>{fact.value}</h3>
                  <span>{fact.description}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="st-delivery-page__process">
          <div className="st-delivery-page__process-copy">
            <p className="st-retail-eyebrow">From cart to your door</p>
            <h2>How delivery works.</h2>
            <p>
              We keep the journey simple and give you a dedicated tracking page
              whenever you want the latest update.
            </p>
            <Link href="/track-order" className="st-retail-text-link">
              Open order tracking
              <ArrowRight />
            </Link>
          </div>

          <div className="st-delivery-page__steps">
            {deliverySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title}>
                  <span className="st-delivery-page__step-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span
                    className="st-delivery-page__step-icon"
                    aria-hidden="true"
                  >
                    <Icon />
                  </span>

                  <div className="st-delivery-page__step-copy">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="st-retail-section st-delivery-page__payment">
          <div className="st-retail-section__heading">
            <div>
              <p className="st-retail-eyebrow">Payment methods</p>
              <h2>Pay your way.</h2>
              <p>Available methods are always confirmed before you order.</p>
            </div>
          </div>

          <div className="st-delivery-page__payment-grid">
            <article className="is-active">
              <Banknote />
              <div>
                <span>Available now</span>
                <h3>Cash on delivery</h3>
                <p>Pay the courier when your order arrives.</p>
              </div>
              <Check />
            </article>
            <article className="is-coming-soon" aria-disabled="true">
              <WalletCards />
              <div>
                <span>Coming soon</span>
                <h3>Whish Money</h3>
                <p>Digital payment will be added when fully enabled.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="st-delivery-page__notice">
          <div>
            <div>
              <p className="st-retail-eyebrow">Before your order arrives</p>
              <h2>Keep your phone nearby.</h2>
              <p>
                Provide a complete address and active number so the delivery
                team can reach you. Inspect the package when it arrives and
                contact Stereophonie promptly if anything is wrong.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/9613161285"
            target="_blank"
            rel="noreferrer"
            className="st-retail-button st-retail-button--quiet"
          >
            WhatsApp support
            <ArrowRight />
          </a>
        </section>
      </main>

      <V3Footer />
    </div>
  );
}
