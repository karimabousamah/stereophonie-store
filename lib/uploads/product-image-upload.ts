"use client";

import * as tus from "tus-js-client";

import { createClient } from "@/lib/supabase/client";

const bucketName = "product-images";

export const maximumProductImageSize = 10 * 1024 * 1024;

export const acceptedProductImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProductImageUploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
};

type UploadProductImageOptions = {
  file: File;
  storagePath: string;
  onProgress?: (progress: ProductImageUploadProgress) => void;
};

function getStorageProjectId() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!projectUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  const hostname = new URL(projectUrl).hostname;
  const projectId = hostname.split(".")[0];

  if (!projectId) {
    throw new Error("The Supabase project identifier could not be determined.");
  }

  return projectId;
}

export function getProductImageExtension(file: File) {
  const extensionFromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extensionFromName === "jpeg") {
    return "jpg";
  }

  if (
    extensionFromName === "jpg" ||
    extensionFromName === "png" ||
    extensionFromName === "webp"
  ) {
    return extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export function createTemporaryProductImagePath(file: File) {
  const extension = getProductImageExtension(file);

  return (
    `temporary/${crypto.randomUUID()}/` +
    `${Date.now()}-${crypto.randomUUID()}.${extension}`
  );
}

export function createExistingProductImagePath(
  productId: string,
  file: File,
  index: number,
) {
  const extension = getProductImageExtension(file);

  return (
    `${productId}/` +
    `${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`
  );
}

export function validateProductImageFiles(
  files: File[],
  _existingImageCount = 0,
) {
  /*
   * Physical file validation only.
   *
   * Photograph quantity is NOT a product-wide rule anymore.
   * The Admin supports up to 10 photographs per exact product
   * configuration, and that rule is validated using configuration
   * assignments in the Add/Edit Product flows.
   *
   * Keep the second argument temporarily for compatibility with
   * existing callers while deliberately ignoring it here.
   */
  for (const file of files) {
    if (
      !acceptedProductImageTypes.includes(
        file.type as (typeof acceptedProductImageTypes)[number],
      )
    ) {
      throw new Error(`${file.name} is not supported. Use JPEG, PNG or WebP.`);
    }

    if (file.size > maximumProductImageSize) {
      throw new Error(`${file.name} is larger than 10 MB.`);
    }
  }
}

export async function uploadProductImageDirectly({
  file,
  storagePath,
  onProgress,
}: UploadProductImageOptions): Promise<void> {
  validateProductImageFiles([file]);

  const supabase = createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session?.access_token) {
    throw new Error(
      "Your administrator session has expired. Please sign in again.",
    );
  }

  const projectId = getStorageProjectId();

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint:
        `https://${projectId}.storage.supabase.co` +
        "/storage/v1/upload/resumable",

      retryDelays: [0, 3000, 5000, 10000, 20000],

      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },

      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,

      metadata: {
        bucketName,
        objectName: storagePath,
        contentType: file.type,
        cacheControl: "3600",
      },

      onError(error) {
        reject(
          new Error(error.message || `The upload of ${file.name} failed.`),
        );
      },

      onProgress(bytesUploaded, bytesTotal) {
        const percentage =
          bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;

        onProgress?.({
          bytesUploaded,
          bytesTotal,
          percentage,
        });
      },

      onSuccess() {
        resolve();
      },
    });

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }

        upload.start();
      })
      .catch((error: unknown) => {
        reject(
          error instanceof Error
            ? error
            : new Error(`The upload of ${file.name} could not start.`),
        );
      });
  });
}

export async function removeDirectlyUploadedImages(storagePaths: string[]) {
  if (storagePaths.length === 0) {
    return;
  }

  const supabase = createClient();

  const { error } = await supabase.storage
    .from(bucketName)
    .remove(storagePaths);

  if (error) {
    console.error("Temporary product image cleanup failed:", error);
  }
}

export function getPublicProductImageUrl(storagePath: string) {
  const supabase = createClient();

  return supabase.storage.from(bucketName).getPublicUrl(storagePath).data
    .publicUrl;
}
