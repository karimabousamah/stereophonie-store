"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
   * Stable browser-side configuration identity.
   */
  configuration_id?: string;
  original_name: string;
  content_type: string;
  size: number;
  position: number;
  alt_text: string;
  is_primary: boolean;
  variant_name?: string;
  variant_position?: number;
  is_variant_primary?: boolean;
};

const validImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maximumImageSize = 10 * 1024 * 1024;
const maximumImages = 10;

function redirectWithError(message: string): never {
  redirect(`/admin/products/new?error=${encodeURIComponent(message)}`);
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

export async function createProduct(formData: FormData) {
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
  const brandId = String(formData.get("brand_id") ?? "").trim();
  const collectionId = String(formData.get("collection_id") ?? "").trim();

  const resolvedIntent = String(
    formData.get("resolved_intent") ??
      formData.get("intent") ??
      "draft",
  );

  const publishingIntent =
    resolvedIntent === "publish" ? "publish" : "draft";

  const variantsJson = String(formData.get("variants_json") ?? "[]");

  const imageMetadataJson = String(formData.get("image_metadata") ?? "[]");

  const directUploadedImagesJson = String(
    formData.get("direct_uploaded_images") ?? "[]",
  );

  const uploadedFiles = formData
    .getAll("product_images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const isFeatured = formData.get("is_featured") === "on";
  const isTrending = formData.get("is_trending") === "on";
  const isNewArrival = formData.get("is_new_arrival") === "on";


  if (
    publishingIntent === "publish" &&
    !isFeatured &&
    !isTrending &&
    !isNewArrival
  ) {
    redirectWithError(
      "Select at least one store placement before publishing: Featured, Trending or New arrival.",
    );
  }

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

    const configurationRegularPrice =
      Number(variant.regular_price);

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
      (
        !Number.isFinite(configurationRegularPrice) ||
        configurationRegularPrice <= 0
      )
    ) {
      redirectWithError(
        `Enter a valid regular price for ${configurationName}.`,
      );
    }

    if (
      configurationSalePrice !== null &&
      (
        !Number.isFinite(configurationSalePrice) ||
        configurationSalePrice < 0
      )
    ) {
      redirectWithError(
        `Enter a valid sale price for ${configurationName}.`,
      );
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
      "The directly uploaded photograph information could not be processed.",
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
   * The browser assigns photographs using the configuration's
   * stable client_id.
   *
   * Configuration names may be generated or edited AFTER a photo
   * has been assigned. Resolving the ID here, at final submission,
   * prevents photographs from silently losing their configuration.
   */
  const configurationNameByClientId =
    new Map(
      variants
        .map((variant) => [
          String(
            variant.client_id ?? "",
          ).trim(),
          String(
            variant.variant_name ?? "",
          ).trim(),
        ] as const)
        .filter(
          ([clientId, configurationName]) =>
            Boolean(
              clientId &&
              configurationName,
            ),
        ),
    );

  directUploadedImages =
    directUploadedImages.map(
      (image) => {
        const configurationId =
          String(
            image.configuration_id ?? "",
          ).trim();

        if (!configurationId) {
          return {
            ...image,
            variant_name:
              String(
                image.variant_name ?? "",
              ).trim(),
          };
        }

        const resolvedConfigurationName =
          configurationNameByClientId.get(
            configurationId,
          );

        if (!resolvedConfigurationName) {
          redirectWithError(
            "A photograph is assigned to a configuration that could not be resolved. Reassign the photograph and try again.",
          );
        }

        return {
          ...image,
          variant_name:
            resolvedConfigurationName,
        };
      },
    );

  if (uploadedFiles.length > 0 && directUploadedImages.length > 0) {
    redirectWithError(
      "The photographs were submitted using two different upload methods. Please reload the page and try again.",
    );
  }

  const submittedImageCount =
    directUploadedImages.length > 0
      ? directUploadedImages.length
      : uploadedFiles.length;

  if (submittedImageCount > maximumImages) {
    redirectWithError(`Upload no more than ${maximumImages} photographs.`);
  }

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
    redirectWithError("The photograph information could not be processed.");
  }

  if (!Array.isArray(imageMetadata)) {
    imageMetadata = [];
  }

  if (
    uploadedFiles.length > 0 &&
    imageMetadata.length !== uploadedFiles.length
  ) {
    redirectWithError(
      "The photograph order could not be processed. Please reselect the images.",
    );
  }

  const primaryImages =
    directUploadedImages.length > 0
      ? directUploadedImages.filter((image) => image.is_primary)
      : imageMetadata.filter((image) => image.is_primary);

  if (submittedImageCount > 0 && primaryImages.length !== 1) {
    redirectWithError("Select exactly one main product photograph.");
  }

  for (const image of directUploadedImages) {
    const storagePath = String(image.storage_path ?? "").trim();

    const contentType = String(image.content_type ?? "").trim();

    const originalName = String(image.original_name ?? "").trim();

    const size = Number(image.size);
    const position = Number(image.position);

    if (!storagePath || !storagePath.startsWith("temporary/")) {
      redirectWithError(
        "A directly uploaded photograph has an invalid temporary storage path.",
      );
    }

    if (!validImageTypes.has(contentType)) {
      redirectWithError(
        `${originalName || "A photograph"} is not supported. Use JPEG, PNG or WebP.`,
      );
    }

    if (!Number.isFinite(size) || size <= 0 || size > maximumImageSize) {
      redirectWithError(
        `${originalName || "A photograph"} has an invalid file size.`,
      );
    }

    if (
      !Number.isInteger(position) ||
      position < 0 ||
      position >= directUploadedImages.length
    ) {
      redirectWithError("The directly uploaded photograph order is invalid.");
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
      "The directly uploaded photograph order contains duplicate positions.",
    );
  }

  directUploadedImages.sort(
    (first, second) => first.position - second.position,
  );

  const submittedConfigurationNames =
    new Set(
      variants
        .map((variant) =>
          String(
            variant.variant_name ?? "",
          ).trim(),
        )
        .filter(Boolean),
    );

  for (const image of directUploadedImages) {
    const imageVariantName =
      String(
        image.variant_name ?? "",
      ).trim();

    if (
      imageVariantName &&
      !submittedConfigurationNames.has(
        imageVariantName,
      )
    ) {
      redirectWithError(
        `The photograph assigned to "${imageVariantName}" no longer matches a product configuration. Reassign that photograph and try again.`,
      );
    }
  }

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

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name,
      slug: createSlug(name),
      description: description || null,
      category_id: categoryId,
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
      display_position:
        Number.isFinite(
          Number(
            variant.display_position,
          ),
        )
          ? Math.max(
              0,
              Math.trunc(
                Number(
                  variant.display_position,
                ),
              ),
            )
          : 0,
      attributes: variant.attributes ?? {},
      sku: variant.sku.trim() || null,
      regular_price:
        Number.isFinite(Number(variant.regular_price)) &&
        Number(variant.regular_price) > 0
          ? Number(variant.regular_price)
          : 0,

      sale_price:
        variant.sale_price === "" ||
        variant.sale_price === null ||
        variant.sale_price === undefined
          ? null
          : Number(variant.sale_price),
      stock_quantity: unavailable ? 0 : Number(variant.stock_quantity),
      low_stock_threshold: Number(variant.low_stock_threshold),
      availability_status: variant.availability_status,
    };
  });

  const { error: variantsError } = await supabase
    .from("product_variants")
    .insert(variantsToInsert);

  if (variantsError) {
    await supabase.from("products").delete().eq("id", product.id);

    redirectWithError(variantsError.message);
  }

  const uploadedStoragePaths: string[] = [];
  const temporaryStoragePaths = directUploadedImages.map(
    (image) => image.storage_path,
  );

  try {
    
  /*
   * Resolve the administrator-facing configuration name
   * to the newly-created stable product_variant UUID.
   *
   * variant_name remains stored temporarily for backwards
   * compatibility, but variant_id is now authoritative.
   */
  const {
    data: persistedVariantRows,
    error: persistedVariantRowsError,
  } = await supabase
    .from("product_variants")
    .select("id, variant_name")
    .eq("product_id", product.id);

  if (persistedVariantRowsError) {
    redirectWithError(
      persistedVariantRowsError.message,
    );
  }

  const persistedVariantIdByName =
    new Map(
      (persistedVariantRows ?? [])
        .map(
          (variant): [string, string] => [
            String(
              variant.variant_name ?? "",
            ).trim().toLowerCase(),
            String(variant.id),
          ],
        )
        .filter(
          ([name]) =>
            Boolean(name),
        ),
    );


const imageRows = [];

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

        const temporaryIndex = temporaryStoragePaths.indexOf(
          image.storage_path,
        );

        if (temporaryIndex !== -1) {
          temporaryStoragePaths.splice(temporaryIndex, 1);
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(destinationPath);

        imageRows.push({
          product_id: product.id,
          storage_path: destinationPath,
          image_url: publicUrlData.publicUrl,
          alt_text:
            String(image.alt_text ?? "").trim() ||
            `${name} photograph ${index + 1}`,
          position: index,
          is_primary: image.is_primary,
          variant_name:
            String(
              image.variant_name ?? "",
            ).trim() || null,

          variant_id:
            persistedVariantIdByName.get(
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
                  0,
              ) || 0,
            ),

          is_variant_primary:
            Boolean(
              image.is_variant_primary,
            ),
        });
      }
    } else {
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
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedStoragePaths.push(storagePath);

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(storagePath);

        imageRows.push({
          product_id: product.id,
          storage_path: storagePath,
          image_url: publicUrlData.publicUrl,
          alt_text:
            metadata?.alt_text?.trim() || `${name} photograph ${index + 1}`,
          position: index,
          is_primary: metadata?.is_primary ?? index === 0,
        });
      }
    }

    if (imageRows.length > 0) {
      const { error: imageRowsError } = await supabase
        .from("product_images")
        .insert(imageRows);

      if (imageRowsError) {
        throw new Error(imageRowsError.message);
      }
    }
  } catch (error) {
    await removeUploadedFiles(supabase, [
      ...uploadedStoragePaths,
      ...temporaryStoragePaths,
    ]);

    await supabase.from("products").delete().eq("id", product.id);

    const message =
      error instanceof Error
        ? error.message
        : "The photographs could not be uploaded.";

    redirectWithError(message);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/");

  redirect(
    publishingIntent === "draft"
      ? "/admin/products?filter=draft&saved=draft"
      : "/admin/products?filter=live&saved=published",
  );
}
