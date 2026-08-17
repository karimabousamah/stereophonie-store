import type { Metadata } from "next";
import V2ShopPage from "@/components/stereophonie-v2/shop/v2-shop-page";
import type {
  StoreProductCardProduct,
  StoreProductImage,
  StoreProductVariant,
} from "@/components/storefront/store-product-card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse Stereophonie electronics, technology and accessories. Filter products by category, brand, availability and price.",
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
  created_at: string | null;
  categories: NamedRelation;
  brands: NamedRelation;
  product_images: StoreProductImage[] | null;
  product_variants: StoreProductVariant[] | null;
};

type AvailabilityFilter = "" | "in-stock";

type SortOption = "newest" | "price-asc" | "price-desc";

type ShopPageProps = {
  searchParams: Promise<{
    search?: string | string[];
    q?: string | string[];
    category?: string | string[];
    brand?: string | string[];
    availability?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    sort?: string | string[];
  }>;
};

function singleParameter(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
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

function categoryName(product: ProductRow) {
  return relationName(product.categories, "Technology");
}

function brandName(product: ProductRow) {
  return relationName(product.brands, "");
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function selectedPrice(value: string) {
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

function selectedAvailability(value: string): AvailabilityFilter {
  return value === "in-stock" ? "in-stock" : "";
}

function selectedSort(value: string): SortOption {
  if (value === "price-asc" || value === "price-desc") {
    return value;
  }

  return "newest";
}

function variantPrice(variant: StoreProductVariant) {
  const regular = numberValue(variant.regular_price);
  const sale = numberValue(variant.sale_price);

  const validSale = sale > 0 && regular > 0 && sale < regular;

  return validSale ? sale : regular;
}

function productPrices(product: ProductRow) {
  return (product.product_variants ?? [])
    .filter((variant) => variant.is_active !== false)
    .map(variantPrice)
    .filter((price) => price > 0);
}

function lowestPrice(product: ProductRow) {
  const prices = productPrices(product);

  return prices.length > 0 ? Math.min(...prices) : null;
}

function normalizedAvailability(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

function productInStock(product: ProductRow) {
  return (product.product_variants ?? []).some((variant) => {
    if (variant.is_active === false) {
      return false;
    }

    const status = normalizedAvailability(variant.availability_status);
    const quantity = numberValue(variant.stock_quantity);

    if (status === "coming_soon" || status === "out_of_stock") {
      return false;
    }

    return quantity > 0 || status === "in_stock" || status === "low_stock";
  });
}

function matchesPriceRange(
  product: ProductRow,
  minimum: number | null,
  maximum: number | null,
) {
  if (minimum === null && maximum === null) {
    return true;
  }

  return productPrices(product).some((price) => {
    if (minimum !== null && price < minimum) {
      return false;
    }

    if (maximum !== null && price > maximum) {
      return false;
    }

    return true;
  });
}

function matchesSearch(product: ProductRow, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const searchableValues = [
    product.name,
    product.description ?? "",
    categoryName(product),
    brandName(product),
    ...(product.product_variants ?? []).flatMap((variant) => [
      String(variant.size ?? ""),
      String(
        (variant as StoreProductVariant & { variant_name?: string })
          .variant_name ?? "",
      ),
    ]),
  ];

  return searchableValues.some((value) => value.toLowerCase().includes(query));
}

function newestTimestamp(product: ProductRow) {
  if (!product.created_at) {
    return 0;
  }

  const timestamp = new Date(product.created_at).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortCatalog(products: ProductRow[], sort: SortOption) {
  const result = [...products];

  if (sort === "price-asc") {
    return result.sort((first, second) => {
      const firstPrice = lowestPrice(first);
      const secondPrice = lowestPrice(second);

      if (firstPrice === null && secondPrice === null) {
        return newestTimestamp(second) - newestTimestamp(first);
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
      const firstPrice = lowestPrice(first);
      const secondPrice = lowestPrice(second);

      if (firstPrice === null && secondPrice === null) {
        return newestTimestamp(second) - newestTimestamp(first);
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
    (first, second) => newestTimestamp(second) - newestTimestamp(first),
  );
}

function normalizeProduct(product: ProductRow): StoreProductCardProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: categoryName(product),
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    images: product.product_images ?? [],
    variants: product.product_variants ?? [],
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const parameters = await searchParams;

  const search =
    singleParameter(parameters.search).trim() ||
    singleParameter(parameters.q).trim();

  const category = singleParameter(parameters.category).trim();
  const brand = singleParameter(parameters.brand).trim();

  const availability = selectedAvailability(
    singleParameter(parameters.availability).toLowerCase(),
  );

  const requestedMinimumPrice = selectedPrice(
    singleParameter(parameters.minPrice),
  );

  const requestedMaximumPrice = selectedPrice(
    singleParameter(parameters.maxPrice),
  );

  const sort = selectedSort(singleParameter(parameters.sort).toLowerCase());

  const supabase = await createClient();

  const [productsResult, categoriesResult, brandsResult] = await Promise.all([
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
          created_at,

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
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("brands")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),
  ]);

  if (productsResult.error) {
    console.error("Stereophonie catalog could not load:", productsResult.error);
  }

  if (categoriesResult.error) {
    console.error(
      "Stereophonie categories could not load:",
      categoriesResult.error,
    );
  }

  if (brandsResult.error) {
    console.error("Stereophonie brands could not load:", brandsResult.error);
  }

  const products = (productsResult.data ?? []) as ProductRow[];

  const categories = (categoriesResult.data ?? [])
    .map((item) => String(item.name ?? "").trim())
    .filter(Boolean);

  const brands = (brandsResult.data ?? [])
    .map((item) => String(item.name ?? "").trim())
    .filter(Boolean);

  /*
   * PRICE WINDOW
   *
   * The slider bounds react to:
   * - current category
   * - current brand
   * - current search
   * - stock-only selection
   *
   * They intentionally ignore the current price filter itself,
   * otherwise the rail would collapse around itself.
   */
  const priceWindowProducts = products.filter((product) => {
    if (
      category &&
      categoryName(product).toLowerCase() !== category.toLowerCase()
    ) {
      return false;
    }

    if (brand && brandName(product).toLowerCase() !== brand.toLowerCase()) {
      return false;
    }

    if (availability === "in-stock" && !productInStock(product)) {
      return false;
    }

    if (!matchesSearch(product, search)) {
      return false;
    }

    return true;
  });

  const availablePrices = priceWindowProducts.flatMap((product) =>
    productPrices(product),
  );

  let catalogMinimumPrice =
    availablePrices.length > 0 ? Math.floor(Math.min(...availablePrices)) : 0;

  let catalogMaximumPrice =
    availablePrices.length > 0 ? Math.ceil(Math.max(...availablePrices)) : 5;

  /*
   * Physical Filter System requirement:
   * MIN and MAX must always have at least $5 between them.
   */
  if (catalogMaximumPrice - catalogMinimumPrice < 5) {
    catalogMaximumPrice = catalogMinimumPrice + 5;
  }

  let minimumPrice = requestedMinimumPrice;
  let maximumPrice = requestedMaximumPrice;

  if (minimumPrice !== null) {
    minimumPrice = Math.min(
      Math.max(minimumPrice, catalogMinimumPrice),
      catalogMaximumPrice - 5,
    );
  }

  if (maximumPrice !== null) {
    maximumPrice = Math.max(
      Math.min(maximumPrice, catalogMaximumPrice),
      catalogMinimumPrice + 5,
    );
  }

  if (
    minimumPrice !== null &&
    maximumPrice !== null &&
    maximumPrice - minimumPrice < 5
  ) {
    maximumPrice = Math.min(catalogMaximumPrice, minimumPrice + 5);

    if (maximumPrice - minimumPrice < 5) {
      minimumPrice = Math.max(catalogMinimumPrice, maximumPrice - 5);
    }
  }

  const filteredProducts = products.filter((product) => {
    if (
      category &&
      categoryName(product).toLowerCase() !== category.toLowerCase()
    ) {
      return false;
    }

    if (brand && brandName(product).toLowerCase() !== brand.toLowerCase()) {
      return false;
    }

    if (availability === "in-stock" && !productInStock(product)) {
      return false;
    }

    if (!matchesPriceRange(product, minimumPrice, maximumPrice)) {
      return false;
    }

    if (!matchesSearch(product, search)) {
      return false;
    }

    return true;
  });

  const displayedProducts = sortCatalog(filteredProducts, sort).map(
    normalizeProduct,
  );

  return (
    <V2ShopPage
      products={displayedProducts}
      categories={categories}
      brands={brands}
      selectedCategory={category}
      selectedBrand={brand}
      selectedAvailability={availability}
      selectedSort={sort}
      selectedMinPrice={minimumPrice}
      selectedMaxPrice={maximumPrice}
      minimumAvailablePrice={catalogMinimumPrice}
      maximumAvailablePrice={catalogMaximumPrice}
      selectedSearch={search}
    />
  );
}
