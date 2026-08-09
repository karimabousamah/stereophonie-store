import Link from "next/link";
import { ArrowRight, PackageSearch, X } from "lucide-react";

import ShopFilterBar from "@/components/storefront/shop-filter-bar";
import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import StoreProductCard, {
  type StoreProductImage,
  type StoreProductVariant,
} from "@/components/storefront/store-product-card";
import { createClient } from "@/lib/supabase/server";

type CategoryRelation =
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
  collection_id: string | null;
  created_at: string | null;
  categories: CategoryRelation;
  product_images: StoreProductImage[] | null;
  product_variants: StoreProductVariant[] | null;
};

type MerchandiseFilter = "" | "new" | "featured" | "trending";

type AvailabilityFilter = "" | "in-stock";

type SortOption = "newest" | "price-asc" | "price-desc";

type ShopPageProps = {
  searchParams: Promise<{
    filter?: string | string[];
    category?: string | string[];
    collection?: string | string[];
    availability?: string | string[];
    size?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    sort?: string | string[];
  }>;
};

function getSingleParameter(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getCategoryName(category: CategoryRelation) {
  if (!category) {
    return "Collection";
  }

  if (Array.isArray(category)) {
    return category[0]?.name ?? "Collection";
  }

  return category.name ?? "Collection";
}

function getSelectedFilter(value: string): MerchandiseFilter {
  if (value === "new" || value === "featured" || value === "trending") {
    return value;
  }

  return "";
}

function getSelectedAvailability(value: string): AvailabilityFilter {
  return value === "in-stock" ? "in-stock" : "";
}

function getSelectedSort(value: string): SortOption {
  if (value === "price-asc" || value === "price-desc") {
    return value;
  }

  return "newest";
}

function toNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getSelectedPrice(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
}

function getVariantPrice(variant: StoreProductVariant) {
  const regularPrice = toNumber(variant.regular_price);

  const salePrice = toNumber(variant.sale_price);

  const hasValidSale =
    salePrice > 0 && regularPrice > 0 && salePrice < regularPrice;

  return hasValidSale ? salePrice : regularPrice;
}

function getProductVariantPrices(product: ProductRow) {
  return (product.product_variants ?? [])
    .filter((variant) => variant.is_active !== false)
    .map(getVariantPrice)
    .filter((price) => price > 0);
}

function getLowestProductPrice(product: ProductRow) {
  const prices = getProductVariantPrices(product);

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

function productHasSize(product: ProductRow, selectedSize: string) {
  if (!selectedSize) {
    return true;
  }

  const normalizedSize = selectedSize.trim().toLowerCase();

  return (product.product_variants ?? []).some((variant) => {
    if (variant.is_active === false) {
      return false;
    }

    return (
      String(variant.size ?? "")
        .trim()
        .toLowerCase() === normalizedSize
    );
  });
}

function productMatchesPriceRange(
  product: ProductRow,
  minimumPrice: number | null,
  maximumPrice: number | null,
) {
  if (minimumPrice === null && maximumPrice === null) {
    return true;
  }

  return getProductVariantPrices(product).some((price) => {
    if (minimumPrice !== null && price < minimumPrice) {
      return false;
    }

    if (maximumPrice !== null && price > maximumPrice) {
      return false;
    }

    return true;
  });
}

function normalizeAvailabilityStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

function productIsInStock(product: ProductRow) {
  return (product.product_variants ?? []).some((variant) => {
    const status = normalizeAvailabilityStatus(variant.availability_status);

    const stockQuantity = toNumber(variant.stock_quantity);

    if (status === "coming_soon" || status === "out_of_stock") {
      return false;
    }

    return stockQuantity > 0 || status === "in_stock" || status === "low_stock";
  });
}

function compareNewest(first: ProductRow, second: ProductRow) {
  const firstDate = first.created_at ? new Date(first.created_at).getTime() : 0;

  const secondDate = second.created_at
    ? new Date(second.created_at).getTime()
    : 0;

  return secondDate - firstDate;
}

function sortProducts(products: ProductRow[], sort: SortOption) {
  const sortedProducts = [...products];

  if (sort === "price-asc") {
    return sortedProducts.sort((first, second) => {
      const firstPrice = getLowestProductPrice(first);

      const secondPrice = getLowestProductPrice(second);

      if (firstPrice === null && secondPrice === null) {
        return compareNewest(first, second);
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
    return sortedProducts.sort((first, second) => {
      const firstPrice = getLowestProductPrice(first);

      const secondPrice = getLowestProductPrice(second);

      if (firstPrice === null && secondPrice === null) {
        return compareNewest(first, second);
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

  return sortedProducts.sort(compareNewest);
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const parameters = await searchParams;

  const selectedFilter = getSelectedFilter(
    getSingleParameter(parameters.filter).toLowerCase(),
  );

  const selectedCategory = getSingleParameter(parameters.category).trim();

  const selectedAvailability = getSelectedAvailability(
    getSingleParameter(parameters.availability).toLowerCase(),
  );

  const selectedCollection = getSingleParameter(parameters.collection)
    .trim()
    .toLowerCase();

  const selectedSize = getSingleParameter(parameters.size).trim();

  const selectedMinPrice = getSelectedPrice(
    getSingleParameter(parameters.minPrice),
  );

  const selectedMaxPrice = getSelectedPrice(
    getSingleParameter(parameters.maxPrice),
  );

  const selectedSort = getSelectedSort(
    getSingleParameter(parameters.sort).toLowerCase(),
  );

  const supabase = await createClient();

  const { data: products, error } = await supabase
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
      collection_id,
      created_at,
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
        size,
        is_active,
        availability_status
      )
    `,
    )
    .eq("status", "published")
    .order("created_at", {
      ascending: false,
    });

  const { data: collectionRows, error: collectionsError } = await supabase
    .from("collections")
    .select(
      `
      id,
      name,
      slug,
      sort_order
    `,
    )
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  const collections = (collectionRows ?? []).map((collection) => ({
    id: String(collection.id),
    name: String(collection.name),
    slug: String(collection.slug),
  }));

  const selectedCollectionRecord =
    collections.find(
      (collection) => collection.slug.toLowerCase() === selectedCollection,
    ) ?? null;

  const productList = (products ?? []) as ProductRow[];

  const categories = Array.from(
    new Set(
      productList
        .map((product) => getCategoryName(product.categories).trim())
        .filter(
          (category) => category && category.toLowerCase() !== "collection",
        ),
    ),
  ).sort((first, second) => first.localeCompare(second));

  const preferredSizeOrder = [
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "One Size",
  ];

  const availableSizes = Array.from(
    new Set(
      productList.flatMap((product) =>
        (product.product_variants ?? [])
          .filter((variant) => variant.is_active !== false)
          .map((variant) => String(variant.size ?? "").trim())
          .filter(Boolean),
      ),
    ),
  ).sort((first, second) => {
    const firstIndex = preferredSizeOrder.indexOf(first);

    const secondIndex = preferredSizeOrder.indexOf(second);

    if (firstIndex !== -1 || secondIndex !== -1) {
      return (
        (firstIndex === -1 ? preferredSizeOrder.length : firstIndex) -
        (secondIndex === -1 ? preferredSizeOrder.length : secondIndex)
      );
    }

    return first.localeCompare(second);
  });

  const maximumAvailablePrice = Math.max(
    1,
    Math.ceil(
      productList.reduce((currentMaximum, product) => {
        const prices = getProductVariantPrices(product);

        if (prices.length === 0) {
          return currentMaximum;
        }

        return Math.max(currentMaximum, ...prices);
      }, 0),
    ),
  );

  const filteredProducts = productList.filter((product) => {
    const categoryName = getCategoryName(product.categories);

    if (
      selectedCategory &&
      categoryName.toLowerCase() !== selectedCategory.toLowerCase()
    ) {
      return false;
    }

    if (
      selectedCollectionRecord &&
      product.collection_id !== selectedCollectionRecord.id
    ) {
      return false;
    }

    if (selectedFilter === "new" && !product.is_new_arrival) {
      return false;
    }

    if (selectedFilter === "featured" && !product.is_featured) {
      return false;
    }

    if (selectedFilter === "trending" && !product.is_trending) {
      return false;
    }

    if (selectedAvailability === "in-stock" && !productIsInStock(product)) {
      return false;
    }

    if (!productHasSize(product, selectedSize)) {
      return false;
    }

    if (
      !productMatchesPriceRange(product, selectedMinPrice, selectedMaxPrice)
    ) {
      return false;
    }

    return true;
  });

  const displayedProducts = sortProducts(filteredProducts, selectedSort);

  const sectionDescription = selectedCollectionRecord
    ? `Explore the ${selectedCollectionRecord.name} collection.`
    : selectedCategory
      ? `Explore our selected ${selectedCategory.toLowerCase()} collection.`
      : "Explore selected Italian clothing and accessories, with availability managed individually for every size.";

  const currentShopParameters = new URLSearchParams();

  if (selectedFilter) {
    currentShopParameters.set("filter", selectedFilter);
  }

  if (selectedCategory) {
    currentShopParameters.set("category", selectedCategory);
  }

  if (selectedCollectionRecord) {
    currentShopParameters.set("collection", selectedCollectionRecord.slug);
  }

  if (selectedAvailability) {
    currentShopParameters.set("availability", selectedAvailability);
  }

  if (selectedSize) {
    currentShopParameters.set("size", selectedSize);
  }

  if (selectedMinPrice !== null) {
    currentShopParameters.set("minPrice", String(selectedMinPrice));
  }

  if (selectedMaxPrice !== null) {
    currentShopParameters.set("maxPrice", String(selectedMaxPrice));
  }

  if (selectedSort !== "newest") {
    currentShopParameters.set("sort", selectedSort);
  }

  function createFilterRemovalUrl(parameterNames: string[]) {
    const updatedParameters = new URLSearchParams(
      currentShopParameters.toString(),
    );

    parameterNames.forEach((parameterName) => {
      updatedParameters.delete(parameterName);
    });

    updatedParameters.delete("page");

    const queryString = updatedParameters.toString();

    return queryString ? `/shop?${queryString}` : "/shop";
  }

  const merchandiseFilterLabel =
    selectedFilter === "new"
      ? "New arrivals"
      : selectedFilter === "featured"
        ? "Featured"
        : selectedFilter === "trending"
          ? "Trending"
          : "";

  const sortLabel =
    selectedSort === "price-asc"
      ? "Price: low to high"
      : selectedSort === "price-desc"
        ? "Price: high to low"
        : "";

  const priceFilterLabel =
    selectedMinPrice !== null || selectedMaxPrice !== null
      ? `$${Math.round(selectedMinPrice ?? 0)} – $${Math.round(
          selectedMaxPrice ?? maximumAvailablePrice,
        )}`
      : "";

  const activeFilters = [
    merchandiseFilterLabel
      ? {
          key: "filter",
          label: merchandiseFilterLabel,
          href: createFilterRemovalUrl(["filter"]),
        }
      : null,
    selectedCategory
      ? {
          key: "category",
          label: selectedCategory,
          href: createFilterRemovalUrl(["category"]),
        }
      : null,
    selectedCollectionRecord
      ? {
          key: "collection",
          label: selectedCollectionRecord.name,
          href: createFilterRemovalUrl(["collection"]),
        }
      : null,
    selectedSize
      ? {
          key: "size",
          label: `Size ${selectedSize}`,
          href: createFilterRemovalUrl(["size"]),
        }
      : null,
    priceFilterLabel
      ? {
          key: "price",
          label: priceFilterLabel,
          href: createFilterRemovalUrl(["minPrice", "maxPrice"]),
        }
      : null,
    selectedAvailability
      ? {
          key: "availability",
          label: "In stock",
          href: createFilterRemovalUrl(["availability"]),
        }
      : null,
    sortLabel
      ? {
          key: "sort",
          label: sortLabel,
          href: createFilterRemovalUrl(["sort"]),
        }
      : null,
  ].filter(
    (
      filter,
    ): filter is {
      key: string;
      label: string;
      href: string;
    } => filter !== null,
  );

  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <section className="border-b border-black/10 bg-[#f5f4f1]">
        <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
                Selected Italian apparel
              </p>

              <h1 className="mt-5 text-6xl font-semibold uppercase leading-[0.9] tracking-[-0.06em] sm:text-8xl lg:text-9xl">
                {selectedCollectionRecord?.name || selectedCategory || "Shop"}
              </h1>
            </div>

            <p className="max-w-xl text-sm leading-7 text-black/50 sm:text-base">
              {sectionDescription}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-12 lg:px-12">
        <ShopFilterBar
          categories={categories}
          collections={collections}
          productCount={displayedProducts.length}
          selectedFilter={selectedFilter}
          selectedCategory={selectedCategory}
          selectedCollection={selectedCollectionRecord?.slug ?? ""}
          selectedAvailability={selectedAvailability}
          sizes={availableSizes}
          selectedSize={selectedSize}
          selectedMinPrice={selectedMinPrice}
          selectedMaxPrice={selectedMaxPrice}
          maximumAvailablePrice={maximumAvailablePrice}
          selectedSort={selectedSort}
        />

        <section className="min-w-0 py-12 lg:py-16">
          {error || collectionsError ? (
            <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Shop information could not be loaded:{" "}
              {error?.message ?? collectionsError?.message}
            </div>
          ) : null}

          {!error && !collectionsError ? (
            <div className="mb-9 border-b border-black/10 pb-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/35">
                    Shop results
                  </p>

                  <p className="mt-2 text-lg font-semibold">
                    {displayedProducts.length}{" "}
                    {displayedProducts.length === 1 ? "product" : "products"}
                  </p>
                </div>

                {activeFilters.length > 0 ? (
                  <Link
                    href="/shop"
                    className="w-fit text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40 underline decoration-black/20 underline-offset-4 transition hover:text-black"
                  >
                    Clear all
                  </Link>
                ) : null}
              </div>

              {activeFilters.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <Link
                      key={filter.key}
                      href={filter.href}
                      scroll={false}
                      aria-label={`Remove ${filter.label} filter`}
                      className="group inline-flex min-h-10 items-center gap-2 border border-black/15 bg-white px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition hover:border-black hover:bg-black hover:text-white"
                    >
                      <span>{filter.label}</span>

                      <X className="h-3.5 w-3.5 text-black/40 transition group-hover:text-white" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-black/40">
                  Browse all currently available products.
                </p>
              )}
            </div>
          ) : null}

          {!error && !collectionsError && displayedProducts.length === 0 ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center border border-dashed border-black/15 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center border border-black/10 bg-black/[0.025]">
                <PackageSearch className="h-7 w-7 text-black/30" />
              </div>

              <h2 className="mt-7 text-3xl font-semibold">
                No matching products
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-black/45">
                Try removing one or more filters to discover additional products
                from the collection.
              </p>

              <Link
                href="/shop"
                className="mt-7 inline-flex min-h-12 items-center justify-center border border-black bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#242424]"
              >
                Clear filters
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ) : null}

          {!error && !collectionsError && displayedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-16">
              {displayedProducts.map((product) => (
                <StoreProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    description: product.description,
                    categoryName: getCategoryName(product.categories),
                    is_featured: product.is_featured,
                    is_trending: product.is_trending,
                    is_new_arrival: product.is_new_arrival,
                    images: product.product_images ?? [],
                    variants: product.product_variants ?? [],
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="border-t border-black/10 bg-[#f5f4f1]">
          <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-end lg:px-12 lg:py-20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
                Nita Style
              </p>

              <h2 className="mt-4 max-w-3xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.045em] sm:text-6xl">
                Selected pieces,
                <br />
                limited availability
              </h2>
            </div>

            <Link
              href="/about"
              className="group inline-flex items-center gap-4 border border-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] transition hover:bg-black hover:text-white"
            >
              Discover our story
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* sidebar-product-layout-end */}
      </div>

      <StoreFooter />
    </main>
  );
}
