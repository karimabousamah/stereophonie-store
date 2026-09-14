"use client";

import {
  createTemporaryProductImagePath,
  removeDirectlyUploadedImages,
  uploadProductImageDirectly,
  validateProductImageFiles,
} from "@/lib/uploads/product-image-upload";

export type DirectUploadSelectedImage = {
  file: File;

  /**
   * Stable browser-side exact configuration identities.
   *
   * Empty array means Shared.
   */
  configurationIds: string[];
  altText: string;
  isPrimary: boolean;
  position: number;
};

export type DirectUploadProgress = {
  currentFileName: string;
  percentage: number;
};

export type DirectUploadedImagePayload = {
  storage_path: string;
  configuration_ids: string[];
  original_name: string;
  content_type: string;
  size: number;
  position: number;
  alt_text: string;
  is_primary: boolean;
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
      "Complete all required product information before uploading images.",
    );
  }

  const formData = new FormData(form);

  const productName = String(formData.get("name") ?? "").trim();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  const variantsJson = String(formData.get("variants_json") ?? "[]");

  if (!productName) {
    throw new Error("Enter the product name before uploading images.");
  }

  if (!categoryId) {
    throw new Error("Select a product category before uploading images.");
  }

  let variants: unknown[];

  try {
    variants = JSON.parse(variantsJson) as unknown[];
  } catch {
    throw new Error("The selected product sizes could not be processed.");
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error(
      "Create at least one product configuration before uploading images.",
    );
  }

  for (const item of variants) {
    if (!item || typeof item !== "object") {
      throw new Error("A product configuration could not be processed.");
    }

    const variant = item as Record<string, unknown>;

    const regularPrice = Number(variant.regular_price);

    const salePriceText =
      variant.sale_price === null || variant.sale_price === undefined
        ? ""
        : String(variant.sale_price).trim();

    if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
      throw new Error("Every configuration must have a valid regular price.");
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
    throw new Error("Select exactly one main product image.");
  }

  const totalBytes = orderedImages.reduce(
    (total, image) => total + image.file.size,
    0,
  );

  let completedBytes = 0;

  const uploadedPaths: string[] = [];

  /*
   * Preserve exact payload ordering even though transfers now finish
   * independently.
   */
  const payload: DirectUploadedImagePayload[] =
    new Array(orderedImages.length);

  /*
   * Per-file progress lets concurrent XHR uploads report one accurate
   * aggregate percentage instead of jumping backwards.
   */
  const uploadedBytesByIndex = orderedImages.map(() => 0);

  const reportAggregateProgress = (
    index: number,
    currentFileName: string,
    bytesUploaded: number,
  ) => {
    uploadedBytesByIndex[index] = Math.max(
      0,
      Math.min(
        bytesUploaded,
        orderedImages[index]?.file.size ?? 0,
      ),
    );

    const aggregateUploadedBytes =
      uploadedBytesByIndex.reduce(
        (total, value) => total + value,
        0,
      );

    const percentage =
      totalBytes > 0
        ? Math.round(
            (aggregateUploadedBytes / totalBytes) * 100,
          )
        : 0;

    options.onProgress?.({
      currentFileName,
      percentage: Math.min(percentage, 100),
    });
  };

  /*
   * Three concurrent transfers are fast enough to remove the old
   * one-file-at-a-time bottleneck without flooding Supabase or the
   * administrator's upstream connection.
   */
  const maximumConcurrentUploads = 3;

  let nextUploadIndex = 0;

  async function uploadWorker() {
    while (true) {
      const index = nextUploadIndex;
      nextUploadIndex += 1;

      if (index >= orderedImages.length) {
        return;
      }

      const image = orderedImages[index];

      const storagePath =
        createTemporaryProductImagePath(image.file);

      await uploadProductImageDirectly({
        file: image.file,
        storagePath,
        onProgress(progress) {
          reportAggregateProgress(
            index,
            image.file.name,
            progress.bytesUploaded,
          );
        },
      });

      uploadedPaths.push(storagePath);

      uploadedBytesByIndex[index] = image.file.size;

      reportAggregateProgress(
        index,
        image.file.name,
        image.file.size,
      );

      payload[index] = {
        storage_path: storagePath,
        configuration_ids: Array.from(
          new Set(
            image.configurationIds
              .map((configurationId) =>
                configurationId.trim(),
              )
              .filter(Boolean),
          ),
        ),
        original_name: image.file.name,
        content_type: image.file.type,
        size: image.file.size,
        position: index,
        alt_text: image.altText.trim(),
        is_primary: image.isPrimary,
      };
    }
  }

  try {
    /*
     * Wait for every worker to settle before cleanup.
     *
     * This matters on failure: no still-running upload can finish AFTER
     * cleanup and leave an orphaned temporary object in storage.
     */
    const workerCount = Math.min(
      maximumConcurrentUploads,
      orderedImages.length,
    );

    const workerResults = await Promise.allSettled(
      Array.from(
        { length: workerCount },
        () => uploadWorker(),
      ),
    );

    const rejectedWorker = workerResults.find(
      (
        result,
      ): result is PromiseRejectedResult =>
        result.status === "rejected",
    );

    if (rejectedWorker) {
      throw rejectedWorker.reason;
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
