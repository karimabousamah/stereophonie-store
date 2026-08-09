import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, ImageOff } from "lucide-react";

import HeroFeaturedCarousel, {
  type HeroFeaturedSlide,
} from "@/components/home/hero-featured-carousel";
import AccountVerifiedToast from "@/components/storefront/account-verified-toast";
import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import StoreProductCard, {
  type StoreProductCardProduct,
} from "@/components/storefront/store-product-card";
import {
  normalizeHomepageSettings,
  type HomepageSettings,
} from "@/lib/homepage-settings";
import { createClient } from "@/lib/supabase/server";

type ProductImage = {
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

type ProductVariant = {
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
};

type CategoryRelation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type FeaturedCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

type Product = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  collection_id: string | null;
  categories: CategoryRelation;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
};

const productSelection = `
  id,
  name,
  slug,
  description,
  is_featured,
  is_trending,
  is_new_arrival,
  
  collection_id,created_at,
  categories (
    name
  ),
  product_images (
    image_url,
    alt_text,
    position,
    is_primary
  ),
  product_variants (
    regular_price,
    sale_price,
    stock_quantity,
    availability_status
  )
`;

function getCategoryName(category: CategoryRelation) {
  if (!category) {
    return "Collection";
  }

  if (Array.isArray(category)) {
    return category[0]?.name ?? "Collection";
  }

  return category.name;
}

function getMainImage(images: ProductImage[]) {
  const primaryImage = images.find(
    (image) => image.is_primary && image.image_url,
  );

  if (primaryImage?.image_url) {
    return primaryImage;
  }

  return (
    [...images]
      .filter((image) => Boolean(image.image_url))
      .sort((first, second) => first.position - second.position)[0] ?? null
  );
}

function normalizeProduct(product: Product): StoreProductCardProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: getCategoryName(product.categories),
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    images: product.product_images ?? [],
    variants: product.product_variants ?? [],
  };
}

export default async function HomePage() {
  const supabase = await createClient();

  const { data: settingsData } = await supabase
    .from("homepage_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  const settings = normalizeHomepageSettings(
    settingsData as Partial<HomepageSettings> | null,
  );

  const { data: products } = await supabase
    .from("products")
    .select(productSelection)
    .eq("status", "published")
    .order("created_at", {
      ascending: false,
    })
    .limit(12);

  const productList = (products ?? []) as Product[];

  const { data: featuredCollectionRows } = await supabase
    .from("collections")
    .select(
      `
      id,
      name,
      slug,
      description,
      image_url,
      sort_order
    `,
    )
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    })
    .limit(settings.collections_limit);

  const featuredCollections = Array.from(
    new Map(
      ((featuredCollectionRows ?? []) as FeaturedCollection[]).map(
        (collection) => [collection.id, collection],
      ),
    ).values(),
  );

  let selectedHeroProduct = settings.hero_product_id
    ? (productList.find((product) => product.id === settings.hero_product_id) ??
      null)
    : null;

  if (settings.hero_product_id && !selectedHeroProduct) {
    const { data: heroProductData } = await supabase
      .from("products")
      .select(productSelection)
      .eq("id", settings.hero_product_id)
      .eq("status", "published")
      .maybeSingle();

    selectedHeroProduct = (heroProductData as Product | null) ?? null;
  }

  const orderedProducts = (() => {
    if (settings.products_sort_mode === "featured_first") {
      return [...productList].sort(
        (first, second) =>
          Number(Boolean(second.is_featured)) -
          Number(Boolean(first.is_featured)),
      );
    }

    if (settings.products_sort_mode === "new_arrivals_first") {
      return [...productList].sort(
        (first, second) =>
          Number(Boolean(second.is_new_arrival)) -
          Number(Boolean(first.is_new_arrival)),
      );
    }

    return productList;
  })();

  const displayedProducts = orderedProducts.slice(0, settings.products_limit);

  const heroProduct =
    selectedHeroProduct ?? displayedProducts[0] ?? productList[0] ?? null;

  const heroImage = heroProduct
    ? getMainImage(heroProduct.product_images ?? [])
    : null;

  const heroCarouselProducts = [
    ...(heroProduct ? [heroProduct] : []),
    ...productList.filter(
      (product) => !heroProduct || product.id !== heroProduct.id,
    ),
  ];

  const heroSlides: HeroFeaturedSlide[] = heroCarouselProducts
    .map((product) => {
      const image = getMainImage(product.product_images ?? []);

      if (!image?.image_url) {
        return null;
      }

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: image.image_url,
        altText: image.alt_text ?? product.name ?? "Nita Style collection",
      };
    })
    .filter((slide): slide is HeroFeaturedSlide => slide !== null)
    .slice(0, 6);

  const categoryNames = Array.from(
    new Set(
      productList
        .map((product) => getCategoryName(product.categories))
        .filter((category) => category !== "Collection"),
    ),
  ).slice(0, settings.categories_limit);

  const homepageSections = {
    products: settings.products_enabled ? (
      <section
        key="products"
        className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
      >
        <div className="flex flex-col gap-7 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-start">
            <p className="m-0 translate-x-1 text-[10px] font-semibold uppercase leading-none tracking-[0.23em] text-black/45">
              {settings.products_eyebrow}
            </p>

            <h2 className="mt-5 m-0 text-4xl font-semibold uppercase leading-none tracking-[-0.045em] sm:text-6xl">
              {settings.products_heading}
            </h2>
          </div>

          <Link
            href={settings.products_button_href}
            className="group inline-flex items-center gap-3 self-start text-[11px] font-semibold uppercase tracking-[0.17em] text-black/50 transition hover:text-black md:self-auto"
          >
            {settings.products_button_label}

            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>

        {displayedProducts.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 lg:gap-x-6">
            {displayedProducts.map((product) => (
              <StoreProductCard
                key={product.id}
                product={normalizeProduct(product)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex min-h-[360px] items-center justify-center border border-dashed border-black/15 text-center">
            <div>
              <ImageOff className="mx-auto h-8 w-8 text-black/25" />

              <p className="mt-4 text-sm text-black/45">
                Published products will appear here.
              </p>
            </div>
          </div>
        )}
      </section>
    ) : null,

    collections:
      settings.collections_enabled && featuredCollections.length > 0 ? (
        <section
          key="collections"
          className="border-t border-black/10 bg-white"
        >
          <div className="mx-auto max-w-[1600px] py-14 lg:py-16">
            <div className="flex items-end justify-between gap-6 px-5 sm:px-8 lg:px-12">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-black/40">
                  {settings.collections_eyebrow}
                </p>

                <h2 className="mt-3 text-3xl font-semibold uppercase leading-none tracking-[-0.04em] sm:text-4xl">
                  {settings.collections_heading}
                </h2>
              </div>

              <Link
                href={settings.collections_button_href}
                className="group inline-flex shrink-0 items-center gap-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45 transition hover:text-black"
              >
                {settings.collections_button_label}

                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="mx-5 mt-7 border-t border-black/10 sm:mx-8 lg:mx-12" />

            <div
              data-collections-scroller="true"
              className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-4 sm:px-8 lg:gap-5 lg:px-12"
              style={{
                scrollbarWidth: "thin",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {featuredCollections.map((collection, index) => {
                /*
                 * The homepage collection card must represent a real
                 * published product from that collection.
                 *
                 * productList is already ordered newest-first.
                 * getMainImage() explicitly prefers is_primary=true.
                 */
                const representativeProduct =
                  productList.find((product) => {
                    if (product.collection_id !== collection.id) {
                      return false;
                    }

                    return Boolean(
                      getMainImage(product.product_images ?? [])?.image_url,
                    );
                  }) ?? null;

                const representativeImage = representativeProduct
                  ? getMainImage(representativeProduct.product_images ?? [])
                  : null;

                /*
                 * PRIORITY:
                 * 1. Admin-selected PRIMARY PRODUCT photograph
                 * 2. Explicit collection image
                 * 3. Designed no-image fallback
                 */
                const collectionImageUrl =
                  representativeImage?.image_url?.trim() ||
                  collection.image_url?.trim() ||
                  null;

                const collectionImageAlt =
                  representativeImage?.alt_text?.trim() ||
                  representativeProduct?.name ||
                  collection.name;

                return (
                  <Link
                    key={collection.id}
                    href={`/shop?collection=${encodeURIComponent(
                      collection.slug,
                    )}`}
                    className="group flex w-[44vw] max-w-[190px] shrink-0 snap-start flex-col overflow-hidden border border-black/10 bg-white sm:w-[240px] lg:w-[300px] lg:max-w-[300px]"
                  >
                    <div className="relative h-[300px] w-full shrink-0 overflow-hidden bg-[#f2f1ee] sm:h-[320px] lg:h-[340px]">
                      {collectionImageUrl ? (
                        <img
                          src={collectionImageUrl}
                          alt={collectionImageAlt}
                          loading={index < 2 ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={index === 0 ? "high" : "auto"}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-8 text-center text-white">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/45">
                            Nita Style
                          </p>

                          <p className="mt-4 text-3xl font-semibold uppercase leading-[0.95] tracking-[-0.04em]">
                            {collection.name}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex min-h-[170px] flex-1 flex-col border-t border-black/10 bg-white p-5 text-black sm:p-6">
                      <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/45">
                        Featured collection
                      </p>

                      <h3 className="mt-2 text-2xl font-semibold uppercase leading-[0.95] tracking-[-0.035em] sm:text-[1.65rem]">
                        {collection.name}
                      </h3>

                      {collection.description ? (
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-black/55">
                          {collection.description}
                        </p>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between pt-5">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                          Explore
                        </span>

                        <span className="flex h-9 w-9 items-center justify-center border border-black text-black transition group-hover:bg-black group-hover:text-white">
                          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}

              <Link
                href={settings.collections_button_href}
                className="flex aspect-[4/5] w-[44vw] max-w-[190px] shrink-0 snap-start flex-col items-center justify-center border border-black/10 bg-[#f5f4f1] px-8 text-center transition hover:border-black hover:bg-black hover:text-white sm:w-[240px] lg:w-[300px] lg:max-w-[300px]"
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] opacity-50">
                  Discover more
                </p>

                <p className="mt-4 text-2xl font-semibold uppercase leading-tight tracking-[-0.035em]">
                  {settings.collections_button_label}
                </p>

                <span className="mt-6 flex h-10 w-10 items-center justify-center border border-current">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      ) : null,

    categories:
      settings.categories_enabled && categoryNames.length > 0 ? (
        <section
          key="categories"
          className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
        >
          <div className="border-b border-black/10 pb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-black/40">
              {settings.categories_eyebrow}
            </p>

            <h2 className="mt-4 text-4xl font-semibold uppercase tracking-[-0.045em] sm:text-6xl">
              {settings.categories_heading}
            </h2>
          </div>

          <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
            {categoryNames.map((category) => (
              <Link
                key={category}
                href={`/shop?category=${encodeURIComponent(category)}`}
                className="group flex items-center justify-between py-6 text-black transition hover:px-3"
              >
                <span className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {category}
                </span>

                <ArrowRight className="h-5 w-5 text-black/35 transition group-hover:translate-x-1 group-hover:text-black" />
              </Link>
            ))}
          </div>
        </section>
      ) : null,
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <Suspense fallback={null}>
        <AccountVerifiedToast />
      </Suspense>

      <section className="relative min-h-[calc(100vh-88px)] overflow-hidden border-b border-black/10 bg-[#f3f1ed]">
        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-[1600px] lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative z-10 flex items-center px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-black/30" />

                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-black/45">
                  {settings.hero_eyebrow}
                </p>
              </div>

              <h1 className="mt-7 text-[clamp(3.6rem,8vw,8.5rem)] font-semibold uppercase leading-[0.84] tracking-[-0.075em]">
                {settings.hero_line_one}
                <br />
                {settings.hero_line_two}
                <br />
                {settings.hero_line_three}
              </h1>

              <p className="mt-8 max-w-lg text-sm leading-7 text-black/55 sm:text-base">
                {settings.hero_description}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={settings.primary_button_href}
                  className="group inline-flex min-h-14 items-center justify-between gap-8 bg-black px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] !text-white transition duration-300 hover:bg-[#242424] hover:!text-white"
                >
                  {settings.primary_button_label}

                  <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                </Link>

                <Link
                  href={settings.secondary_button_href}
                  className="inline-flex min-h-14 items-center justify-center border border-black/20 bg-transparent px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-black transition duration-300 hover:border-black hover:bg-black hover:!text-white"
                >
                  {settings.secondary_button_label}
                </Link>
              </div>
            </div>
          </div>

          <div className="relative min-h-[560px] overflow-hidden lg:min-h-full">
            <HeroFeaturedCarousel slides={heroSlides} />
          </div>
        </div>
      </section>

      {settings.section_order.map(
        (sectionName) => homepageSections[sectionName],
      )}

      <section className="bg-black text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-10 px-5 py-16 sm:px-8 md:flex-row md:items-end lg:px-12 lg:py-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-white/40">
              {settings.final_eyebrow}
            </p>

            <h2 className="mt-5 max-w-4xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              {settings.final_line_one}
              <br />
              {settings.final_line_two}
            </h2>
          </div>

          <Link
            href={settings.final_button_href}
            className="group inline-flex min-h-14 items-center gap-8 border border-white bg-transparent px-7 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] !text-white transition duration-300 hover:bg-white hover:!text-black"
          >
            {settings.final_button_label}

            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
