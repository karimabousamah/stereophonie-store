import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, RefreshCcw, ShieldCheck, Truck } from "lucide-react";

import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import StoreProductCard from "@/components/storefront/store-product-card";
import RecentlyViewedProducts from "@/components/storefront/recently-viewed-products";
import ProductInformationAccordions from "@/components/storefront/product-information-accordions";
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
    return relation[0]?.name ?? fallback;
  }

  return relation.name;
}

function lowestPrices(variants: ProductVariant[]) {
  const regularPrices = variants
    .map((variant) => variant.regular_price)
    .filter((price): price is number => typeof price === "number");

  const salePrices = variants
    .map((variant) => variant.sale_price)
    .filter((price): price is number => typeof price === "number");

  return {
    regularPrice: regularPrices.length > 0 ? Math.min(...regularPrices) : null,

    salePrice: salePrices.length > 0 ? Math.min(...salePrices) : null,
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const openStockNotification = query.notify === "1";

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
      collection_id,
      categories (
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

  const primaryImage =
    images.find((image) => image.is_primary) ?? images[0] ?? null;

  const galleryImages = primaryImage
    ? [primaryImage, ...images.filter((image) => image.id !== primaryImage.id)]
    : images;

  const variants = ((product.product_variants as ProductVariant[]) ?? []).sort(
    (first, second) => first.size.localeCompare(second.size),
  );

  const { regularPrice, salePrice } = lowestPrices(variants);

  const categoryName = relationName(
    product.categories as Relation,
    "Collection",
  );

  const collectionName = relationName(
    product.collections as Relation,
    categoryName,
  );

  const { data: relatedProductData } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        slug,
        description,
        status,
        category_id,
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
          is_active,
          availability_status
        )
      `,
    )
    .eq("status", "published")
    .neq("id", product.id)
    .limit(24);

  const relatedProducts = ((relatedProductData ?? []) as any[])
    .map((relatedProduct) => {
      const sameCategory =
        Boolean(product.category_id) &&
        relatedProduct.category_id === product.category_id;

      const sameCollection =
        Boolean(product.collection_id) &&
        relatedProduct.collection_id === product.collection_id;

      return {
        score: (sameCategory ? 2 : 0) + (sameCollection ? 1 : 0),

        product: {
          id: relatedProduct.id,
          name: relatedProduct.name,
          slug: relatedProduct.slug,
          description: relatedProduct.description ?? null,
          categoryName: relationName(
            relatedProduct.categories as Relation,
            "Collection",
          ),
          is_featured: relatedProduct.is_featured,
          is_trending: relatedProduct.is_trending,
          is_new_arrival: relatedProduct.is_new_arrival,
          images: relatedProduct.product_images ?? [],
          variants: relatedProduct.product_variants ?? [],
        },
      };
    })
    .sort((first, second) => {
      if (first.score !== second.score) {
        return second.score - first.score;
      }

      return first.product.name.localeCompare(second.product.name);
    })
    .slice(0, 4)
    .map((item) => item.product);

  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <div className="border-b border-black/10">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-hidden px-4 py-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-black/35 sm:px-8 lg:px-12">
          <Link href="/" className="transition hover:text-black">
            Home
          </Link>

          <ChevronRight className="h-3 w-3 shrink-0 text-black/20" />

          <Link href="/shop" className="transition hover:text-black">
            Shop
          </Link>

          <ChevronRight className="h-3 w-3 shrink-0 text-black/20" />

          <span className="truncate text-black">{product.name}</span>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1600px] gap-10 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.16fr)_minmax(390px,0.64fr)] lg:gap-14 lg:px-12 lg:py-14">
        <ProductGallery productName={product.name} images={galleryImages} />

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="border-b border-black/10 pb-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
              {collectionName}
            </p>

            <h1 className="mt-4 text-4xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              {product.name}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              {product.is_new_arrival ? (
                <span className="bg-black px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
                  New arrival
                </span>
              ) : null}

              {product.is_featured ? (
                <span className="border border-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em]">
                  Featured
                </span>
              ) : null}

              {product.is_trending ? (
                <span className="border border-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em]">
                  Trending
                </span>
              ) : null}
            </div>

            <div className="mt-7 flex items-end gap-3">
              {salePrice !== null ? (
                <>
                  <p className="text-3xl font-semibold">
                    ${salePrice.toFixed(2)}
                  </p>

                  {regularPrice !== null ? (
                    <p className="pb-1 text-base text-black/35 line-through">
                      ${regularPrice.toFixed(2)}
                    </p>
                  ) : null}
                </>
              ) : regularPrice !== null ? (
                <p className="text-3xl font-semibold">
                  ${regularPrice.toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-black/40">Price unavailable</p>
              )}
            </div>
          </div>

          {product.description ? (
            <div className="border-b border-black/10 py-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
                Product details
              </p>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-black/60">
                {product.description}
              </p>
            </div>
          ) : null}

          <ProductPurchaseControls
            product={{
              id: product.id,
              slug: product.slug ?? slug,
              name: product.name,
              imageUrl: primaryImage?.image_url ?? null,
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
            openStockNotification={openStockNotification}
          />

          <div className="mt-7 divide-y divide-black/10 border-y border-black/10">
            <div className="flex gap-4 py-5">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-black/40" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Delivery confirmation
                </p>

                <p className="mt-2 text-xs leading-6 text-black/45">
                  Delivery availability and fees are confirmed after submission.
                </p>
              </div>
            </div>

            <div className="flex gap-4 py-5">
              <RefreshCcw className="mt-0.5 h-5 w-5 shrink-0 text-black/40" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  No returns
                </p>

                <p className="mt-2 text-xs leading-6 text-black/45">
                  Please confirm the product and size carefully before ordering.
                </p>
              </div>
            </div>

            <div className="flex gap-4 py-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-black/40" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Secure order
                </p>

                <p className="mt-2 text-xs leading-6 text-black/45">
                  Your order is reviewed before delivery and payment are
                  confirmed.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <ProductInformationAccordions
        description={product.description}
        categoryName={categoryName}
      />

      {relatedProducts.length > 0 ? (
        <section className="border-t border-black/10 bg-white">
          <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
                  Complete the look
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                  You may also like
                </h2>
              </div>

              <Link
                href="/shop"
                className="border-b border-black pb-1 text-[10px] font-semibold uppercase tracking-[0.17em] transition hover:opacity-45"
              >
                Explore all products
              </Link>
            </div>

            <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
              {relatedProducts.map((relatedProduct) => (
                <div
                  key={relatedProduct.id}
                  className="w-[68vw] max-w-[285px] shrink-0 snap-start sm:w-[40vw] sm:max-w-[320px] lg:w-auto lg:max-w-none"
                >
                  <StoreProductCard product={relatedProduct} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <RecentlyViewedProducts
        currentProduct={{
          id: product.id,
          name: product.name,
          slug: product.slug ?? slug,
          imageUrl: primaryImage?.image_url ?? null,
          price: salePrice ?? regularPrice,
          categoryName,
        }}
      />

      <StoreFooter />
    </main>
  );
}
