import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Clock3,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";

import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";

export const metadata: Metadata = {
  title: "Delivery Information",
  description:
    "Learn about Stereophonie delivery coverage, fees, estimated delivery times, and available payment methods in Lebanon.",
};

const deliveryDetails = [
  {
    title: "Delivery coverage",
    description: "We deliver orders to customers across Lebanon.",
    icon: MapPin,
  },
  {
    title: "Delivery fee",
    description: "A flat delivery fee of $5 applies to orders below $150.",
    icon: Truck,
  },
  {
    title: "Free delivery",
    description: "Delivery is free when the total order value is $150 or more.",
    icon: PackageCheck,
  },
  {
    title: "Estimated timing",
    description: "Orders are normally delivered within 3–4 working days.",
    icon: Clock3,
  },
];

export default function DeliveryPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <section className="border-b border-black/10 bg-black text-white">
        <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/40">
            Customer care
          </p>

          <h1 className="mt-6 max-w-5xl text-[clamp(3.5rem,9vw,8rem)] font-semibold uppercase leading-[0.85] tracking-[-0.07em]">
            Delivery
            <br />
            Information
          </h1>

          <p className="mt-9 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            Everything you need to know about receiving your Stereophonie order
            in Lebanon.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid border-y border-black/10 md:grid-cols-2 xl:grid-cols-4">
          {deliveryDetails.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className={`py-9 md:px-7 ${
                  index < deliveryDetails.length - 1
                    ? "border-b border-black/10 xl:border-b-0 xl:border-r"
                    : ""
                } ${index % 2 === 0 ? "md:border-r md:border-black/10" : ""}`}
              >
                <Icon className="h-5 w-5" />

                <h2 className="mt-8 text-sm font-semibold uppercase tracking-[0.16em]">
                  {item.title}
                </h2>

                <p className="mt-4 text-sm leading-7 text-black/50">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#f3f1ed]">
        <div className="mx-auto grid max-w-[1600px] lg:grid-cols-2">
          <div className="border-b border-black/10 px-5 py-16 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-24">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
              Payment methods
            </p>

            <h2 className="mt-5 text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.05em] sm:text-6xl">
              Pay when
              <br />
              delivered
            </h2>

            <div className="mt-10 border border-black bg-black p-6 text-white">
              <div className="flex items-start gap-4">
                <Banknote className="mt-0.5 h-5 w-5 shrink-0" />

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.15em]">
                    Cash on Delivery
                  </p>

                  <p className="mt-3 text-sm leading-7 text-white/55">
                    Cash on Delivery is currently the only active payment
                    method. Payment is made when your order arrives.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
              Coming soon
            </p>

            <div className="mt-8 space-y-4">
              <div className="border border-black/10 bg-white p-6">
                <div className="flex items-center justify-between gap-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.15em]">
                    Whish Money
                  </p>

                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">
                    Coming soon
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-black/45">
                  This payment option is not yet enabled.
                </p>
              </div>

              <div className="border border-black/10 bg-white p-6">
                <div className="flex items-center justify-between gap-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.15em]">
                    Card payment
                  </p>

                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">
                    Coming soon
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-black/45">
                  Online debit and credit card payments are not yet enabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
              Important information
            </p>

            <h2 className="mt-5 text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.05em] sm:text-6xl">
              Before your
              <br />
              order arrives
            </h2>
          </div>

          <div className="space-y-6 border-t border-black/10 pt-8 text-sm leading-7 text-black/55">
            <p>
              Delivery times are estimates and may occasionally be affected by
              weekends, public holidays, severe weather, address accessibility,
              or exceptional courier delays.
            </p>

            <p>
              Please provide a complete address and an active Lebanese phone
              number during checkout so the delivery team can contact you.
            </p>

            <p>
              Customers should inspect the order upon delivery and contact Nita
              Style promptly if there is an issue with the package received.
            </p>

            <a
              href="https://wa.me/96176992206"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex min-h-14 items-center justify-between gap-10 border border-black bg-black px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
            >
              Contact us on WhatsApp
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>

            <p className="text-xs text-black/35">
              By placing an order, you also agree to our{" "}
              <Link
                href="/returns"
                className="underline underline-offset-4 hover:text-black"
              >
                No Returns Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
