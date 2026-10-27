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
import QuickPriceEditor from "./quick-price-editor";


async function ProductsDirectory({
  initialProductFilter,
}: {
  initialProductFilter: "all" | "published" | "draft" | "archived";
}) {
  const productsPerfStartedAt = performance.now();
  const supabase = await createClient();

  const productsQueryStartedAt = performance.now();

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
        barcode,
        regular_price,
        sale_price,
        stock_quantity,
        availability_status
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    });

  console.log(
    `[PRODUCTS PERF] products query: ${(performance.now() - productsQueryStartedAt).toFixed(1)}ms | products=${products?.length ?? 0}`,
  );

  if (error) {
    console.error("Products query error:", error);
  }

  const productIds = (products ?? []).map((product) => product.id);

  /*
   * ST_ADMIN_PRODUCT_IMAGES_QUERY_LENGTH_FIX_V1
   *
   * Keep the existing product-scope filtering, but perform it
   * locally instead of passing hundreds of UUIDs through a
   * very long PostgREST URL.
   *
   * The image pagination still retrieves every page.
   * No image records, product data, or database policies change.
   */
  const directoryProductIdSet = new Set(productIds);

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

  /*
   * Category and brand names depend only on the Products result.
   * Start these lightweight lookups now so they can run while the
   * existing complete product-image pagination continues below.
   */
  const directoryLookupsPromise = Promise.all([
    categoryIds.length
      ? supabase.from("categories").select("id, name").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    brandIds.length
      ? supabase.from("brands").select("id, name").in("id", brandIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

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
  const directoryAssignmentPageSize = 500;

  type DirectoryImageAssignment = {
    image_id: string;
    variant_id: string;
    position: number;
    is_primary: boolean;
  };

  type DirectoryImage = {
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
    }>;
  };

  /*
   * The directory only displays one photograph per product.
   *
   * storefrontConfigurationImages() uses assignments belonging to the
   * administrator's first configuration. Assignments belonging only to
   * later configurations cannot affect the directory thumbnail.
   *
   * Determine those first configuration IDs using the exact same ordering
   * rules as storefrontConfigurationImages().
   */
  const firstConfigurationIds = Array.from(
    new Set(
      (products ?? [])
        .map((product) => {
          const firstConfiguration = [
            ...(product.product_variants ?? []),
          ].sort((first, second) => {
            const positionDifference =
              Number(first.display_position ?? 0) -
              Number(second.display_position ?? 0);

            if (positionDifference !== 0) {
              return positionDifference;
            }

            return String(
              first.variant_name ?? first.size ?? "",
            ).localeCompare(
              String(
                second.variant_name ?? second.size ?? "",
              ),
              undefined,
              {
                numeric: true,
              },
            );
          })[0];

          return firstConfiguration?.id
            ? String(firstConfiguration.id)
            : null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  );

  /*
   * Fetch only assignment metadata relevant to those first configurations.
   *
   * Previously every product_images page embedded product_image_variants
   * for every configuration. That made each 500-row image request perform
   * and transfer substantially more relational work.
   *
   * The base photographs remain complete. Nothing is omitted from the
   * product-level legacy fallback.
   */
  /*
   * ST_ADMIN_PRODUCT_ASSIGNMENTS_QUERY_LENGTH_FIX_V1
   *
   * The previous query placed every first-configuration UUID
   * into one very long PostgREST URL.
   *
   * Read the assignment table using normal pagination, then
   * keep only assignments belonging to the same first
   * configurations used by the existing directory resolver.
   *
   * No assignment records or selection priorities change.
   */
  const firstConfigurationIdSet = new Set(firstConfigurationIds);

  const directoryAssignmentsPromise = (async () => {
    const assignments: DirectoryImageAssignment[] = [];
    let assignmentsError: { message: string } | null = null;
    let assignmentPageNumber = 0;

    const assignmentsStartedAt =
      performance.now();

    if (firstConfigurationIds.length > 0) {
      for (
        let from = 0;
        ;
        from += directoryAssignmentPageSize
      ) {
        const to =
          from +
          directoryAssignmentPageSize -
          1;

        const pageStartedAt =
          performance.now();

        const result = await supabase
          .from("product_image_variants")
          .select(
            `
            image_id,
            variant_id,
            position,
            is_primary
          `,
          )
          .order("variant_id", {
            ascending: true,
          })
          .order("position", {
            ascending: true,
          })
          .order("image_id", {
            ascending: true,
          })
          .range(from, to);

        console.log(
          `[PRODUCTS PERF] assignment page ${assignmentPageNumber + 1}: ${(performance.now() - pageStartedAt).toFixed(1)}ms | rows=${result.data?.length ?? 0}`,
        );

        if (result.error) {
          assignmentsError =
            result.error;
          break;
        }

        const pageAssignments =
          result.data ?? [];

        assignments.push(
          ...pageAssignments.filter((assignment) =>
            firstConfigurationIdSet.has(assignment.variant_id),
          ),
        );

        assignmentPageNumber += 1;

        if (
          pageAssignments.length <
          directoryAssignmentPageSize
        ) {
          break;
        }
      }
    }

    console.log(
      `[PRODUCTS PERF] all assignments: ${(performance.now() - assignmentsStartedAt).toFixed(1)}ms | pages=${assignmentPageNumber} | rows=${assignments.length}`,
    );

    return {
      assignments,
      error: assignmentsError,
    };
  })();

  /*
   * Base product images still load completely.
   *
   * Keep the existing complete pagination and five-request parallel batch.
   * The only removed work is the nested assignment relation above.
   */
  let directoryImageRows: Array<{
    id: string;
    product_id: string;
    image_url: string | null;
    storage_path: string | null;
    alt_text: string | null;
    position: number;
    is_primary: boolean;
  }> = [];

  let directoryImagesError:
    | { message: string }
    | null = null;

  const directoryImagesStartedAt =
    performance.now();

  let directoryImagePageNumber = 0;

  if (productIds.length > 0) {
    const directoryImageParallelBatchSize = 5;

    let batchStartPageIndex = 0;
    let reachedFinalImagePage = false;

    while (
      !reachedFinalImagePage &&
      !directoryImagesError
    ) {
      const pageRequests = Array.from(
        {
          length:
            directoryImageParallelBatchSize,
        },
        (_, batchOffset) => {
          const pageIndex =
            batchStartPageIndex +
            batchOffset;

          const pageNumber =
            pageIndex + 1;

          const from =
            pageIndex *
            directoryImagePageSize;

          const to =
            from +
            directoryImagePageSize -
            1;

          const startedAt =
            performance.now();

          return {
            pageNumber,
            startedAt,
            request: supabase
              .from("product_images")
              .select(
                `
                id,
                product_id,
                image_url,
                storage_path,
                alt_text,
                position,
                is_primary
              `,
              )
              .order("product_id", {
                ascending: true,
              })
              .order("position", {
                ascending: true,
              })
              .range(from, to),
          };
        },
      );

      const pageResults =
        await Promise.all(
          pageRequests.map(
            async ({
              pageNumber,
              startedAt,
              request,
            }) => {
              const result =
                await request;

              console.log(
                `[PRODUCTS PERF] image page ${pageNumber}: ${(performance.now() - startedAt).toFixed(1)}ms | rows=${result.data?.length ?? 0}`,
              );

              return {
                pageNumber,
                result,
              };
            },
          ),
        );

      pageResults.sort(
        (first, second) =>
          first.pageNumber -
          second.pageNumber,
      );

      for (
        const {
          pageNumber,
          result,
        } of pageResults
      ) {
        if (result.error) {
          directoryImagesError =
            result.error;
          break;
        }

        const pageImages =
          result.data ?? [];

        directoryImageRows.push(
          ...pageImages.filter((image) =>
            directoryProductIdSet.has(image.product_id),
          ),
        );

        directoryImagePageNumber =
          pageNumber;

        if (
          pageImages.length <
          directoryImagePageSize
        ) {
          reachedFinalImagePage =
            true;
          break;
        }
      }

      batchStartPageIndex +=
        directoryImageParallelBatchSize;
    }
  }

  console.log(
    `[PRODUCTS PERF] all base images: ${(performance.now() - directoryImagesStartedAt).toFixed(1)}ms | pages=${directoryImagePageNumber} | rows=${directoryImageRows.length}`,
  );

  if (directoryImagesError) {
    console.error(
      "Product directory images query error:",
      directoryImagesError,
    );
  }

  const {
    assignments:
      directoryAssignments,
    error:
      directoryAssignmentsError,
  } =
    await directoryAssignmentsPromise;

  if (directoryAssignmentsError) {
    console.error(
      "Product directory image assignments query error:",
      directoryAssignmentsError,
    );
  }

  const directoryAssignmentsByImageId =
    new Map<
      string,
      Array<{
        variant_id: string;
        position: number;
        is_primary: boolean;
      }>
    >();

  for (
    const assignment of
    directoryAssignments
  ) {
    const imageId =
      String(assignment.image_id);

    const imageAssignments =
      directoryAssignmentsByImageId.get(
        imageId,
      ) ?? [];

    imageAssignments.push({
      variant_id:
        String(assignment.variant_id),
      position:
        Number(
          assignment.position ?? 0,
        ),
      is_primary:
        Boolean(
          assignment.is_primary,
        ),
    });

    directoryAssignmentsByImageId.set(
      imageId,
      imageAssignments,
    );
  }

  /*
   * Recreate the exact shape expected by storefrontConfigurationImages().
   *
   * For directory-thumbnail selection it only inspects the assignment for
   * the first configuration, so pruning unrelated configuration assignments
   * is behaviorally equivalent while the full base-image fallback remains.
   */
  const directoryImages:
    DirectoryImage[] =
    directoryImageRows.map(
      (image) => ({
        ...image,
        product_image_variants:
          directoryAssignmentsByImageId.get(
            String(image.id),
          ) ?? [],
      }),
    );

  console.log(
    `[PRODUCTS PERF] media ready: images=${directoryImages.length} | relevant assignments=${directoryAssignments.length}`,
  );

  const directoryImagesByProductId =
    new Map<string, DirectoryImage[]>();

  for (const image of directoryImages) {
    const productId = String(image.product_id);

    const productImages: DirectoryImage[] =
      directoryImagesByProductId.get(productId) ?? [];

    productImages.push(image);
    directoryImagesByProductId.set(productId, productImages);
  }

  const [
    { data: directoryCategories, error: directoryCategoriesError },
    { data: directoryBrands, error: directoryBrandsError },
  ] = await directoryLookupsPromise;

  console.log(
    `[PRODUCTS PERF] data ready: ${(performance.now() - productsPerfStartedAt).toFixed(1)}ms | products=${products?.length ?? 0} | images=${directoryImages.length} | categories=${directoryCategories?.length ?? 0} | brands=${directoryBrands?.length ?? 0}`,
  );

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
                  askForPriceTotal={
                    products.filter(
                      (product) =>
                        product.status === "published" &&
                        product.availability === "ask_for_price",
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

                      if (
                        product.availability === "coming_soon" ||
                        product.availability === "ask_for_price"
                      ) {
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

                      const isAskForPrice =
                        product.status === "published" &&
                        product.availability === "ask_for_price";

                      const isOutOfStock =
                        product.status === "published" &&
                        !isComingSoon &&
                        !isAskForPrice &&
                        variants.length > 0 &&
                        variants.every(
                          (variant) => Number(variant.stock_quantity ?? 0) <= 0,
                        );

                      const prices = variants
                        .filter(
                          (variant) =>
                            variant.availability_status !== "ask_for_price",
                        )
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
                              variant.barcode ?? "",
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
                                isComingSoon || isAskForPrice
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
                                : isAskForPrice
                                  ? "Ask for price"
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
                            <QuickPriceEditor
                              productId={String(product.id)}
                              productName={product.name}
                              variants={variants.map((variant, index) => ({
                                id: String(variant.id),
                                name:
                                  String(variant.variant_name ?? "").trim() ||
                                  String(variant.size ?? "").trim() ||
                                  `Configuration ${index + 1}`,
                                regularPrice:
                                  typeof variant.regular_price === "number"
                                    ? variant.regular_price
                                    : null,
                                salePrice:
                                  typeof variant.sale_price === "number"
                                    ? variant.sale_price
                                    : null,
                              }))}
                            />
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
  );
}

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

  const productsDirectory = await ProductsDirectory({
    initialProductFilter,
  });

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

          {productsDirectory}
        </div>
      </div>
    </AdminShell>
  );
}
