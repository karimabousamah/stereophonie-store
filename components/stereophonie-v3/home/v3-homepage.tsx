import Image from "next/image";
import Link from "next/link";

import V3Reveal from "@/components/stereophonie-v3/shared/v3-reveal";
import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";
import V3EntertainmentCategory from "@/components/stereophonie-v3/home/v3-entertainment-category";
import {
  isMoviesSeriesCategory,
  stereophonieEntertainment,
} from "@/lib/stereophonie-entertainment";

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
  homepage_theme?: "light" | "dark" | null;
};

function primaryProductImage(product: V3Product | undefined) {
  if (!product) {
    return null;
  }

  const images = [...product.images]
    .filter((image) => Boolean(image.image_url))
    .sort((a, b) => {
      if (a.is_primary !== b.is_primary) {
        return a.is_primary ? -1 : 1;
      }

      return (a.position ?? 0) - (b.position ?? 0);
    });

  return images[0]?.image_url ?? null;
}

function productForCategory(category: V3HomeCategory, products: V3Product[]) {
  const normalized = category.name.trim().toLowerCase();

  return products.find(
    (product) => product.categoryName.trim().toLowerCase() === normalized,
  );
}

function categoryImage(category: V3HomeCategory, products: V3Product[]) {
  const uploaded = category.homepage_wallpaper_url?.trim();

  if (uploaded) {
    return uploaded;
  }

  return primaryProductImage(productForCategory(category, products));
}

function categoryDescription(category: V3HomeCategory) {
  const custom = category.homepage_description?.trim();

  if (custom) {
    return custom;
  }

  const name = category.name.toLowerCase();

  return `Discover our selection of ${name}.`;
}

function categoryHref(category: V3HomeCategory) {
  if (isMoviesSeriesCategory(category)) {
    return "/movies-series";
  }

  return `/shop?category=${encodeURIComponent(category.name)}`;
}

function categoryExploreHref(category: V3HomeCategory) {
  if (isMoviesSeriesCategory(category)) {
    return "/movies-series";
  }

  return `/shop?category=${encodeURIComponent(category.name)}&sort=newest`;
}

function CategoryMedia({
  category,
  products,
  className = "",
}: {
  category: V3HomeCategory;
  products: V3Product[];
  className?: string;
}) {
  const image = categoryImage(category, products);

  return (
    <div className={`st3-cat-media ${className}`}>
      {image ? (
        <img
          src={image}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="auto"
        />
      ) : (
        <div className="st3-cat-media__empty" aria-hidden="true">
          <div />
        </div>
      )}
    </div>
  );
}

function CategoryActions({
  category,
  inverted = false,
}: {
  category: V3HomeCategory;
  inverted?: boolean;
}) {
  return (
    <div className="st3-cat-actions" aria-hidden="true">
      <span className="st3-button">Shop</span>

      <span
        className={
          inverted
            ? "st3-cat-text-link st3-cat-text-link--light"
            : "st3-cat-text-link"
        }
      >
        Explore
        <span aria-hidden="true">›</span>
      </span>
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  description,
  products,
  href,
  linkLabel,
  soft = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: V3Product[];
  href: string;
  linkLabel: string;
  soft?: boolean;
}) {
  if (!products.length) {
    return null;
  }

  const shelfProducts = products;

  return (
    <V3Reveal>
      <section
        className={`st3-products-section st3-home-shop-products ${
          soft ? "st3-products-section--soft" : ""
        }`}
      >
        <div className="st3-section-heading">
          <div>
            <p className="st3-section-eyebrow">{eyebrow}</p>

            <h2>{title}</h2>

            <p className="st3-section-description">{description}</p>
          </div>
        </div>

        <div className="st3-shop-card-context st3-home-product-shelf-context">
          <div className="st3-shop-v4__grid st-product-grid-canonical st3-home-product-shelf">
            {shelfProducts.map((product, index) => (
              <V2ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>

        <div className="st3-home-product-shelf__scroll-hint" aria-hidden="true">
          <span className="st3-home-product-shelf__scroll-hint-mobile">
            Swipe to explore
          </span>
          <span className="st3-home-product-shelf__scroll-hint-desktop">
            Scroll to explore
          </span>
          <span className="st3-home-product-shelf__scroll-hint-arrow">→</span>
        </div>

        <Link href={href} className="st3-home-product-shelf__see-all">
          <span>{linkLabel}</span>
          <span aria-hidden="true">›</span>
        </Link>
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
  heroImageUrl,
  heroProductId,
  heroEyebrow,
  heroLineOne,
  heroLineTwo,
  heroLineThree,
  heroDescription,
  primaryButtonLabel,
  primaryButtonHref,
  secondaryButtonLabel,
  secondaryButtonHref,
}: {
  categories: V3HomeCategory[];
  latestProducts: V3Product[];
  offerProducts: V3Product[];
  featuredProducts: V3Product[];
  catalogProducts: V3Product[];
  heroImageUrl?: string | null;
  heroProductId?: string | null;
  heroEyebrow: string;
  heroLineOne: string;
  heroLineTwo: string;
  heroLineThree: string;
  heroDescription: string;
  primaryButtonLabel: string;
  primaryButtonHref: string;
  secondaryButtonLabel: string;
  secondaryButtonHref: string;
}) {
  const selectedHeroProduct = heroProductId
    ? (catalogProducts.find((product) => product.id === heroProductId) ?? null)
    : null;

  const heroProduct =
    selectedHeroProduct ??
    featuredProducts[0] ??
    latestProducts[0] ??
    catalogProducts[0];

  const heroImage = heroImageUrl?.trim() || primaryProductImage(heroProduct);

  const first = categories[0];

  const second = categories[1];

  const gridCategories = categories.slice(2);

  return (
    <main className="st3-home-live">
      {/* ====================================================
          MAIN STORE HERO
          ==================================================== */}

      <section className="st3-premium-hero">
        <div className="st3-premium-hero__inner">
          <div className="st3-premium-hero__copy">
            <p className="st3-premium-hero__eyebrow">{heroEyebrow}</p>

            <h1>
              {heroLineOne}
              <br />
              {heroLineTwo}
              {heroLineThree ? (
                <>
                  <br />
                  {heroLineThree}
                </>
              ) : null}
            </h1>

            <p className="st3-premium-hero__description">{heroDescription}</p>

            <div className="st3-premium-hero__actions">
              <Link href={primaryButtonHref} className="st3-button">
                {primaryButtonLabel}
              </Link>

              <Link href={secondaryButtonHref} className="st3-link-arrow">
                {secondaryButtonLabel}
                <span aria-hidden="true">›</span>
              </Link>
            </div>
          </div>

          <div className="st3-premium-hero__visual">
            <div className="st3-premium-hero__halo" aria-hidden="true" />

            {heroImage ? (
              <Image
                src={heroImage}
                alt={
                  heroImageUrl
                    ? "Stereophonie homepage hero"
                    : (heroProduct?.name ?? "")
                }
                fill
                priority
                fetchPriority="high"
                sizes="(max-width: 900px) 100vw, 50vw"
                quality={90}
                className="st3-premium-hero__image"
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* ====================================================
          CATEGORY INTRO
          ==================================================== */}

      {categories.length ? (
        <section className="st3-cat-world">
          <V3Reveal>
            <div className="st3-cat-intro">
              <p>Explore Stereophonie</p>

              <h2>Find what fits your life.</h2>
            </div>
          </V3Reveal>

          {/* ==================================================
              CATEGORY 01 — LARGE LIGHT CAMPAIGN
              ================================================== */}

          {first ? (
            <V3Reveal>
              <Link
                href={categoryHref(first)}
                aria-label={`Explore ${first.name}`}
                data-category-theme={
                  first.homepage_theme === "dark" ? "dark" : "light"
                }
                className={`st3-cat-hero ${
                  first.homepage_theme === "dark"
                    ? "st3-cat-hero--dark"
                    : "st3-cat-hero--light"
                }`}
              >
                <div className="st3-cat-hero__copy">
                  <h2>{first.name}</h2>

                  <p>{categoryDescription(first)}</p>

                  <CategoryActions
                    category={first}
                    inverted={first.homepage_theme === "dark"}
                  />
                </div>

                <CategoryMedia
                  category={first}
                  products={catalogProducts}
                  className="st3-cat-media--hero"
                />
              </Link>
            </V3Reveal>
          ) : null}

          {/* ==================================================
              CATEGORY 02 — DIFFERENT / DARK SPLIT CAMPAIGN
              ================================================== */}

          {second ? (
            <V3Reveal>
              <Link
                href={categoryHref(second)}
                aria-label={`Explore ${second.name}`}
                data-category-theme={
                  second.homepage_theme === "dark" ? "dark" : "light"
                }
                className={`st3-cat-split ${
                  second.homepage_theme === "dark"
                    ? "st3-cat-split--dark"
                    : "st3-cat-split--light"
                }`}
              >
                <div className="st3-cat-split__copy">
                  <p className="st3-cat-kicker">Featured category</p>

                  <h2>{second.name}</h2>

                  <p className="st3-cat-split__description">
                    {categoryDescription(second)}
                  </p>

                  <CategoryActions
                    category={second}
                    inverted={second.homepage_theme === "dark"}
                  />
                </div>

                <CategoryMedia
                  category={second}
                  products={catalogProducts}
                  className="st3-cat-media--split"
                />
              </Link>
            </V3Reveal>
          ) : null}

          {/* ==================================================
              REMAINING CATEGORIES — APPLE-LIKE 2-UP CAMPAIGNS
              ================================================== */}

          {gridCategories.length ? (
            <div className="st3-cat-grid">
              {gridCategories.map((category, index) => {
                const dark = category.homepage_theme === "dark";

                const wide = index > 0 && index % 5 === 4;

                if (isMoviesSeriesCategory(category)) {
                  return (
                    <V3Reveal
                      key={category.id}
                      className="st3-reveal--movies-series"
                    >
                      <V3EntertainmentCategory
                        title={
                          category.homepage_title?.trim() || "Movies & Series"
                        }
                        description={
                          category.homepage_description?.trim() ||
                          "Discover a cinematic selection, preview trailers and ask Stereophonie about any title."
                        }
                        items={stereophonieEntertainment}
                      />
                    </V3Reveal>
                  );
                }

                return (
                  <V3Reveal key={category.id}>
                    <article
                      data-category-theme={dark ? "dark" : "light"}
                      className={`st3-cat-tile ${
                        dark ? "st3-cat-tile--dark" : ""
                      } ${wide ? "st3-cat-tile--wide" : ""}`}
                    >
                      <Link
                        href={categoryHref(category)}
                        className="st3-cat-tile__full-link"
                        aria-label={`Open ${category.name}`}
                      />

                      <div className="st3-cat-tile__copy">
                        <p className="st3-cat-kicker">Stereophonie</p>

                        <h3>{category.name}</h3>

                        <p>{categoryDescription(category)}</p>

                        <div className="st3-cat-actions">
                          <Link
                            href={categoryHref(category)}
                            className="st3-button"
                            aria-label={`Shop ${category.name}`}
                          >
                            Shop
                          </Link>

                          <Link
                            href={categoryExploreHref(category)}
                            className={
                              dark
                                ? "st3-cat-text-link st3-cat-text-link--light"
                                : "st3-cat-text-link"
                            }
                            aria-label={`Explore newest ${category.name}`}
                          >
                            Explore
                            <span aria-hidden="true">›</span>
                          </Link>
                        </div>
                      </div>

                      <CategoryMedia
                        category={category}
                        products={catalogProducts}
                        className="st3-cat-media--tile"
                      />
                    </article>
                  </V3Reveal>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ====================================================
          PRODUCTS
          ==================================================== */}

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
          title="More for less."
          description="Selected technology at special prices."
          products={offerProducts}
          href="/shop?offers=true"
          linkLabel="View offers"
        />
      ) : null}

      <ProductSection
        eyebrow="Selected"
        title="Worth discovering."
        description="A selection from across the Stereophonie store."
        products={featuredProducts}
        href="/shop"
        linkLabel="Explore store"
      />
    </main>
  );
}
