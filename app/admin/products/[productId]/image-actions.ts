"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maximumImageSize = 10 * 1024 * 1024;
const maximumImagesPerProduct = 10;

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

function redirectWithSuccess(productId: string, message: string): never {
  redirect(
    `/admin/products/${productId}?image_success=${encodeURIComponent(message)}`,
  );
}

function getFileExtension(file: File) {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extension === "jpeg") {
    return "jpg";
  }

  if (extension) {
    return extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function refreshProductPages(productId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

export async function uploadProductImages(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  if (!productId) {
    redirect("/admin/products");
  }

  const files = formData
    .getAll("new_product_images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    redirectWithError(productId, "Select at least one photograph.");
  }

  const { count: existingImageCount, error: countError } = await supabase
    .from("product_images")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("product_id", productId);

  if (countError) {
    redirectWithError(productId, countError.message);
  }

  const currentCount = existingImageCount ?? 0;

  if (currentCount + files.length > maximumImagesPerProduct) {
    redirectWithError(
      productId,
      `A product can have a maximum of ${maximumImagesPerProduct} photographs.`,
    );
  }

  for (const file of files) {
    if (!allowedImageTypes.has(file.type)) {
      redirectWithError(
        productId,
        `${file.name} is not supported. Use JPEG, PNG or WebP.`,
      );
    }

    if (file.size > maximumImageSize) {
      redirectWithError(productId, `${file.name} is larger than 10 MB.`);
    }
  }

  const { data: existingImages, error: imagesError } = await supabase
    .from("product_images")
    .select("id, position, is_primary")
    .eq("product_id", productId)
    .order("position", {
      ascending: true,
    });

  if (imagesError) {
    redirectWithError(productId, imagesError.message);
  }

  const nextPosition = existingImages?.length ?? 0;
  const productHasPrimaryImage =
    existingImages?.some((image) => image.is_primary) ?? false;

  const uploadedPaths: string[] = [];
  const imageRows: {
    product_id: string;
    storage_path: string;
    image_url: string;
    alt_text: string;
    position: number;
    is_primary: boolean;
  }[] = [];

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const extension = getFileExtension(file);

      const storagePath =
        `${productId}/` +
        `${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;

      const fileBytes = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(storagePath, fileBytes, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedPaths.push(storagePath);

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(storagePath);

      imageRows.push({
        product_id: productId,
        storage_path: storagePath,
        image_url: publicUrlData.publicUrl,
        alt_text: "",
        position: nextPosition + index,
        is_primary: !productHasPrimaryImage && index === 0,
      });
    }

    const { error: insertError } = await supabase
      .from("product_images")
      .insert(imageRows);

    if (insertError) {
      throw new Error(insertError.message);
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("product-images").remove(uploadedPaths);
    }

    const message =
      error instanceof Error
        ? error.message
        : "The photographs could not be uploaded.";

    redirectWithError(productId, message);
  }

  await refreshProductPages(productId);

  redirectWithSuccess(productId, "Photographs uploaded successfully.");
}

type DirectUploadedExistingProductImage = {
  storage_path: string;
  original_name: string;
  content_type: string;
  size: number;
  position: number;
  alt_text: string;
  variant_ids?: string[];
};

export async function finalizeDirectProductImageUploads(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  const uploadedImagesJson = String(
    formData.get("direct_uploaded_images") ?? "[]",
  );

  if (!productId) {
    redirect("/admin/products");
  }

  let uploadedImages: DirectUploadedExistingProductImage[];

  try {
    uploadedImages = JSON.parse(
      uploadedImagesJson,
    ) as DirectUploadedExistingProductImage[];
  } catch {
    redirectWithError(
      productId,
      "The uploaded photograph information could not be processed.",
    );
  }

  if (!Array.isArray(uploadedImages) || uploadedImages.length === 0) {
    redirectWithError(productId, "Select at least one photograph.");
  }

  if (uploadedImages.length > maximumImagesPerProduct) {
    redirectWithError(
      productId,
      `A product can have a maximum of ${maximumImagesPerProduct} photographs.`,
    );
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    redirectWithError(
      productId,
      productError?.message ?? "The product could not be found.",
    );
  }

  const { data: existingImages, error: imagesError } = await supabase
    .from("product_images")
    .select("id, position, is_primary")
    .eq("product_id", productId)
    .order("position", {
      ascending: true,
    });

  if (imagesError) {
    redirectWithError(productId, imagesError.message);
  }

  const { data: productConfigurations, error: productConfigurationsError } =
    await supabase
      .from("product_variants")
      .select("id, variant_name")
      .eq("product_id", productId);

  if (productConfigurationsError) {
    redirectWithError(productId, productConfigurationsError.message);
  }

  const validConfigurationsById = new Map(
    (productConfigurations ?? []).map((configuration) => [
      String(configuration.id),
      {
        id: String(configuration.id),
        variant_name: String(configuration.variant_name ?? "").trim(),
      },
    ]),
  );

  const currentImageCount = existingImages?.length ?? 0;

  if (currentImageCount + uploadedImages.length > maximumImagesPerProduct) {
    redirectWithError(
      productId,
      `A product can have a maximum of ${maximumImagesPerProduct} photographs.`,
    );
  }

  const submittedPositions = new Set<number>();

  for (const image of uploadedImages) {
    const storagePath = String(image.storage_path ?? "").trim();

    const originalName = String(image.original_name ?? "").trim();

    const contentType = String(image.content_type ?? "").trim();

    const size = Number(image.size);
    const position = Number(image.position);

    if (!storagePath || !storagePath.startsWith("temporary/")) {
      redirectWithError(
        productId,
        "A photograph has an invalid temporary storage path.",
      );
    }

    if (!allowedImageTypes.has(contentType)) {
      redirectWithError(
        productId,
        `${originalName || "A photograph"} is not supported. Use JPEG, PNG or WebP.`,
      );
    }

    if (!Number.isFinite(size) || size <= 0 || size > maximumImageSize) {
      redirectWithError(
        productId,
        `${originalName || "A photograph"} has an invalid file size.`,
      );
    }

    if (
      !Number.isInteger(position) ||
      position < 0 ||
      position >= uploadedImages.length
    ) {
      redirectWithError(productId, "The photograph order is invalid.");
    }

    if (submittedPositions.has(position)) {
      redirectWithError(
        productId,
        "The photograph order contains duplicate positions.",
      );
    }

    const imageVariantIds = Array.from(
      new Set(
        (Array.isArray(image.variant_ids) ? image.variant_ids : [])
          .map((variantId) => String(variantId ?? "").trim())
          .filter(Boolean),
      ),
    );

    for (const variantId of imageVariantIds) {
      if (!validConfigurationsById.has(variantId)) {
        redirectWithError(
          productId,
          "A photograph is assigned to a product configuration that no longer exists.",
        );
      }
    }

    image.variant_ids = imageVariantIds;

    submittedPositions.add(position);
  }

  uploadedImages.sort((first, second) => first.position - second.position);

  const productHasPrimaryImage =
    existingImages?.some((image) => image.is_primary) ?? false;

  const nextPosition = currentImageCount;

  const permanentStoragePaths: string[] = [];

  /*
   * Keep track of database rows created during this upload batch.
   *
   * Storage moves and database inserts cannot share one transaction.
   * If a later photograph or configuration assignment fails, these
   * IDs let us remove every product_images row already created by
   * this batch before removing the corresponding storage objects.
   *
   * product_image_variants rows are removed automatically through
   * their ON DELETE CASCADE foreign key.
   */
  const insertedImageIds: string[] = [];

  const remainingTemporaryPaths = uploadedImages.map(
    (image) => image.storage_path,
  );

  try {
    for (let index = 0; index < uploadedImages.length; index += 1) {
      const image = uploadedImages[index];

      const extension =
        image.storage_path
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";

      const destinationPath =
        `${productId}/` +
        `${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;

      const { error: moveError } = await supabase.storage
        .from("product-images")
        .move(image.storage_path, destinationPath);

      if (moveError) {
        throw new Error(moveError.message);
      }

      permanentStoragePaths.push(destinationPath);

      const temporaryPathIndex = remainingTemporaryPaths.indexOf(
        image.storage_path,
      );

      if (temporaryPathIndex !== -1) {
        remainingTemporaryPaths.splice(temporaryPathIndex, 1);
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(destinationPath);

      const selectedVariantIds = Array.from(
        new Set(
          (image.variant_ids ?? [])
            .map((variantId) => String(variantId ?? "").trim())
            .filter(Boolean),
        ),
      );

      const legacyConfiguration =
        selectedVariantIds.length === 1
          ? (validConfigurationsById.get(selectedVariantIds[0]) ?? null)
          : null;

      const { data: insertedImage, error: insertImageError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          storage_path: destinationPath,
          image_url: publicUrlData.publicUrl,
          alt_text:
            String(image.alt_text ?? "").trim() ||
            `${product.name} photograph ${nextPosition + index + 1}`,
          position: nextPosition + index,
          is_primary: !productHasPrimaryImage && index === 0,

          /*
           * Legacy compatibility:
           *
           * 0 assignments = shared.
           * 1 assignment  = mirror that exact configuration.
           * 2+            = NULL because one legacy variant_id cannot
           *                 truthfully represent multiple configurations.
           */
          variant_name: legacyConfiguration?.variant_name || null,
          variant_id: legacyConfiguration?.id || null,
          variant_position: 0,
          is_variant_primary: false,
        })
        .select("id")
        .single();

      if (insertImageError || !insertedImage) {
        throw new Error(
          insertImageError?.message ?? "The photograph could not be saved.",
        );
      }

      insertedImageIds.push(insertedImage.id);

      for (const variantId of selectedVariantIds) {
        const { data: lastAssignment, error: lastAssignmentError } =
          await supabase
            .from("product_image_variants")
            .select("position")
            .eq("variant_id", variantId)
            .order("position", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastAssignmentError) {
          throw new Error(lastAssignmentError.message);
        }

        const nextVariantPosition = Number(lastAssignment?.position ?? -1) + 1;

        const { count: primaryCount, error: primaryCountError } = await supabase
          .from("product_image_variants")
          .select("*", { count: "exact", head: true })
          .eq("variant_id", variantId)
          .eq("is_primary", true);

        if (primaryCountError) {
          throw new Error(primaryCountError.message);
        }

        const { error: assignmentInsertError } = await supabase
          .from("product_image_variants")
          .insert({
            image_id: insertedImage.id,
            variant_id: variantId,
            position: Math.max(0, nextVariantPosition),
            is_primary: (primaryCount ?? 0) === 0,
          });

        if (assignmentInsertError) {
          throw new Error(assignmentInsertError.message);
        }
      }
    }
  } catch (error) {
    /*
     * Roll the database back before removing storage objects.
     *
     * Without this cleanup, a failure while inserting a later
     * product_image_variants assignment could leave product_images
     * rows pointing at files that were subsequently deleted.
     */
    if (insertedImageIds.length > 0) {
      await supabase.from("product_images").delete().in("id", insertedImageIds);
    }

    const pathsToRemove = [
      ...permanentStoragePaths,
      ...remainingTemporaryPaths,
    ];

    if (pathsToRemove.length > 0) {
      await supabase.storage.from("product-images").remove(pathsToRemove);
    }

    const message =
      error instanceof Error
        ? error.message
        : "The photographs could not be saved.";

    redirectWithError(productId, message);
  }

  await refreshProductPages(productId);

  redirectWithSuccess(
    productId,
    uploadedImages.length === 1
      ? "Photograph uploaded successfully."
      : `${uploadedImages.length} photographs uploaded successfully.`,
  );
}

export async function setPrimaryProductImage(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();
  const imageId = String(formData.get("image_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  const { data: image, error: imageError } = await supabase
    .from("product_images")
    .select("id")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (imageError || !image) {
    redirectWithError(
      productId,
      imageError?.message ?? "The photograph could not be found.",
    );
  }

  /*
   * ========================================================
   * EXACT CONFIGURATION MAIN
   * ========================================================
   *
   * A photograph may belong to multiple exact configurations.
   *
   * Main therefore belongs to the image/configuration
   * association, not to product_images itself.
   */
  if (variantId) {
    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();

    if (variantError || !variant) {
      redirectWithError(
        productId,
        variantError?.message ??
          "The selected configuration could not be verified.",
      );
    }

    const { data: selectedAssignment, error: selectedAssignmentError } =
      await supabase
        .from("product_image_variants")
        .select("image_id, variant_id")
        .eq("image_id", imageId)
        .eq("variant_id", variantId)
        .maybeSingle();

    if (selectedAssignmentError || !selectedAssignment) {
      redirectWithError(
        productId,
        selectedAssignmentError?.message ??
          "This photograph is not assigned to that configuration.",
      );
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("product_image_variants")
      .select("image_id, position, is_primary")
      .eq("variant_id", variantId)
      .order("position", { ascending: true })
      .order("image_id", { ascending: true });

    if (assignmentsError || !assignments) {
      redirectWithError(
        productId,
        assignmentsError?.message ??
          "Configuration photographs could not be loaded.",
      );
    }

    const selectedIndex = assignments.findIndex(
      (assignment) => assignment.image_id === imageId,
    );

    if (selectedIndex < 0) {
      redirectWithError(
        productId,
        "The configuration photograph could not be found.",
      );
    }

    /*
     * Making an image Main also places it first in that exact
     * configuration's gallery.
     */
    const reordered = [
      assignments[selectedIndex],
      ...assignments.filter((assignment) => assignment.image_id !== imageId),
    ];

    const { error: clearPrimaryError } = await supabase
      .from("product_image_variants")
      .update({
        is_primary: false,
      })
      .eq("variant_id", variantId);

    if (clearPrimaryError) {
      redirectWithError(productId, clearPrimaryError.message);
    }

    for (let index = 0; index < reordered.length; index += 1) {
      const assignment = reordered[index];

      const { error: temporaryUpdateError } = await supabase
        .from("product_image_variants")
        .update({
          position: 100000 + index,
        })
        .eq("variant_id", variantId)
        .eq("image_id", assignment.image_id);

      if (temporaryUpdateError) {
        redirectWithError(productId, temporaryUpdateError.message);
      }
    }

    for (let index = 0; index < reordered.length; index += 1) {
      const assignment = reordered[index];

      const { error: updateError } = await supabase
        .from("product_image_variants")
        .update({
          position: index,
          is_primary: assignment.image_id === imageId,
        })
        .eq("variant_id", variantId)
        .eq("image_id", assignment.image_id);

      if (updateError) {
        redirectWithError(productId, updateError.message);
      }
    }

    await refreshProductPages(productId);

    redirectWithSuccess(productId, "Configuration Main photograph updated.");
  }

  /*
   * ========================================================
   * SHARED PRODUCT MAIN
   * ========================================================
   *
   * No variant_id means this action is for a photograph shared
   * with every configuration.
   */
  const { count: assignmentCount, error: assignmentCountError } = await supabase
    .from("product_image_variants")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("image_id", imageId);

  if (assignmentCountError) {
    redirectWithError(productId, assignmentCountError.message);
  }

  if ((assignmentCount ?? 0) > 0) {
    redirectWithError(
      productId,
      "Choose an exact configuration before changing this photograph's Main state.",
    );
  }

  const { error: clearPrimaryError } = await supabase
    .from("product_images")
    .update({
      is_primary: false,
    })
    .eq("product_id", productId);

  if (clearPrimaryError) {
    redirectWithError(productId, clearPrimaryError.message);
  }

  const { error: primaryError } = await supabase
    .from("product_images")
    .update({
      is_primary: true,
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (primaryError) {
    redirectWithError(productId, primaryError.message);
  }

  await refreshProductPages(productId);

  redirectWithSuccess(productId, "Main photograph updated.");
}

export async function updateProductImageVariantName(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();
  const imageId = String(formData.get("image_id") ?? "").trim();

  const requestedVariantIds = Array.from(
    new Set(
      formData
        .getAll("variant_ids")
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  const { data: image, error: imageError } = await supabase
    .from("product_images")
    .select("id")
    .eq("id", imageId)
    .eq("product_id", productId)
    .maybeSingle();

  if (imageError || !image) {
    redirectWithError(
      productId,
      imageError?.message ?? "The photograph could not be found.",
    );
  }

  let selectedVariants: {
    id: string;
    variant_name: string | null;
  }[] = [];

  if (requestedVariantIds.length > 0) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, variant_name")
      .eq("product_id", productId)
      .in("id", requestedVariantIds);

    if (error) {
      redirectWithError(productId, error.message);
    }

    selectedVariants = data ?? [];

    if (selectedVariants.length !== requestedVariantIds.length) {
      redirectWithError(
        productId,
        "One or more selected configurations no longer exist.",
      );
    }
  }

  /*
   * Preserve the existing per-configuration order/primary data
   * for assignments that remain selected.
   */
  const { data: previousAssignments, error: previousAssignmentsError } =
    await supabase
      .from("product_image_variants")
      .select("variant_id, position, is_primary")
      .eq("image_id", imageId);

  if (previousAssignmentsError) {
    redirectWithError(productId, previousAssignmentsError.message);
  }

  const previousByVariant = new Map(
    (previousAssignments ?? []).map((assignment) => [
      assignment.variant_id,
      assignment,
    ]),
  );

  const rows: {
    image_id: string;
    variant_id: string;
    position: number;
    is_primary: boolean;
  }[] = [];

  for (const variant of selectedVariants) {
    const previous = previousByVariant.get(variant.id);

    if (previous) {
      rows.push({
        image_id: imageId,
        variant_id: variant.id,
        position: previous.position,
        is_primary: previous.is_primary,
      });

      continue;
    }

    const { data: existingForVariant, error: existingForVariantError } =
      await supabase
        .from("product_image_variants")
        .select("position")
        .eq("variant_id", variant.id)
        .order("position", { ascending: false })
        .limit(1);

    if (existingForVariantError) {
      redirectWithError(productId, existingForVariantError.message);
    }

    const highestPosition = Number(existingForVariant?.[0]?.position ?? -1);

    rows.push({
      image_id: imageId,
      variant_id: variant.id,
      position: highestPosition + 1,
      is_primary: false,
    });
  }

  const { error: clearError } = await supabase
    .from("product_image_variants")
    .delete()
    .eq("image_id", imageId);

  if (clearError) {
    redirectWithError(productId, clearError.message);
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("product_image_variants")
      .insert(rows);

    if (insertError) {
      redirectWithError(productId, insertError.message);
    }
  }

  /*
   * Legacy fields are mirrored only for exactly one assignment.
   * For shared/multi-assignment images they stay null so they
   * cannot falsely describe the photograph.
   */
  const singleVariant =
    selectedVariants.length === 1 ? selectedVariants[0] : null;

  const singleAssignment = rows.length === 1 ? rows[0] : null;

  const { error: legacyError } = await supabase
    .from("product_images")
    .update({
      variant_id: singleVariant?.id ?? null,
      variant_name: singleVariant?.variant_name ?? null,
      variant_position: singleAssignment?.position ?? 0,
      is_variant_primary: singleAssignment?.is_primary ?? false,
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (legacyError) {
    redirectWithError(productId, legacyError.message);
  }

  await refreshProductPages(productId);

  redirectWithSuccess(
    productId,
    selectedVariants.length === 0
      ? "Photograph shared with all configurations."
      : `Photograph assigned to ${selectedVariants.length} configuration${
          selectedVariants.length === 1 ? "" : "s"
        }.`,
  );
}

export async function updateProductImageAltText(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  const imageId = String(formData.get("image_id") ?? "").trim();

  const altText = String(formData.get("alt_text") ?? "").trim();

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  const { error } = await supabase
    .from("product_images")
    .update({
      alt_text: altText || null,
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    redirectWithError(productId, error.message);
  }

  await refreshProductPages(productId);

  redirectWithSuccess(productId, "Image description updated.");
}

export async function moveProductImage(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();
  const imageId = String(formData.get("image_id") ?? "").trim();
  const variantId = String(formData.get("variant_id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  if (direction !== "left" && direction !== "right") {
    redirectWithError(productId, "Invalid photograph direction.");
  }

  /*
   * ========================================================
   * EXACT CONFIGURATION ORDER
   * ========================================================
   *
   * Each image/configuration relationship has its own position.
   */
  if (variantId) {
    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("id", variantId)
      .eq("product_id", productId)
      .maybeSingle();

    if (variantError || !variant) {
      redirectWithError(
        productId,
        variantError?.message ??
          "The selected configuration could not be verified.",
      );
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("product_image_variants")
      .select("image_id, position, is_primary")
      .eq("variant_id", variantId)
      .order("position", { ascending: true })
      .order("image_id", { ascending: true });

    if (assignmentsError || !assignments) {
      redirectWithError(
        productId,
        assignmentsError?.message ??
          "Configuration photographs could not be loaded.",
      );
    }

    const currentIndex = assignments.findIndex(
      (assignment) => assignment.image_id === imageId,
    );

    if (currentIndex < 0) {
      redirectWithError(
        productId,
        "This photograph is not assigned to that configuration.",
      );
    }

    const targetIndex =
      direction === "left" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= assignments.length) {
      await refreshProductPages(productId);

      redirectWithSuccess(
        productId,
        "This photograph is already at the edge of its configuration.",
      );
    }

    const reordered = [...assignments];

    const [moving] = reordered.splice(currentIndex, 1);

    reordered.splice(targetIndex, 0, moving);

    /*
     * First move every assignment into a temporary position range.
     * Then write the final positions.
     *
     * This prevents adjacent photographs from colliding while they
     * exchange positions.
     */
    for (let index = 0; index < reordered.length; index += 1) {
      const assignment = reordered[index];

      const { error: temporaryUpdateError } = await supabase
        .from("product_image_variants")
        .update({
          position: 100000 + index,
        })
        .eq("variant_id", variantId)
        .eq("image_id", assignment.image_id);

      if (temporaryUpdateError) {
        redirectWithError(productId, temporaryUpdateError.message);
      }
    }

    for (let index = 0; index < reordered.length; index += 1) {
      const assignment = reordered[index];

      const { error: updateError } = await supabase
        .from("product_image_variants")
        .update({
          position: index,
        })
        .eq("variant_id", variantId)
        .eq("image_id", assignment.image_id);

      if (updateError) {
        redirectWithError(productId, updateError.message);
      }
    }

    await refreshProductPages(productId);

    redirectWithSuccess(productId, "Configuration photograph order updated.");
  }

  /*
   * ========================================================
   * SHARED PHOTO ORDER
   * ========================================================
   *
   * Shared means the photograph has zero junction rows.
   *
   * Only other shared photographs participate in this ordering.
   */
  const { data: productImages, error: productImagesError } = await supabase
    .from("product_images")
    .select(
      `
          id,
          position,
          product_image_variants (
            variant_id
          )
        `,
    )
    .eq("product_id", productId)
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (productImagesError || !productImages) {
    redirectWithError(
      productId,
      productImagesError?.message ?? "Product photographs could not be loaded.",
    );
  }

  const sharedImages = productImages.filter(
    (image) =>
      !Array.isArray(image.product_image_variants) ||
      image.product_image_variants.length === 0,
  );

  const currentIndex = sharedImages.findIndex((image) => image.id === imageId);

  if (currentIndex < 0) {
    redirectWithError(
      productId,
      "Choose an exact configuration before moving this photograph.",
    );
  }

  const targetIndex =
    direction === "left" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= sharedImages.length) {
    await refreshProductPages(productId);

    redirectWithSuccess(
      productId,
      "This photograph is already at the edge of the shared gallery.",
    );
  }

  const reordered = [...sharedImages];

  const [moving] = reordered.splice(currentIndex, 1);

  reordered.splice(targetIndex, 0, moving);

  /*
   * Keep shared photographs in deterministic order without
   * changing configuration-specific junction positions.
   */
  for (let index = 0; index < reordered.length; index += 1) {
    const image = reordered[index];

    const { error: updateError } = await supabase
      .from("product_images")
      .update({
        position: index,
      })
      .eq("product_id", productId)
      .eq("id", image.id);

    if (updateError) {
      redirectWithError(productId, updateError.message);
    }
  }

  await refreshProductPages(productId);

  redirectWithSuccess(productId, "Shared photograph order updated.");
}

export async function deleteProductImage(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  const imageId = String(formData.get("image_id") ?? "").trim();

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  const { data: image, error: imageError } = await supabase
    .from("product_images")
    .select("id, storage_path, is_primary, position")
    .eq("id", imageId)
    .eq("product_id", productId)
    .single();

  if (imageError || !image) {
    redirectWithError(
      productId,
      imageError?.message ?? "The photograph could not be found.",
    );
  }

  if (image.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove([image.storage_path]);

    if (storageError) {
      redirectWithError(productId, storageError.message);
    }
  }

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)
    .eq("product_id", productId);

  if (deleteError) {
    redirectWithError(productId, deleteError.message);
  }

  const { data: remainingImages } = await supabase
    .from("product_images")
    .select("id, position, is_primary")
    .eq("product_id", productId)
    .order("position", {
      ascending: true,
    });

  if (remainingImages?.length) {
    for (let index = 0; index < remainingImages.length; index += 1) {
      await supabase
        .from("product_images")
        .update({
          position: index,
        })
        .eq("id", remainingImages[index].id);
    }

    const stillHasPrimary = remainingImages.some(
      (remainingImage) => remainingImage.is_primary,
    );

    if (!stillHasPrimary) {
      await supabase
        .from("product_images")
        .update({
          is_primary: true,
        })
        .eq("id", remainingImages[0].id);
    }
  }

  await refreshProductPages(productId);

  redirectWithSuccess(productId, "Photograph deleted.");
}
