import Link from "next/link";

import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";

export default function HomePage() {
  return (
    <>
      <V3Header />

      <main className="st3-home">
        <section className="st3-home__hero">
          <div className="st3-home__hero-content">
            <p className="st3-home__eyebrow">
              Stereophonie
            </p>

            <h1 className="st3-home__title">
              Technology.
              <br />
              Simply better.
            </h1>

            <p className="st3-home__subtitle">
              Discover the latest technology, selected
              for the way you live, work and play.
            </p>

            <div className="st3-home__actions">
              <Link
                href="/shop"
                className="st3-button"
              >
                Shop
              </Link>

              <Link
                href="/shop?offers=true"
                className="st3-home__text-link"
              >
                View offers
                <span aria-hidden="true">›</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="st3-home__statement">
          <div className="st3-home__statement-inner">
            <p className="st3-home__section-label">
              Stereophonie
            </p>

            <h2>
              Everything you love about technology.
              <span> In one place.</span>
            </h2>
          </div>
        </section>

        <section className="st3-home__preview-grid">
          <article className="st3-home__preview st3-home__preview--light">
            <div>
              <p className="st3-home__preview-eyebrow">
                Latest
              </p>

              <h2>Just arrived.</h2>

              <p>
                Explore the newest additions to
                Stereophonie.
              </p>

              <Link href="/shop">
                Shop latest
                <span aria-hidden="true">›</span>
              </Link>
            </div>
          </article>

          <article className="st3-home__preview st3-home__preview--dark">
            <div>
              <p className="st3-home__preview-eyebrow">
                Offers
              </p>

              <h2>More for less.</h2>

              <p>
                Discover selected technology at
                exceptional prices.
              </p>

              <Link href="/shop?offers=true">
                View offers
                <span aria-hidden="true">›</span>
              </Link>
            </div>
          </article>
        </section>

        <section className="st3-home__coming">
          <p>
            V3 storefront
          </p>

          <h2>
            A completely new Stereophonie is being built.
          </h2>

          <span>
            Categories, products and content will connect
            to the existing store database in the next
            phase.
          </span>
        </section>
      </main>
    </>
  );
}
