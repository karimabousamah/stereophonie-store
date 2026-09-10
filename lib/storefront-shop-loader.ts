import type {
  StoreProductCardProduct,
  StoreProductImage,
  StoreProductVariant,
} from "@/components/storefront/store-product-card";
import {
  shopBrandName,
  shopCategoryName,
  shopMatchesPriceRange,
  shopMatchesSearch,
  shopProductInStock,
  shopProductOnOffer,
  shopProductPrices,
  shopSortCatalog,
  type ShopAvailabilityFilter,
  type ShopCatalogueProduct,
  type ShopNamedRelation,
  type ShopSortOption,
} from "@/lib/storefront-shop-catalog";
import { storefrontConfigurationImages } from "@/lib/storefront-product-media";
import { createClient } from "@/lib/supabase/server";

export const SHOP_PRODUCTS_PER_BATCH = 50;

type ShopIndexVariant = StoreProductVariant;

type ShopIndexRow = ShopCatalogueProduct & {
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
};

type ShopFullImage = StoreProductImage & {
  id: string;
  storage_path: string | null;
  product_image_variants?:
    | {
        variant_id: string;
        position: number;
        is_primary: boolean;
      }[]
    | null;
};

type ShopFullRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
  created_at: string | null;
  categories: ShopNamedRelation;
  brands: ShopNamedRelation;
  product_images: ShopFullImage[] | null;
  product_variants: StoreProductVariant[] | null;
};

export type ShopBatchFilters = {
  search: string;
  category: string;
  offers: boolean;
  brand: string;
  availability: ShopAvailabilityFilter;
  requestedMinimumPrice: number | null;
  requestedMaximumPrice: number | null;
  sort: ShopSortOption;
};

export type ShopBatchResult = {
  products: StoreProductCardProduct[];
  totalProducts: number;
  minimumPrice: number | null;
  maximumPrice: number | null;
  minimumAvailablePrice: number;
  maximumAvailablePrice: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

function storefrontThumbnailPath(storagePath: string) {
  const slashIndex = storagePath.lastIndexOf("/");

  const directory =
    slashIndex >= 0
      ? storagePath.slice(0, slashIndex)
      : "";

  const filename =
    slashIndex >= 0
      ? storagePath.slice(slashIndex + 1)
      : storagePath;

  const dotIndex = filename.lastIndexOf(".");

  const baseName =
    dotIndex > 0
      ? filename.slice(0, dotIndex)
      : filename;

  const thumbnailFilename = `${baseName}.webp`;

  return directory
    ? `${directory}/storefront/${thumbnailFilename}`
    : `storefront/${thumbnailFilename}`;
}

type ShopSupabaseClient =
  Awaited<ReturnType<typeof createClient>>;

function normalizeProduct(
  product: ShopFullRow,
  supabase: ShopSupabaseClient,
): StoreProductCardProduct {
  const storagePathByImageUrl = new Map<string, string>();

  for (const image of product.product_images ?? []) {
    if (image.image_url && image.storage_path) {
      storagePathByImageUrl.set(
        image.image_url,
        image.storage_path,
      );
    }
  }

  const orderedImages = storefrontConfigurationImages(
    product.product_images,
    product.product_variants,
  );

  const images = orderedImages.map((image) => {
    if (!image.image_url) {
      return image;
    }

    const storagePath =
      storagePathByImageUrl.get(image.image_url);

    if (!storagePath) {
      return image;
    }

    const thumbnailPath =
      storefrontThumbnailPath(storagePath);

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(thumbnailPath);

    return {
      ...image,
      storefront_image_url: data.publicUrl,
    };
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: shopCategoryName(product),
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    new_drop_started_at: product.new_drop_started_at,
    images,
    variants: product.product_variants ?? [],
  };
}

function clampPriceRange({
  products,
  requestedMinimumPrice,
  requestedMaximumPrice,
}: {
  products: ShopIndexRow[];
  requestedMinimumPrice: number | null;
  requestedMaximumPrice: number | null;
}) {
  const availablePrices = products.flatMap((product) =>
    shopProductPrices(product),
  );

  let catalogMinimumPrice =
    availablePrices.length > 0
      ? Math.floor(Math.min(...availablePrices))
      : 0;

  let catalogMaximumPrice =
    availablePrices.length > 0
      ? Math.ceil(Math.max(...availablePrices))
      : 5;

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
    maximumPrice = Math.min(
      catalogMaximumPrice,
      minimumPrice + 5,
    );

    if (maximumPrice - minimumPrice < 5) {
      minimumPrice = Math.max(
        catalogMinimumPrice,
        maximumPrice - 5,
      );
    }
  }

  return {
    minimumPrice,
    maximumPrice,
    catalogMinimumPrice,
    catalogMaximumPrice,
  };
}

export async function loadShopProductBatch({
  filters,
  offset = 0,
  limit = SHOP_PRODUCTS_PER_BATCH,
}: {
  filters: ShopBatchFilters;
  offset?: number;
  limit?: number;
}): Promise<ShopBatchResult> {
  const safeOffset = Math.max(0, Math.floor(offset));

  const safeLimit = Math.min(
    SHOP_PRODUCTS_PER_BATCH,
    Math.max(1, Math.floor(limit)),
  );

  const supabase = await createClient();

  /*
   * Stage 1
   * -------
   * Full catalogue semantics, but WITHOUT product images.
   *
   * These are exactly the fields required for:
   * - search
   * - category
   * - brand
   * - offers
   * - stock
   * - price slider
   * - price filtering
   * - sorting
   */
  const { data: indexData, error: indexError } = await supabase
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

        categories (
          name
        ),

        brands (
          name
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
    });

  if (indexError) {
    console.error(
      "Stereophonie shop index could not load:",
      indexError,
    );

    return {
      products: [],
      totalProducts: 0,
      minimumPrice: null,
      maximumPrice: null,
      minimumAvailablePrice: 0,
      maximumAvailablePrice: 5,
      offset: safeOffset,
      limit: safeLimit,
      hasMore: false,
    };
  }

  const products = (indexData ?? []) as ShopIndexRow[];

  const priceWindowProducts = products.filter((product) => {
    if (filters.offers && !shopProductOnOffer(product)) {
      return false;
    }

    if (
      filters.category &&
      shopCategoryName(product).toLowerCase() !==
        filters.category.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.brand &&
      shopBrandName(product).toLowerCase() !==
        filters.brand.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.availability === "in-stock" &&
      !shopProductInStock(product)
    ) {
      return false;
    }

    if (!shopMatchesSearch(product, filters.search)) {
      return false;
    }

    return true;
  });

  const {
    minimumPrice,
    maximumPrice,
    catalogMinimumPrice,
    catalogMaximumPrice,
  } = clampPriceRange({
    products: priceWindowProducts,
    requestedMinimumPrice: filters.requestedMinimumPrice,
    requestedMaximumPrice: filters.requestedMaximumPrice,
  });

  const filteredProducts = products.filter((product) => {
    if (filters.offers && !shopProductOnOffer(product)) {
      return false;
    }

    if (
      filters.category &&
      shopCategoryName(product).toLowerCase() !==
        filters.category.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.brand &&
      shopBrandName(product).toLowerCase() !==
        filters.brand.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.availability === "in-stock" &&
      !shopProductInStock(product)
    ) {
      return false;
    }

    if (
      !shopMatchesPriceRange(
        product,
        minimumPrice,
        maximumPrice,
      )
    ) {
      return false;
    }

    if (!shopMatchesSearch(product, filters.search)) {
      return false;
    }

    return true;
  });

  const sortedProducts = shopSortCatalog(
    filteredProducts,
    filters.sort,
  );

  const totalProducts = sortedProducts.length;

  const batchIndexProducts = sortedProducts.slice(
    safeOffset,
    safeOffset + safeLimit,
  );

  const batchIds = batchIndexProducts.map(
    (product) => product.id,
  );

  if (batchIds.length === 0) {
    return {
      products: [],
      totalProducts,
      minimumPrice,
      maximumPrice,
      minimumAvailablePrice: catalogMinimumPrice,
      maximumAvailablePrice: catalogMaximumPrice,
      offset: safeOffset,
      limit: safeLimit,
      hasMore: safeOffset < totalProducts,
    };
  }

  /*
   * Stage 2
   * -------
   * Only the current visible batch receives the expensive
   * photograph/configuration graph.
   */
  const { data: fullData, error: fullError } = await supabase
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
          size,
          variant_name,
          is_active,
          availability_status
        )
      `,
    )
    .eq("status", "published")
    .in("id", batchIds);

  if (fullError) {
    console.error(
      "Stereophonie shop batch could not load:",
      fullError,
    );

    return {
      products: [],
      totalProducts,
      minimumPrice,
      maximumPrice,
      minimumAvailablePrice: catalogMinimumPrice,
      maximumAvailablePrice: catalogMaximumPrice,
      offset: safeOffset,
      limit: safeLimit,
      hasMore: safeOffset < totalProducts,
    };
  }

  const normalizedById = new Map(
    ((fullData ?? []) as ShopFullRow[]).map((product) => [
      product.id,
      normalizeProduct(product, supabase),
    ]),
  );

  /*
   * Supabase .in() does not promise caller-ID ordering.
   * Rebuild the exact order produced by shopSortCatalog().
   */
  const batchProducts = batchIds
    .map((id) => normalizedById.get(id))
    .filter(
      (product): product is StoreProductCardProduct =>
        Boolean(product),
    );

  return {
    products: batchProducts,
    totalProducts,
    minimumPrice,
    maximumPrice,
    minimumAvailablePrice: catalogMinimumPrice,
    maximumAvailablePrice: catalogMaximumPrice,
    offset: safeOffset,
    limit: safeLimit,
    hasMore:
      safeOffset + batchProducts.length < totalProducts,
  };
}
