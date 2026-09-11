"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, PackageSearch } from "lucide-react";

import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";

import V2CatalogControls from "@/components/stereophonie-v2/shop/v2-catalog-controls";
import V2ProductGrid from "@/components/stereophonie-v2/shop/v2-product-grid";

import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
type SortOption = "newest" | "price-asc" | "price-desc";

type Props = {
  products: StoreProductCardProduct[];
  totalProducts: number;
  categories: string[];
  brands: string[];
  selectedCategory: string;
  selectedBrand: string;
  selectedOffers: boolean;
  selectedAvailability: string;
  selectedSort: SortOption;
  selectedMinPrice: number | null;
  selectedMaxPrice: number | null;
  minimumAvailablePrice: number;
  maximumAvailablePrice: number;
  selectedSearch?: string;
};

type ShopBatchResponse = {
  products: StoreProductCardProduct[];
  totalProducts: number;
  offset: number;
  limit: number;
  hasMore: boolean;
};

function resultCopy(count: number) {
  if (count === 1) {
    return "1 product";
  }

  return `${count} products`;
}

const SHOP_PRODUCTS_PER_BATCH = 50;

export default function V2ShopPage({
  products,
  totalProducts,
  categories,
  brands,
  selectedCategory,
  selectedBrand,
  selectedOffers,
  selectedAvailability,
  selectedSort,
  selectedMinPrice,
  selectedMaxPrice,
  minimumAvailablePrice,
  maximumAvailablePrice,
  selectedSearch = "",
}: Props) {
  const [loadedProducts, setLoadedProducts] =
    useState<StoreProductCardProduct[]>(products);

  const [isLoadingMore, setIsLoadingMore] =
    useState(false);

  const [loadMoreFailed, setLoadMoreFailed] =
    useState(false);

  /*
   * Every server-rendered filter state receives a new first
   * batch. Reset the locally appended catalogue accordingly.
   */
  const requestVersion = useRef(0);

  useEffect(() => {
    requestVersion.current += 1;
    setLoadedProducts(products);
    setIsLoadingMore(false);
    setLoadMoreFailed(false);
  }, [
    products,
    totalProducts,
    selectedCategory,
    selectedBrand,
    selectedOffers,
    selectedAvailability,
    selectedSort,
    selectedMinPrice,
    selectedMaxPrice,
    selectedSearch,
  ]);

  const visibleProductsTotal = loadedProducts.length;

  const hasMoreProducts =
    visibleProductsTotal < totalProducts;

  async function loadMoreProducts() {
    if (isLoadingMore || !hasMoreProducts) {
      return;
    }

    const currentVersion = requestVersion.current;

    setIsLoadingMore(true);
    setLoadMoreFailed(false);

    try {
      const parameters = new URLSearchParams();

      if (selectedSearch.trim()) {
        parameters.set(
          "search",
          selectedSearch.trim(),
        );
      }

      if (selectedCategory) {
        parameters.set(
          "category",
          selectedCategory,
        );
      }

      if (selectedOffers) {
        parameters.set("offers", "true");
      }

      if (selectedBrand) {
        parameters.set("brand", selectedBrand);
      }

      if (selectedAvailability === "in-stock") {
        parameters.set(
          "availability",
          "in-stock",
        );
      }

      if (selectedMinPrice !== null) {
        parameters.set(
          "minPrice",
          String(selectedMinPrice),
        );
      }

      if (selectedMaxPrice !== null) {
        parameters.set(
          "maxPrice",
          String(selectedMaxPrice),
        );
      }

      if (selectedSort !== "newest") {
        parameters.set("sort", selectedSort);
      }

      parameters.set(
        "offset",
        String(loadedProducts.length),
      );

      const response = await fetch(
        `/api/storefront/shop-products?${parameters.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Shop batch request failed with ${response.status}.`,
        );
      }

      const result =
        (await response.json()) as ShopBatchResponse;

      if (!Array.isArray(result.products)) {
        throw new Error(
          "Invalid shop batch response.",
        );
      }

      /*
       * A filter/navigation change invalidates any older
       * request that may still be in flight.
       */
      if (requestVersion.current !== currentVersion) {
        return;
      }

      setLoadedProducts((current) => {
        const existingIds = new Set(
          current.map((product) => product.id),
        );

        const newProducts = result.products.filter(
          (product) => !existingIds.has(product.id),
        );

        return [...current, ...newProducts];
      });
    } catch (error) {
      if (requestVersion.current === currentVersion) {
        console.error(
          "Could not load more shop products:",
          error,
        );

        setLoadMoreFailed(true);
      }
    } finally {
      if (requestVersion.current === currentVersion) {
        setIsLoadingMore(false);
      }
    }
  }

  const hasFilters =
    Boolean(selectedCategory) ||
    Boolean(selectedBrand) ||
    selectedAvailability === "in-stock" ||
    selectedMinPrice !== null ||
    selectedMaxPrice !== null ||
    Boolean(selectedSearch.trim());


    return (
    <>
      <V3Header />

      <main className="st3-shop-v4 st-retail-shop st-retail-shop-v4">
        <section className="st3-shop-v4__catalog">
          <div className="st3-shop-v4__catalog-inner">
            <div className="st3-shop-v4__catalog-heading">
              <div>
                <h2>Shop all products</h2>
              </div>

            </div>

            <div className="st3-shop-v4__controls">
              <V2CatalogControls
                categories={categories}
                brands={brands}
                selectedCategory={selectedCategory}
                selectedBrand={selectedBrand}
                selectedAvailability={selectedAvailability}
                selectedSort={selectedSort}
                selectedMinPrice={selectedMinPrice}
                selectedMaxPrice={selectedMaxPrice}
                minimumAvailablePrice={minimumAvailablePrice}
                maximumAvailablePrice={maximumAvailablePrice}
                searchValue={selectedSearch}
              />
            </div>

            {hasFilters ? (
              <div className="st3-shop-v4__active-state">
                <span>Showing filtered results</span>

                <Link href="/shop">Clear all</Link>
              </div>
            ) : null}

            <section className="st3-shop-v4__results" aria-label="Products">
              {loadedProducts.length > 0 ? (
                <>
                  <V2ProductGrid products={loadedProducts} />

                  {totalProducts > SHOP_PRODUCTS_PER_BATCH ? (
                    <div className="st3-shop-v4__load-more">
                      <div
                        className="st3-shop-v4__load-more-status"
                        aria-live="polite"
                      >
                        <span>
                          Showing <strong>{visibleProductsTotal}</strong> of{" "}
                          <strong>{totalProducts}</strong> products
                        </span>

                        <div
                          className="st3-shop-v4__load-more-progress"
                          aria-hidden="true"
                        >
                          <i
                            style={{
                              width: `${
                                totalProducts > 0
                                  ? Math.min(
                                      100,
                                      (visibleProductsTotal / totalProducts) *
                                        100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {hasMoreProducts ? (
                        <button
                          type="button"
                          className="st3-shop-v4__load-more-button"
                          onClick={loadMoreProducts}
                          disabled={isLoadingMore}
                          aria-busy={isLoadingMore}
                        >
                          <span>
                            {isLoadingMore
                              ? "Loading products..."
                              : loadMoreFailed
                                ? "Try loading again"
                                : "Load more products"}
                          </span>

                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      ) : (
                        <div className="st3-shop-v4__load-more-complete">
                          All products loaded
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="st3-shop-v4__empty">
                  <div className="st3-shop-v4__empty-icon">
                    <PackageSearch />
                  </div>

                  <p>No results</p>

                  <h2>We couldn’t find a match.</h2>

                  <span>
                    Try changing your search or removing one of the selected
                    filters.
                  </span>

                  <Link href="/shop" className="st3-shop-v4__reset">
                    View all products
                    <ArrowRight />
                  </Link>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>

      <V3Footer />
    </>
  );
}
