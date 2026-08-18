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

function categoryVisual(
  category: V3HomeCategory,
  products: V3Product[],
) {
  if (
    category.homepage_wallpaper_url
      ?.trim()
  ) {
    return (
      category.homepage_wallpaper_url
    );
  }

  return primaryProductImage(
    categoryProduct(
      category,
      products,
    ),
  );
}

function categoryTitle(
  category: V3HomeCategory,
) {
  return (
    category.homepage_title?.trim() ||
    category.name
  );
}

function categoryDescription(
  category: V3HomeCategory,
) {
  return (
    category.homepage_description
      ?.trim() ||
    `Discover our selection of ${category.name.toLowerCase()}.`
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

  const primaryCategories =
    categories.slice(0, 2);

  const secondaryCategories =
    categories.slice(2);

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
              Discover technology selected
              for the way you live, work
              and play.
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


      {primaryCategories.length ? (
        <section className="st3-apple-categories">
          <V3Reveal>
            <div className="st3-apple-categories__heading">
              <p className="st3-section-eyebrow">
                Explore Stereophonie
              </p>

              <h2>
                Find what fits your life.
              </h2>
            </div>
          </V3Reveal>

          <div className="st3-apple-category-stack">
            {primaryCategories.map(
              (category, index) => {
                const visual =
                  categoryVisual(
                    category,
                    catalogProducts,
                  );

                return (
                  <V3Reveal
                    key={category.id}
                  >
                    <article
                      className={`st3-apple-category-hero ${
                        index % 2 === 1
                          ? "st3-apple-category-hero--dark"
                          : ""
                      }`}
                    >
                      <div className="st3-apple-category-hero__copy">
                        <p className="st3-apple-category-hero__eyebrow">
                          Stereophonie
                        </p>

                        <h2>
                          {categoryTitle(
                            category,
                          )}
                        </h2>

                        <p>
                          {categoryDescription(
                            category,
                          )}
                        </p>

                        <div className="st3-apple-category-hero__actions">
                          <Link
                            href={`/shop?category=${encodeURIComponent(
                              category.name,
                            )}`}
                            className="st3-button"
                          >
                            Shop
                          </Link>

                          <Link
                            href={`/shop?category=${encodeURIComponent(
                              category.name,
                            )}`}
                            className="st3-category-learn-link"
                          >
                            Explore
                            <span aria-hidden="true">
                              ›
                            </span>
                          </Link>
                        </div>
                      </div>

                      <div className="st3-apple-category-hero__media">
                        {visual ? (
                          <img
                            src={visual}
                            alt=""
                            loading={
                              index === 0
                                ? "eager"
                                : "lazy"
                            }
                          />
                        ) : (
                          <div className="st3-category-image-fallback">
                            <span>
                              {category.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  </V3Reveal>
                );
              },
            )}
          </div>


          {secondaryCategories.length ? (
            <div className="st3-category-feature-grid">
              {secondaryCategories.map(
                (category) => {
                  const visual =
                    categoryVisual(
                      category,
                      catalogProducts,
                    );

                  return (
                    <V3Reveal
                      key={category.id}
                    >
                      <Link
                        href={`/shop?category=${encodeURIComponent(
                          category.name,
                        )}`}
                        className="st3-category-feature-card"
                      >
                        <div className="st3-category-feature-card__copy">
                          <p>
                            Category
                          </p>

                          <h3>
                            {categoryTitle(
                              category,
                            )}
                          </h3>

                          <span>
                            {categoryDescription(
                              category,
                            )}
                          </span>

                          <span className="st3-category-feature-card__cta">
                            Explore
                            <span aria-hidden="true">
                              ›
                            </span>
                          </span>
                        </div>

                        <div className="st3-category-feature-card__media">
                          {visual ? (
                            <img
                              src={visual}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <div className="st3-category-image-fallback">
                              <span>
                                {
                                  category.name
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    </V3Reveal>
                  );
                },
              )}
            </div>
          ) : null}
        </section>
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
              Technology for
              <br />
              every day.
            </h2>

            <p>
              From your pocket to your
              desk, discover technology
              selected for everyday life.
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
              leading technology
              categories.
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
              track orders online.
            </span>
          </div>
        </section>
      </V3Reveal>
    </main>
  );
}
