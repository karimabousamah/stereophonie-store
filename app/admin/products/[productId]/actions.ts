"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { processStockNotificationsForProduct } from "@/lib/email/process-stock-notifications";
import { createClient } from "@/lib/supabase/server";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type VariantInput = {
  id: string | null;
  variant_name: string;
  display_position?: number;
  attributes: Record<string, string>;
  sku: string;
  regular_price: number | "";
  sale_price: number | "";
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

const validAvailabilityStatuses: AvailabilityStatus[] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "coming_soon",
];

async function requireAdministrator() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (error || !admin?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

function redirectWithError(productId: string, message: string): never {
  redirect(`/admin/products/${productId}?error=${encodeURIComponent(message)}`);
}

function calculateProductAvailability(
  variants: VariantInput[],
): "in_stock" | "out_of_stock" | "coming_soon" {
  const allComingSoon = variants.every(
    (variant) => variant.availability_status === "coming_soon",
  );

  if (allComingSoon) {
    return "coming_soon";
  }

  const hasAvailableConfiguration = variants.some(
    (variant) =>
      variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock",
  );

  if (hasAvailableConfiguration) {
    return "in_stock";
  }

  return "out_of_stock";
}

function validateVariants(
  productId: string,
  variants: VariantInput[],
  publishingIntent: string,
) {
  if (!Array.isArray(variants) || variants.length === 0) {
    redirectWithError(productId, "Create at least one product configuration.");
  }

  const usedConfigurationNames = new Set<string>();

  for (const variant of variants) {
    const configurationName = String(variant.variant_name ?? "").trim();

    if (!configurationName) {
      redirectWithError(
        productId,
        "Every product configuration must have a name.",
      );
    }

    const normalizedName = configurationName.toLowerCase();

    if (usedConfigurationNames.has(normalizedName)) {
      redirectWithError(
        productId,
        `Configuration ${configurationName} was added more than once.`,
      );
    }

    usedConfigurationNames.add(normalizedName);

    if (
      typeof variant.attributes !== "object" ||
      variant.attributes === null ||
      Array.isArray(variant.attributes)
    ) {
      redirectWithError(
        productId,
        `The technical attributes for ${configurationName} are invalid.`,
      );
    }

    if (!validAvailabilityStatuses.includes(variant.availability_status)) {
      redirectWithError(
        productId,
        `Select a valid availability status for ${configurationName}.`,
      );
    }

    const regularPrice = Number(variant.regular_price);

    const salePriceText =
      variant.sale_price === null ||
      variant.sale_price === undefined ||
      variant.sale_price === ""
        ? ""
        : String(variant.sale_price).trim();

    if (
      publishingIntent === "publish" &&
      variant.availability_status !== "coming_soon" &&
      (!Number.isFinite(regularPrice) || regularPrice <= 0)
    ) {
      redirectWithError(
        productId,
        `Enter a valid regular price for ${configurationName}.`,
      );
    }

    if (
      salePriceText &&
      (publishingIntent === "publish" ||
        (Number.isFinite(regularPrice) && regularPrice > 0))
    ) {
      const salePrice = Number(salePriceText);

      if (
        !Number.isFinite(salePrice) ||
        salePrice < 0 ||
        salePrice >= regularPrice
      ) {
        redirectWithError(
          productId,
          `The sale price for ${configurationName} must be lower than its regular price.`,
        );
      }
    }

    const stockQuantity = Number(variant.stock_quantity);
    const lowStockThreshold = Number(variant.low_stock_threshold);

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      redirectWithError(
        productId,
        `Enter a valid stock quantity for ${configurationName}.`,
      );
    }

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      redirectWithError(
        productId,
        `Enter a valid low-stock warning for ${configurationName}.`,
      );
    }
  }
}

export async function updateProduct(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  if (!productId) {
    redirect("/admin/products");
  }

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  const subcategoryId = String(formData.get("subcategory_id") ?? "").trim();

  const collectionId = String(formData.get("collection_id") ?? "").trim();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  const publishingIntent = String(formData.get("intent") ?? "draft");

  const variantsJson = String(formData.get("variants_json") ?? "[]");

  let isFeatured = formData.get("is_featured") === "on";

  let isTrending = formData.get("is_trending") === "on";

  let isNewArrival = formData.get("is_new_arrival") === "on";

  if (!name) {
    redirectWithError(productId, "Product name is required.");
  }

  if (!categoryId) {
    redirectWithError(productId, "Please select a category.");
  }

  let variants: VariantInput[];

  try {
    variants = JSON.parse(variantsJson) as VariantInput[];
  } catch {
    redirectWithError(
      productId,
      "The product configurations could not be processed.",
    );
  }

  validateVariants(
    productId,
    variants,
    publishingIntent === "archive" ? "draft" : publishingIntent,
  );

  const productStatus =
    publishingIntent === "publish"
      ? "published"
      : publishingIntent === "archive"
        ? "archived"
        : "draft";

  const productAvailability = calculateProductAvailability(variants);

  /*
   * Out of Stock is exclusive.
   *
   * Never preserve or accept merchandising flags when the
   * aggregate product availability is Out of Stock.
   */
  if (productAvailability === "out_of_stock") {
    isFeatured = false;
    isTrending = false;
    isNewArrival = false;
  }

  const { error: productUpdateError } = await supabase
    .from("products")
    .update({
      name,
      description: description || null,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      collection_id: collectionId || null,
      brand_id: brandId || null,
      status: productStatus,
      availability: productAvailability,
      is_featured: isFeatured,
      is_trending: isTrending,
      is_new_arrival: isNewArrival,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (productUpdateError) {
    redirectWithError(productId, productUpdateError.message);
  }

  const { data: existingVariants, error: existingVariantsError } =
    await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

  if (existingVariantsError) {
    redirectWithError(productId, existingVariantsError.message);
  }

  const existingVariantIds = new Set(
    (existingVariants ?? []).map((variant) => variant.id),
  );

  const submittedExistingVariantIds = variants.flatMap((variant) =>
    variant.id ? [variant.id] : [],
  );

  if (
    new Set(submittedExistingVariantIds).size !==
    submittedExistingVariantIds.length
  ) {
    redirectWithError(
      productId,
      "A product configuration was submitted more than once.",
    );
  }

  const hasInvalidVariantId = submittedExistingVariantIds.some(
    (variantId) => !existingVariantIds.has(variantId),
  );

  if (hasInvalidVariantId) {
    redirectWithError(
      productId,
      "One product configuration could not be verified.",
    );
  }

  const submittedVariantIdSet = new Set(submittedExistingVariantIds);

  const variantIdsToRemove = [...existingVariantIds].filter(
    (variantId) => !submittedVariantIdSet.has(variantId),
  );

  if (variantIdsToRemove.length > 0) {
    const { error: removeVariantsError } = await supabase
      .from("product_variants")
      .delete()
      .in("id", variantIdsToRemove)
      .eq("product_id", productId);

    if (removeVariantsError) {
      redirectWithError(productId, removeVariantsError.message);
    }
  }

  const variantSaveResults = await Promise.all(
    variants.map(async (variant) => {
      const unavailable =
        variant.availability_status === "out_of_stock" ||
        variant.availability_status === "coming_soon";

      const configurationName = variant.variant_name.trim();

      const configurationRegularPrice = Number(variant.regular_price);

      const configurationSalePrice =
        variant.sale_price === "" ||
        variant.sale_price === null ||
        variant.sale_price === undefined
          ? null
          : Number(variant.sale_price);

      const variantValues = {
        // Legacy compatibility for checkout/order code.
        size: configurationName,

        variant_name: configurationName,
        display_position: Number.isFinite(Number(variant.display_position))
          ? Math.max(0, Math.trunc(Number(variant.display_position)))
          : 0,
        attributes: variant.attributes ?? {},
        sku: variant.sku.trim() || null,

        regular_price:
          Number.isFinite(configurationRegularPrice) &&
          configurationRegularPrice > 0
            ? configurationRegularPrice
            : 0,

        sale_price:
          Number.isFinite(configurationRegularPrice) &&
          configurationRegularPrice > 0
            ? configurationSalePrice
            : null,

        stock_quantity: unavailable ? 0 : Number(variant.stock_quantity),

        low_stock_threshold: Number(variant.low_stock_threshold),

        availability_status: variant.availability_status,
      };

      if (variant.id) {
        const { error: updateVariantError } = await supabase
          .from("product_variants")
          .update(variantValues)
          .eq("id", variant.id)
          .eq("product_id", productId);

        return updateVariantError?.message ?? null;
      }

      const { error: insertVariantError } = await supabase
        .from("product_variants")
        .insert({
          product_id: productId,
          ...variantValues,
        });

      return insertVariantError?.message ?? null;
    }),
  );

  const variantSaveError = variantSaveResults.find(Boolean);

  if (variantSaveError) {
    redirectWithError(productId, variantSaveError);
  }

  try {
    const notificationResult =
      await processStockNotificationsForProduct(productId);

    if (!notificationResult.success) {
      console.error(
        `Some stock notifications failed for product ${productId}:`,
        notificationResult.errors,
      );
    }
  } catch (error) {
    /*
     * A notification failure must never undo
     * a valid product or inventory update.
     */
    console.error(
      `Stock notifications could not be processed for product ${productId}:`,
      error,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/stock-alerts");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${productId}`);

  if (productStatus === "archived") {
    redirect("/admin/products?filter=archived");
  }

  redirect(
    `/admin/products/${productId}?saved=${encodeURIComponent(productStatus)}`,
  );
}

export async function archiveProduct(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  if (!productId) {
    redirect("/admin/products");
  }

  const { error } = await supabase
    .from("products")
    .update({
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    redirectWithError(productId, error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/");

  redirect("/admin/products?filter=archived");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  if (!productId) {
    redirect("/admin/products");
  }

  const { data: productImages, error: imagesError } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  if (imagesError) {
    redirectWithError(productId, imagesError.message);
  }

  const storagePaths = (productImages ?? [])
    .map((image) => image.storage_path)
    .filter(
      (path): path is string => typeof path === "string" && path.length > 0,
    );

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove(storagePaths);

    if (storageError) {
      redirectWithError(productId, storageError.message);
    }
  }

  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (deleteError) {
    redirectWithError(productId, deleteError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/");

  redirect("/admin/products?deleted=true");
}
