"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";

import {
  SHOP_CATALOGUE_CACHE_TAG,
  STOREFRONT_RECOMMENDATION_CACHE_TAG,
} from "@/lib/storefront-cache-tags";
import { createClient } from "@/lib/supabase/server";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type VariantInput = {
  /*
   * Temporary browser identity used while creating the product.
   * This is never stored in product_variants.
   */
  client_id?: string;

  variant_name: string;
  display_position?: number;
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  regular_price: number | "";
  sale_price: number | "" | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: AvailabilityStatus;
};

type ImageMetadata = {
  position: number;
  alt_text: string;
  is_primary: boolean;
};

type DirectUploadedImage = {
  storage_path: string;

  /*
   * Empty configuration_ids = Shared image.
   *
   * configuration_id remains accepted temporarily for an
   * already-open browser tab using the previous client bundle.
   */
  configuration_ids?: string[];
  configuration_id?: string;

  original_name: string;
  content_type: string;
  size: number;
  position: number;
  alt_text: string;
  is_primary: boolean;
};

/* === ST NEW PRODUCT STOREFRONT THUMBNAILS START === */

/*
 * Keep New Product media behavior identical to Edit Product:
 *
 * - original product image remains untouched
 * - one lightweight storefront WebP is generated once
 * - storefront cards/pages can request the smaller derivative
 * - thumbnail failure never invalidates an otherwise valid product
 */

const storefrontThumbnailMaximumSize = 640;
const storefrontThumbnailQuality = 80;
const storefrontThumbnailCacheControl = "31536000";

function storefrontThumbnailPath(storagePath: string) {
  const normalizedPath = String(storagePath ?? "").trim();

  if (!normalizedPath) {
    throw new Error("The image storage path is missing.");
  }

  const slashIndex = normalizedPath.lastIndexOf("/");

  const directory =
    slashIndex >= 0
      ? normalizedPath.slice(0, slashIndex)
      : "";

  const filename =
    slashIndex >= 0
      ? normalizedPath.slice(slashIndex + 1)
      : normalizedPath;

  const baseName =
    filename.replace(/\.[^.]+$/, "") || "image";

  const thumbnailFilename = `${baseName}.webp`;

  return directory
    ? `${directory}/storefront/${thumbnailFilename}`
    : `storefront/${thumbnailFilename}`;
}

async function createStorefrontThumbnail(
  input: Buffer | Uint8Array,
) {
  return sharp(input)
    .rotate()
    .resize({
      width: storefrontThumbnailMaximumSize,
      height: storefrontThumbnailMaximumSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: storefrontThumbnailQuality,
      alphaQuality: storefrontThumbnailQuality,
      smartSubsample: true,
    })
    .toBuffer();
}

async function tryUploadStorefrontThumbnail({
  supabase,
  sourceBytes,
  sourceStoragePath,
}: {
  supabase: any;
  sourceBytes: Buffer | Uint8Array;
  sourceStoragePath: string;
}) {
  try {
    const thumbnailPath =
      storefrontThumbnailPath(sourceStoragePath);

    const thumbnailBytes =
      await createStorefrontThumbnail(sourceBytes);

    const { error } = await supabase.storage
      .from("product-images")
      .upload(thumbnailPath, thumbnailBytes, {
        contentType: "image/webp",
        cacheControl: storefrontThumbnailCacheControl,
        upsert: true,
      });

    if (error) {
      console.error(
        "Storefront thumbnail upload failed:",
        thumbnailPath,
        error,
      );

      return null;
    }

    return thumbnailPath;
  } catch (error) {
    console.error(
      "Storefront thumbnail preparation failed:",
      sourceStoragePath,
      error,
    );

    return null;
  }
}

/* === ST NEW PRODUCT STOREFRONT THUMBNAILS END === */

const validImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maximumImageSize = 10 * 1024 * 1024;
const maximumImagesPerConfiguration = 15;

class ProductSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductSubmissionError";
  }
}

function redirectWithError(message: string): never {
  throw new ProductSubmissionError(message);
}

function isNextRedirectError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT"),
  );
}

function createSlug(name: string) {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseSlug}-${Date.now()}`;
}

function getFileExtension(file: File) {
  const extensionFromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extensionFromName) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

async function removeUploadedFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePaths: string[],
) {
  if (storagePaths.length === 0) {
    return;
  }

  await supabase.storage.from("product-images").remove(storagePaths);
}

async function createProductUnsafe(formData: FormData) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    redirect("/admin/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const subcategoryId = String(formData.get("subcategory_id") ?? "").trim();
  const brandId = String(formData.get("brand_id") ?? "").trim();
  const collectionId = String(formData.get("collection_id") ?? "").trim();

  const resolvedIntent = String(
    formData.get("resolved_intent") ?? formData.get("intent") ?? "draft",
  );

  const publishingIntent = resolvedIntent === "publish" ? "publish" : "draft";

  const variantsJson = String(formData.get("variants_json") ?? "[]");

  const imageMetadataJson = String(formData.get("image_metadata") ?? "[]");

  const directUploadedImagesJson = String(
    formData.get("direct_uploaded_images") ?? "[]",
  );

  const uploadedFiles = formData
    .getAll("product_images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  let isFeatured = formData.get("is_featured") === "on";
  let isTrending = formData.get("is_trending") === "on";
  let isNewArrival = formData.get("is_new_arrival") === "on";

  if (!name) {
    redirectWithError("Product name is required.");
  }

  if (!categoryId) {
    redirectWithError("Please select a category.");
  }

  let variants: VariantInput[];

  try {
    variants = JSON.parse(variantsJson) as VariantInput[];
  } catch {
    redirectWithError("The product configurations could not be processed.");
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    redirectWithError("Create at least one product configuration.");
  }

  const validStatuses: AvailabilityStatus[] = [
    "in_stock",
    "low_stock",
    "out_of_stock",
    "coming_soon",
  ];

  if (
    publishingIntent === "publish" &&
    variants.some(
      (variant) =>
        !validStatuses.includes(
          variant.availability_status as AvailabilityStatus,
        ),
    )
  ) {
    redirectWithError(
      "Choose customer availability for every configuration before publishing.",
    );
  }

  /*
   * Drafts are work in progress.
   *
   * Give unfinished draft configurations safe internal values so
   * the database can store them without pretending they are ready
   * for customers.
   *
   * Publishing remains strict.
   */
  if (publishingIntent === "draft") {
    variants = variants.map((variant, index) => ({
      ...variant,
      variant_name:
        String(variant.variant_name ?? "").trim() ||
        `Configuration ${index + 1}`,
      availability_status: validStatuses.includes(
        variant.availability_status as AvailabilityStatus,
      )
        ? variant.availability_status
        : "out_of_stock",
      stock_quantity:
        Number.isFinite(Number(variant.stock_quantity)) &&
        Number(variant.stock_quantity) >= 0
          ? Number(variant.stock_quantity)
          : 0,
      low_stock_threshold:
        Number.isFinite(Number(variant.low_stock_threshold)) &&
        Number(variant.low_stock_threshold) >= 0
          ? Number(variant.low_stock_threshold)
          : 0,
    }));
  }

  const usedConfigurationNames = new Set<string>();

  for (const variant of variants) {
    const configurationName = String(variant.variant_name ?? "").trim();

    if (!configurationName) {
      redirectWithError("Every product configuration must have a name.");
    }

    const normalizedConfigurationName = configurationName.toLowerCase();

    if (usedConfigurationNames.has(normalizedConfigurationName)) {
      redirectWithError(
        `Configuration ${configurationName} was added more than once.`,
      );
    }

    usedConfigurationNames.add(normalizedConfigurationName);

    if (!validStatuses.includes(variant.availability_status)) {
      redirectWithError(
        `Select a valid availability for ${configurationName}.`,
      );
    }

    if (
      typeof variant.attributes !== "object" ||
      variant.attributes === null ||
      Array.isArray(variant.attributes)
    ) {
      redirectWithError(
        `The technical attributes for ${configurationName} are invalid.`,
      );
    }

    const configurationRegularPrice = Number(variant.regular_price);

    const configurationSalePriceText =
      variant.sale_price === "" ||
      variant.sale_price === null ||
      variant.sale_price === undefined
        ? ""
        : String(variant.sale_price).trim();

    const configurationSalePrice =
      configurationSalePriceText === ""
        ? null
        : Number(configurationSalePriceText);

    /*
     * Live products must have real pricing for every exact
     * customer-purchasable configuration.
     *
     * Drafts may remain unfinished.
     */
    if (
      publishingIntent === "publish" &&
      variant.availability_status !== "coming_soon" &&
      (!Number.isFinite(configurationRegularPrice) ||
        configurationRegularPrice <= 0)
    ) {
      redirectWithError(
        `Enter a valid regular price for ${configurationName}.`,
      );
    }

    if (
      configurationSalePrice !== null &&
      (!Number.isFinite(configurationSalePrice) || configurationSalePrice < 0)
    ) {
      redirectWithError(`Enter a valid sale price for ${configurationName}.`);
    }

    if (
      configurationSalePrice !== null &&
      Number.isFinite(configurationRegularPrice) &&
      configurationRegularPrice > 0 &&
      configurationSalePrice >= configurationRegularPrice
    ) {
      redirectWithError(
        `The sale price for ${configurationName} must be lower than its regular price.`,
      );
    }

    const stockQuantity = Number(variant.stock_quantity);
    const lowStockThreshold = Number(variant.low_stock_threshold);

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      redirectWithError(
        `Enter a valid stock quantity for ${configurationName}.`,
      );
    }

    if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
      redirectWithError(
        `Enter a valid low-stock warning for ${configurationName}.`,
      );
    }
  }

  let directUploadedImages: DirectUploadedImage[];

  try {
    directUploadedImages = JSON.parse(
      directUploadedImagesJson,
    ) as DirectUploadedImage[];
  } catch {
    redirectWithError(
      "The directly uploaded image information could not be processed.",
    );
  }

  if (!Array.isArray(directUploadedImages)) {
    directUploadedImages = [];
  }

  /*
   * ==========================================================
   * CONFIGURATION-SAFE IMAGE ASSIGNMENT
   * ==========================================================
   *
   * The browser assigns images using the configuration's
   * stable client_id.
   *
   * Configuration names may be generated or edited AFTER a photo
   * has been assigned. Resolving the ID here, at final submission,
   * prevents images from silently losing their configuration.
   */
  const configurationNameByClientId = new Map(
    variants
      .map(
        (variant) =>
          [
            String(variant.client_id ?? "").trim(),
            String(variant.variant_name ?? "").trim(),
          ] as const,
      )
      .filter(([clientId, configurationName]) =>
        Boolean(clientId && configurationName),
      ),
  );

  directUploadedImages = directUploadedImages.map((image) => {
    const submittedIds = Array.isArray(image.configuration_ids)
      ? image.configuration_ids
      : image.configuration_id
        ? [image.configuration_id]
        : [];

    const configurationIds = Array.from(
      new Set(
        submittedIds
          .map((configurationId) => String(configurationId ?? "").trim())
          .filter(Boolean),
      ),
    );

    for (const configurationId of configurationIds) {
      if (!configurationNameByClientId.has(configurationId)) {
        redirectWithError(
          "A image is assigned to a configuration that could not be resolved. Reassign the image and try again.",
        );
      }
    }

    return {
      ...image,
      configuration_ids: configurationIds,
    };
  });

  /*
   * ==========================================================
   * MAXIMUM 15 IMAGES PER EXACT CONFIGURATION
   * ==========================================================
   *
   * There is intentionally no product-wide image limit.
   *
   * A image with no configuration_ids is Shared and is
   * therefore visible in every exact configuration gallery.
   * Shared images consequently count against every
   * configuration's 10-image allowance.
   *
   * A physical image assigned to several configurations
   * counts once in each of those galleries.
   */
  if (variants.length > 0 && directUploadedImages.length > 0) {
    const photographCountByConfiguration = new Map(
      variants.map((variant) => [String(variant.client_id ?? "").trim(), 0]),
    );

    for (const image of directUploadedImages) {
      const assignedConfigurationIds = Array.isArray(image.configuration_ids)
        ? image.configuration_ids
        : [];

      const affectedConfigurationIds =
        assignedConfigurationIds.length > 0
          ? assignedConfigurationIds
          : Array.from(photographCountByConfiguration.keys());

      for (const configurationId of affectedConfigurationIds) {
        const nextCount =
          (photographCountByConfiguration.get(configurationId) ?? 0) + 1;

        photographCountByConfiguration.set(configurationId, nextCount);

        if (nextCount > maximumImagesPerConfiguration) {
          const configurationName =
            configurationNameByClientId.get(configurationId) ||
            "this configuration";

          redirectWithError(
            `${configurationName} can have a maximum of ${maximumImagesPerConfiguration} images. Shared images count toward every configuration.`,
          );
        }
      }
    }
  }

  if (uploadedFiles.length > 0 && directUploadedImages.length > 0) {
    redirectWithError(
      "The images were submitted using two different upload methods. Please reload the page and try again.",
    );
  }

  const submittedImageCount =
    directUploadedImages.length > 0
      ? directUploadedImages.length
      : uploadedFiles.length;

  for (const file of uploadedFiles) {
    if (!validImageTypes.has(file.type)) {
      redirectWithError(
        `${file.name} is not supported. Use JPEG, PNG or WebP.`,
      );
    }

    if (file.size > maximumImageSize) {
      redirectWithError(`${file.name} is larger than 10 MB.`);
    }
  }

  let imageMetadata: ImageMetadata[];

  try {
    imageMetadata = JSON.parse(imageMetadataJson) as ImageMetadata[];
  } catch {
    redirectWithError("The image information could not be processed.");
  }

  if (!Array.isArray(imageMetadata)) {
    imageMetadata = [];
  }

  if (
    uploadedFiles.length > 0 &&
    imageMetadata.length !== uploadedFiles.length
  ) {
    redirectWithError(
      "The image order could not be processed. Please reselect the images.",
    );
  }

  const primaryImages =
    directUploadedImages.length > 0
      ? directUploadedImages.filter((image) => image.is_primary)
      : imageMetadata.filter((image) => image.is_primary);

  if (submittedImageCount > 0 && primaryImages.length !== 1) {
    redirectWithError("Select exactly one main product image.");
  }

  for (const image of directUploadedImages) {
    const storagePath = String(image.storage_path ?? "").trim();

    const contentType = String(image.content_type ?? "").trim();

    const originalName = String(image.original_name ?? "").trim();

    const size = Number(image.size);
    const position = Number(image.position);

    if (!storagePath || !storagePath.startsWith("temporary/")) {
      redirectWithError(
        "A directly uploaded image has an invalid temporary storage path.",
      );
    }

    if (!validImageTypes.has(contentType)) {
      redirectWithError(
        `${originalName || "A image"} is not supported. Use JPEG, PNG or WebP.`,
      );
    }

    if (!Number.isFinite(size) || size <= 0 || size > maximumImageSize) {
      redirectWithError(
        `${originalName || "A image"} has an invalid file size.`,
      );
    }

    if (
      !Number.isInteger(position) ||
      position < 0 ||
      position >= directUploadedImages.length
    ) {
      redirectWithError("The directly uploaded image order is invalid.");
    }
  }

  const directImagePositions = new Set(
    directUploadedImages.map((image) => Number(image.position)),
  );

  if (
    directUploadedImages.length > 0 &&
    directImagePositions.size !== directUploadedImages.length
  ) {
    redirectWithError(
      "The directly uploaded image order contains duplicate positions.",
    );
  }

  directUploadedImages.sort(
    (first, second) => first.position - second.position,
  );

  const status = publishingIntent === "publish" ? "published" : "draft";

  const allComingSoon = variants.every(
    (variant) => variant.availability_status === "coming_soon",
  );

  const hasAvailableConfiguration = variants.some(
    (variant) =>
      variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock",
  );

  let availability: "in_stock" | "out_of_stock" | "coming_soon";

  if (allComingSoon) {
    availability = "coming_soon";
  } else if (hasAvailableConfiguration) {
    availability = "in_stock";
  } else {
    availability = "out_of_stock";
  }

  /*
   * Out of Stock is an exclusive storefront state.
   *
   * Even if a stale browser form submits merchandising flags,
   * never persist Featured / Trending / New arrival on an
   * aggregate Out-of-Stock product.
   */
  if (availability === "out_of_stock") {
    isFeatured = false;
    isTrending = false;
    isNewArrival = false;
  }

  /*
   * Available live products still require at least one normal
   * store-placement choice.
   *
   * Out-of-Stock products are intentionally exempt because their
   * only storefront badge is Out of Stock.
   */
  if (
    publishingIntent === "publish" &&
    availability !== "out_of_stock" &&
    !isFeatured &&
    !isTrending &&
    !isNewArrival
  ) {
    redirectWithError(
      "Select at least one store placement before publishing: Featured, Trending or New arrival.",
    );
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name,
      slug: createSlug(name),
      description: description || null,
      category_id: categoryId,
      subcategory_id: subcategoryId || null,
      brand_id: brandId || null,
      collection_id: collectionId || null,
      status,
      availability,
      is_featured: isFeatured,
      is_trending: isTrending,
      is_new_arrival: isNewArrival,
    })
    .select("id")
    .single();

  if (productError || !product) {
    redirectWithError(
      productError?.message ?? "The product could not be created.",
    );
  }

  const variantsToInsert = variants.map((variant) => {
    const unavailable =
      variant.availability_status === "out_of_stock" ||
      variant.availability_status === "coming_soon";

    const configurationName = variant.variant_name.trim();

    return {
      product_id: product.id,

      // Temporary compatibility field for existing
      // cart/order code. Storefront terminology uses variant_name.
      size: configurationName,

      variant_name: configurationName,
      display_position: Number.isFinite(Number(variant.display_position))
        ? Math.max(0, Math.trunc(Number(variant.display_position)))
        : 0,
      attributes: variant.attributes ?? {},
      sku: variant.sku.trim() || null,
      barcode: String(variant.barcode ?? "").trim() || null,
      regular_price:
        Number.isFinite(Number(variant.regular_price)) &&
        Number(variant.regular_price) > 0
          ? Number(variant.regular_price)
          : 0,

      sale_price:
        Number.isFinite(Number(variant.regular_price)) &&
        Number(variant.regular_price) > 0 &&
        variant.sale_price !== "" &&
        variant.sale_price !== null &&
        variant.sale_price !== undefined
          ? Number(variant.sale_price)
          : null,
      stock_quantity: unavailable ? 0 : Number(variant.stock_quantity),
      low_stock_threshold: Number(variant.low_stock_threshold),
      availability_status: variant.availability_status,
    };
  });

  const { data: insertedVariants, error: variantsError } = await supabase
    .from("product_variants")
    .insert(variantsToInsert)
    .select("id, variant_name");

  if (variantsError || !insertedVariants) {
    await supabase.from("products").delete().eq("id", product.id);

    redirectWithError(
      variantsError?.message ??
        "The product configurations could not be created.",
    );
  }

  const persistedVariantIdByName = new Map(
    insertedVariants.map((variant): [string, string] => [
      String(variant.variant_name ?? "")
        .trim()
        .toLowerCase(),
      String(variant.id),
    ]),
  );

  const persistedVariantIdByClientId = new Map(
    variants
      .map((variant): [string, string] | null => {
        const clientId = String(variant.client_id ?? "").trim();

        const configurationName = String(variant.variant_name ?? "")
          .trim()
          .toLowerCase();

        const variantId = persistedVariantIdByName.get(configurationName);

        if (!clientId || !variantId) {
          return null;
        }

        return [clientId, variantId];
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );

  const uploadedStoragePaths: string[] = [];
  const insertedImageIds: string[] = [];

  const temporaryStoragePaths = directUploadedImages.map(
    (image) => image.storage_path,
  );

  try {
    const nextConfigurationPosition = new Map<string, number>();

    if (directUploadedImages.length > 0) {
      for (let index = 0; index < directUploadedImages.length; index += 1) {
        const image = directUploadedImages[index];

        const extension =
          image.storage_path
            .split(".")
            .pop()
            ?.toLowerCase()
            .replace(/[^a-z0-9]/g, "") || "jpg";

        const destinationPath =
          `${product.id}/` +
          `${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;

        const { error: moveError } = await supabase.storage
          .from("product-images")
          .move(image.storage_path, destinationPath);

        if (moveError) {
          throw new Error(moveError.message);
        }

        uploadedStoragePaths.push(destinationPath);

        /*
         * Generate the same lightweight storefront WebP used by
         * the existing-product image manager.
         *
         * The original file stays authoritative for the gallery.
         * This derivative exists only for fast storefront rendering.
         */
        try {
          const { data: permanentOriginal, error: downloadError } =
            await supabase.storage
              .from("product-images")
              .download(destinationPath);

          if (downloadError || !permanentOriginal) {
            console.error(
              "Storefront thumbnail source download failed:",
              destinationPath,
              downloadError,
            );
          } else {
            const permanentOriginalBytes = new Uint8Array(
              await permanentOriginal.arrayBuffer(),
            );

            const storefrontThumbnailStoragePath =
              await tryUploadStorefrontThumbnail({
                supabase,
                sourceBytes: permanentOriginalBytes,
                sourceStoragePath: destinationPath,
              });

            if (storefrontThumbnailStoragePath) {
              uploadedStoragePaths.push(
                storefrontThumbnailStoragePath,
              );
            }
          }
        } catch (error) {
          console.error(
            "Storefront thumbnail preparation failed:",
            destinationPath,
            error,
          );
        }

        const temporaryIndex = temporaryStoragePaths.indexOf(
          image.storage_path,
        );

        if (temporaryIndex !== -1) {
          temporaryStoragePaths.splice(temporaryIndex, 1);
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(destinationPath);

        const configurationClientIds = Array.from(
          new Set(
            (image.configuration_ids ?? [])
              .map((configurationId) => String(configurationId ?? "").trim())
              .filter(Boolean),
          ),
        );

        const configurationVariantIds = configurationClientIds.map(
          (configurationClientId) => {
            const variantId = persistedVariantIdByClientId.get(
              configurationClientId,
            );

            if (!variantId) {
              throw new Error(
                "A image configuration could not be resolved after creating the product configurations.",
              );
            }

            return variantId;
          },
        );

        /*
         * Legacy columns can truthfully represent only one
         * exact assignment.
         */
        const legacyVariantId =
          configurationVariantIds.length === 1
            ? configurationVariantIds[0]
            : null;

        const legacyVariantName =
          configurationClientIds.length === 1
            ? (configurationNameByClientId.get(configurationClientIds[0]) ??
              null)
            : null;

        const legacyVariantPosition = legacyVariantId
          ? (nextConfigurationPosition.get(legacyVariantId) ?? 0)
          : 0;

        const { data: insertedImage, error: imageInsertError } = await supabase
          .from("product_images")
          .insert({
            product_id: product.id,
            storage_path: destinationPath,
            image_url: publicUrlData.publicUrl,
            alt_text:
              String(image.alt_text ?? "").trim() ||
              `${name} image ${index + 1}`,
            position: index,
            is_primary: Boolean(image.is_primary),

            variant_id: legacyVariantId,
            variant_name: legacyVariantName,
            variant_position: legacyVariantPosition,
            is_variant_primary: Boolean(
              legacyVariantId && legacyVariantPosition === 0,
            ),
          })
          .select("id")
          .single();

        if (imageInsertError || !insertedImage) {
          throw new Error(
            imageInsertError?.message ?? "The image could not be saved.",
          );
        }

        insertedImageIds.push(insertedImage.id);

        /*
         * Zero rows = Shared.
         * One or more rows = exact configuration assignments.
         */
        const junctionRows = configurationVariantIds.map((variantId) => {
          const position = nextConfigurationPosition.get(variantId) ?? 0;

          return {
            image_id: insertedImage.id,
            variant_id: variantId,
            position,
            is_primary: position === 0,
          };
        });

        if (junctionRows.length > 0) {
          /*
           * Persist every configuration assignment for this image in one
           * database request instead of one sequential request per variant.
           *
           * Positions are calculated from the same authoritative map and
           * are advanced only after the entire insert succeeds.
           */
          const { error: junctionError } = await supabase
            .from("product_image_variants")
            .insert(junctionRows);

          if (junctionError) {
            throw new Error(junctionError.message);
          }

          for (const row of junctionRows) {
            nextConfigurationPosition.set(
              row.variant_id,
              row.position + 1,
            );
          }
        }
      }
    } else {
      /*
       * Legacy FormData uploads carry no exact configuration
       * assignments, therefore they are Shared images.
       */
      for (let index = 0; index < uploadedFiles.length; index += 1) {
        const file = uploadedFiles[index];
        const metadata = imageMetadata[index];
        const extension = getFileExtension(file);

        const storagePath =
          `${product.id}/` +
          `${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`;

        const fileBuffer = new Uint8Array(await file.arrayBuffer());

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(storagePath, fileBuffer, {
            contentType: file.type,
            cacheControl: "31536000",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedStoragePaths.push(storagePath);

        /*
         * Legacy Shared-image uploads also receive the same
         * lightweight storefront derivative.
         */
        const storefrontThumbnailStoragePath =
          await tryUploadStorefrontThumbnail({
            supabase,
            sourceBytes: fileBuffer,
            sourceStoragePath: storagePath,
          });

        if (storefrontThumbnailStoragePath) {
          uploadedStoragePaths.push(
            storefrontThumbnailStoragePath,
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(storagePath);

        const { data: insertedImage, error: imageInsertError } = await supabase
          .from("product_images")
          .insert({
            product_id: product.id,
            storage_path: storagePath,
            image_url: publicUrlData.publicUrl,
            alt_text:
              metadata?.alt_text?.trim() || `${name} image ${index + 1}`,
            position: index,
            is_primary: metadata?.is_primary ?? index === 0,

            variant_id: null,
            variant_name: null,
            variant_position: 0,
            is_variant_primary: false,
          })
          .select("id")
          .single();

        if (imageInsertError || !insertedImage) {
          throw new Error(
            imageInsertError?.message ?? "The image could not be saved.",
          );
        }

        insertedImageIds.push(insertedImage.id);
      }
    }
  } catch (error) {
    /*
     * Delete database images first.
     * Junction rows cascade automatically.
     */
    if (insertedImageIds.length > 0) {
      await supabase.from("product_images").delete().in("id", insertedImageIds);
    }

    await removeUploadedFiles(supabase, [
      ...uploadedStoragePaths,
      ...temporaryStoragePaths,
    ]);

    await supabase.from("products").delete().eq("id", product.id);

    const message =
      error instanceof Error
        ? error.message
        : "The images could not be uploaded.";

    redirectWithError(message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidateTag(SHOP_CATALOGUE_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_RECOMMENDATION_CACHE_TAG, "max");

  redirect(
    `/admin/products/${product.id}?saved=${
      publishingIntent === "publish" ? "published" : "draft"
    }`,
  );
}


export type CreateProductResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function createProduct(
  formData: FormData,
): Promise<CreateProductResult> {
  try {
    await createProductUnsafe(formData);

    return {
      ok: true,
    };
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (error instanceof ProductSubmissionError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    console.error(
      "Unexpected product creation failure:",
      error,
    );

    return {
      ok: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : "The product could not be saved. Your product editor has been kept intact.",
    };
  }
}
