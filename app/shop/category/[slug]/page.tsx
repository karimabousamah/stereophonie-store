import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StereophonieShopPage } from "@/app/shop/page";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = "https://www.stereophoniestore.com";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    search?: string | string[];
    q?: string | string[];
    offers?: string | string[];
    brand?: string | string[];
    availability?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    sort?: string | string[];
  }>;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

async function getCategoryBySlug(slug: string) {
  const supabase = createAdminClient();

  return supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
}

function categoryDescription(category: CategoryRow) {
  const description = category.description?.trim();

  if (description) {
    return description;
  }

  return `Shop ${category.name} at Stereophonie Store. Explore electronics and technology with delivery across Lebanon.`;
}

export async function generateMetadata({
  params,
}: Pick<CategoryPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;

  const { data: category } = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Category",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalUrl = `${SITE_URL}/shop/category/${encodeURIComponent(
    category.slug,
  )}`;

  const title = category.name;

  const description = categoryDescription(category).slice(0, 160);

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: "Stereophonie Store",
      locale: "en_LB",
    },

    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;

  const { data: category, error } =
    await getCategoryBySlug(slug);

  if (error || !category) {
    notFound();
  }

  const parameters = await searchParams;

  const categoryUrl = `${SITE_URL}/shop/category/${encodeURIComponent(
    category.slug,
  )}`;

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${SITE_URL}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: categoryUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      {await StereophonieShopPage({
        searchParams: Promise.resolve({
          ...parameters,
          category: category.name,
        }),
      })}
    </>
  );
}
