import type { StoreProductVariant } from "@/components/storefront/store-product-card";
import {
  storefrontSearchDirectProductMatch,
} from "@/lib/storefront-search";

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
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
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
  if (!search.trim()) {
    return true;
  }

  return storefrontSearchDirectProductMatch({
    name: product.name,
    brand: shopBrandName(product),
    query: search,
  });
}

export function shopNewestTimestamp(product: ShopCatalogueProduct) {
  const createdTimestamp = product.created_at
    ? new Date(product.created_at).getTime()
    : 0;

  const validCreatedTimestamp = Number.isFinite(createdTimestamp)
    ? createdTimestamp
    : 0;

  if (!product.is_new_arrival || !product.new_drop_started_at) {
    return validCreatedTimestamp;
  }

  const newDropTimestamp = new Date(
    product.new_drop_started_at,
  ).getTime();

  if (!Number.isFinite(newDropTimestamp)) {
    return validCreatedTimestamp;
  }

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const newDropAge = Date.now() - newDropTimestamp;

  if (newDropAge >= 0 && newDropAge < sevenDays) {
    return newDropTimestamp;
  }

  return validCreatedTimestamp;
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
