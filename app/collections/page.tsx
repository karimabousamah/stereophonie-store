import Link from "next/link";
import { ArrowRight, Layers3, PackageSearch } from "lucide-react";

import StoreFooter from "@/components/storefront/store-footer";
import StoreHeader from "@/components/storefront/store-header";
import { createClient } from "@/lib/supabase/server";

type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
};

type ProductCollectionLink = {
  collection_id: string | null;
};

function getProductLabel(count: number) {
  return count === 1 ? "1 product" : `${count} products`;
}

export default async function CollectionsPage() {
  const supabase = await createClient();

  const [collectionsResult, productsResult] = await Promise.all([
    supabase
      .from("collections")
      .select(
        `
        id,
        name,
        slug,
        description,
        image_url,
        sort_order,
        is_featured,
        created_at
      `,
      )
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase.from("products").select("collection_id").eq("status", "published"),
  ]);

  const collections = (collectionsResult.data ?? []) as CollectionRow[];

  const products = (productsResult.data ?? []) as ProductCollectionLink[];

  const productCounts = new Map<string, number>();

  for (const product of products) {
    if (!product.collection_id) {
      continue;
    }

    productCounts.set(
      product.collection_id,
      (productCounts.get(product.collection_id) ?? 0) + 1,
    );
  }

  const featuredCollections = collections.filter(
    (collection) => collection.is_featured,
  );

  const regularCollections = collections.filter(
    (collection) => !collection.is_featured,
  );

  const orderedCollections = [...featuredCollections, ...regularCollections];

  const loadingError = collectionsResult.error ?? productsResult.error;

  return (
    <main className="min-h-screen bg-white text-black">
      <StoreHeader />

      <section className="border-b border-black/10 bg-[#f5f4f1]">
        <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">
                Curated by Nita Style
              </p>

              <h1 className="mt-5 text-6xl font-semibold uppercase leading-[0.9] tracking-[-0.06em] sm:text-8xl lg:text-9xl">
                Collections
              </h1>
            </div>

            <p className="max-w-xl text-sm leading-7 text-black/50 sm:text-base">
              Explore our curated selections of Italian clothing and
              accessories, organized to help you find the pieces that match your
              style.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        {loadingError ? (
          <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Collections could not be loaded: {loadingError.message}
          </div>
        ) : null}

        {!loadingError && orderedCollections.length === 0 ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center border border-dashed border-black/15 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center border border-black/10 bg-black/[0.025]">
              <PackageSearch className="h-7 w-7 text-black/30" />
            </div>

            <h2 className="mt-7 text-3xl font-semibold">
              Collections coming soon
            </h2>

            <p className="mt-3 max-w-md text-sm leading-6 text-black/45">
              Our curated collections are currently being prepared. You can
              still explore all available products in the shop.
            </p>

            <Link
              href="/shop"
              className="mt-7 inline-flex min-h-12 items-center justify-center border border-black bg-black px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#242424]"
            >
              Shop all products
            </Link>
          </div>
        ) : null}

        {!loadingError && orderedCollections.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:gap-7">
            {orderedCollections.map((collection, index) => {
              const productCount = productCounts.get(collection.id) ?? 0;

              const isLargeCard = index === 0 && orderedCollections.length > 2;

              return (
                <Link
                  key={collection.id}
                  href={`/shop?collection=${encodeURIComponent(
                    collection.slug,
                  )}`}
                  className={`group relative isolate flex min-h-[460px] overflow-hidden bg-[#eceae5] ${
                    isLargeCard
                      ? "md:col-span-2 lg:min-h-[620px]"
                      : "lg:min-h-[540px]"
                  }`}
                >
                  {collection.image_url ? (
                    <div
                      role="img"
                      aria-label={collection.name}
                      className="absolute inset-0 bg-cover bg-center transition duration-700 ease-out group-hover:scale-[1.035]"
                      style={{
                        backgroundImage: `url("${collection.image_url}")`,
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#ebe9e4]">
                      <Layers3 className="h-20 w-20 text-black/10" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/5" />

                  {collection.is_featured ? (
                    <span className="absolute left-5 top-5 border border-white/30 bg-black/20 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md sm:left-7 sm:top-7">
                      Featured collection
                    </span>
                  ) : null}

                  <div className="relative mt-auto flex w-full flex-col gap-6 p-6 text-white sm:p-8 lg:p-10">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/65">
                        {getProductLabel(productCount)}
                      </p>

                      <h2 className="mt-3 max-w-4xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                        {collection.name}
                      </h2>

                      {collection.description ? (
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                          {collection.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.17em]">
                      Explore collection
                      <span className="flex h-10 w-10 items-center justify-center border border-white/40 transition duration-300 group-hover:bg-white group-hover:text-black">
                        <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="border-t border-black/10 bg-[#f5f4f1]">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-end lg:px-12 lg:py-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">
              View everything
            </p>

            <h2 className="mt-4 max-w-3xl text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.045em] sm:text-6xl">
              Discover the complete
              <br />
              Nita Style selection
            </h2>
          </div>

          <Link
            href="/shop"
            className="group inline-flex items-center gap-4 border border-black px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.17em] transition hover:bg-black hover:text-white"
          >
            Shop all products
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
