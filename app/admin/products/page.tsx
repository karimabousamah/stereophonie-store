import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  ImageIcon,
  PackageOpen,
  Plus,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";
import {
  storefrontConfigurationImages,
} from "@/lib/storefront-product-media";

import ProductSearch from "@/components/admin/product-search";
import ProductDirectoryThumbnail from "@/components/admin/products/product-directory-thumbnail";
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    saved?: string;
    filter?: string;
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const savedState = resolvedSearchParams.saved ?? "";

  const initialProductFilter =
    resolvedSearchParams.filter === "live"
      ? "published"
      : resolvedSearchParams.filter === "draft"
        ? "draft"
        : resolvedSearchParams.filter === "archived"
          ? "archived"
          : "all";

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (!admin?.is_active) {
    redirect("/admin/login");
  }

  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      slug,
      status,
      availability,
      is_featured,
      is_trending,
      is_new_arrival,
      created_at,
        category_id,
        brand_id,

      product_variants (
        id,
        variant_name,
        size,
        display_position,
        sku,
        regular_price,
        sale_price,
        stock_quantity
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("Products query error:", error);
  }

  const productIds = (products ?? []).map((product) => product.id);

  /*
   * Use the same authoritative configuration-media hierarchy as the
   * storefront. The administrator's first configuration by
   * display_position controls the directory thumbnail, and that
   * configuration's explicit Main image wins.
   *
   * Product-level image order remains the legacy fallback.
   */
  /*
   * product_images can exceed Supabase/PostgREST's maximum rows per
   * response across the full catalog.
   *
   * Loading every product in one unpaginated request silently truncates
   * the result and makes later products appear to have no media.
   *
   * Page through the complete result so every product can resolve its
   * first configuration's explicit Main image.
   */
  const directoryImagePageSize = 500;

  let directoryImages: Array<{
    id: string;
    product_id: string;
    image_url: string | null;
    storage_path: string | null;
    alt_text: string | null;
    position: number;
    is_primary: boolean;
    product_image_variants: Array<{
      variant_id: string;
      position: number;
      is_primary: boolean;
    }> | null;
  }> = [];

  let directoryImagesError: { message: string } | null = null;

  if (productIds.length > 0) {
    for (let from = 0; ; from += directoryImagePageSize) {
      const to = from + directoryImagePageSize - 1;

      const pageResult = await supabase
        .from("product_images")
        .select(
          `
          id,
          product_id,
          image_url,
          storage_path,
          alt_text,
          position,
          is_primary,
          variant_id,
          product_image_variants (
            variant_id,
            position,
            is_primary
          )
        `,
        )
        .in("product_id", productIds)
        .order("product_id", { ascending: true })
        .order("position", { ascending: true })
        .range(from, to);

      if (pageResult.error) {
        directoryImagesError = pageResult.error;
        break;
      }

      const pageImages = pageResult.data ?? [];

      directoryImages.push(...pageImages);

      if (pageImages.length < directoryImagePageSize) {
        break;
      }
    }
  }

  if (directoryImagesError) {
    console.error(
      "Product directory images query error:",
      directoryImagesError,
    );
  }

  type DirectoryImage = (typeof directoryImages)[number];

  const directoryImagesByProductId =
    new Map<string, DirectoryImage[]>();

  for (const image of directoryImages) {
    const productId = String(image.product_id);

    const productImages: DirectoryImage[] =
      directoryImagesByProductId.get(productId) ?? [];

    productImages.push(image);
    directoryImagesByProductId.set(productId, productImages);
  }

  const categoryIds = Array.from(
    new Set(
      (products ?? [])
        .map((product) => product.category_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const brandIds = Array.from(
    new Set(
      (products ?? [])
        .map((product) => product.brand_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [
    { data: directoryCategories, error: directoryCategoriesError },
    { data: directoryBrands, error: directoryBrandsError },
  ] = await Promise.all([
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    brandIds.length
      ? supabase.from("brands").select("id, name").in("id", brandIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (directoryCategoriesError) {
    console.error(
      "Product directory categories query error:",
      directoryCategoriesError,
    );
  }

  if (directoryBrandsError) {
    console.error(
      "Product directory brands query error:",
      directoryBrandsError,
    );
  }

  const categoryNameById = new Map(
    (directoryCategories ?? []).map((category) => [
      String(category.id),
      category.name,
    ]),
  );

  const brandNameById = new Map(
    (directoryBrands ?? []).map((brand) => [String(brand.id), brand.name]),
  );

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Products"
      pageDescription="Manage electronics, product images, configurations, pricing and inventory."
    >
      <div className="st-admin-products-v2">
        <div className="st-admin-products-v2__inner">
          <div className="st-admin-products-v2__actions">

            <Link
              href="/admin/products/new"
              className="st-admin-products-v2__add"
            >
              <Plus aria-hidden="true" />
              <span>Add product</span>
            </Link>
          </div>

          {savedState === "draft" ? (
            <div className="mt-6 flex items-center justify-between gap-5 rounded-[18px] border border-emerald-500/20 bg-[#effbf5] px-5 py-4 text-[#16815d]">
              <div>
                <p className="text-sm font-semibold">
                  Draft saved successfully
                </p>

                <p className="mt-1 text-xs text-[#16815d]/70">
                  The product is saved in Draft products and remains hidden from
                  customers.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] shadow-sm">
                Draft
              </span>
            </div>
          ) : savedState === "published" ? (
            <div className="mt-6 flex items-center justify-between gap-5 rounded-[18px] border border-emerald-500/20 bg-[#effbf5] px-5 py-4 text-[#16815d]">
              <div>
                <p className="text-sm font-semibold">
                  Product published successfully
                </p>

                <p className="mt-1 text-xs text-[#16815d]/70">
                  The product is now live on the storefront.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] shadow-sm">
                Live
              </span>
            </div>
          ) : null}

          <section className="st-admin-products-v2__directory">
            {!products?.length ? (
              <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
                  <PackageOpen className="h-7 w-7 text-white/50" />
                </div>

                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
                  No products yet
                </h2>

                <p className="mt-3 max-w-md leading-7 text-white/40">
                  Create your first product with clear images, configurations,
                  pricing, specifications and inventory.
                </p>

                <Link
                  href="/admin/products/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:border-white hover:bg-white hover:text-black"
                >
                  Create first product
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="st-admin-products-v2__directory-content">
                <ProductSearch
                  total={products.length}
                  liveTotal={
                    products.filter((product) => product.status === "published")
                      .length
                  }
                  draftTotal={
                    products.filter((product) => product.status === "draft")
                      .length
                  }
                  comingSoonTotal={
                    products.filter(
                      (product) =>
                        product.status === "published" &&
                        product.availability === "coming_soon",
                    ).length
                  }
                  archivedTotal={
                    products.filter((product) => product.status === "archived")
                      .length
                  }
                  initialFilter={initialProductFilter}
                  outOfStockTotal={
                    products.filter((product) => {
                      /*
                       * "Out of stock" is a storefront inventory state.
                       *
                       * Draft products are unfinished catalogue items,
                       * so they must stay exclusively inside Drafts,
                       * even when their temporary stock is zero.
                       */
                      if (product.status !== "published") {
                        return false;
                      }

                      if (product.availability === "coming_soon") {
                        return false;
                      }

                      const variants = product.product_variants ?? [];

                      if (variants.length === 0) {
                        return false;
                      }

                      return variants.every(
                        (variant) => Number(variant.stock_quantity ?? 0) <= 0,
                      );
                    }).length
                  }
                />

                <div className="st-admin-products-directory">
                  <div
                    className="st-admin-products-directory__head"
                    aria-hidden="true"
                  >
                    <span>Product</span>
                    <span>Status</span>
                    <span>Inventory</span>
                    <span>Category</span>
                    <span>Brand</span>
                    <span>Price</span>
                    <span>Configurations</span>
                    <span>Storefront</span>
                  </div>

                  <div className="st-admin-products-directory__body">
                    {products.map((product) => {
                      const variants = product.product_variants ?? [];

                      const totalStock = variants.reduce(
                        (total, variant) =>
                          total + Number(variant.stock_quantity ?? 0),
                        0,
                      );

                      const isComingSoon =
                        product.status === "published" &&
                        product.availability === "coming_soon";

                      const isOutOfStock =
                        product.status === "published" &&
                        !isComingSoon &&
                        variants.length > 0 &&
                        variants.every(
                          (variant) => Number(variant.stock_quantity ?? 0) <= 0,
                        );

                      const prices = variants
                        .map(
                          (variant) =>
                            variant.sale_price ?? variant.regular_price,
                        )
                        .filter(
                          (price): price is number => typeof price === "number",
                        );

                      const lowestPrice =
                        prices.length > 0 ? Math.min(...prices) : null;

                      const category = product.category_id
                        ? (categoryNameById.get(String(product.category_id)) ??
                          null)
                        : null;

                      const brand = product.brand_id
                        ? (brandNameById.get(String(product.brand_id)) ?? null)
                        : null;

                      const productImages =
                        directoryImagesByProductId.get(String(product.id)) ?? [];

                      const primaryImage =
                        storefrontConfigurationImages(
                          productImages,
                          variants,
                        )[0] ?? null;

                      const primaryOriginalUrl =
                        primaryImage?.image_url?.trim() || null;

                      const primaryStoragePath =
                        primaryImage?.storage_path?.trim() || null;

                      let primaryThumbnailUrl: string | null = null;

                      if (primaryStoragePath) {
                        const slashIndex =
                          primaryStoragePath.lastIndexOf("/");

                        const directory =
                          slashIndex >= 0
                            ? primaryStoragePath.slice(0, slashIndex)
                            : "";

                        const filename =
                          slashIndex >= 0
                            ? primaryStoragePath.slice(slashIndex + 1)
                            : primaryStoragePath;

                        const dotIndex = filename.lastIndexOf(".");

                        const baseName =
                          dotIndex > 0
                            ? filename.slice(0, dotIndex)
                            : filename;

                        const thumbnailPath = directory
                          ? `${directory}/storefront/${baseName}.webp`
                          : `storefront/${baseName}.webp`;

                        const { data: thumbnailData } =
                          supabase.storage
                            .from("product-images")
                            .getPublicUrl(thumbnailPath);

                        primaryThumbnailUrl =
                          thumbnailData.publicUrl || null;
                      }

                      const statusLabel =
                        product.status === "published"
                          ? "Live"
                          : product.status === "archived"
                            ? "Archived"
                            : "Draft";

                      return (
                        <div
                          key={product.id}
                          className="st-admin-products-directory__row"
                          data-admin-product-search-card="true"
                          data-admin-product-status={product.status}
                          data-admin-product-availability={
                            product.availability ?? ""
                          }
                          data-admin-product-out-of-stock={
                            isOutOfStock ? "true" : "false"
                          }
                          data-admin-product-search={[
                            product.name,
                            category ?? "",
                            brand ?? "",
                            ...variants.flatMap((variant) => [
                              variant.variant_name ?? "",
                              variant.size ?? "",
                              variant.sku ?? "",
                            ]),
                          ].join(" ")}
                        >
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="st-admin-products-directory__product st-admin-products-directory__edit-link"
                          >
                            <div className="st-admin-products-directory__image">
                              {primaryOriginalUrl ? (
                                <ProductDirectoryThumbnail
                                  src={
                                    primaryThumbnailUrl ??
                                    primaryOriginalUrl
                                  }
                                  fallbackSrc={primaryOriginalUrl}
                                  alt={
                                    primaryImage?.alt_text ||
                                    `${product.name} product image`
                                  }
                                />
                              ) : (
                                <ImageIcon aria-hidden="true" />
                              )}
                            </div>

                            <div className="st-admin-products-directory__identity">
                              <strong>{product.name}</strong>
                              <span>
                                {variants[0]?.sku
                                  ? `SKU ${variants[0].sku}`
                                  : product.slug}
                              </span>
                            </div>
                          </Link>

                          <div className="st-admin-products-directory__cell">
                            <span
                              className={`st-admin-product-status-badge ${
                                product.status === "published"
                                  ? "is-live"
                                  : product.status === "archived"
                                    ? "is-archived"
                                    : "is-draft"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <div className="st-admin-products-directory__cell st-admin-products-directory__inventory">
                            <strong
                              className={
                                isComingSoon
                                  ? ""
                                  : isOutOfStock
                                    ? "is-empty"
                                    : totalStock > 0 && totalStock <= 5
                                      ? "is-low"
                                      : ""
                              }
                            >
                              {isComingSoon
                                ? "Coming soon"
                                : variants.length === 0
                                  ? "No configurations"
                                  : isOutOfStock
                                    ? "Out of stock"
                                    : `${totalStock} in stock`}
                            </strong>

                            {variants.length > 1 ? (
                              <span>
                                Across {variants.length} configurations
                              </span>
                            ) : null}
                          </div>

                          <div className="st-admin-products-directory__cell">
                            <span>{category ?? "No category"}</span>
                          </div>

                          <div className="st-admin-products-directory__cell st-admin-products-directory__brand">
                            <span>{brand ?? "No brand"}</span>
                          </div>

                          <div className="st-admin-products-directory__cell st-admin-products-directory__price">
                            <strong>
                              {lowestPrice === null
                                ? "—"
                                : `$${lowestPrice.toFixed(2)}`}
                            </strong>
                          </div>

                          <div className="st-admin-products-directory__cell st-admin-products-directory__configurations">
                            <span>{variants.length}</span>
                          </div>

                          <div className="st-admin-products-directory__preview">
                            <Link
                              href={`/shop/${product.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="st-admin-products-directory__preview-link"
                              aria-label={`View ${product.name} on storefront`}
                              title="View storefront"
                            >
                              <span>View</span>
                              <ArrowUpRight aria-hidden="true" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
