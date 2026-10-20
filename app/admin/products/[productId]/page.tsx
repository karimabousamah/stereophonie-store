import { notFound, redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import ProductSaveResultScroll from "@/components/admin/product-save-result-scroll";
import ProductActionNotice from "@/components/admin/products/product-action-notice";
import ProductPageBehavior from "@/components/admin/products/product-page-behavior";
import { createClient } from "@/lib/supabase/server";

import EditProductForm from "./edit-product-form";
import { buildProductCategoryLeafOptions } from "@/components/admin/product-category-leaf-options";
import ImageManager from "./image-manager";

type EditProductPageProps = {
  params: Promise<{
    productId: string;
  }>;

  searchParams: Promise<{
    error?: string;
    saved?: string;
    image_success?: string;
    setup_saved?: string;
  }>;
};

type ProductVariant = {
  id: string;
  size: string;
  variant_name: string;
  display_position: number | null;
  attributes: Record<string, string> | null;
  sku: string | null;
  barcode: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | "ask_for_price";
};

type ProductImage = {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
  variant_name: string | null;
  variant_id: string | null;
  variant_position: number;
  is_variant_primary: boolean;
};


/* ADMIN V2 EFFECTIVE NEW ARRIVAL — 7 DAY WINDOW */

const ADMIN_NEW_ARRIVAL_WINDOW_MS =
  7 * 24 * 60 * 60 * 1000;

function adminNewArrivalIsActive(product: {
  status: string;
  is_new_arrival: boolean | null;
  new_drop_started_at: string | null;
}) {
  if (!product.is_new_arrival) {
    return false;
  }

  /*
   * A draft may be marked New before it is published.
   * Its seven-day timer starts only once publication activates
   * the existing database trigger.
   */
  if (product.status !== "published") {
    return true;
  }

  if (!product.new_drop_started_at) {
    return false;
  }

  const startedAt =
    Date.parse(product.new_drop_started_at);

  if (!Number.isFinite(startedAt)) {
    return false;
  }

  const age =
    Date.now() - startedAt;

  return (
    age >= 0 &&
    age < ADMIN_NEW_ARRIVAL_WINDOW_MS
  );
}

export default async function EditProductPage({
  params,
  searchParams,
}: EditProductPageProps) {
  const { productId } = await params;
  const resolvedSearchParams = await searchParams;

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login");
  }

  const [
    productResult,
    categoriesResult,
    subcategoriesResult,
    additionalCategoriesResult,
    brandsResult,
  ] = await Promise.all([
      supabase
        .from("products")
        .select(
          `
        id,
        name,
        slug,
        description,
        category_id,
        subcategory_id,
        brand_id,
        status,
        availability,
        is_featured,
        is_trending,
        is_new_arrival,
        new_drop_started_at,
        created_at,
        updated_at,
        product_variants (
          id,
          size,
          variant_name,
          display_position,
          attributes,
          sku,
          barcode,
          regular_price,
          sale_price,
          stock_quantity,
          low_stock_threshold,
          availability_status
        ),
        product_images (
          id,
          image_url,
          storage_path,
          alt_text,
          position,
          is_primary,
          variant_name,
          variant_id,
          variant_position,
          is_variant_primary,
          product_image_variants (
            variant_id,
            position,
            is_primary
          )
        )
      `,
        )
        .eq("id", productId)
        .single(),

      supabase.from("categories").select("id, name").order("name", {
        ascending: true,
      }),

      supabase
        .from("subcategories")
        .select("id, category_id, parent_subcategory_id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("product_category_assignments")
        .select(
          "id, category_id, subcategory_id, created_at, display_position",
        )
        .eq("product_id", productId)
        .order("display_position", {
          ascending: true,
        })
        .order("created_at", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        }),

      supabase
        .from("brands")
        .select("id, name")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  if (productResult.error || !productResult.data) {
    notFound();
  }

  const product = productResult.data;

  /*
   * Preserve the administrator-defined configuration order.
   *
   * display_position is persisted when the product is saved, so the
   * edit screen must restore configurations using that value instead
   * of alphabetically sorting them by name.
   *
   * The name comparison is only a deterministic fallback when two
   * configurations somehow have the same display position.
   */
  const variants = ((product.product_variants as ProductVariant[]) ?? []).sort(
    (first, second) => {
      const firstPosition = Number(first.display_position ?? 0);

      const secondPosition = Number(second.display_position ?? 0);

      if (firstPosition !== secondPosition) {
        return firstPosition - secondPosition;
      }

      return (first.variant_name?.trim() || first.size || "").localeCompare(
        second.variant_name?.trim() || second.size || "",
        undefined,
        {
          numeric: true,
        },
      );
    },
  );

  const images = ((product.product_images as ProductImage[]) ?? []).sort(
    (first, second) => first.position - second.position,
  );

  const firstVariant = variants[0];

  const regularPrice = firstVariant?.regular_price ?? 0;

  const salePrice = firstVariant?.sale_price ?? null;

  const productCategoryOptions =
    buildProductCategoryLeafOptions(
      categoriesResult.data ?? [],
      subcategoriesResult.data ?? [],
    );

  const validProductCategoryOptionIds = new Set(
    productCategoryOptions.map((option) => option.id),
  );

  const additionalCategoryIds = (
    additionalCategoriesResult.data ?? []
  )
    .map(
      (assignment) =>
        assignment.subcategory_id ??
        assignment.category_id,
    )
    .filter((id) =>
      validProductCategoryOptionIds.has(id),
    );

  const loadingError =
    categoriesResult.error ||
    subcategoriesResult.error ||
    additionalCategoriesResult.error ||
    brandsResult.error;

  const errorMessage =
    resolvedSearchParams.error ??
    (loadingError ? "Categories or brands could not be loaded." : undefined);

  const savedStatus = resolvedSearchParams.saved;

  const imageSuccessMessage = resolvedSearchParams.image_success;

  const setupSaved = resolvedSearchParams.setup_saved === "true";


  return (
    <AdminShell
      role={admin.role}
      pageTitle="Edit product"
      pageDescription="Update product information, images, inventory, visibility and merchandising."
    >
      <ProductSaveResultScroll
        active={Boolean(
          savedStatus || resolvedSearchParams.error,
        )}
      />

      <ProductPageBehavior />

      <div className="st-admin-product-editor-page-shell py-6 sm:py-7">
        <div className="mx-auto max-w-[1540px]">


          {savedStatus && (
            <ProductActionNotice
              key={`product-saved-${savedStatus}`}
              variant="success"
              title="Product saved"
              message={
                savedStatus === "published"
                  ? "The product was successfully saved as Live."
                  : "The product was successfully saved as Draft."
              }
              clearQueryParams={["saved"]}
            />
          )}

          {setupSaved && (
            <ProductActionNotice
              key="product-setup-saved"
              variant="success"
              title="Product setup saved"
              message="Product information, configurations and store placement were saved. The current publication status was preserved."
              clearQueryParams={["setup_saved"]}
            />
          )}

          {errorMessage && (
            <ProductActionNotice
              key={`product-error-${errorMessage}`}
              variant="error"
              title="Product not saved"
              message={errorMessage}
              clearQueryParams={["error"]}
            />
          )}

          <EditProductForm
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              description: product.description ?? "",
              categoryId: product.category_id ?? "",
              subcategoryId: product.subcategory_id ?? "",
              additionalCategoryIds,
              brandId: product.brand_id ?? "",
              status: product.status,
              availability: product.availability,
              isFeatured: product.is_featured ?? false,
              isTrending: product.is_trending ?? false,
              isNewArrival: adminNewArrivalIsActive(product),
              regularPrice,
              salePrice,
              variants,
            }}
            categories={productCategoryOptions}
            brands={brandsResult.data ?? []}
            errorMessage={errorMessage}
            mediaManager={
              <ImageManager
                key={`product-images-${product.id}`}
                productId={product.id}
                productName={product.name}
                images={images}
                configurations={variants.map((variant) => ({
                  id: variant.id,
                  variant_name: variant.variant_name || variant.size,
                }))}
                successMessage={imageSuccessMessage}
              />
            }
          />
        </div>
      </div>
    </AdminShell>
  );
}
