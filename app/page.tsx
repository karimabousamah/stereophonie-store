import type { Metadata } from "next";
import { Suspense } from "react";

import V3Homepage, {
  type V3HomeCategory,
} from "@/components/stereophonie-v3/home/v3-homepage";
import type { V3HeroMediaItem } from "@/components/stereophonie-v3/home/v3-hero-media-carousel";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import V3AnnouncementBar, {
  type StorefrontAnnouncement,
} from "@/components/stereophonie-v3/layout/v3-announcement-bar";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import {
  isCurrentNewDrop,
  isProductOnOffer,
  type V3Product,
  type V3ProductImage,
  type V3ProductVariant,
} from "@/components/stereophonie-v3/shared/v3-product-card";
import HomepageAccountSuccessToasts from "@/components/storefront/homepage-account-success-toasts";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHomepageSettings } from "@/lib/homepage-settings";
import { storefrontConfigurationImages } from "@/lib/storefront-product-media";

export const metadata: Metadata = {
  title: {
    absolute: "Stereophonie Store | Electronics, Gaming & Tech in Lebanon",
  },
  description:
    "Shop phones, laptops, gaming gear, smartwatches, audio and accessories at Stereophonie Store. Selected technology with delivery across Lebanon.",
  alternates: {
    canonical: "/",
  },
};

type NamedRelation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
  created_at: string | null;
  availability: string | null;
  offer_started_at: string | null;
  discovering_started_at: string | null;
  coming_soon_started_at: string | null;
  categories: NamedRelation;
  brands: NamedRelation;
  product_images: V3ProductImage[] | null;
  product_variants: V3ProductVariant[] | null;
};

type HomepageProductIndexRow = {
  id: string;
  created_at: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
  availability: string | null;
  offer_started_at: string | null;
  discovering_started_at: string | null;
  coming_soon_started_at: string | null;
  categories: NamedRelation;
  product_variants:
    | {
        regular_price: number | null;
        sale_price: number | null;
        is_active: boolean | null;
      }[]
    | null;
};

type HomepageProductIndex = {
  id: string;
  categoryName: string;
  created_at: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
  availability: string | null;
  offer_started_at: string | null;
  discovering_started_at: string | null;
  coming_soon_started_at: string | null;
  variants: {
    regular_price: number | null;
    sale_price: number | null;
    is_active: boolean | null;
  }[];
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  homepage_theme: "light" | "dark" | null;
};

function storefrontThumbnailPath(storagePath: string) {
  const normalized = storagePath.trim().replace(/^\/+/, "");
  const slash = normalized.lastIndexOf("/");
  const directory = slash >= 0 ? normalized.slice(0, slash) : "";
  const filename = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const dot = filename.lastIndexOf(".");
  const basename = dot > 0 ? filename.slice(0, dot) : filename;

  return directory
    ? `${directory}/storefront/${basename}.webp`
    : `storefront/${basename}.webp`;
}

function homepageImagesWithStorefrontUrls(
  images: ProductRow["product_images"],
  supabase: ReturnType<typeof createAdminClient>,
) {
  return (images ?? []).map((image) => {
    const storagePath =
      typeof image.storage_path === "string"
        ? image.storage_path.trim()
        : "";

    if (!storagePath) {
      return image;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(storefrontThumbnailPath(storagePath));

    return {
      ...image,
      storefront_image_url: data.publicUrl,
    };
  });
}

function relationName(relation: NamedRelation, fallback = "") {
  if (!relation) {
    return fallback;
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() || fallback;
  }

  return relation.name?.trim() || fallback;
}

type HomepageProduct = V3Product & {
  availability?: string | null;
  offer_started_at?: string | null;
  discovering_started_at?: string | null;
  coming_soon_started_at?: string | null;
};

function normalizeProduct(
  product: ProductRow,
  supabase: ReturnType<typeof createAdminClient>,
): HomepageProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: relationName(product.categories, "Technology"),
    brandName: relationName(product.brands, ""),
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    new_drop_started_at: product.new_drop_started_at,
    created_at: product.created_at,
    availability: product.availability,
    offer_started_at: product.offer_started_at,
    discovering_started_at: product.discovering_started_at,
    coming_soon_started_at: product.coming_soon_started_at,
    images: storefrontConfigurationImages(
      homepageImagesWithStorefrontUrls(
        product.product_images,
        supabase,
      ),
      product.product_variants,
    ),
    variants: product.product_variants ?? [],
  };
}

function timestampValue(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function sortProductsByTimestamp(
  products: HomepageProduct[],
  getTimestamp: (product: HomepageProduct) => string | null | undefined,
) {
  return [...products].sort((a, b) => {
    const aTimestamp =
      timestampValue(getTimestamp(a)) || timestampValue(a.created_at);

    const bTimestamp =
      timestampValue(getTimestamp(b)) || timestampValue(b.created_at);

    if (bTimestamp !== aTimestamp) {
      return bTimestamp - aTimestamp;
    }

    return String(b.id).localeCompare(String(a.id));
  });
}

function isComingSoonProduct(product: HomepageProduct) {
  return product.availability === "coming_soon";
}

function normalizeProductIndex(
  product: HomepageProductIndexRow,
): HomepageProductIndex {
  return {
    id: product.id,
    categoryName: relationName(product.categories, "Technology"),
    created_at: product.created_at,
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    new_drop_started_at: product.new_drop_started_at,
    availability: product.availability,
    offer_started_at: product.offer_started_at,
    discovering_started_at: product.discovering_started_at,
    coming_soon_started_at: product.coming_soon_started_at,
    variants: product.product_variants ?? [],
  };
}

function indexProductOnOffer(product: HomepageProductIndex) {
  return product.variants.some((variant) => {
    if (variant.is_active === false) {
      return false;
    }

    const regular = Number(variant.regular_price ?? 0);
    const sale = Number(variant.sale_price ?? 0);

    return regular > 0 && sale > 0 && sale < regular;
  });
}

function indexCurrentNewDrop(product: HomepageProductIndex) {
  return isCurrentNewDrop({
    is_new_arrival: product.is_new_arrival,
    new_drop_started_at: product.new_drop_started_at,
  } as V3Product);
}

function sortProductIndexByTimestamp(
  products: HomepageProductIndex[],
  getTimestamp: (
    product: HomepageProductIndex,
  ) => string | null | undefined,
) {
  return [...products].sort((a, b) => {
    const aTimestamp =
      timestampValue(getTimestamp(a)) || timestampValue(a.created_at);

    const bTimestamp =
      timestampValue(getTimestamp(b)) || timestampValue(b.created_at);

    if (bTimestamp !== aTimestamp) {
      return bTimestamp - aTimestamp;
    }

    return String(b.id).localeCompare(String(a.id));
  });
}

export default async function HomePage() {

  const supabase = createAdminClient();

  const [
    productIndexResult,
    categoriesResult,
    homepageSettingsResult,
    announcementsResult,
  ] = await Promise.all([
          supabase
        .from("products")
        .select(
          `
            id,
            created_at,
            is_featured,
            is_trending,
            is_new_arrival,
            new_drop_started_at,
            availability,
            offer_started_at,
            discovering_started_at,
            coming_soon_started_at,

            categories (
              name
            ),

            product_variants (
              regular_price,
              sale_price,
              is_active
            )
          `,
        )
        .eq("status", "published")
        .order("created_at", {
          ascending: false,
        }),

    supabase
      .from("categories")
      .select(
        `
          id,
          name,
          slug,
          image_url,
          homepage_theme,
          sort_order
        `,
      )
      .eq("is_active", true)
      .eq("show_on_homepage", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("homepage_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle(),

    supabase
      .from("homepage_announcements")
      .select(
        `
          id,
          message,
          link_label,
          link_href
        `,
      )
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (productIndexResult.error) {
    console.error(
      "V3 homepage product index could not load:",
      productIndexResult.error,
    );
  }

  if (categoriesResult.error) {
    console.error(
      "V3 homepage categories could not load:",
      categoriesResult.error,
    );
  }

  const homepageSettings = normalizeHomepageSettings(
    homepageSettingsResult.data ?? null,
  );

  const announcements = (announcementsResult.data ??
    []) as StorefrontAnnouncement[];

  if (announcementsResult.error) {
    console.error(
      "V3 homepage announcements could not load:",
      announcementsResult.error,
    );
  }

  const categories: V3HomeCategory[] = (
    (categoriesResult.data ?? []) as CategoryRow[]
  ).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    homepage_title: null,
    homepage_description: null,
    homepage_wallpaper_url: category.image_url ?? null,
    homepage_theme: category.homepage_theme === "dark" ? "dark" : "light",
  }));

  const productIndex = (
    (productIndexResult.data ?? []) as HomepageProductIndexRow[]
  ).map(normalizeProductIndex);

  const latestIndex = sortProductIndexByTimestamp(
    productIndex.filter(indexCurrentNewDrop),
    (product) => product.new_drop_started_at,
  );

  const latestIndexFallback =
    latestIndex.length > 0
      ? latestIndex
      : sortProductIndexByTimestamp(
          productIndex,
          (product) => product.created_at,
        );

  const offerIndex = sortProductIndexByTimestamp(
    productIndex.filter(indexProductOnOffer),
    (product) => product.offer_started_at,
  );

  const featuredIndex = sortProductIndexByTimestamp(
    productIndex.filter(
      (product) => product.is_featured || product.is_trending,
    ),
    (product) => product.discovering_started_at,
  );

  const featuredIndexFallback =
    featuredIndex.length > 0
      ? featuredIndex
      : sortProductIndexByTimestamp(
          productIndex,
          (product) => product.created_at,
        );

  const comingSoonIndex = sortProductIndexByTimestamp(
    productIndex.filter(
      (product) => product.availability === "coming_soon",
    ),
    (product) => product.coming_soon_started_at,
  );

  /*
   * Only products that can actually appear on the homepage now
   * receive the expensive media/configuration payload.
   */
  const selectedProductIds = new Set<string>();

  function selectProducts(
    products: HomepageProductIndex[],
    limit = 12,
  ) {
    for (const product of products.slice(0, limit)) {
      selectedProductIds.add(product.id);
    }
  }

  selectProducts(latestIndexFallback);
  selectProducts(offerIndex);
  selectProducts(featuredIndexFallback);
  selectProducts(comingSoonIndex);

  /*
   * Preserve explicit hero selection even when that product does
   * not belong to one of the four merchandising shelves.
   */
  if (homepageSettings.hero_product_id) {
    selectedProductIds.add(homepageSettings.hero_product_id);
  }

  /*
   * Preserve the existing catalogProducts[0] hero fallback.
   */
  if (productIndex[0]?.id) {
    selectedProductIds.add(productIndex[0].id);
  }

  /*
   * Preserve CategoryMedia exactly:
   * productForCategory() currently selects the first published
   * product for each category from the created_at-desc catalogue.
   */
  for (const category of categories) {
    const normalizedCategory = category.name.trim().toLowerCase();

    const categoryProduct = productIndex.find(
      (product) =>
        product.categoryName.trim().toLowerCase() === normalizedCategory,
    );

    if (categoryProduct) {
      selectedProductIds.add(categoryProduct.id);
    }
  }

  const selectedIds = [...selectedProductIds];

  const selectedProductsResult =
    selectedIds.length > 0
      ? await supabase
          .from("products")
          .select(
            `
              id,
              name,
              slug,
              description,
              is_featured,
              is_trending,
              is_new_arrival,
              new_drop_started_at,
              created_at,
              availability,
              offer_started_at,
              discovering_started_at,
              coming_soon_started_at,

              categories (
                name
              ),

              brands (
                name
              ),

              product_images (
                id,
                image_url,
                storage_path,
                alt_text,
                position,
                is_primary,
                variant_id,
                variant_position,
                is_variant_primary,
                product_image_variants (
                  variant_id,
                  position,
                  is_primary
                )
              ),

              product_variants (
                id,
                display_position,
                regular_price,
                sale_price,
                stock_quantity,
                size,
                variant_name,
                is_active,
                availability_status
              )
            `,
          )
          .eq("status", "published")
          .in("id", selectedIds)
      : {
          data: [] as ProductRow[],
          error: null,
        };

  if (selectedProductsResult.error) {
    console.error(
      "V3 homepage selected products could not load:",
      selectedProductsResult.error,
    );
  }

  const selectedProducts = (
    (selectedProductsResult.data ?? []) as ProductRow[]
  ).map((product) => normalizeProduct(product, supabase));

  const productById = new Map(
    selectedProducts.map((product) => [product.id, product]),
  );

  function materializeProducts(indexProducts: HomepageProductIndex[]) {
    return indexProducts
      .slice(0, 12)
      .map((product) => productById.get(product.id))
      .filter((product): product is HomepageProduct => Boolean(product));
  }

  const latestProducts = materializeProducts(latestIndexFallback);
  const offerProducts = materializeProducts(offerIndex);
  const featuredProducts = materializeProducts(featuredIndexFallback);
  const comingSoonProducts = materializeProducts(comingSoonIndex);

  /*
   * Reconstruct catalogProducts in the exact original catalogue order.
   * This preserves:
   * - configured hero lookup
   * - newest hero fallback
   * - first-product-per-category media fallback
   */
  const { data: heroMediaRows, error: heroMediaError } =
    await supabase
      .from("homepage_hero_media")
      .select(
        `
        id,
        media_type,
        media_url,
        sort_order,
        created_at
      `,
      )
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

  if (heroMediaError) {
    console.error(
      "Homepage hero media could not load:",
      heroMediaError,
    );
  }

  const heroMedia = (heroMediaRows ?? []).flatMap((row) => {
    const mediaType =
      row.media_type === "image" ||
      row.media_type === "video"
        ? row.media_type
        : null;

    const mediaUrl =
      typeof row.media_url === "string"
        ? row.media_url.trim()
        : "";

    if (!mediaType || !mediaUrl) {
      return [];
    }

    return [
      {
        id: String(row.id),
        media_type: mediaType,
        media_url: mediaUrl,
      } satisfies V3HeroMediaItem,
    ];
  });

  const products = productIndex
    .map((product) => productById.get(product.id))
    .filter((product): product is HomepageProduct => Boolean(product));

  return (
    <>
      {/* HERO_NATIVE_VIDEO_V10E
          Start fetching the first active Hero video from the
          initial server-rendered document before hydration. */}
      {heroMedia[0]?.media_type === "video" ? (
        <link
          rel="preload"
          as="video"
          href={heroMedia[0].media_url}
        />
      ) : null}

      <V3Header />

      <Suspense fallback={null}>
        <HomepageAccountSuccessToasts />
      </Suspense>

      <V3AnnouncementBar
        announcements={announcements}
        backgroundMode={homepageSettings.announcement_background_mode}
      />

      <V3Homepage
        categories={categories}
        latestProducts={latestProducts}
        offerProducts={offerProducts}
        featuredProducts={featuredProducts}
        comingSoonProducts={comingSoonProducts}
        catalogProducts={products}
        heroImageUrl={homepageSettings.hero_image_url}
        heroMedia={heroMedia}
        heroProductId={homepageSettings.hero_product_id}
        heroEyebrow={homepageSettings.hero_eyebrow}
        heroLineOne={homepageSettings.hero_line_one}
        heroLineTwo={homepageSettings.hero_line_two}
        heroLineThree={homepageSettings.hero_line_three}
        heroDescription={homepageSettings.hero_description}
        primaryButtonLabel={homepageSettings.primary_button_label}
        primaryButtonHref={homepageSettings.primary_button_href}
        secondaryButtonLabel={homepageSettings.secondary_button_label}
        secondaryButtonHref={homepageSettings.secondary_button_href}
      />

      <V3Footer />
    </>
  );
}
