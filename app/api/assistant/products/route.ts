import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CategoryRelation =
  | {
      name?: string | null;
    }
  | {
      name?: string | null;
    }[]
  | null;

type ProductImageRow = {
  image_url?: string | null;
  alt_text?: string | null;
  position?: number | null;
  is_primary?: boolean | null;
};

type ProductVariantRow = {
  id: string;
  size?: string | null;
  regular_price?: number | string | null;
  sale_price?: number | string | null;
  stock_quantity?: number | null;
  availability_status?: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categories: CategoryRelation;
  product_images: ProductImageRow[] | null;
  product_variants: ProductVariantRow[] | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getCategoryName(relation: CategoryRelation) {
  if (!relation) {
    return "Collection";
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() || "Collection";
  }

  return relation.name?.trim() || "Collection";
}

function normalizeStatus(value: string | null | undefined) {
  return cleanText(value).toLowerCase().replaceAll(" ", "_");
}

function getPrimaryImage(images: ProductImageRow[]) {
  return [...images]
    .sort((first, second) => {
      if (Boolean(first.is_primary) !== Boolean(second.is_primary)) {
        return first.is_primary ? -1 : 1;
      }

      return (first.position ?? 999) - (second.position ?? 999);
    })
    .find((image) => Boolean(image.image_url));
}

function getVariantPrice(variant: ProductVariantRow) {
  const regularPrice = toNumber(variant.regular_price);

  const possibleSalePrice = toNumber(variant.sale_price);

  const hasSale =
    possibleSalePrice > 0 &&
    regularPrice > 0 &&
    possibleSalePrice < regularPrice;

  return {
    regularPrice,
    salePrice: hasSale ? possibleSalePrice : null,
    currentPrice: hasSale ? possibleSalePrice : regularPrice,
  };
}

function variantIsPurchasable(variant: ProductVariantRow) {
  const status = normalizeStatus(variant.availability_status);

  const stock = Math.max(0, variant.stock_quantity ?? 0);

  return (
    stock > 0 &&
    status !== "out_of_stock" &&
    status !== "coming_soon" &&
    status !== "unavailable"
  );
}

function getSearchTerms(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9À-ÿ\u0600-\u06ff\s-]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 10);
}

function productMatchesSearch(product: ProductRow, terms: string[]) {
  if (terms.length === 0) {
    return true;
  }

  const searchableText = [
    product.name,
    product.description ?? "",
    getCategoryName(product.categories),
  ]
    .join(" ")
    .toLowerCase();

  return terms.some((term) => searchableText.includes(term));
}

export async function GET(request: NextRequest) {
  const searchQuery = cleanText(request.nextUrl.searchParams.get("q")).slice(
    0,
    120,
  );

  const requestedCategory = cleanText(
    request.nextUrl.searchParams.get("category"),
  ).toLowerCase();

  const requestedSize = cleanText(
    request.nextUrl.searchParams.get("size"),
  ).toLowerCase();

  const rawMaximumPrice = Number(request.nextUrl.searchParams.get("maxPrice"));

  const maximumPrice =
    Number.isFinite(rawMaximumPrice) && rawMaximumPrice > 0
      ? rawMaximumPrice
      : null;

  const onlyAvailable =
    request.nextUrl.searchParams.get("available") !== "false";

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
      product_images (
        image_url,
        alt_text,
        position,
        is_primary
      ),
      product_variants (
        id,
        size,
        regular_price,
        sale_price,
        stock_quantity,
        availability_status
      )
    `,
    )
    .eq("status", "published")
    .order("name", {
      ascending: true,
    })
    .limit(100);

  if (error) {
    console.error("Assistant product search failed:", error);

    return NextResponse.json(
      {
        results: [],
        error: "The catalog could not be searched.",
      },
      {
        status: 500,
      },
    );
  }

  const terms = getSearchTerms(searchQuery);

  const results = ((data ?? []) as ProductRow[])
    .filter((product) => productMatchesSearch(product, terms))
    .map((product) => {
      const variants = (product.product_variants ?? [])
        .map((variant) => {
          const prices = getVariantPrice(variant);

          return {
            id: variant.id,
            size: cleanText(variant.size) || "One size",
            regularPrice: prices.regularPrice,
            salePrice: prices.salePrice,
            currentPrice: prices.currentPrice,
            stockQuantity: Math.max(0, variant.stock_quantity ?? 0),
            availabilityStatus:
              normalizeStatus(variant.availability_status) || "unavailable",
            purchasable: variantIsPurchasable(variant),
          };
        })
        .filter((variant) => variant.currentPrice > 0)
        .filter((variant) => {
          if (requestedSize && variant.size.toLowerCase() !== requestedSize) {
            return false;
          }

          if (maximumPrice !== null && variant.currentPrice > maximumPrice) {
            return false;
          }

          if (onlyAvailable && !variant.purchasable) {
            return false;
          }

          return true;
        });

      const primaryImage = getPrimaryImage(product.product_images ?? []);

      const lowestPrice =
        variants.length > 0
          ? Math.min(...variants.map((variant) => variant.currentPrice))
          : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug ?? product.id,
        description: product.description,
        category: getCategoryName(product.categories),
        imageUrl: primaryImage?.image_url ?? null,
        imageAlt: primaryImage?.alt_text ?? product.name,
        price: lowestPrice,
        variants,
      };
    })
    .filter((product) => {
      if (
        requestedCategory &&
        !product.category.toLowerCase().includes(requestedCategory)
      ) {
        return false;
      }

      return product.variants.length > 0;
    })
    .slice(0, 8);

  return NextResponse.json({
    results,
  });
}
