import Link from "next/link";
import {
  ArrowRight,
  Headphones,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Truck,
  Zap,
} from "lucide-react";
import { Suspense } from "react";

import AccountVerifiedToast from "@/components/storefront/account-verified-toast";
import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import StoreProductCard, {
  type StoreProductCardProduct,
} from "@/components/storefront/store-product-card";
import { createClient } from "@/lib/supabase/server";

type ProductImage = {
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

type ProductVariant = {
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
};

type CategoryRelation = { name: string } | { name: string }[] | null;

type Product = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  categories: CategoryRelation;
  product_images: ProductImage[] | null;
  product_variants: ProductVariant[] | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
};

const productSelection = `
  id,
  name,
  slug,
  description,
  is_featured,
  is_trending,
  is_new_arrival,
  categories(name),
  product_images(
    image_url,
    alt_text,
    position,
    is_primary
  ),
  product_variants(
    regular_price,
    sale_price,
    stock_quantity,
    availability_status
  )
`;

function categoryName(category: CategoryRelation) {
  if (!category) return "Technology";
  if (Array.isArray(category)) return category[0]?.name ?? "Technology";
  return category.name;
}

function normalizeProduct(product: Product): StoreProductCardProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: categoryName(product.categories),
    is_featured: product.is_featured,
    is_trending: product.is_trending,
    is_new_arrival: product.is_new_arrival,
    images: product.product_images ?? [],
    variants: product.product_variants ?? [],
  };
}

function primaryImage(product: Product | null) {
  if (!product) return null;

  const images = [...(product.product_images ?? [])]
    .filter((image) => image.image_url)
    .sort((a, b) => a.position - b.position);

  return images.find((image) => image.is_primary) ?? images[0] ?? null;
}

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: productRows }, { data: categoryRows }] = await Promise.all([
    supabase
      .from("products")
      .select(productSelection)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("categories")
      .select("id,name,slug,image_url")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(8),
  ]);

  const products = (productRows ?? []) as Product[];
  const categories = (categoryRows ?? []) as Category[];

  const heroProduct =
    products.find((product) => product.is_featured) ?? products[0] ?? null;

  const heroImage = primaryImage(heroProduct);

  const productCards = products.slice(0, 8).map(normalizeProduct);

  return (
    <main className="stereo-site">
      <StoreHeader />

      <Suspense fallback={null}>
        <AccountVerifiedToast />
      </Suspense>

      <section className="stereo-hero">
        <div className="stereo-hero__grid" />

        <div className="stereo-container stereo-hero__inner">
          <div className="stereo-hero__copy">
            <p className="stereo-eyebrow">
              <span />
              STEREOPHONIE / TECHNOLOGY STORE
            </p>

            <h1>
              Technology
              <br />
              <em>that performs.</em>
            </h1>

            <p className="stereo-hero__description">
              Discover phones, computing, gaming, audio and essential technology
              selected for performance, reliability and everyday use.
            </p>

            <div className="stereo-hero__actions">
              <Link href="/shop" className="stereo-btn stereo-btn--red">
                Explore products
                <ArrowRight />
              </Link>

              <a
                href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
                target="_blank"
                rel="noreferrer"
                className="stereo-btn stereo-btn--ghost"
              >
                <MapPin />
                Visit the store
              </a>
            </div>

            <div className="stereo-hero__metrics">
              <div>
                <strong>01</strong>
                <span>Physical store</span>
              </div>

              <div>
                <strong>LB</strong>
                <span>Delivery coverage</span>
              </div>

              <div>
                <strong>NEW</strong>
                <span>Latest technology</span>
              </div>
            </div>
          </div>

          <div className="stereo-hero__visual">
            <div className="stereo-hero__visual-label">FEATURED / 001</div>

            <div className="stereo-hero__product">
              {heroImage?.image_url ? (
                <img
                  src={heroImage.image_url}
                  alt={heroImage.alt_text ?? heroProduct?.name ?? ""}
                />
              ) : (
                <div className="stereo-hero__placeholder">
                  <Zap />
                  <span>STEREOPHONIE</span>
                </div>
              )}
            </div>

            <div className="stereo-hero__product-info">
              <span>
                {heroProduct
                  ? categoryName(heroProduct.categories)
                  : "Featured technology"}
              </span>

              <strong>
                {heroProduct?.name ?? "Discover premium electronics"}
              </strong>

              {heroProduct?.slug ? (
                <Link href={`/shop/${heroProduct.slug}`}>
                  Product details
                  <ArrowRight />
                </Link>
              ) : (
                <Link href="/shop">
                  Explore store
                  <ArrowRight />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="stereo-category-section">
        <div className="stereo-container">
          <div className="stereo-section-heading">
            <div>
              <p>SHOP BY DEPARTMENT</p>
              <h2>Find your technology.</h2>
            </div>

            <Link href="/shop">
              View all products
              <ArrowRight />
            </Link>
          </div>

          <div className="stereo-category-grid">
            {(categories.length
              ? categories
              : [
                  { id: "1", name: "Phones", slug: "phones", image_url: null },
                  {
                    id: "2",
                    name: "Laptops",
                    slug: "laptops",
                    image_url: null,
                  },
                  { id: "3", name: "Gaming", slug: "gaming", image_url: null },
                  { id: "4", name: "Audio", slug: "audio", image_url: null },
                ]
            ).map((category, index) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.name)}`}
                className="stereo-category-card"
              >
                <div className="stereo-category-card__number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="stereo-category-card__visual">
                  {category.image_url ? (
                    <img src={category.image_url} alt={category.name} />
                  ) : (
                    <Smartphone />
                  )}
                </div>

                <div className="stereo-category-card__bottom">
                  <strong>{category.name}</strong>
                  <ArrowRight />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="stereo-products-section">
        <div className="stereo-container">
          <div className="stereo-section-heading">
            <div>
              <p>JUST LANDED</p>
              <h2>New arrivals.</h2>
            </div>

            <Link href="/shop">
              Shop all
              <ArrowRight />
            </Link>
          </div>

          {productCards.length ? (
            <div className="stereo-product-grid">
              {productCards.map((product) => (
                <StoreProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="stereo-empty-products">
              <Zap />
              <h3>Products coming soon.</h3>
              <p>
                Add products from the Stereophonie admin dashboard and they will
                appear here automatically.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="stereo-promo">
        <div className="stereo-container stereo-promo__grid">
          <div className="stereo-promo__main">
            <div>
              <p>STEREOPHONIE SERVICES</p>

              <h2>
                Buy online.
                <br />
                Pick up in store.
              </h2>

              <p className="stereo-promo__description">
                Shop from anywhere and choose the fulfilment option that works
                best for you.
              </p>
            </div>

            <a
              href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
              target="_blank"
              rel="noreferrer"
            >
              Get directions
              <ArrowRight />
            </a>
          </div>

          <div className="stereo-promo__side">
            <PackageCheck />
            <span>STORE PICKUP</span>
            <strong>Convenient collection from our physical store.</strong>
          </div>
        </div>
      </section>

      <section className="stereo-benefits">
        <div className="stereo-container stereo-benefits__grid">
          <div>
            <Truck />
            <strong>Delivery</strong>
            <span>Delivery throughout Lebanon.</span>
          </div>

          <div>
            <PackageCheck />
            <strong>Store pickup</strong>
            <span>Collect directly from Stereophonie.</span>
          </div>

          <div>
            <ShieldCheck />
            <strong>Trusted products</strong>
            <span>
              Technology selected by an established physical retailer.
            </span>
          </div>

          <div>
            <Headphones />
            <strong>Customer support</strong>
            <span>Speak directly with our team when you need assistance.</span>
          </div>
        </div>
      </section>

      <section className="stereo-location">
        <div className="stereo-container stereo-location__inner">
          <div>
            <p className="stereo-eyebrow">
              <span />
              PHYSICAL STORE
            </p>

            <h2>
              Visit
              <br />
              Stereophonie.
            </h2>

            <p>
              Experience our products in person and speak directly with our
              team.
            </p>

            <div className="stereo-location__actions">
              <a
                href="https://maps.app.goo.gl/kCsBPgCRFXaK298i6?g_st=ic"
                target="_blank"
                rel="noreferrer"
                className="stereo-btn stereo-btn--red"
              >
                <MapPin />
                Open directions
              </a>

              <a
                href="tel:+9613161285"
                className="stereo-btn stereo-btn--dark-outline"
              >
                Call +961 3 161 285
              </a>
            </div>
          </div>

          <div className="stereo-location__graphic">
            <span>LEBANON</span>

            <MapPin />

            <strong>STEREOPHONIE</strong>

            <small>PHYSICAL RETAIL / ONLINE STORE</small>
          </div>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
