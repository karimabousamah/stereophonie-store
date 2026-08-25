"use client";

import {
  createTemporaryProductImagePath,
  removeDirectlyUploadedImages,
  uploadProductImageDirectly,
  validateProductImageFiles,
} from "@/lib/uploads/product-image-upload";

export type DirectUploadSelectedImage = {
  file: File;
  altText: string;
  isPrimary: boolean;
  position: number;

  /**
   * Empty string means the photograph is shared by every
   * configuration.
   *
   * Otherwise it stores the exact configuration name.
   */
  variantName: string;
};

export type DirectUploadProgress = {
  currentFileName: string;
  percentage: number;
};

export type DirectUploadedImagePayload = {
  storage_path: string;
  original_name: string;
  content_type: string;
  size: number;
  position: number;
  alt_text: string;
  is_primary: boolean;
  variant_name: string;
};

type UploadOptions = {
  images: DirectUploadSelectedImage[];
  onProgress?: (progress: DirectUploadProgress) => void;

  /**
   * Publishing requires the complete product form.
   *
   * Drafts deliberately skip this validation because an
   * administrator must be able to save work in progress.
   */
  validateForm?: boolean;
};

function validateProductForm(form: HTMLFormElement) {
  if (!form.reportValidity()) {
    throw new Error(
      "Complete all required product information before uploading photographs.",
    );
  }

  const formData = new FormData(form);

  const productName = String(formData.get("name") ?? "").trim();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  const variantsJson = String(formData.get("variants_json") ?? "[]");

  if (!productName) {
    throw new Error("Enter the product name before uploading photographs.");
  }

  if (!categoryId) {
    throw new Error("Select a product category before uploading photographs.");
  }

  let variants: unknown[];

  try {
    variants = JSON.parse(variantsJson) as unknown[];
  } catch {
    throw new Error("The selected product sizes could not be processed.");
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error(
      "Create at least one product configuration before uploading photographs.",
    );
  }

  for (const item of variants) {
    if (!item || typeof item !== "object") {
      throw new Error(
        "A product configuration could not be processed.",
      );
    }

    const variant = item as Record<string, unknown>;

    const regularPrice = Number(variant.regular_price);

    const salePriceText =
      variant.sale_price === null ||
      variant.sale_price === undefined
        ? ""
        : String(variant.sale_price).trim();

    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      throw new Error(
        "Every configuration must have a valid regular price.",
      );
    }

    if (salePriceText) {
      const salePrice = Number(salePriceText);

      if (
        !Number.isFinite(salePrice) ||
        salePrice < 0 ||
        salePrice >= regularPrice
      ) {
        throw new Error(
          "A configuration sale price must be lower than its regular price.",
        );
      }
    }
  }
}

export async function uploadImagesBeforeProductSubmission(
  form: HTMLFormElement,
  options: UploadOptions,
): Promise<DirectUploadedImagePayload[]> {
  if (options.validateForm !== false) {
    validateProductForm(form);
  }

  const orderedImages = [...options.images].sort(
    (first, second) => first.position - second.position,
  );

  validateProductImageFiles(orderedImages.map((image) => image.file));

  if (orderedImages.length === 0) {
    return [];
  }

  const primaryImages = orderedImages.filter((image) => image.isPrimary);

  if (primaryImages.length !== 1) {
    throw new Error("Select exactly one main product photograph.");
  }

  const totalBytes = orderedImages.reduce(
    (total, image) => total + image.file.size,
    0,
  );

  let completedBytes = 0;

  const uploadedPaths: string[] = [];
  const payload: DirectUploadedImagePayload[] = [];

  try {
    for (let index = 0; index < orderedImages.length; index += 1) {
      const image = orderedImages[index];

      const storagePath = createTemporaryProductImagePath(image.file);

      await uploadProductImageDirectly({
        file: image.file,
        storagePath,
        onProgress(progress) {
          const uploadedBytes = completedBytes + progress.bytesUploaded;

          const percentage =
            totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;

          options.onProgress?.({
            currentFileName: image.file.name,
            percentage: Math.min(percentage, 100),
          });
        },
      });

      uploadedPaths.push(storagePath);
      completedBytes += image.file.size;

      payload.push({
        storage_path: storagePath,
        original_name: image.file.name,
        content_type: image.file.type,
        size: image.file.size,
        position: index,
        alt_text: image.altText.trim(),
        is_primary: image.isPrimary,
        variant_name: image.variantName.trim(),
      });
    }

    options.onProgress?.({
      currentFileName: "",
      percentage: 100,
    });

    return payload;
  } catch (error) {
    await removeDirectlyUploadedImages(uploadedPaths);

    throw error;
  }
}
