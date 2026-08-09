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

export async function setPrimaryProductImage(formData: FormData) {
  const supabase = await requireAdministrator();

  const productId = String(formData.get("product_id") ?? "").trim();

  const imageId = String(formData.get("image_id") ?? "").trim();

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  const { error: removePrimaryError } = await supabase
    .from("product_images")
    .update({
      is_primary: false,
    })
    .eq("product_id", productId);

  if (removePrimaryError) {
    redirectWithError(productId, removePrimaryError.message);
  }

  const { error: setPrimaryError } = await supabase
    .from("product_images")
    .update({
      is_primary: true,
    })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (setPrimaryError) {
    redirectWithError(productId, setPrimaryError.message);
  }

  await refreshProductPages(productId);

  redirectWithSuccess(productId, "Main photograph updated.");
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

  const direction = String(formData.get("direction") ?? "");

  if (!productId || !imageId) {
    redirect("/admin/products");
  }

  if (direction !== "left" && direction !== "right") {
    redirectWithError(productId, "Invalid photograph direction.");
  }

  const { data: images, error: imagesError } = await supabase
    .from("product_images")
    .select("id, position")
    .eq("product_id", productId)
    .order("position", {
      ascending: true,
    });

  if (imagesError) {
    redirectWithError(productId, imagesError.message);
  }

  const currentIndex = images?.findIndex((image) => image.id === imageId) ?? -1;

  if (currentIndex === -1) {
    redirectWithError(productId, "The photograph could not be found.");
  }

  const targetIndex =
    direction === "left" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || !images || targetIndex >= images.length) {
    redirectWithSuccess(productId, "Photograph order unchanged.");
  }

  const currentImage = images[currentIndex];
  const targetImage = images[targetIndex];

  const temporaryPosition =
    Math.max(...images.map((image) => image.position)) + 1;

  const { error: temporaryError } = await supabase
    .from("product_images")
    .update({
      position: temporaryPosition,
    })
    .eq("id", currentImage.id);

  if (temporaryError) {
    redirectWithError(productId, temporaryError.message);
  }

  const { error: targetError } = await supabase
    .from("product_images")
    .update({
      position: currentImage.position,
    })
    .eq("id", targetImage.id);

  if (targetError) {
    redirectWithError(productId, targetError.message);
  }

  const { error: currentError } = await supabase
    .from("product_images")
    .update({
      position: targetImage.position,
    })
    .eq("id", currentImage.id);

  if (currentError) {
    redirectWithError(productId, currentError.message);
  }

  await refreshProductPages(productId);

  redirectWithSuccess(productId, "Photograph order updated.");
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
