import { type NextRequest, NextResponse } from "next/server";

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
  image_url?: string | null;
  alt_text?: string | null;
  position?: number | null;
  is_primary?: boolean | null;
};

type ProductVariant = {
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
    .filter((variant) => variant.is_active !== false)
    .map((variant) => {
      const regularPrice = toNumber(variant.regular_price);
      const salePrice = toNumber(variant.sale_price);

      const onSale =
        salePrice > 0 &&
        regularPrice > 0 &&
        salePrice < regularPrice;

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
      (variant) =>
        variant.status === "in_stock" &&
        variant.stock > 0,
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
        variant.status === "low_stock" ||
        variant.stock > 0,
    )
  ) {
    return {
      label: "Low stock",
      status: "low_stock",
    };
  }

  if (
    normalized.some(
      (variant) => variant.status === "coming_soon",
    )
  ) {
    return {
      label: "Coming soon",
      status: "coming_soon",
    };
  }

  return {
    label: "Out of stock",
    status: "out_of_stock",
  };
}

function getPrimaryImage(images: ProductImage[]) {
  return [...images]
    .sort((a, b) => {
      if (Boolean(a.is_primary) !== Boolean(b.is_primary)) {
        return a.is_primary ? -1 : 1;
      }

      return (a.position ?? 999) - (b.position ?? 999);
    })
    .find((image) => image.image_url) ?? null;
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

function matchesProduct(product: ProductRow, query: string) {
  return searchableValues(product).some((value) =>
    value.toLowerCase().includes(query),
  );
}

function ranking(product: ProductRow, query: string) {
  const name = product.name.toLowerCase();
  const brand = relationName(product.brands).toLowerCase();
  const category = relationName(product.categories).toLowerCase();

  if (name === query) return 0;
  if (name.startsWith(query)) return 1;

  if (brand === query) return 2;
  if (brand.startsWith(query)) return 3;

  if (category === query) return 4;
  if (category.startsWith(query)) return 5;

  if (name.includes(query)) return 6;
  if (brand.includes(query)) return 7;
  if (category.includes(query)) return 8;

  return 9;
}

export async function GET(request: NextRequest) {
  const searchQuery =
    request.nextUrl.searchParams
      .get("q")
      ?.trim()
      .slice(0, 80) ?? "";

  if (searchQuery.length < 1) {
    return NextResponse.json({
      results: [],
      brands: [],
      categories: [],
    });
  }

  const normalizedQuery = searchQuery.toLowerCase();

  const supabase = await createClient();

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
        image_url,
        alt_text,
        position,
        is_primary
      ),

      product_variants (
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
    .order("name", {
      ascending: true,
    })
    .limit(150);

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

  const matchingProducts = ((data ?? []) as ProductRow[])
    .filter((product) =>
      matchesProduct(product, normalizedQuery),
    )
    .sort((a, b) => {
      const score =
        ranking(a, normalizedQuery) -
        ranking(b, normalizedQuery);

      if (score !== 0) {
        return score;
      }

      return a.name.localeCompare(b.name);
    });

  const results = matchingProducts
    .slice(0, 8)
    .map((product) => {
      const image = getPrimaryImage(
        product.product_images ?? [],
      );

      const prices = getProductPrices(
        product.product_variants ?? [],
      );

      const availability = getAvailability(
        product.product_variants ?? [],
      );

      return {
        id: product.id,
        name: product.name,
        slug: product.slug ?? product.id,

        description: product.description,

        brand: relationName(
          product.brands,
          "",
        ),

        category: relationName(
          product.categories,
          "Technology",
        ),

        imageUrl: image?.image_url ?? null,

        imageAlt:
          image?.alt_text ??
          product.name,

        price: prices.price,
        regularPrice: prices.regularPrice,
        onSale: prices.onSale,

        availability: availability.label,
        availabilityStatus: availability.status,
      };
    });

  const brands = Array.from(
    new Set(
      matchingProducts
        .map((product) =>
          relationName(product.brands),
        )
        .filter(Boolean)
        .filter((brand) =>
          brand
            .toLowerCase()
            .includes(normalizedQuery),
        ),
    ),
  ).slice(0, 5);

  const categories = Array.from(
    new Set(
      matchingProducts
        .map((product) =>
          relationName(product.categories),
        )
        .filter(Boolean)
        .filter((category) =>
          category
            .toLowerCase()
            .includes(normalizedQuery),
        ),
    ),
  ).slice(0, 5);

  return NextResponse.json({
    results,
    brands,
    categories,
  });
}
