import type { ReactNode } from "react";
import Link from "next/link";

import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";

type PolicySection = {
  title: string;
  content: ReactNode;
};

type PolicyPageProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  updated: string;
  sections: PolicySection[];
};

export default function PolicyPage({
  eyebrow,
  title,
  introduction,
  updated,
  sections,
}: PolicyPageProps) {
  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <section className="border-b border-black/10 bg-black text-white">
        <div className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/40">
            {eyebrow}
          </p>

          <h1 className="mt-6 max-w-6xl text-[clamp(3.5rem,8vw,8rem)] font-semibold uppercase leading-[0.86] tracking-[-0.065em]">
            {title}
          </h1>

          <p className="mt-9 max-w-3xl text-sm leading-7 text-white/55 sm:text-base">
            {introduction}
          </p>

          <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Last updated: {updated}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
          <aside>
            <div className="border-t border-black/10 pt-6 lg:sticky lg:top-28">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
                On this page
              </p>

              <nav className="mt-6 space-y-4">
                {sections.map((section, index) => (
                  <a
                    key={section.title}
                    href={`#section-${index + 1}`}
                    className="block text-sm text-black/55 transition hover:text-black"
                  >
                    {String(index + 1).padStart(2, "0")} — {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-10 border border-black/10 bg-[#f3f1ed] p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">
                  Contact
                </p>

                <a
                  href="mailto:thenitastyle@gmail.com"
                  className="mt-4 block break-all text-sm font-medium underline underline-offset-4"
                >
                  thenitastyle@gmail.com
                </a>

                <a
                  href="https://wa.me/96176992206"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-sm font-medium underline underline-offset-4"
                >
                  WhatsApp: +961 76 99 22 06
                </a>
              </div>
            </div>
          </aside>

          <div className="border-t border-black/10">
            {sections.map((section, index) => (
              <section
                id={`section-${index + 1}`}
                key={section.title}
                className="scroll-mt-28 border-b border-black/10 py-9 sm:py-12"
              >
                <div className="grid gap-6 sm:grid-cols-[80px_1fr]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/30">
                    {String(index + 1).padStart(2, "0")}
                  </p>

                  <div>
                    <h2 className="text-2xl font-semibold uppercase tracking-[-0.035em] sm:text-3xl">
                      {section.title}
                    </h2>

                    <div className="mt-5 space-y-4 text-sm leading-7 text-black/55 sm:text-base sm:leading-8">
                      {section.content}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            <div className="mt-12 flex flex-col items-start justify-between gap-7 bg-black p-7 text-white sm:p-10 lg:flex-row lg:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Stereophonie
                </p>

                <p className="mt-3 max-w-xl text-xl font-medium">
                  Need clarification about an order or one of our policies?
                </p>
              </div>

              <Link
                href="/delivery"
                className="inline-flex min-h-12 items-center border border-white bg-white px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
              >
                Delivery information
              </Link>
            </div>
          </div>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
