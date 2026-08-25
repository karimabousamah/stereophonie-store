import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  PackageSearch,
} from "lucide-react";

import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";

import V2CatalogControls from "@/components/stereophonie-v2/shop/v2-catalog-controls";
import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";

import { V3Header } from "@/components/stereophonie-v3/layout/v3-header";
import V3Footer from "@/components/stereophonie-v3/layout/v3-footer";
type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc";

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
                <p>
                  Shop
                </p>

                <h2>
                  Shop all products
                </h2>
              </div>

              <span>
                {resultCopy(products.length)}
              </span>
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
                <span>
                  Showing filtered results
                </span>

                <Link href="/shop">
                  Clear all
                </Link>
              </div>
            ) : null}


            <section
              className="st3-shop-v4__results"
              aria-label="Products"
            >

              {products.length > 0 ? (
                <div className="st3-shop-v4__grid">
                  {products.map(
                    (product, index) => (
                      <V2ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                      />
                    ),
                  )}
                </div>
              ) : (
                <div className="st3-shop-v4__empty">

                  <div className="st3-shop-v4__empty-icon">
                    <PackageSearch />
                  </div>

                  <p>
                    No results
                  </p>

                  <h2>
                    We couldn’t find
                    a match.
                  </h2>

                  <span>
                    Try changing your search
                    or removing one of the
                    selected filters.
                  </span>

                  <Link
                    href="/shop"
                    className="st3-shop-v4__reset"
                  >
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
