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
};

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categories: CategoryRelation;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
};

function getCategoryName(relation: CategoryRelation) {
  if (!relation) {
    return "Collection";
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() || "Collection";
  }

  return relation.name?.trim() || "Collection";
}

function toNumber(value: number | string | null | undefined) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getProductPrices(variants: ProductVariant[]) {
  const validVariants = variants
    .map((variant) => {
      const regularPrice = toNumber(variant.regular_price);

      const salePrice = toNumber(variant.sale_price);

      const hasValidSale =
        salePrice > 0 && regularPrice > 0 && salePrice < regularPrice;

      return {
        currentPrice: hasValidSale ? salePrice : regularPrice,
        regularPrice,
        hasValidSale,
      };
    })
    .filter((variant) => variant.currentPrice > 0)
    .sort((first, second) => first.currentPrice - second.currentPrice);

  const lowestVariant = validVariants[0];

  if (!lowestVariant) {
    return {
      price: null,
      regularPrice: null,
      onSale: false,
    };
  }

  return {
    price: lowestVariant.currentPrice,
    regularPrice: lowestVariant.hasValidSale
      ? lowestVariant.regularPrice
      : null,
    onSale: lowestVariant.hasValidSale,
  };
}

function getAvailability(variants: ProductVariant[]) {
  if (variants.length === 0) {
    return {
      label: "Unavailable",
      status: "unavailable",
    };
  }

  const normalizedVariants = variants.map((variant) => ({
    status:
      variant.availability_status?.trim().toLowerCase().replaceAll(" ", "_") ??
      "",
    stock: variant.stock_quantity ?? 0,
  }));

  const hasInStock = normalizedVariants.some(
    (variant) => variant.status === "in_stock" && variant.stock > 0,
  );

  if (hasInStock) {
    return {
      label: "In stock",
      status: "in_stock",
    };
  }

  const hasLowStock = normalizedVariants.some(
    (variant) => variant.status === "low_stock" || variant.stock > 0,
  );

  if (hasLowStock) {
    return {
      label: "Low stock",
      status: "low_stock",
    };
  }

  const hasComingSoon = normalizedVariants.some(
    (variant) => variant.status === "coming_soon",
  );

  if (hasComingSoon) {
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
  const orderedImages = [...images].sort((first, second) => {
    if (Boolean(first.is_primary) !== Boolean(second.is_primary)) {
      return first.is_primary ? -1 : 1;
    }

    return (first.position ?? 999) - (second.position ?? 999);
  });

  return orderedImages.find((image) => image.image_url) ?? null;
}

export async function GET(request: NextRequest) {
  const searchQuery =
    request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";

  if (searchQuery.length < 2) {
    return NextResponse.json({
      results: [],
    });
  }

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
        regular_price,
        sale_price,
        stock_quantity,
        availability_status
      )
    `,
    )
    .eq("status", "published")
    .ilike("name", `%${searchQuery}%`)
    .order("name", {
      ascending: true,
    })
    .limit(8);

  if (error) {
    console.error("Product search failed:", error);

    return NextResponse.json(
      {
        error: "Products could not be searched.",
        results: [],
      },
      {
        status: 500,
      },
    );
  }

  const products = (data ?? []) as ProductRow[];

  const results = products.map((product) => {
    const variants = product.product_variants ?? [];

    const image = getPrimaryImage(product.product_images ?? []);

    const prices = getProductPrices(variants);

    const availability = getAvailability(variants);

    return {
      id: product.id,
      name: product.name,
      slug: product.slug ?? product.id,
      description: product.description,
      category: getCategoryName(product.categories),
      imageUrl: image?.image_url ?? null,
      imageAlt: image?.alt_text ?? product.name,
      price: prices.price,
      regularPrice: prices.regularPrice,
      onSale: prices.onSale,
      availability: availability.label,
      availabilityStatus: availability.status,
    };
  });

  return NextResponse.json({
    results,
  });
}
