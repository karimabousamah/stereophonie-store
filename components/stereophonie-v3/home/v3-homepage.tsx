import Link from "next/link";

import V3Reveal from "@/components/stereophonie-v3/shared/v3-reveal";

import V3ProductCard, {
  type V3Product,
} from "@/components/stereophonie-v3/shared/v3-product-card";

export type V3HomeCategory = {
  id: string;
  name: string;
  slug: string | null;
  homepage_title?: string | null;
  homepage_description?: string | null;
  homepage_wallpaper_url?: string | null;
};

function primaryProductImage(
  product: V3Product | undefined,
) {
  if (!product) {
    return null;
  }

  const images = [...product.images]
    .filter((image) => image.image_url)
    .sort((first, second) => {
      if (
        first.is_primary !==
        second.is_primary
      ) {
        return first.is_primary ? -1 : 1;
      }

      return (
        (first.position ?? 0) -
        (second.position ?? 0)
      );
    });

  return images[0]?.image_url ?? null;
}

function categoryProduct(
  category: V3HomeCategory,
  products: V3Product[],
) {
  return products.find(
    (product) =>
      product.categoryName
        .trim()
        .toLowerCase() ===
      category.name
        .trim()
        .toLowerCase(),
  );
}

function ProductSection({
  eyebrow,
  title,
  description,
  products,
  href,
  linkLabel,
  tone = "white",
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: V3Product[];
  href: string;
  linkLabel: string;
  tone?: "white" | "soft";
}) {
  if (!products.length) {
    return null;
  }

  return (
    <V3Reveal>
      <section
        className={`st3-products-section ${
          tone === "soft"
            ? "st3-products-section--soft"
            : ""
        }`}
      >
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
            <span aria-hidden="true">
              ›
            </span>
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
  catalogProducts,
}: {
  categories: V3HomeCategory[];
  latestProducts: V3Product[];
  offerProducts: V3Product[];
  featuredProducts: V3Product[];
  catalogProducts: V3Product[];
}) {
  const heroProduct =
    featuredProducts[0] ??
    latestProducts[0] ??
    catalogProducts[0];

  const heroImage =
    primaryProductImage(heroProduct);

  return (
    <main className="st3-home-live">
      <section className="st3-premium-hero">
        <div className="st3-premium-hero__inner">
          <div className="st3-premium-hero__copy">
            <p className="st3-premium-hero__eyebrow">
              Stereophonie
            </p>

            <h1>
              Technology.
              <br />
              Simply better.
            </h1>

            <p className="st3-premium-hero__description">
              Discover phones, computers,
              entertainment and accessories
              selected for the way you live.
            </p>

            <div className="st3-premium-hero__actions">
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
                <span aria-hidden="true">
                  ›
                </span>
              </Link>
            </div>
          </div>

          <div className="st3-premium-hero__visual">
            <div
              className="st3-premium-hero__halo"
              aria-hidden="true"
            />

            {heroImage ? (
              <img
                src={heroImage}
                alt={
                  heroProduct?.name ??
                  "Stereophonie technology"
                }
                className="st3-premium-hero__image"
              />
            ) : (
              <div className="st3-premium-hero__visual-fallback">
                Stereophonie
              </div>
            )}
          </div>
        </div>
      </section>

      {categories.length ? (
        <V3Reveal>
          <section className="st3-category-section st3-category-section--premium">
            <div className="st3-section-heading">
              <div>
                <p className="st3-section-eyebrow">
                  Explore
                </p>

                <h2>
                  Find your technology.
                </h2>

                <p className="st3-section-description">
                  Browse Stereophonie by
                  category.
                </p>
              </div>

              <Link
                href="/shop"
                className="st3-section-link"
              >
                Shop all
                <span aria-hidden="true">
                  ›
                </span>
              </Link>
            </div>

            <div className="st3-category-rail">
              {categories.map(
                (category, index) => {
                  const relatedProduct =
                    categoryProduct(
                      category,
                      catalogProducts,
                    );

                  const productImage =
                    primaryProductImage(
                      relatedProduct,
                    );

                  const visual =
                    category.homepage_wallpaper_url ||
                    productImage;

                  const title =
                    category.homepage_title
                      ?.trim() ||
                    category.name;

                  const description =
                    category.homepage_description
                      ?.trim() ||
                    `Explore the latest ${category.name.toLowerCase()} at Stereophonie.`;

                  return (
                    <Link
                      key={category.id}
                      href={`/shop?category=${encodeURIComponent(
                        category.name,
                      )}`}
                      className={`st3-category-card ${
                        index === 0
                          ? "st3-category-card--featured"
                          : ""
                      }`}
                    >
                      <div className="st3-category-card__copy">
                        <p className="st3-category-card__eyebrow">
                          Shop
                        </p>

                        <h3>{title}</h3>

                        <p>
                          {description}
                        </p>
                      </div>

                      <div className="st3-category-card__visual">
                        {visual ? (
                          <img
                            src={visual}
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
                },
              )}
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

      {offerProducts.length ? (
        <ProductSection
          eyebrow="Offers"
          title="More technology. Better value."
          description="Selected products at special prices."
          products={offerProducts}
          href="/shop?offers=true"
          linkLabel="View offers"
          tone="soft"
        />
      ) : null}

      <V3Reveal>
        <section className="st3-home-banner">
          <div className="st3-home-banner__copy">
            <p className="st3-section-eyebrow">
              Stereophonie
            </p>

            <h2>
              Everything you need.
              <br />
              One place.
            </h2>

            <p>
              Discover technology for work,
              entertainment, gaming and
              everyday life.
            </p>

            <Link
              href="/shop"
              className="st3-button"
            >
              Explore the store
            </Link>
          </div>

          <div
            className="st3-home-banner__shape"
            aria-hidden="true"
          />
        </section>
      </V3Reveal>

      <ProductSection
        eyebrow="Selected for you"
        title="Worth discovering."
        description="A curated selection from across the Stereophonie store."
        products={featuredProducts}
        href="/shop"
        linkLabel="Explore store"
      />

      <V3Reveal>
        <section className="st3-service-strip">
          <div className="st3-service-strip__item">
            <span className="st3-service-strip__number">
              01
            </span>

            <strong>
              Secure shopping
            </strong>

            <span>
              A simple and streamlined
              checkout experience.
            </span>
          </div>

          <div className="st3-service-strip__item">
            <span className="st3-service-strip__number">
              02
            </span>

            <strong>
              Selected technology
            </strong>

            <span>
              Products chosen across
              leading technology categories.
            </span>
          </div>

          <div className="st3-service-strip__item">
            <span className="st3-service-strip__number">
              03
            </span>

            <strong>
              Order support
            </strong>

            <span>
              Access your account and
              track your orders online.
            </span>
          </div>
        </section>
      </V3Reveal>
    </main>
  );
}
