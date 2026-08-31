import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Gamepad2,
  Headphones,
  Laptop,
  Smartphone,
  Tv,
  Zap,
} from "lucide-react";

import V2Footer from "@/components/stereophonie-v2/layout/v2-footer";
import V2Header from "@/components/stereophonie-v2/layout/v2-header";
import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";
import type { StoreProductCardProduct } from "@/components/storefront/store-product-card";

import StereophonieMiniGame from "@/components/stereophonie-v2/arcade/stereophonie-mini-game";
type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

type V2HomepageProps = {
  products: StoreProductCardProduct[];
  categories: Category[];
};

function productPrice(product: StoreProductCardProduct) {
  const prices = product.variants
    .map((variant) => variant.sale_price ?? variant.regular_price)
    .filter((value): value is number => typeof value === "number");

  return prices.length ? Math.min(...prices) : null;
}

function productImage(product: StoreProductCardProduct) {
  return (
    [...product.images]
      .filter((image) => image.image_url)
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) {
          return a.is_primary ? -1 : 1;
        }

        return a.position - b.position;
      })[0]?.image_url ?? null
  );
}

function categoryIcon(name: string) {
  const value = name.toLowerCase();

  if (value.includes("phone")) return Smartphone;
  if (value.includes("laptop") || value.includes("computer")) return Laptop;
  if (value.includes("gaming")) return Gamepad2;
  if (value.includes("audio")) return Headphones;
  if (value.includes("tv") || value.includes("display")) return Tv;

  return Cpu;
}

export default function V2Homepage({ products, categories }: V2HomepageProps) {
  const hero = products[0] ?? null;
  const heroImage = hero ? productImage(hero) : null;
  const heroPrice = hero ? productPrice(hero) : null;

  const departments = categories.length
    ? categories
    : [
        {
          id: "phones",
          name: "Phones",
          slug: "phones",
          description: null,
          image_url: null,
          sort_order: 10,
        },
        {
          id: "laptops",
          name: "Laptops",
          slug: "laptops",
          description: null,
          image_url: null,
          sort_order: 20,
        },
        {
          id: "gaming",
          name: "Gaming",
          slug: "gaming",
          description: null,
          image_url: null,
          sort_order: 30,
        },
        {
          id: "audio",
          name: "Audio",
          slug: "audio",
          description: null,
          image_url: null,
          sort_order: 40,
        },
      ];

  return (
    <main className="st-v2">
      <V2Header />

      <section className="st-v2-home-hero st-v2-screen">
        <div className="st-v2-home-hero__noise" />

        <div className="st-v2-container st-v2-home-hero__inner">
          <div className="st-v2-home-hero__copy">
            <div className="st-v2-home-hero__system">
              <span className="st-v2-led" />
              STEREOPHONIE OS / READY
            </div>

            <p className="st-v2-kicker">TECHNOLOGY / GAMING / AUDIO</p>

            <h1>
              PRESS
              <br />
              <Link
                href="/shop"
                className="st-v2-home-start-button"
                aria-label="Start shopping"
              >
                <span className="st-v2-home-start-button__label">START</span>
                <span className="st-v2-home-start-button__prompt">PRESS</span>
              </Link>
              <br />
              TO SHOP.
            </h1>

            <p className="st-v2-home-hero__description">
              Phones, computing, gaming, audio and connected technology selected
              for performance and everyday use.
            </p>

            <div className="st-v2-home-hero__actions">
              <Link href="/shop" className="st-v2-button st-v2-button--signal">
                ENTER STORE
                <ArrowRight />
              </Link>

              <Link
                href="/shop?filter=new"
                className="st-v2-button st-v2-button--secondary"
              >
                NEW RELEASES
              </Link>
            </div>
          </div>

          <div className="st-v2-home-console">
            <StereophonieMiniGame />
          </div>
        </div>
      </section>

      <section className="st-v2-home-departments">
        <div className="st-v2-container">
          <div className="st-v2-home-section-head">
            <div>
              <span>01 / DEPARTMENTS</span>
              <h2>CHOOSE YOUR MODE.</h2>
            </div>

            <Link href="/shop">
              VIEW ALL
              <ArrowRight />
            </Link>
          </div>

          <div className="st-v2-home-department-grid">
            {departments.map((category, index) => {
              const Icon = categoryIcon(category.name);

              return (
                <Link
                  key={category.id}
                  href={`/shop?category=${encodeURIComponent(category.name)}`}
                  className="st-v2-home-department"
                >
                  <div className="st-v2-home-department__top">
                    <span>{String(index + 1).padStart(2, "0")}</span>

                    <span className="st-v2-led" />
                  </div>

                  <div className="st-v2-home-department__visual">
                    {category.image_url ? (
                      <img src={category.image_url} alt={category.name} />
                    ) : (
                      <Icon />
                    )}
                  </div>

                  <div className="st-v2-home-department__bottom">
                    <div className="st-v2-home-department__copy">
                      <strong>{category.name}</strong>

                      {category.description ? (
                        <small>{category.description}</small>
                      ) : null}
                    </div>

                    <ArrowRight />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="st-v2-home-products">
        <div className="st-v2-container">
          <div className="st-v2-home-section-head">
            <div>
              <span>02 / NEW HARDWARE</span>
              <h2>JUST DROPPED.</h2>
            </div>

            <Link href="/shop?filter=new">
              ALL PRODUCTS
              <ArrowRight />
            </Link>
          </div>

          <div className="st-v2-home-product-grid st-v2-home-product-grid--canonical">
            {products.slice(0, 8).map((product, index) => (
              <V2ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      </section>
      <V2Footer />
    </main>
  );
}
