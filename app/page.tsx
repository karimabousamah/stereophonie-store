import type { Metadata } from "next";

import V3Homepage, {
  type V3HomeCategory,
} from "@/components/stereophonie-v3/home/v3-homepage";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
import V3AnnouncementBar, {
  type StorefrontAnnouncement,
} from "@/components/stereophonie-v3/layout/v3-announcement-bar";
import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import AccountSigninSuccessToast from "@/components/storefront/account-signin-success-toast";
import AccountSignoutSuccessToast from "@/components/storefront/account-signout-success-toast";
import {
  isCurrentNewDrop,
  isProductOnOffer,
  type V3Product,
  type V3ProductImage,
  type V3ProductVariant,
} from "@/components/stereophonie-v3/shared/v3-product-card";
import { createClient } from "@/lib/supabase/server";
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

type CategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  homepage_theme: "light" | "dark" | null;
};

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

function normalizeProduct(product: ProductRow): HomepageProduct {
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
      product.product_images,
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

type HomePageProps = {
  searchParams: Promise<{
    account?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;

  const accountState = Array.isArray(resolvedSearchParams.account)
    ? resolvedSearchParams.account[0]
    : resolvedSearchParams.account;

  const showSigninSuccess = accountState === "logged-in";
  const showSignoutSuccess = accountState === "signed-out";

  const supabase = await createClient();

  const [
    productsResult,
    categoriesResult,
    homepageSettingsResult,
    announcementsResult,
  ] = await Promise.all([
    supabase
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

  if (productsResult.error) {
    console.error("V3 homepage products could not load:", productsResult.error);
  }

  if (categoriesResult.error) {
    console.error(
      "V3 homepage categories could not load:",
      categoriesResult.error,
    );
  }

  const products = ((productsResult.data ?? []) as ProductRow[]).map(
    normalizeProduct,
  );

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

  const latestProducts = sortProductsByTimestamp(
    products.filter(isCurrentNewDrop),
    (product) => product.new_drop_started_at,
  );

  const latestFallback =
    latestProducts.length > 0
      ? latestProducts
      : sortProductsByTimestamp(products, (product) => product.created_at);

  const offerProducts = sortProductsByTimestamp(
    products.filter(isProductOnOffer),
    (product) => product.offer_started_at,
  );

  const featuredProducts = sortProductsByTimestamp(
    products.filter((product) => product.is_featured || product.is_trending),
    (product) => product.discovering_started_at,
  );

  const featuredFallback =
    featuredProducts.length > 0
      ? featuredProducts
      : sortProductsByTimestamp(products, (product) => product.created_at);

  const comingSoonProducts = sortProductsByTimestamp(
    products.filter(isComingSoonProduct),
    (product) => product.coming_soon_started_at,
  );

  return (
    <>
      <V3Header />

      <AccountSigninSuccessToast show={showSigninSuccess} />

      <AccountSignoutSuccessToast show={showSignoutSuccess} />

      <V3AnnouncementBar
        announcements={announcements}
        backgroundMode={homepageSettings.announcement_background_mode}
      />

      <V3Homepage
        categories={categories}
        latestProducts={latestFallback}
        offerProducts={offerProducts}
        featuredProducts={featuredFallback}
        comingSoonProducts={comingSoonProducts}
        catalogProducts={products}
        heroImageUrl={homepageSettings.hero_image_url}
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
