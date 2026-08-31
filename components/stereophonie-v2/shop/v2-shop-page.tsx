"use client";

import { useEffect, useState } from "react";
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
  categories: string[];
  brands: string[];
  selectedCategory: string;
  selectedBrand: string;
  selectedAvailability: string;
  selectedSort: SortOption;
  selectedMinPrice: number | null;
  selectedMaxPrice: number | null;
  minimumAvailablePrice: number;
  maximumAvailablePrice: number;
  selectedSearch?: string;
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
  categories,
  brands,
  selectedCategory,
  selectedBrand,
  selectedAvailability,
  selectedSort,
  selectedMinPrice,
  selectedMaxPrice,
  minimumAvailablePrice,
  maximumAvailablePrice,
  selectedSearch = "",
}: Props) {
  const [visibleProductCount, setVisibleProductCount] = useState(
    SHOP_PRODUCTS_PER_BATCH,
  );

  /*
   * Whenever filters, sorting, search, category, brand,
   * availability or price results produce a new product set,
   * return the catalog to its first 50 products.
   */
  useEffect(() => {
    setVisibleProductCount(SHOP_PRODUCTS_PER_BATCH);
  }, [products]);

  const visibleProducts = products.slice(0, visibleProductCount);

  const hasMoreProducts = visibleProductCount < products.length;

  const visibleProductsTotal = Math.min(visibleProductCount, products.length);

  function loadMoreProducts() {
    setVisibleProductCount((current) =>
      Math.min(current + SHOP_PRODUCTS_PER_BATCH, products.length),
    );
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
                <p>Shop</p>

                <h2>Shop all products</h2>
              </div>

              <span>{resultCopy(products.length)}</span>
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
              {products.length > 0 ? (
                <>
                  <V2ProductGrid products={visibleProducts} />

                  {products.length > SHOP_PRODUCTS_PER_BATCH ? (
                    <div className="st3-shop-v4__load-more">
                      <div
                        className="st3-shop-v4__load-more-status"
                        aria-live="polite"
                      >
                        <span>
                          Showing <strong>{visibleProductsTotal}</strong> of{" "}
                          <strong>{products.length}</strong> products
                        </span>

                        <div
                          className="st3-shop-v4__load-more-progress"
                          aria-hidden="true"
                        >
                          <i
                            style={{
                              width: `${
                                products.length > 0
                                  ? Math.min(
                                      100,
                                      (visibleProductsTotal / products.length) *
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
                        >
                          <span>Load more products</span>

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
