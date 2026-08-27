import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  PackageSearch,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { createClient } from "@/lib/supabase/server";

import EditProductForm from "./edit-product-form";
import ImageManager from "./image-manager";

type EditProductPageProps = {
  params: Promise<{
    productId: string;
  }>;

  searchParams: Promise<{
    error?: string;
    saved?: string;
    image_success?: string;
  }>;
};

type ProductVariant = {
  id: string;
  size: string;
  variant_name: string;
  display_position: number | null;
  attributes: Record<string, string> | null;
  sku: string | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status:
    "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";
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

  const [productResult, categoriesResult, brandsResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        description,
        category_id,
        brand_id,
        status,
        availability,
        is_featured,
        is_trending,
        is_new_arrival,
        created_at,
        updated_at,
        product_variants (
          id,
          size,
          variant_name,
          display_position,
          attributes,
          sku,
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
          is_variant_primary
        )
      `,
      )
      .eq("id", productId)
      .single(),

    supabase.from("categories").select("id, name").order("name", {
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

  const loadingError = categoriesResult.error || brandsResult.error;

  const errorMessage =
    resolvedSearchParams.error ??
    (loadingError ? "Categories or brands could not be loaded." : undefined);

  const savedStatus = resolvedSearchParams.saved;

  const imageSuccessMessage = resolvedSearchParams.image_success;

  const isLive = product.status === "published";

  return (
    <AdminShell
      role={admin.role}
      pageTitle="Edit product"
      pageDescription="Update product information, images, inventory, visibility and merchandising."
    >
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="mx-auto max-w-[1540px]">
          <header className="mb-8 border-b border-white/10 pb-8">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to products
            </Link>

            <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <PackageSearch className="h-5 w-5 text-white/55" />

                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                    Catalogue management
                  </p>
                </div>

                <h1 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  {product.name}
                </h1>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span
                    data-admin-product-status={
                      isLive ? "published" : product.status
                    }
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                      isLive
                        ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300"
                        : product.status === "archived"
                          ? "border-red-400/25 bg-red-400/[0.07] text-red-300"
                          : "border-white/10 bg-white/[0.04] text-white/50"
                    }`}
                  >
                    {isLive ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}

                    {product.status}
                  </span>

                  <span className="text-sm text-white/35">
                    Product ID: {product.id}
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-white/[0.025] px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                  Current visibility
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isLive ? "bg-emerald-400" : "bg-white/30"
                    }`}
                  />

                  <p className="text-sm font-semibold">
                    {isLive ? "Visible to customers" : "Hidden from customers"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {savedStatus && (
            <div
              data-admin-product-success="true"
              className="mb-7 flex items-start gap-4 rounded-[18px] border border-emerald-400/25 bg-emerald-400/[0.07] p-5"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 self-center text-emerald-300" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Product saved
                </p>

                <p className="mt-2 text-sm leading-6 text-white/65">
                  The product was successfully saved as{" "}
                  <strong className="text-white">
                    {savedStatus === "published" ? "Live" : "Draft"}
                  </strong>
                  .
                </p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <ImageManager
              productId={product.id}
              productName={product.name}
              images={images}
              configurations={variants.map((variant) => ({
                id: variant.id,
                variant_name: variant.variant_name || variant.size,
              }))}
              successMessage={imageSuccessMessage}
            />
          </div>

          <EditProductForm
            product={{
              id: product.id,
              name: product.name,
              description: product.description ?? "",
              categoryId: product.category_id ?? "",
              brandId: product.brand_id ?? "",
              status: product.status,
              availability: product.availability,
              isFeatured: product.is_featured ?? false,
              isTrending: product.is_trending ?? false,
              isNewArrival: product.is_new_arrival ?? false,
              regularPrice,
              salePrice,
              variants,
            }}
            categories={categoriesResult.data ?? []}
            brands={brandsResult.data ?? []}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </AdminShell>
  );
}
