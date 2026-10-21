import { type NextRequest, NextResponse } from "next/server";

import {
  storefrontConfigurationImages,
} from "@/lib/storefront-product-media";
import {
  normalizeStorefrontSearchText,
  storefrontSearchValueScore,
} from "@/lib/storefront-search";
import { loadShopSearchIndex } from "@/lib/storefront-shop-loader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NamedRelation =
  | {
      name?: string | null;
    }
  | {
      name?: string | null;
    }[]
  | null;

type ProductImage = {
  id: string;

  image_url: string | null;
  storage_path: string | null;
  alt_text: string | null;

  position: number;
  is_primary: boolean;

  variant_id: string | null;
  variant_position: number | null;
  is_variant_primary: boolean | null;

  product_image_variants:
    | {
        variant_id: string;
        position: number;
        is_primary: boolean;
      }[]
    | null;
};

type ProductVariant = {
  id?: string | null;
  display_position?: number | null;
  regular_price?: number | string | null;
  sale_price?: number | string | null;
  stock_quantity?: number | null;
  availability_status?: string | null;
  variant_name?: string | null;
  size?: string | null;
  is_active?: boolean | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categories: NamedRelation;
  brands: NamedRelation;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
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

function storefrontImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string | null | undefined,
) {
  const cleanStoragePath =
    typeof storagePath === "string" ? storagePath.trim() : "";

  if (!cleanStoragePath) {
    return null;
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(storefrontThumbnailPath(cleanStoragePath));

  return data.publicUrl;
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

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getProductPrices(variants: ProductVariant[]) {
  const prices = variants
    .filter(
      (variant) =>
        variant.is_active !== false &&
        normalizeAvailability(variant.availability_status) !== "ask_for_price",
    )
    .map((variant) => {
      const regularPrice = toNumber(variant.regular_price);
      const salePrice = toNumber(variant.sale_price);

      const onSale =
        salePrice > 0 && regularPrice > 0 && salePrice < regularPrice;

      return {
        price: onSale ? salePrice : regularPrice,
        regularPrice,
        onSale,
      };
    })
    .filter((item) => item.price > 0)
    .sort((a, b) => a.price - b.price);

  const lowest = prices[0];

  if (!lowest) {
    return {
      price: null,
      regularPrice: null,
      onSale: false,
    };
  }

  return {
    price: lowest.price,
    regularPrice: lowest.onSale ? lowest.regularPrice : null,
    onSale: lowest.onSale,
  };
}

function normalizeAvailability(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

function getAvailability(variants: ProductVariant[]) {
  const active = variants.filter((variant) => variant.is_active !== false);

  if (active.length === 0) {
    return {
      label: "Unavailable",
      status: "unavailable",
    };
  }

  const normalized = active.map((variant) => ({
    status: normalizeAvailability(variant.availability_status),
    stock: Number(variant.stock_quantity ?? 0),
  }));

  if (
    normalized.some(
      (variant) => variant.status === "in_stock" && variant.stock > 0,
    )
  ) {
    return {
      label: "In stock",
      status: "in_stock",
    };
  }

  if (
    normalized.some(
      (variant) =>
        variant.status === "low_stock" &&
        variant.stock > 0,
    )
  ) {
    return {
      label: "Low stock",
      status: "low_stock",
    };
  }

  if (normalized.some((variant) => variant.status === "coming_soon")) {
    return {
      label: "Coming soon",
      status: "coming_soon",
    };
  }

  if (normalized.some((variant) => variant.status === "ask_for_price")) {
    return {
      label: "Ask for price",
      status: "ask_for_price",
    };
  }

  return {
    label: "Out of stock",
    status: "out_of_stock",
  };
}

function searchableValues(product: ProductRow) {
  return [
    product.name,
    product.description ?? "",
    relationName(product.brands),
    relationName(product.categories),

    ...(product.product_variants ?? []).flatMap((variant) => [
      variant.variant_name ?? "",
      variant.size ?? "",
    ]),
  ];
}

function productSearchScore(product: ProductRow, query: string) {
  const weightedValues = [
    {
      value: product.name,
      weight: 0,
    },
    {
      value: relationName(product.brands),
      weight: 20,
    },
    {
      value: relationName(product.categories),
      weight: 30,
    },

    ...(product.product_variants ?? []).flatMap((variant) => [
      {
        value: variant.variant_name ?? "",
        weight: 40,
      },
      {
        value: variant.size ?? "",
        weight: 45,
      },
    ]),

    {
      value: product.description ?? "",
      weight: 60,
    },
  ];

  let bestScore: number | null = null;

  for (const item of weightedValues) {
    const matchScore = storefrontSearchValueScore(item.value, query);

    if (matchScore === null) {
      continue;
    }

    const score = item.weight + matchScore;

    if (bestScore === null || score < bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

function matchesProduct(product: ProductRow, query: string) {
  return productSearchScore(product, query) !== null;
}

function ranking(product: ProductRow, query: string) {
  return productSearchScore(product, query) ?? Number.MAX_SAFE_INTEGER;
}
export async function GET(request: NextRequest) {
  const searchQuery =
    request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";

  if (searchQuery.length < 1) {
    return NextResponse.json({
      results: [],
      brands: [],
      categories: [],
    });
  }

  const normalizedQuery = normalizeStorefrontSearchText(searchQuery);

  /*
   * Search the complete published catalogue first.
   *
   * Previously this endpoint hydrated only the first 150 products
   * alphabetically and then searched inside that incomplete subset.
   * A valid product such as Samsung Galaxy S26 could therefore appear
   * on the submitted Shop results page but be missing from autocomplete.
   *
   * The Shop catalogue index is lightweight, cached briefly, and is the
   * same authoritative search source used by the full Shop experience.
   */
  const matchingIndexProducts =
    await loadShopSearchIndex(searchQuery);

  const topProductIds =
    matchingIndexProducts
      .slice(0, 8)
      .map((product) => product.id);

  const supabase = await createClient();

  if (topProductIds.length === 0) {
    return NextResponse.json({
      results: [],
      brands: [],
      categories: [],
    });
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      description,

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
        availability_status,
        variant_name,
        size,
        is_active
      )
      `,
    )
    .eq("status", "published")
    .in("id", topProductIds);

  if (error) {
    console.error("Live product search failed:", error);

    return NextResponse.json(
      {
        results: [],
        brands: [],
        categories: [],
        error: "Search database unavailable.",
      },
      {
        status: 500,
      },
    );
  }

  const hydratedProductById =
    new Map(
      ((data ?? []) as ProductRow[]).map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  /*
   * Supabase does not guarantee the order of an IN() result.
   * Restore the authoritative whole-catalog search ranking here.
   */
  const matchingProducts =
    topProductIds
      .map((productId) =>
        hydratedProductById.get(productId),
      )
      .filter(
        (product): product is ProductRow =>
          Boolean(product),
      );

  const results = matchingProducts.slice(0, 8).map((product) => {
    const image =
      storefrontConfigurationImages(
        product.product_images ?? [],
        product.product_variants ?? [],
      )[0] ?? null;

    const prices = getProductPrices(product.product_variants ?? []);

    const availability = getAvailability(product.product_variants ?? []);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug ?? product.id,

      description: product.description,

      brand: relationName(product.brands, ""),

      category: relationName(product.categories, "Technology"),

      /*
       * Autocomplete must always have a dependable product photograph.
       *
       * The generated storefront thumbnail is optional and may not exist
       * for every older/imported image. The original saved image URL is
       * authoritative and is known to work on the normal storefront card.
       */
      imageUrl:
        image?.image_url ??
        storefrontImageUrl(
          supabase,
          image?.storage_path,
        ) ??
        null,

      imageAlt: image?.alt_text ?? product.name,

      price: prices.price,
      regularPrice: prices.regularPrice,
      onSale: prices.onSale,

      availability: availability.label,
      availabilityStatus: availability.status,
    };
  });

  const brands = Array.from(
    new Set(
      matchingIndexProducts
        .map((product) => relationName(product.brands))
        .filter(Boolean)
        .filter(
          (brand) => storefrontSearchValueScore(brand, normalizedQuery) !== null,
        ),
    ),
  ).slice(0, 5);

  const categories = Array.from(
    new Set(
      matchingIndexProducts
        .map((product) => relationName(product.categories))
        .filter(Boolean)
        .filter(
          (category) =>
            storefrontSearchValueScore(category, normalizedQuery) !== null,
        ),
    ),
  ).slice(0, 5);

  return NextResponse.json({
    results,
    brands,
    categories,
  });
}
