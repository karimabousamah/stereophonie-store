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
  variant_name: string;
  variant_position?: number;
  is_variant_primary?: boolean;
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

  const {
    data: productConfigurations,
    error: productConfigurationsError,
  } = await supabase
    .from("product_variants")
    .select("id, variant_name")
    .eq("product_id", productId);

  if (productConfigurationsError) {
    redirectWithError(
      productId,
      productConfigurationsError.message,
    );
  }

  const validConfigurationNames = new Set(
    (productConfigurations ?? [])
      .map((configuration) =>
        String(configuration.variant_name ?? "").trim(),
      )
      .filter(Boolean),
  );

  const validConfigurationIdsByName =
    new Map(
      (productConfigurations ?? [])
        .map(
          (configuration): [string, string] => [
            String(
              configuration.variant_name ?? "",
            ).trim().toLowerCase(),
            String(configuration.id),
          ],
        )
        .filter(
          ([name]) =>
            Boolean(name),
        ),
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

    const imageVariantName =
      String(image.variant_name ?? "").trim();

    if (
      imageVariantName &&
      !validConfigurationNames.has(imageVariantName)
    ) {
      redirectWithError(
        productId,
        `The photograph assigned to "${imageVariantName}" no longer matches a product configuration.`,
      );
    }

    submittedPositions.add(position);
  }

  uploadedImages.sort((first, second) => first.position - second.position);

  const productHasPrimaryImage =
    existingImages?.some((image) => image.is_primary) ?? false;

  const nextPosition = currentImageCount;

  const permanentStoragePaths: string[] = [];

  const remainingTemporaryPaths = uploadedImages.map(
    (image) => image.storage_path,
  );

  try {
    const rows = [];

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

      rows.push({
        product_id: productId,
        storage_path: destinationPath,
        image_url: publicUrlData.publicUrl,
        alt_text:
          String(image.alt_text ?? "").trim() ||
          `${product.name} photograph ${nextPosition + index + 1}`,
        position: nextPosition + index,
        is_primary: !productHasPrimaryImage && index === 0,

        /*
         * NULL = shared photograph.
         * Otherwise this photograph belongs to this exact
         * product configuration.
         */
        variant_name:
          String(image.variant_name ?? "").trim() || null,

        variant_id:
          validConfigurationIdsByName.get(
            String(
              image.variant_name ?? "",
            )
              .trim()
              .toLowerCase(),
          ) ?? null,

        variant_position:
          Math.max(
            0,
            Number(
              image.variant_position ??
                image.position ??
                index,
            ) || 0,
          ),

        is_variant_primary:
          Boolean(
            image.is_variant_primary,
          ),
      });
    }

    const { error: insertError } = await supabase
      .from("product_images")
      .insert(rows);

    if (insertError) {
      throw new Error(insertError.message);
    }
  } catch (error) {
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

export async function setPrimaryProductImage(
  formData: FormData,
) {
  const supabase =
    await requireAdministrator();

  const productId =
    String(
      formData.get("product_id") ??
        "",
    ).trim();

  const imageId =
    String(
      formData.get("image_id") ??
        "",
    ).trim();

  if (
    !productId ||
    !imageId
  ) {
    redirect("/admin/products");
  }

  const {
    data: selectedImage,
    error: selectedImageError,
  } = await supabase
    .from("product_images")
    .select(
      "id, variant_id, variant_position, position",
    )
    .eq(
      "product_id",
      productId,
    )
    .eq(
      "id",
      imageId,
    )
    .single();

  if (
    selectedImageError ||
    !selectedImage
  ) {
    redirectWithError(
      productId,
      selectedImageError?.message ??
        "The photograph could not be found.",
    );
  }

  /*
   * ========================================================
   * CONFIGURATION-SPECIFIC MAIN
   * ========================================================
   *
   * Every sellable configuration has its own Main photograph.
   *
   * Black  -> one Main
   * Navy   -> one Main
   * Orange -> one Main
   *
   * Making a photograph Main also moves it to
   * variant_position 0.
   */
  if (
    selectedImage.variant_id
  ) {
    const {
      data: groupImages,
      error: groupImagesError,
    } = await supabase
      .from("product_images")
      .select(
        "id, variant_position, position",
      )
      .eq(
        "product_id",
        productId,
      )
      .eq(
        "variant_id",
        selectedImage.variant_id,
      )
      .order(
        "variant_position",
        {
          ascending: true,
        },
      )
      .order(
        "position",
        {
          ascending: true,
        },
      );

    if (
      groupImagesError ||
      !groupImages
    ) {
      redirectWithError(
        productId,
        groupImagesError?.message ??
          "Configuration photographs could not be loaded.",
      );
    }

    const selectedIndex =
      groupImages.findIndex(
        (image) =>
          image.id === imageId,
      );

    if (
      selectedIndex < 0
    ) {
      redirectWithError(
        productId,
        "The configuration photograph could not be found.",
      );
    }

    /*
     * Rebuild clean configuration positions with selected image first.
     */
    const reordered = [
      groupImages[selectedIndex],
      ...groupImages.filter(
        (image) =>
          image.id !== imageId,
      ),
    ];

    /*
     * Clear old configuration Main flag first.
     */
    const {
      error: clearMainError,
    } = await supabase
      .from("product_images")
      .update({
        is_variant_primary:
          false,
      })
      .eq(
        "product_id",
        productId,
      )
      .eq(
        "variant_id",
        selectedImage.variant_id,
      );

    if (clearMainError) {
      redirectWithError(
        productId,
        clearMainError.message,
      );
    }

    /*
     * Store deterministic positions inside this configuration.
     */
    for (
      let index = 0;
      index <
      reordered.length;
      index += 1
    ) {
      const image =
        reordered[index];

      const {
        error: positionError,
      } = await supabase
        .from("product_images")
        .update({
          variant_position:
            index,

          is_variant_primary:
            image.id === imageId,
        })
        .eq(
          "id",
          image.id,
        )
        .eq(
          "product_id",
          productId,
        );

      if (positionError) {
        redirectWithError(
          productId,
          positionError.message,
        );
      }
    }

    await refreshProductPages(
      productId,
    );

    redirectWithSuccess(
      productId,
      "Configuration Main photograph updated.",
    );
  }

  /*
   * ========================================================
   * SHARED / LEGACY PRODUCT MAIN
   * ========================================================
   *
   * Shared photographs continue using the original one-primary
   * product behaviour for backwards compatibility.
   */
  const {
    error: clearPrimaryError,
  } = await supabase
    .from("product_images")
    .update({
      is_primary: false,
    })
    .eq(
      "product_id",
      productId,
    );

  if (clearPrimaryError) {
    redirectWithError(
      productId,
      clearPrimaryError.message,
    );
  }

  const {
    error: primaryError,
  } = await supabase
    .from("product_images")
    .update({
      is_primary: true,
    })
    .eq(
      "id",
      imageId,
    )
    .eq(
      "product_id",
      productId,
    );

  if (primaryError) {
    redirectWithError(
      productId,
      primaryError.message,
    );
  }

  await refreshProductPages(
    productId,
  );

  redirectWithSuccess(
    productId,
    "Main photograph updated.",
  );
}


export async function updateProductImageVariantName(
  formData: FormData,
) {
  const supabase = await requireAdministrator();

  const productId =
    String(formData.get("product_id") ?? "").trim();

  const imageId =
    String(formData.get("image_id") ?? "").trim();

  const variantName =
    String(formData.get("variant_name") ?? "").trim();

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  /*
   * Empty variantName intentionally means:
   * Shared with every product configuration.
   */
  if (variantName) {
    const {
      data: matchingConfiguration,
      error: matchingConfigurationError,
    } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("variant_name", variantName)
      .maybeSingle();

    if (
      matchingConfigurationError ||
      !matchingConfiguration
    ) {
      redirectWithError(
        productId,
        "That product configuration no longer exists. Choose another photograph usage.",
      );
    }
  }

  let selectedVariantId: string | null =
    null;

  if (variantName) {
    const {
      data: selectedVariant,
      error: selectedVariantError,
    } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("variant_name", variantName)
      .maybeSingle();

    if (
      selectedVariantError ||
      !selectedVariant
    ) {
      redirectWithError(
        productId,
        "That product configuration no longer exists.",
      );
    }

    selectedVariantId =
      selectedVariant.id;
  }

  /*
   * Put the photograph at the end of the selected configuration.
   */
  let nextVariantPosition = 0;

  if (selectedVariantId) {
    const {
      data: configurationImages,
    } = await supabase
      .from("product_images")
      .select("variant_position")
      .eq("product_id", productId)
      .eq(
        "variant_id",
        selectedVariantId,
      );

    nextVariantPosition =
      configurationImages?.length ?? 0;
  }

  const { error } = await supabase
    .from("product_images")
    .update({
      variant_name:
        variantName || null,
      variant_id:
        selectedVariantId,
      variant_position:
        nextVariantPosition,
      is_variant_primary:
        false,
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    redirectWithError(
      productId,
      error.message,
    );
  }

  await refreshProductPages(productId);

  redirectWithSuccess(
    productId,
    variantName
      ? `Photograph assigned to ${variantName}.`
      : "Photograph shared with all configurations.",
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

export async function moveProductImage(
  formData: FormData,
) {
  const supabase =
    await requireAdministrator();

  const productId =
    String(
      formData.get("product_id") ??
        "",
    ).trim();

  const imageId =
    String(
      formData.get("image_id") ??
        "",
    ).trim();

  const direction =
    String(
      formData.get("direction") ??
        "",
    ).trim();

  if (
    !productId ||
    !imageId
  ) {
    redirect("/admin/products");
  }

  if (
    direction !== "left" &&
    direction !== "right"
  ) {
    redirectWithError(
      productId,
      "Invalid photograph direction.",
    );
  }

  /*
   * The database function performs the complete move atomically.
   *
   * IMPORTANT:
   *
   * Configuration photographs move by `variant_position`.
   * They DO NOT move by the old global `position`.
   *
   * Therefore:
   *
   * Black photo 1 -> Black photo 2
   * Navy photo 1  -> Navy photo 2
   *
   * are completely independent galleries.
   */
  const {
    data,
    error,
  } = await supabase.rpc(
    "admin_move_product_configuration_image",
    {
      requested_product_id:
        productId,

      requested_image_id:
        imageId,

      requested_direction:
        direction,
    },
  );

  if (error) {
    redirectWithError(
      productId,
      error.message,
    );
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  await refreshProductPages(
    productId,
  );

  redirectWithSuccess(
    productId,
    result?.moved
      ? "Configuration photograph order updated."
      : "This photograph is already at the edge of its configuration.",
  );
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
