import type { MetadataRoute } from "next";

import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = "https://www.stereophoniestore.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/shop`,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/movies-series`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/delivery`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const supabase = createAdminClient();

  const [productsResult, categoriesResult] = await Promise.all([
    supabase
      .from("products")
      .select("slug, created_at, updated_at")
      .eq("status", "published")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false }),

    supabase
      .from("categories")
      .select("slug, created_at, updated_at")
      .eq("is_active", true)
      .not("slug", "is", null)
      .order("sort_order", { ascending: true }),
  ]);

  const products = productsResult.data;

  if (productsResult.error) {
    console.error(
      "Product sitemap could not be loaded:",
      productsResult.error,
    );
  }

  if (categoriesResult.error) {
    console.error(
      "Category sitemap could not be loaded:",
      categoriesResult.error,
    );
  }

  const productRoutes: MetadataRoute.Sitemap = (products ?? [])
    .filter(
      (
        product,
      ): product is {
        slug: string;
        created_at: string | null;
        updated_at: string | null;
      } =>
        typeof product.slug === "string" &&
        product.slug.trim().length > 0,
    )
    .map((product) => ({
      url: `${SITE_URL}/shop/${encodeURIComponent(product.slug.trim())}`,
      lastModified:
        product.updated_at ??
        product.created_at ??
        undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const categoryRoutes: MetadataRoute.Sitemap = (
    categoriesResult.data ?? []
  )
    .filter(
      (
        category,
      ): category is {
        slug: string;
        created_at: string | null;
        updated_at: string | null;
      } =>
        typeof category.slug === "string" &&
        category.slug.trim().length > 0,
    )
    .map((category) => ({
      url: `${SITE_URL}/shop/category/${encodeURIComponent(
        category.slug.trim(),
      )}`,
      lastModified:
        category.updated_at ??
        category.created_at ??
        undefined,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
  ];
}
