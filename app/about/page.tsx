import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Gem, Heart, Scissors, Diamond } from "lucide-react";

import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";

export const metadata: Metadata = {
  title: "About Stereophonie",
  description:
    "Discover Stereophonie, a Lebanon-based electronics store founded by Nicole and Tania and dedicated to curated consumer electronics and technology.",
};

const values = [
  {
    title: "Selected quality",
    description:
      "Every piece is chosen carefully for its fabric, finish, silhouette, and ability to remain elegant beyond a single season.",
    icon: Gem,
  },
  {
    title: "Italian character",
    description:
      "Our collections reflect the confidence, refinement, and distinctive details associated with modern Italian fashion.",
    icon: Scissors,
  },
  {
    title: "Modern femininity",
    description:
      "We select products that feel polished yet effortless, helping women express their personal style with confidence.",
    icon: Diamond,
  },
  {
    title: "Personal service",
    description:
      "Stereophonie is built around trust, attentive support, and a more personal approach to shopping online.",
    icon: Heart,
  },
];

const selectionPrinciples = [
  "Distinctive designs without unnecessary excess",
  "Elegant silhouettes for modern everyday styling",
  "Considered fabrics, finishes, and details",
  "Focused collections instead of overwhelming choice",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <section className="relative overflow-hidden border-b border-black/10 bg-[#0b0b0b] text-white">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute -left-20 top-20 h-80 w-80 rounded-full border border-white" />
          <div className="absolute -right-16 bottom-[-120px] h-[430px] w-[430px] rounded-full border border-white" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-[1600px] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex items-end border-b border-white/10 px-5 py-16 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
                About Stereophonie
              </p>

              <h1 className="mt-6 text-[clamp(4rem,10vw,9rem)] font-semibold uppercase leading-[0.82] tracking-[-0.075em]">
                Our
                <br />
                Story
              </h1>
            </div>
          </div>

          <div className="flex items-center px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/35">
                Founded by Nicole &amp; Tania
              </p>

              <p className="mt-7 text-2xl font-medium leading-[1.35] tracking-[-0.025em] text-white sm:text-3xl lg:text-4xl">
                Stereophonie was created from a shared love for quality
                technology, distinctive details, and the effortless confidence
                of Italian fashion.
              </p>

              <p className="mt-8 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
                Based in Lebanon and operating entirely online, we curate
                consumer electronics and technology that feels modern, refined,
                and easy to make your own.
              </p>

              <Link
                href="/shop"
                className="group mt-10 inline-flex min-h-14 items-center gap-8 border border-white bg-white px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-white"
              >
                Explore the collection
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
              Who we are
            </p>

            <h2 className="mt-5 text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.05em] sm:text-6xl">
              A more
              <br />
              thoughtful
              <br />
              wardrobe
            </h2>
          </div>

          <div className="border-t border-black/10 pt-8">
            <p className="max-w-3xl text-xl leading-9 tracking-[-0.02em] text-black/75 sm:text-2xl sm:leading-10">
              Stereophonie is an online technology destination for women who
              appreciate distinctive products that remain easy to wear and
              style.
            </p>

            <div className="mt-10 grid gap-8 text-sm leading-7 text-black/50 md:grid-cols-2">
              <p>
                Rather than offering hundreds of unrelated products, we focus on
                selected technology that works together as a clear and
                considered collection. Each arrival is selected for its shape,
                detail, quality, and styling potential.
              </p>

              <p>
                Our goal is to make discovering fashion feel personal again:
                fewer distractions, stronger products, and a shopping experience
                built around elegance, confidence, and attention to detail.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="nita-about-values mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="border-b border-black/10 pb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
            What guides us
          </p>

          <h2 className="mt-5 text-4xl font-semibold uppercase tracking-[-0.05em] sm:text-6xl">
            Our values
          </h2>
        </div>

        <div className="grid border-b border-black/10 md:grid-cols-2 xl:grid-cols-4">
          {values.map((value, index) => {
            const Icon = value.icon;

            return (
              <article
                key={value.title}
                className={`py-9 md:px-7 ${
                  index < values.length - 1
                    ? "border-b border-black/10 xl:border-b-0 xl:border-r"
                    : ""
                } ${index % 2 === 0 ? "md:border-r md:border-black/10" : ""}`}
              >
                <Icon className="h-5 w-5" />

                <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.16em]">
                  {value.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-black/50">
                  {value.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-t border-black/10 bg-black text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-10 px-5 py-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
              Discover Stereophonie
            </p>

            <h2 className="mt-5 max-w-3xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.05em] sm:text-6xl">
              Find your next favourite piece.
            </h2>
          </div>

          <Link
            href="/shop"
            className="group inline-flex min-h-14 shrink-0 items-center justify-between gap-10 border border-white bg-white px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
          >
            Shop now
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
