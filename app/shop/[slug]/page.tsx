import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Gamepad2,
  PackageCheck,
  ShieldCheck,
  Truck,
  Undo2,
  Zap,
} from "lucide-react";

import V2Footer from "@/components/stereophonie-v2/layout/v2-footer";
import V2Header from "@/components/stereophonie-v2/layout/v2-header";
import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";
import { createClient } from "@/lib/supabase/server";

import ProductGallery from "./product-gallery";
import ProductPurchaseControls from "./product-purchase-controls";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    notify?: string;
  }>;
};

type ProductImage = {
  id: string;
  image_url: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
};

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type ProductVariant = {
  id: string;
  size: string;
  variant_name: string | null;
  attributes: Record<string, string> | null;
  sku: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

type Relation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

function relationName(relation: Relation, fallback: string) {
  if (!relation) {
    return fallback;
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() || fallback;
  }

  return relation.name?.trim() || fallback;
}

function lowestPrices(variants: ProductVariant[]) {
  const prices = variants
    .map((variant) => {
      const regular =
        typeof variant.regular_price === "number"
          ? variant.regular_price
          : null;

      const sale =
        typeof variant.sale_price === "number" ? variant.sale_price : null;

      if (sale !== null && regular !== null && sale > 0 && sale < regular) {
        return {
          current: sale,
          regular,
          sale: true,
        };
      }

      if (regular !== null && regular > 0) {
        return {
          current: regular,
          regular,
          sale: false,
        };
      }

      return null;
    })
    .filter(
      (
        price,
      ): price is {
        current: number;
        regular: number;
        sale: boolean;
      } => Boolean(price),
    )
    .sort((first, second) => first.current - second.current);

  return prices[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      `
        name,
        description,
        status,
        categories ( name ),
        brands ( name ),
        product_images (
          image_url,
          position,
          is_primary
        )
      `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!product) {
    return {
      title: "Product | Stereophonie",
      description: "Explore electronics and technology at Stereophonie.",
    };
  }

  const brand = relationName(product.brands as Relation, "");
  const category = relationName(product.categories as Relation, "Technology");

  const title = [product.name, brand, "Stereophonie"]
    .filter(Boolean)
    .join(" | ");

  const description =
    product.description?.trim() ||
    `Shop ${product.name} in ${category} at Stereophonie.`;

  const images = (
    (product.product_images as {
      image_url: string | null;
      position: number;
      is_primary: boolean;
    }[]) ?? []
  )
    .filter((image) => Boolean(image.image_url))
    .sort((first, second) => {
      if (first.is_primary !== second.is_primary) {
        return first.is_primary ? -1 : 1;
      }

      return first.position - second.position;
    });

  const primaryImage = images[0]?.image_url ?? undefined;

  return {
    title,
    description: description.slice(0, 160),

    openGraph: {
      title,
      description: description.slice(0, 200),
      type: "website",
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        description,
        status,
        is_featured,
        is_trending,
        is_new_arrival,
        category_id,
        brand_id,
        collection_id,

        categories (
          name
        ),

        brands (
          name
        ),

        collections (
          name
        ),

        product_images (
          id,
          image_url,
          alt_text,
          position,
          is_primary
        ),

        product_variants (
          id,
          size,
          variant_name,
          attributes,
          sku,
          regular_price,
          sale_price,
          stock_quantity,
          low_stock_threshold,
          availability_status
        )
      `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !product) {
    notFound();
  }

  const images = ((product.product_images as ProductImage[]) ?? []).sort(
    (first, second) => first.position - second.position,
  );

  const primary = images.find((image) => image.is_primary) ?? images[0] ?? null;

  const galleryImages = primary
    ? [primary, ...images.filter((image) => image.id !== primary.id)]
    : images;

  const variants = ((product.product_variants as ProductVariant[]) ?? []).sort(
    (first, second) =>
      (first.variant_name?.trim() || first.size || "").localeCompare(
        second.variant_name?.trim() || second.size || "",
        undefined,
        { numeric: true },
      ),
  );

  const price = lowestPrices(variants);

  const brandName = relationName(
    product.brands as Relation,
    "Stereophonie Select",
  );

  const categoryName = relationName(
    product.categories as Relation,
    "Technology",
  );

  const collectionName = relationName(
    product.collections as Relation,
    categoryName,
  );

  const available = variants.some(
    (variant) =>
      variant.stock_quantity > 0 &&
      (variant.availability_status === "in_stock" ||
        variant.availability_status === "low_stock"),
  );

  const firstAttributes =
    variants.find(
      (variant) => variant.attributes && typeof variant.attributes === "object",
    )?.attributes ?? {};

  const { data: relatedData } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        description,
        status,
        category_id,
        brand_id,
        collection_id,
        is_featured,
        is_trending,
        is_new_arrival,

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
          availability_status
        )
      `,
    )
    .eq("status", "published")
    .neq("id", product.id)
    .limit(20);

  const relatedProducts = ((relatedData ?? []) as any[])
    .map((item) => {
      let score = 0;

      if (product.category_id && item.category_id === product.category_id) {
        score += 4;
      }

      if (product.brand_id && item.brand_id === product.brand_id) {
        score += 3;
      }

      if (
        product.collection_id &&
        item.collection_id === product.collection_id
      ) {
        score += 2;
      }

      return {
        score,

        product: {
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description ?? null,
          categoryName: relationName(item.categories as Relation, "Technology"),
          is_featured: item.is_featured,
          is_trending: item.is_trending,
          is_new_arrival: item.is_new_arrival,
          images: item.product_images ?? [],
          variants: item.product_variants ?? [],
        },
      };
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, 4)
    .map((item) => item.product);

  return (
    <main className="st-v2 st-pdp17">
      <V2Header />

      <div className="st-pdp17__breadcrumb">
        <Link href="/">HOME</Link>
        <span>/</span>
        <Link href="/shop">SHOP</Link>
        <span>/</span>
        <strong>{product.name}</strong>
      </div>

      <section className="st-pdp17__hero">
        <div className="st-pdp17__gallery-column">
          <ProductGallery productName={product.name} images={galleryImages} />
        </div>

        <aside className="st-pdp17__panel">
          <div className="st-pdp17__signal">
            <span className={available ? "is-ready" : "is-offline"}>
              <i />
              {available ? "IN STOCK" : "CURRENTLY OFFLINE"}
            </span>

            <small>REF / {product.id.slice(0, 8).toUpperCase()}</small>
          </div>

          <div className="st-pdp17__identity">
            <p>
              {brandName} / {categoryName}
            </p>

            <h1>{product.name}</h1>

            {price ? (
              <div className="st-pdp17__price">
                <strong>${price.current.toFixed(2)}</strong>

                {price.sale ? <del>${price.regular.toFixed(2)}</del> : null}
              </div>
            ) : (
              <div className="st-pdp17__price">
                <strong>CONTACT STORE</strong>
              </div>
            )}
          </div>

          {product.description ? (
            <p className="st-pdp17__summary">{product.description}</p>
          ) : null}

          <div className="st-pdp17__facts">
            <div>
              <small>BRAND</small>
              <strong>{brandName}</strong>
            </div>

            <div>
              <small>CATEGORY</small>
              <strong>{categoryName}</strong>
            </div>

            <div>
              <small>COLLECTION</small>
              <strong>{collectionName}</strong>
            </div>
          </div>

          <ProductPurchaseControls
            product={{
              id: product.id,
              slug: product.slug ?? slug,
              name: product.name,
              imageUrl: primary?.image_url ?? null,
              description: product.description ?? null,
              categoryName,
              is_featured: product.is_featured,
              is_trending: product.is_trending,
              is_new_arrival: product.is_new_arrival,
              images: galleryImages.map((image) => ({
                image_url: image.image_url,
                alt_text: image.alt_text,
                position: image.position,
                is_primary: image.is_primary,
              })),
              variants: variants.map((variant) => ({
                regular_price: variant.regular_price,
                sale_price: variant.sale_price,
                stock_quantity: variant.stock_quantity,
                availability_status: variant.availability_status,
              })),
            }}
            variants={variants}
            openStockNotification={query.notify === "1"}
          />
        </aside>
      </section>

      <section className="st-pdp17-info">
        <header className="st-pdp17-info__header">
          <div>
            <span>
              <Gamepad2 />
              PLAYER GUIDE
            </span>

            <h2>EVERYTHING YOU NEED.</h2>

            <p>
              Product details, technical information and ordering guidance
              without the clutter.
            </p>
          </div>
        </header>

        <div className="st-pdp17-info__grid">
          <article>
            <span className="st-pdp17-info__number">01</span>

            <div className="st-pdp17-info__icon">
              <Gamepad2 />
            </div>

            <small>PRODUCT</small>
            <h3>OVERVIEW</h3>

            <p>{product.description || `${product.name} by ${brandName}.`}</p>

            <div className="st-pdp17-info__mini-data">
              <span>
                BRAND
                <strong>{brandName}</strong>
              </span>

              <span>
                CATEGORY
                <strong>{categoryName}</strong>
              </span>
            </div>
          </article>

          <article>
            <span className="st-pdp17-info__number">02</span>

            <div className="st-pdp17-info__icon">
              <Zap />
            </div>

            <small>TECH DATA</small>
            <h3>SPECIFICATIONS</h3>

            {Object.keys(firstAttributes).length ? (
              <dl>
                {Object.entries(firstAttributes)
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key.replace(/[_-]+/g, " ").toUpperCase()}</dt>

                      <dd>{String(value)}</dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p>
                Configuration specifications are shown when you select an option
                above.
              </p>
            )}
          </article>

          <article>
            <span className="st-pdp17-info__number">03</span>

            <div className="st-pdp17-info__icon">
              <Truck />
            </div>

            <small>FULFILMENT</small>
            <h3>DELIVERY</h3>

            <p>
              Delivery availability and fees are confirmed during the order
              process.
            </p>

            <Link href="/delivery">
              VIEW DELIVERY INFO
              <ArrowRight />
            </Link>
          </article>

          <article>
            <span className="st-pdp17-info__number">04</span>

            <div className="st-pdp17-info__icon">
              <Undo2 />
            </div>

            <small>STORE POLICY</small>
            <h3>RETURNS</h3>

            <p>
              Review the store return and exchange conditions before completing
              your order.
            </p>

            <Link href="/returns">
              VIEW RETURNS POLICY
              <ArrowRight />
            </Link>
          </article>

          <article>
            <span className="st-pdp17-info__number">05</span>

            <div className="st-pdp17-info__icon">
              <ShieldCheck />
            </div>

            <small>CHECKOUT</small>
            <h3>SECURE ORDER</h3>

            <p>
              Your selected product and configuration are verified through the
              Stereophonie ordering system.
            </p>

            <div className="st-pdp17-info__verified">
              <PackageCheck />
              ORDER SYSTEM READY
            </div>
          </article>
        </div>
      </section>

      {relatedProducts.length ? (
        <section className="st-pdp17-related">
          <header>
            <div>
              <span>CONTINUE BROWSING</span>
              <h2>RELATED HARDWARE</h2>
            </div>

            <Link href="/shop">
              VIEW ALL
              <ArrowRight />
            </Link>
          </header>

          <div className="st-pdp17-related__grid">
            {relatedProducts.map((relatedProduct, index) => (
              <V2ProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}

      <V2Footer />
    </main>
  );
}
