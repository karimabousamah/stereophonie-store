import Link from "next/link";

import V3Reveal from "@/components/stereophonie-v3/shared/v3-reveal";
import V3ProductCard, {
  type V3Product,
} from "@/components/stereophonie-v3/shared/v3-product-card";

export type V3HomeCategory = {
  id: string;
  name: string;
  slug: string | null;
  homepage_title: string | null;
  homepage_description: string | null;
  homepage_wallpaper_url: string | null;
};

function ProductSection({
  eyebrow,
  title,
  description,
  products,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: V3Product[];
  href: string;
  linkLabel: string;
}) {
  if (!products.length) {
    return null;
  }

  return (
    <V3Reveal>
      <section className="st3-products-section">
      <div className="st3-section-heading">
        <div>
          <p className="st3-section-eyebrow">
            {eyebrow}
          </p>

          <h2>{title}</h2>

          <p className="st3-section-description">
            {description}
          </p>
        </div>

        <Link
          href={href}
          className="st3-section-link"
        >
          {linkLabel}
          <span aria-hidden="true">›</span>
        </Link>
      </div>

      <div className="st3-product-grid">
        {products.map((product) => (
          <V3ProductCard
            key={product.id}
            product={product}
          />
        ))}
        </div>
      </section>
    </V3Reveal>
  );
}

export default function V3Homepage({
  categories,
  latestProducts,
  offerProducts,
  featuredProducts,
}: {
  categories: V3HomeCategory[];
  latestProducts: V3Product[];
  offerProducts: V3Product[];
  featuredProducts: V3Product[];
}) {
  return (
    <main className="st3-home-live">
      <section className="st3-live-hero">
        <div className="st3-live-hero__content">
          <p className="st3-live-hero__eyebrow">
            Stereophonie
          </p>

          <h1>
            Technology,
            <br />
            made simple.
          </h1>

          <p className="st3-live-hero__copy">
            Discover phones, computers,
            entertainment and accessories
            selected for everyday life.
          </p>

          <div className="st3-live-hero__actions">
            <Link
              href="/shop"
              className="st3-button"
            >
              Shop now
            </Link>

            <Link
              href="/shop?offers=true"
              className="st3-link-arrow"
            >
              View offers
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>

        <div
          className="st3-live-hero__orb"
          aria-hidden="true"
        />
      </section>

      {categories.length ? (
        <V3Reveal>
          <section className="st3-category-section">
          <div className="st3-section-heading">
            <div>
              <p className="st3-section-eyebrow">
                Explore
              </p>

              <h2>Shop by category.</h2>

              <p className="st3-section-description">
                Find exactly what you need.
              </p>
            </div>

            <Link
              href="/shop"
              className="st3-section-link"
            >
              Shop all
              <span aria-hidden="true">›</span>
            </Link>
          </div>

          <div className="st3-category-rail">
            {categories.map((category) => {
              const title =
                category.homepage_title?.trim() ||
                category.name;

              const description =
                category.homepage_description?.trim() ||
                `Explore ${category.name}.`;

              return (
                <Link
                  key={category.id}
                  href={`/shop?category=${encodeURIComponent(
                    category.name,
                  )}`}
                  className="st3-category-card"
                >
                  <div className="st3-category-card__copy">
                    <h3>{title}</h3>

                    <p>{description}</p>
                  </div>

                  <div className="st3-category-card__visual">
                    {category.homepage_wallpaper_url ? (
                      <img
                        src={
                          category.homepage_wallpaper_url
                        }
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className="st3-category-card__fallback">
                        <span>
                          {category.name
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="st3-category-card__arrow">
                    ›
                  </span>
                </Link>
              );
            })}
          </div>
          </section>
        </V3Reveal>
      ) : null}

      <ProductSection
        eyebrow="Latest"
        title="Just arrived."
        description="The newest technology at Stereophonie."
        products={latestProducts}
        href="/shop?sort=newest"
        linkLabel="View all"
      />

      <ProductSection
        eyebrow="Offers"
        title="A better price."
        description="Selected products, exceptional value."
        products={offerProducts}
        href="/shop?offers=true"
        linkLabel="View offers"
      />

      <ProductSection
        eyebrow="Selected for you"
        title="Worth discovering."
        description="A selection from across the Stereophonie store."
        products={featuredProducts}
        href="/shop"
        linkLabel="Explore store"
      />

      <V3Reveal>
        <section className="st3-service-strip">
        <div className="st3-service-strip__item">
          <strong>Secure shopping</strong>
          <span>
            Shop confidently with a streamlined
            checkout experience.
          </span>
        </div>

        <div className="st3-service-strip__item">
          <strong>Selected technology</strong>
          <span>
            Products chosen across leading
            technology categories.
          </span>
        </div>

        <div className="st3-service-strip__item">
          <strong>Here when you need us</strong>
          <span>
            Access your account and track your
            orders online.
          </span>
        </div>
        </section>
      </V3Reveal>
    </main>
  );
}
