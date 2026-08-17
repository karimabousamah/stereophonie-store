import Link from "next/link";
import { ArrowRight, Box, ChevronRight, PackageSearch } from "lucide-react";

import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";
import V2Footer from "@/components/stereophonie-v2/layout/v2-footer";
import V2Header from "@/components/stereophonie-v2/layout/v2-header";
import V2CatalogControls from "@/components/stereophonie-v2/shop/v2-catalog-controls";
import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";

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
  return (
    <main className="st-v2 st-v2-shop">
      <V2Header />

      <section className="st-v2-shop-hero st-v2-grid">
        <div className="st-v2-container">
          <div className="st-v2-shop-hero__crumb">
            <span>STEREOPHONIE</span>
            <ChevronRight />
            <span>CATALOG</span>
          </div>

          <div className="st-v2-shop-hero__main">
            <div>
              <p className="st-v2-kicker">CATALOG / HARDWARE DATABASE</p>

              <h1>
                FIND YOUR
                <br />
                <span>TECH.</span>
              </h1>
            </div>

            <div className="st-v2-shop-hero__status">
              <div>
                <span>RESULTS</span>
                <strong>{String(products.length).padStart(2, "0")}</strong>
              </div>

              <div>
                <span>REGION</span>
                <strong>LB</strong>
              </div>

              <div>
                <span>SYSTEM</span>
                <strong>ONLINE</strong>
              </div>
            </div>
          </div>

          <div className="st-v2-shop-hero__ticker">
            <span className="st-v2-led" />
            LIVE CATALOG
            <span>•</span>
            PHONES
            <span>•</span>
            COMPUTING
            <span>•</span>
            GAMING
            <span>•</span>
            AUDIO
            <span>•</span>
            ACCESSORIES
          </div>
        </div>
      </section>

      <section className="st-v2-shop-body">
        <div className="st-v2-container">
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

          <div className="st-v2-shop-layout">
            <div className="st-v2-shop-layout__sidebar-space" />

            <section className="st-v2-shop-results">
              <div className="st-v2-shop-results__head">
                <div>
                  <span>PRODUCT DATABASE</span>

                  <strong>
                    {products.length}{" "}
                    {products.length === 1 ? "RESULT" : "RESULTS"}
                  </strong>
                </div>

                <div>
                  <i className="st-v2-led" />
                  DATABASE READY
                </div>
              </div>

              {products.length > 0 ? (
                <div className="st-v2-product-grid">
                  {products.map((product, index) => (
                    <V2ProductCard
                      key={product.id}
                      product={product}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="st-v2-shop-empty">
                  <div className="st-v2-shop-empty__icon">
                    <PackageSearch />
                  </div>

                  <span>SEARCH RESULT / 000</span>

                  <h2>NO HARDWARE FOUND.</h2>

                  <p>
                    No products match the current catalog settings. Reset the
                    filters or try another search.
                  </p>

                  <Link
                    href="/shop"
                    className="st-v2-button st-v2-button--signal"
                  >
                    RESET CATALOG
                    <ArrowRight />
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      <section className="st-v2-shop-support">
        <div className="st-v2-container st-v2-shop-support__inner">
          <div className="st-v2-shop-support__icon">
            <Box />
          </div>

          <div>
            <span>PRODUCT SUPPORT / HUMAN ASSISTANCE</span>

            <h2>
              NOT SURE WHICH
              <br />
              MODEL TO BUY?
            </h2>
          </div>

          <div>
            <p>
              Contact Stereophonie and tell us what you need. We can help
              compare specifications, compatibility, availability and pricing.
            </p>

            <a href="https://wa.me/9613161285" target="_blank" rel="noreferrer">
              TALK TO THE STORE
              <ArrowRight />
            </a>
          </div>
        </div>
      </section>

      <V2Footer />
    </main>
  );
}
