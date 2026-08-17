"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type VariantInput = {
  variant_name: string;
  attributes: Record<string, string>;
  sku: string;
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
  original_name: string;
  content_type: string;
  size: number;
  position: number;
  alt_text: string;
  is_primary: boolean;
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

  const regularPrice = Number(formData.get("regular_price"));
  const salePriceText = String(formData.get("sale_price") ?? "").trim();

  const publishingIntent = String(formData.get("intent") ?? "draft");

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

  if (!name) {
    redirectWithError("Product name is required.");
  }

  if (!categoryId) {
    redirectWithError("Please select a category.");
  }

  if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
    redirectWithError("Enter a valid regular price greater than zero.");
  }

  const salePrice = salePriceText === "" ? null : Number(salePriceText);

  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
    redirectWithError("Enter a valid sale price.");
  }

  if (salePrice !== null && salePrice >= regularPrice) {
    redirectWithError("The sale price must be lower than the regular price.");
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
      attributes: variant.attributes ?? {},
      sku: variant.sku.trim() || null,
      regular_price: regularPrice,
      sale_price: salePrice,
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

  redirect(`/admin/products?created=${encodeURIComponent(status)}`);
}
