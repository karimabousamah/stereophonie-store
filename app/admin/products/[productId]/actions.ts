"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { processStockNotificationsForProduct } from "@/lib/email/process-stock-notifications";
import { createClient } from "@/lib/supabase/server";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type VariantInput = {
  id: string | null;
  size: string;
  sku: string;
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

  const hasAvailableSize = variants.some(
    (variant) =>
      variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock",
  );

  if (hasAvailableSize) {
    return "in_stock";
  }

  return "out_of_stock";
}

function validateVariants(productId: string, variants: VariantInput[]) {
  if (!Array.isArray(variants) || variants.length === 0) {
    redirectWithError(productId, "Select at least one product size.");
  }

  const usedSizes = new Set<string>();

  for (const variant of variants) {
    const size = String(variant.size ?? "").trim();

    if (!size) {
      redirectWithError(productId, "Every product variant must have a size.");
    }

    const normalizedSize = size.toLowerCase();

    if (usedSizes.has(normalizedSize)) {
      redirectWithError(productId, `Size ${size} was selected more than once.`);
    }

    usedSizes.add(normalizedSize);

    if (!validAvailabilityStatuses.includes(variant.availability_status)) {
      redirectWithError(
        productId,
        `Select a valid availability status for size ${size}.`,
      );
    }

    const stockQuantity = Number(variant.stock_quantity);

    const lowStockThreshold = Number(variant.low_stock_threshold);

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      redirectWithError(
        productId,
        `Enter a valid stock quantity for size ${size}.`,
      );
    }

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      redirectWithError(
        productId,
        `Enter a valid low-stock warning for size ${size}.`,
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

  const collectionId = String(formData.get("collection_id") ?? "").trim();

  const regularPrice = Number(formData.get("regular_price"));

  const salePriceText = String(formData.get("sale_price") ?? "").trim();

  const publishingIntent = String(formData.get("intent") ?? "draft");

  const variantsJson = String(formData.get("variants_json") ?? "[]");

  const isFeatured = formData.get("is_featured") === "on";

  const isTrending = formData.get("is_trending") === "on";

  const isNewArrival = formData.get("is_new_arrival") === "on";

  if (!name) {
    redirectWithError(productId, "Product name is required.");
  }

  if (!categoryId) {
    redirectWithError(productId, "Please select a category.");
  }

  if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
    redirectWithError(
      productId,
      "Enter a valid regular price greater than zero.",
    );
  }

  const salePrice = salePriceText === "" ? null : Number(salePriceText);

  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
    redirectWithError(productId, "Enter a valid sale price.");
  }

  if (salePrice !== null && salePrice >= regularPrice) {
    redirectWithError(
      productId,
      "The sale price must be lower than the regular price.",
    );
  }

  let variants: VariantInput[];

  try {
    variants = JSON.parse(variantsJson) as VariantInput[];
  } catch {
    redirectWithError(productId, "The product sizes could not be processed.");
  }

  validateVariants(productId, variants);

  const productStatus = publishingIntent === "publish" ? "published" : "draft";

  const productAvailability = calculateProductAvailability(variants);

  const { error: productUpdateError } = await supabase
    .from("products")
    .update({
      name,
      description: description || null,
      category_id: categoryId,
      collection_id: collectionId || null,
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
      "A product size was submitted more than once.",
    );
  }

  const hasInvalidVariantId = submittedExistingVariantIds.some(
    (variantId) => !existingVariantIds.has(variantId),
  );

  if (hasInvalidVariantId) {
    redirectWithError(productId, "One product size could not be verified.");
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

  for (const variant of variants) {
    const unavailable =
      variant.availability_status === "out_of_stock" ||
      variant.availability_status === "coming_soon";

    const variantValues = {
      size: variant.size.trim(),
      sku: variant.sku.trim() || null,
      regular_price: regularPrice,
      sale_price: salePrice,
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

      if (updateVariantError) {
        redirectWithError(productId, updateVariantError.message);
      }

      continue;
    }

    const { error: insertVariantError } = await supabase
      .from("product_variants")
      .insert({
        product_id: productId,
        ...variantValues,
      });

    if (insertVariantError) {
      redirectWithError(productId, insertVariantError.message);
    }
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

  redirect("/admin/products?archived=true");
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
