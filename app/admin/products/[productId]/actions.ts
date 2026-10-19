"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";

import { processStockNotificationsForProduct } from "@/lib/email/process-stock-notifications";
import { SHOP_CATALOGUE_CACHE_TAG } from "@/lib/storefront-shop-loader";
import {
  SHOP_CATEGORY_FILTER_TAG,
} from "@/lib/storefront-shop-filter-options";
import { updateProductImageVariantUsageBulk } from "./image-actions";
import { createClient } from "@/lib/supabase/server";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type VariantInput = {
  id: string | null;
  client_id?: string | null;
  variant_name: string;
  display_position?: number;
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
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

function variantHasConfigurationOptions(
  variant: { attributes?: Record<string, string> | null },
) {
  const rawHierarchy = variant.attributes?.["__configuration_hierarchy"];

  if (!rawHierarchy) {
    return false;
  }

  try {
    const hierarchy = JSON.parse(rawHierarchy);

    return (
      Array.isArray(hierarchy) &&
      hierarchy.some(
        (key) => typeof key === "string" && key.trim().length > 0,
      )
    );
  } catch {
    return false;
  }
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

    const hasConfigurationOptions =
      variantHasConfigurationOptions(variant);

    if (!configurationName && hasConfigurationOptions) {
      redirectWithError(
        productId,
        "Every product configuration with options must have a name.",
      );
    }

    if (configurationName) {
      const normalizedName = configurationName.toLowerCase();

      if (usedConfigurationNames.has(normalizedName)) {
        redirectWithError(
          productId,
          `Configuration ${configurationName} was added more than once.`,
        );
      }

      usedConfigurationNames.add(normalizedName);
    }

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

  const additionalCategoryAssignmentsJson = String(
    formData.get("additional_category_assignments_json") ?? "[]",
  );

  const collectionId = String(formData.get("collection_id") ?? "").trim();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  const resolvedPublishingIntent = formData.get("resolved_intent");
  const submittedButtonIntent = formData.get("intent");

  const publishingIntent = String(
    submittedButtonIntent ?? resolvedPublishingIntent ?? "draft",
  );

  if (process.env.NODE_ENV === "development") {
    console.log("[EDIT PRODUCT] server publishing intent", {
      productId,
      resolvedIntent: resolvedPublishingIntent,
      buttonIntent: submittedButtonIntent,
      publishingIntent,
    });
  }

  /*
   * setup = persist Product Information + Configurations + Store Placement
   * without changing the product's existing publication status.
   */
  const isSetupIntent = publishingIntent === "setup";

  const variantsJson = String(formData.get("variants_json") ?? "[]");

  const pendingPhotoUsageJson = String(
    formData.get("pending_photo_usage_json") ?? "[]",
  );

  let isFeatured = formData.get("is_featured") === "on";

  let isTrending = formData.get("is_trending") === "on";

  let isNewArrival = formData.get("is_new_arrival") === "on";

  if (!name) {
    redirectWithError(productId, "Product name is required.");
  }

  if (!categoryId) {
    redirectWithError(productId, "Please select a category.");
  }

  let additionalCategoryAssignments: {
    category_id: string;
    subcategory_id: string | null;
  }[] = [];

  try {
    const parsed = JSON.parse(
      additionalCategoryAssignmentsJson,
    );

    if (!Array.isArray(parsed)) {
      throw new Error(
        "Invalid category assignments.",
      );
    }

    const unique = new Map<
      string,
      {
        category_id: string;
        subcategory_id: string | null;
      }
    >();

    for (const entry of parsed) {
      const additionalCategoryId =
        String(
          entry?.category_id ?? "",
        ).trim();

      const additionalSubcategoryId =
        String(
          entry?.subcategory_id ?? "",
        ).trim();

      if (!additionalCategoryId) {
        continue;
      }

      const normalizedSubcategoryId =
        additionalSubcategoryId ||
        null;

      /*
       * The canonical destination stays only on products.
       * product_category_assignments stores additional
       * destinations only.
       */
      if (
        additionalCategoryId === categoryId &&
        normalizedSubcategoryId ===
          (subcategoryId || null)
      ) {
        continue;
      }

      unique.set(
        `${additionalCategoryId}:${
          normalizedSubcategoryId ?? ""
        }`,
        {
          category_id:
            additionalCategoryId,
          subcategory_id:
            normalizedSubcategoryId,
        },
      );
    }

    additionalCategoryAssignments =
      [...unique.values()];
  } catch {
    redirectWithError(
      productId,
      "The additional product categories could not be processed.",
    );
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

  let pendingPhotoUsage: {
    image_id: string;
    client_variant_ids: string[];
  }[] = [];

  try {
    const parsedPendingPhotoUsage =
      JSON.parse(pendingPhotoUsageJson);

    if (!Array.isArray(parsedPendingPhotoUsage)) {
      throw new Error("Invalid pending photo usage.");
    }

    pendingPhotoUsage = parsedPendingPhotoUsage
      .map((entry) => ({
        image_id:
          String(entry?.image_id ?? "").trim(),
        client_variant_ids: Array.from(
          new Set<string>(
            Array.isArray(entry?.client_variant_ids)
              ? entry.client_variant_ids
                  .map((value: unknown) =>
                    String(value ?? "").trim(),
                  )
                  .filter(Boolean)
              : [],
          ),
        ),
      }))
      .filter(
        (entry) =>
          entry.image_id &&
          entry.client_variant_ids.length > 0,
      );
  } catch {
    redirectWithError(
      productId,
      "Pending photo assignments could not be processed.",
    );
  }

  const { data: currentProduct, error: currentProductError } = await supabase
    .from("products")
    .select("status, availability, is_new_arrival, new_drop_started_at")
    .eq("id", productId)
    .single();

  if (currentProductError || !currentProduct) {
    redirectWithError(
      productId,
      currentProductError?.message ??
        "The current product status could not be verified.",
    );
  }

  const currentProductStatus = String(currentProduct.status || "draft");

  const currentProductAvailability = String(
    currentProduct.availability ?? "",
  );

  /* ADMIN V2 CURRENT NEW ARRIVAL WINDOW STATE */

  const currentNewDropStartedAt =
    String(
      currentProduct.new_drop_started_at ?? "",
    ).trim();

  const currentNewDropTimestamp =
    currentNewDropStartedAt
      ? Date.parse(currentNewDropStartedAt)
      : Number.NaN;

  const currentNewDropAge =
    Date.now() - currentNewDropTimestamp;

  const currentNewArrivalWindowActive =
    currentProductStatus === "published" &&
    Boolean(currentProduct.is_new_arrival) &&
    Number.isFinite(currentNewDropTimestamp) &&
    currentNewDropAge >= 0 &&
    currentNewDropAge <
      7 * 24 * 60 * 60 * 1000;


  const validationIntent =
    publishingIntent === "archive"
      ? "draft"
      : isSetupIntent
        ? currentProductStatus === "published"
          ? "publish"
          : "draft"
        : publishingIntent;

  validateVariants(productId, variants, validationIntent);

  const productStatus = isSetupIntent
    ? currentProductStatus
    : publishingIntent === "publish"
      ? "published"
      : publishingIntent === "archive"
        ? "archived"
        : "draft";

  const productAvailability = calculateProductAvailability(variants);

  if (process.env.NODE_ENV === "development") {
    console.log("[EDIT PRODUCT] calculated product status", {
      productId,
      publishingIntent,
      currentProductStatus,
      productStatus,
      productAvailability,
    });
  }

/*
   * A published Coming Soon product becomes a genuine new arrival
   * when it first becomes purchasable.
   *
   * Start the seven-day NEW DROP window from this availability
   * transition rather than from the earlier Coming Soon publication.
   *
   * Ordinary edits and later in-stock updates do not restart it.
   */
  const becameAvailableFromComingSoon =
    currentProductStatus === "published" &&
    productStatus === "published" &&
    currentProductAvailability === "coming_soon" &&
    productAvailability === "in_stock";

  if (becameAvailableFromComingSoon) {
    isNewArrival = true;
  }

  /* ADMIN V2 RESTART EXPIRED NEW ARRIVAL WINDOW */

  const restartExpiredNewArrivalWindow =
    currentProductStatus === "published" &&
    productStatus === "published" &&
    isNewArrival &&
    Boolean(currentProduct.is_new_arrival) &&
    !currentNewArrivalWindowActive;

  const restartNewArrivalWindow =
    becameAvailableFromComingSoon ||
    restartExpiredNewArrivalWindow;


  const productUpdateValues = {
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
    ...(restartNewArrivalWindow
      ? {
          new_drop_started_at: new Date().toISOString(),
        }
      : {}),
  };

  const { error: productUpdateError } = await supabase
    .from("products")
    .update(productUpdateValues)
    .eq("id", productId);

  if (productUpdateError) {
    redirectWithError(productId, productUpdateError.message);
  }

  const {
    data: existingCategoryAssignments,
    error: existingCategoryAssignmentsError,
  } = await supabase
    .from("product_category_assignments")
    .select(
      "id, category_id, subcategory_id, display_position",
    )
    .eq("product_id", productId);

  if (existingCategoryAssignmentsError) {
    redirectWithError(
      productId,
      existingCategoryAssignmentsError.message,
    );
  }

  const requestedCategoryAssignmentKeys =
    new Set(
      additionalCategoryAssignments.map(
        (assignment) =>
          `${assignment.category_id}:${
            assignment.subcategory_id ?? ""
          }`,
      ),
    );

  const existingCategoryAssignmentKeys =
    new Set(
      (existingCategoryAssignments ?? []).map(
        (assignment) =>
          `${assignment.category_id}:${
            assignment.subcategory_id ?? ""
          }`,
      ),
    );

  const requestedCategoryAssignmentPositions =
    new Map(
      additionalCategoryAssignments.map(
        (assignment, index) => [
          `${assignment.category_id}:${
            assignment.subcategory_id ?? ""
          }`,
          index,
        ],
      ),
    );

  const categoryAssignmentsToInsert =
    additionalCategoryAssignments.filter(
      (assignment) =>
        !existingCategoryAssignmentKeys.has(
          `${assignment.category_id}:${
            assignment.subcategory_id ?? ""
          }`,
        ),
    );

  if (
    categoryAssignmentsToInsert.length > 0
  ) {
    const {
      error:
        insertCategoryAssignmentsError,
    } = await supabase
      .from(
        "product_category_assignments",
      )
      .insert(
        categoryAssignmentsToInsert.map(
          (assignment) => ({
            product_id: productId,
            ...assignment,
            display_position:
              requestedCategoryAssignmentPositions.get(
                `${assignment.category_id}:${
                  assignment.subcategory_id ?? ""
                }`,
              ) ?? 0,
          }),
        ),
      );

    if (
      insertCategoryAssignmentsError
    ) {
      redirectWithError(
        productId,
        insertCategoryAssignmentsError.message ||
          "The additional product categories could not be saved.",
      );
    }
  }

  const retainedCategoryAssignments =
    (
      existingCategoryAssignments ?? []
    ).filter((assignment) =>
      requestedCategoryAssignmentKeys.has(
        `${assignment.category_id}:${
          assignment.subcategory_id ?? ""
        }`,
      ),
    );

  const categoryAssignmentPositionUpdates =
    await Promise.all(
      retainedCategoryAssignments.map(
        async (assignment) => {
          const assignmentKey =
            `${assignment.category_id}:${
              assignment.subcategory_id ?? ""
            }`;

          const requestedPosition =
            requestedCategoryAssignmentPositions.get(
              assignmentKey,
            );

          if (
            requestedPosition === undefined ||
            Number(
              assignment.display_position,
            ) === requestedPosition
          ) {
            return null;
          }

          const { error } = await supabase
            .from(
              "product_category_assignments",
            )
            .update({
              display_position:
                requestedPosition,
            })
            .eq("id", assignment.id)
            .eq(
              "product_id",
              productId,
            );

          return error;
        },
      ),
    );

  const categoryAssignmentPositionError =
    categoryAssignmentPositionUpdates.find(
      (error) => Boolean(error),
    );

  if (categoryAssignmentPositionError) {
    redirectWithError(
      productId,
      categoryAssignmentPositionError.message ||
        "The product category order could not be updated.",
    );
  }

  const categoryAssignmentIdsToDelete =
    (
      existingCategoryAssignments ?? []
    )
      .filter(
        (assignment) =>
          !requestedCategoryAssignmentKeys.has(
            `${assignment.category_id}:${
              assignment.subcategory_id ?? ""
            }`,
          ),
      )
      .map(
        (assignment) =>
          assignment.id,
      );

  if (
    categoryAssignmentIdsToDelete.length >
    0
  ) {
    const {
      error:
        deleteCategoryAssignmentsError,
    } = await supabase
      .from(
        "product_category_assignments",
      )
      .delete()
      .eq("product_id", productId)
      .in(
        "id",
        categoryAssignmentIdsToDelete,
      );

    if (
      deleteCategoryAssignmentsError
    ) {
      redirectWithError(
        productId,
        deleteCategoryAssignmentsError.message ||
          "The removed product categories could not be updated.",
      );
    }
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

      const configurationName =
        variant.variant_name.trim() ||
        (!variantHasConfigurationOptions(variant)
          ? "Configuration 1"
          : "");

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

        barcode: String(variant.barcode ?? "").trim() || null,
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

      const clientId =
        String(
          variant.client_id ??
          variant.id ??
          "",
        ).trim();

      if (variant.id) {
        const { error: updateVariantError } = await supabase
          .from("product_variants")
          .update(variantValues)
          .eq("id", variant.id)
          .eq("product_id", productId);

        return {
          error: updateVariantError?.message ?? null,
          clientId,
          id: variant.id,
        };
      }

      const {
        data: insertedVariant,
        error: insertVariantError,
      } = await supabase
        .from("product_variants")
        .insert({
          product_id: productId,
          ...variantValues,
        })
        .select("id")
        .single();

      return {
        error:
          insertVariantError?.message ??
          (!insertedVariant?.id
            ? "The new product configuration could not be identified."
            : null),
        clientId,
        id: insertedVariant?.id ?? null,
      };
    }),
  );

  const variantSaveFailure =
    variantSaveResults.find((result) => result.error);

  if (variantSaveFailure?.error) {
    redirectWithError(
      productId,
      variantSaveFailure.error,
    );
  }

  /*
   * Bridge editor client IDs to the database IDs that now exist.
   *
   * Existing configurations map to themselves.
   * Newly-created configurations map their stable editor clientId
   * to the UUID returned by the insert above.
   */
  const variantIdByClientId =
    new Map<string, string>();

  for (const result of variantSaveResults) {
    if (result.clientId && result.id) {
      variantIdByClientId.set(
        result.clientId,
        result.id,
      );
    }
  }

  /*
   * Media can be assigned to a brand-new configuration before
   * Save Changes.
   *
   * Until this point those assignments are intentionally kept
   * client-side because product_image_variants requires a genuine
   * product_variants UUID.
   *
   * Now that the variants exist, merge those pending assignments
   * with whatever persisted usage Media already saved.
   */
  if (pendingPhotoUsage.length > 0) {
    const resolvedPendingUsage =
      pendingPhotoUsage
        .map((entry) => ({
          image_id: entry.image_id,
          variant_ids: Array.from(
            new Set(
              entry.client_variant_ids
                .map((clientId) =>
                  variantIdByClientId.get(clientId),
                )
                .filter(
                  (variantId): variantId is string =>
                    Boolean(variantId),
                ),
            ),
          ),
        }))
        .filter(
          (entry) =>
            entry.image_id &&
            entry.variant_ids.length > 0,
        );

    if (resolvedPendingUsage.length > 0) {
      const pendingImageIds =
        Array.from(
          new Set(
            resolvedPendingUsage.map(
              (entry) => entry.image_id,
            ),
          ),
        );

      const [
        pendingImagesResult,
        currentAssignmentsResult,
      ] = await Promise.all([
        supabase
          .from("product_images")
          .select("id")
          .eq("product_id", productId)
          .in("id", pendingImageIds),

        supabase
          .from("product_image_variants")
          .select("image_id, variant_id")
          .in("image_id", pendingImageIds),
      ]);

      if (pendingImagesResult.error) {
        redirectWithError(
          productId,
          pendingImagesResult.error.message,
        );
      }

      if (currentAssignmentsResult.error) {
        redirectWithError(
          productId,
          currentAssignmentsResult.error.message,
        );
      }

      const validImageIds =
        new Set(
          (pendingImagesResult.data ?? []).map(
            (image) => image.id,
          ),
        );

      const currentVariantIdsByImage =
        new Map<string, string[]>();

      for (
        const assignment of
          currentAssignmentsResult.data ?? []
      ) {
        if (!validImageIds.has(assignment.image_id)) {
          continue;
        }

        const current =
          currentVariantIdsByImage.get(
            assignment.image_id,
          ) ?? [];

        current.push(assignment.variant_id);

        currentVariantIdsByImage.set(
          assignment.image_id,
          current,
        );
      }

      const mergedUsage =
        resolvedPendingUsage
          .filter((entry) =>
            validImageIds.has(entry.image_id),
          )
          .map((entry) => ({
            image_id: entry.image_id,
            variant_ids: Array.from(
              new Set([
                ...(
                  currentVariantIdsByImage.get(
                    entry.image_id,
                  ) ?? []
                ),
                ...entry.variant_ids,
              ]),
            ),
          }));

      if (mergedUsage.length > 0) {
        const usageFormData = new FormData();

        usageFormData.set(
          "_client_image_operation",
          "1",
        );
        usageFormData.set(
          "product_id",
          productId,
        );
        usageFormData.set(
          "usage_json",
          JSON.stringify(mergedUsage),
        );

        try {
          await updateProductImageVariantUsageBulk(
            usageFormData,
          );
        } catch (error) {
          redirectWithError(
            productId,
            error instanceof Error
              ? error.message
              : "Pending photo assignments could not be saved.",
          );
        }
      }
    }
  }

  /*
   * Product + configuration persistence is complete at this point.
   *
   * Stock notification processing can involve additional database reads,
   * an RPC, recipient preference checks, Resend requests, and follow-up
   * notification-state writes. None of that needs to block the administrator
   * from receiving the successful save response.
   *
   * Next.js after() keeps this work attached to the request lifecycle while
   * allowing the save redirect to complete first.
   */
  after(async () => {
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
  });

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/stock-alerts");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${productId}`);
  updateTag(SHOP_CATALOGUE_CACHE_TAG);
  updateTag(SHOP_CATEGORY_FILTER_TAG);

  if (productStatus === "archived" && !isSetupIntent) {
    redirect("/admin/products?filter=archived");
  }

  if (isSetupIntent) {
    redirect(`/admin/products/${productId}?setup_saved=true`);
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
  updateTag(SHOP_CATALOGUE_CACHE_TAG);
  updateTag(SHOP_CATEGORY_FILTER_TAG);

  redirect("/admin/products?filter=archived");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  if (!productId) {
    redirect("/admin/products");
  }

  /*
   * Capture storage paths before deleting the database product.
   *
   * Database relationships are responsible for cascading or
   * nulling product references. Storage objects are not part of
   * that database transaction, so their paths must be retained
   * here for cleanup after the product row is successfully gone.
   */
  const { data: productImages, error: imagesError } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  if (imagesError) {
    redirectWithError(productId, imagesError.message);
  }

  const storagePaths = Array.from(
    new Set(
      (productImages ?? [])
        .map((image) => image.storage_path)
        .filter(
          (path): path is string =>
            typeof path === "string" && path.length > 0,
        ),
    ),
  );

  /*
   * Delete the product before touching Storage.
   *
   * This is deliberately database-first: if a database constraint
   * or policy prevents deletion, the product and all of its media
   * files remain intact instead of leaving a broken product whose
   * Storage objects were already removed.
   *
   * Existing foreign-key behavior handles dependent database rows:
   * product media/configurations and customer product state cascade,
   * while historical order references are preserved through SET NULL.
   */
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (deleteError) {
    redirectWithError(productId, deleteError.message);
  }

  /*
   * The database product is now deleted successfully.
   * Clean up its physical Storage objects afterward.
   *
   * Storage cleanup failure must not pretend that the product deletion
   * failed: at this point the database deletion has already succeeded.
   * Log the orphaned paths so the administrator is not redirected back
   * to an editor for a product that no longer exists.
   */
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove(storagePaths);

    if (storageError) {
      console.error(
        `Product ${productId} was deleted, but some product image files could not be removed from Storage:`,
        storageError,
        storagePaths,
      );
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(`/shop/${productId}`);
  updateTag(SHOP_CATALOGUE_CACHE_TAG);
  updateTag(SHOP_CATEGORY_FILTER_TAG);

  redirect("/admin/products?deleted=true");
}
