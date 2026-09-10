import type { StoreProductVariant } from "@/components/storefront/store-product-card";

export type ShopNamedRelation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

export type ShopCatalogueProduct = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  created_at: string | null;
  categories: ShopNamedRelation;
  brands: ShopNamedRelation;
  product_variants: StoreProductVariant[] | null;
};

export type ShopAvailabilityFilter = "" | "in-stock";

export type ShopSortOption = "newest" | "price-asc" | "price-desc";

export function shopSingleParameter(
  value: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function shopRelationName(
  relation: ShopNamedRelation,
  fallback = "",
) {
  if (!relation) {
    return fallback;
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() || fallback;
  }

  return relation.name?.trim() || fallback;
}

export function shopCategoryName(product: ShopCatalogueProduct) {
  return shopRelationName(product.categories, "Technology");
}

export function shopBrandName(product: ShopCatalogueProduct) {
  return shopRelationName(product.brands, "");
}

export function shopNumberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function shopSelectedPrice(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function shopSelectedAvailability(
  value: string,
): ShopAvailabilityFilter {
  return value === "in-stock" ? "in-stock" : "";
}

export function shopSelectedSort(value: string): ShopSortOption {
  if (value === "price-asc" || value === "price-desc") {
    return value;
  }

  return "newest";
}

export function shopVariantPrice(variant: StoreProductVariant) {
  const regular = shopNumberValue(variant.regular_price);
  const sale = shopNumberValue(variant.sale_price);

  const validSale = sale > 0 && regular > 0 && sale < regular;

  return validSale ? sale : regular;
}

export function shopProductOnOffer(product: ShopCatalogueProduct) {
  return (product.product_variants ?? []).some((variant) => {
    if (variant.is_active === false) {
      return false;
    }

    const regular = shopNumberValue(variant.regular_price);
    const sale = shopNumberValue(variant.sale_price);

    return regular > 0 && sale > 0 && sale < regular;
  });
}

export function shopProductPrices(product: ShopCatalogueProduct) {
  return (product.product_variants ?? [])
    .filter((variant) => variant.is_active !== false)
    .map(shopVariantPrice)
    .filter((price) => price > 0);
}

export function shopLowestPrice(product: ShopCatalogueProduct) {
  const prices = shopProductPrices(product);

  return prices.length > 0 ? Math.min(...prices) : null;
}

export function shopNormalizedAvailability(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

export function shopProductInStock(product: ShopCatalogueProduct) {
  return (product.product_variants ?? []).some((variant) => {
    if (variant.is_active === false) {
      return false;
    }

    const status = shopNormalizedAvailability(
      variant.availability_status,
    );

    const quantity = shopNumberValue(variant.stock_quantity);

    if (status === "coming_soon" || status === "out_of_stock") {
      return false;
    }

    return (
      quantity > 0 ||
      status === "in_stock" ||
      status === "low_stock"
    );
  });
}

export function shopMatchesPriceRange(
  product: ShopCatalogueProduct,
  minimum: number | null,
  maximum: number | null,
) {
  if (minimum === null && maximum === null) {
    return true;
  }

  return shopProductPrices(product).some((price) => {
    if (minimum !== null && price < minimum) {
      return false;
    }

    if (maximum !== null && price > maximum) {
      return false;
    }

    return true;
  });
}

export function shopMatchesSearch(
  product: ShopCatalogueProduct,
  search: string,
) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const searchableValues = [
    product.name,
    product.description ?? "",
    shopCategoryName(product),
    shopBrandName(product),

    ...(product.product_variants ?? []).flatMap((variant) => [
      String(variant.size ?? ""),
      String(variant.variant_name ?? ""),
    ]),
  ];

  return searchableValues.some((value) =>
    value.toLowerCase().includes(query),
  );
}

export function shopNewestTimestamp(product: ShopCatalogueProduct) {
  if (!product.created_at) {
    return 0;
  }

  const timestamp = new Date(product.created_at).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function shopSortCatalog<T extends ShopCatalogueProduct>(
  products: T[],
  sort: ShopSortOption,
) {
  const result = [...products];

  if (sort === "price-asc") {
    return result.sort((first, second) => {
      const firstPrice = shopLowestPrice(first);
      const secondPrice = shopLowestPrice(second);

      if (firstPrice === null && secondPrice === null) {
        return (
          shopNewestTimestamp(second) -
          shopNewestTimestamp(first)
        );
      }

      if (firstPrice === null) {
        return 1;
      }

      if (secondPrice === null) {
        return -1;
      }

      return firstPrice - secondPrice;
    });
  }

  if (sort === "price-desc") {
    return result.sort((first, second) => {
      const firstPrice = shopLowestPrice(first);
      const secondPrice = shopLowestPrice(second);

      if (firstPrice === null && secondPrice === null) {
        return (
          shopNewestTimestamp(second) -
          shopNewestTimestamp(first)
        );
      }

      if (firstPrice === null) {
        return 1;
      }

      if (secondPrice === null) {
        return -1;
      }

      return secondPrice - firstPrice;
    });
  }

  return result.sort(
    (first, second) =>
      shopNewestTimestamp(second) -
      shopNewestTimestamp(first),
  );
}
