"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const collectionsPath = "/admin/collections";

const collectionImageBucket = "product-images";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const maximumImageSize = 10 * 1024 * 1024;

function getCollectionImage(formData: FormData) {
  const entry = formData.get("collection_image");

  if (!(entry instanceof File) || entry.size === 0) {
    return null;
  }

  if (!allowedImageTypes.has(entry.type)) {
    redirectWithMessage(
      "error",
      `${entry.name} is not supported. Use JPEG, PNG or WebP.`,
    );
  }

  if (entry.size > maximumImageSize) {
    redirectWithMessage("error", `${entry.name} is larger than 10 MB.`);
  }

  return entry;
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

async function uploadCollectionImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  collectionId: string,
  file: File,
) {
  const extension = getFileExtension(file);

  const storagePath =
    `collections/${collectionId}/` +
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const fileBytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(collectionImageBucket)
    .upload(storagePath, fileBytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(collectionImageBucket)
    .getPublicUrl(storagePath);

  return {
    storagePath,
    imageUrl: publicUrlData.publicUrl,
  };
}

async function removeCollectionImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string | null,
) {
  if (!storagePath) {
    return;
  }

  await supabase.storage.from(collectionImageBucket).remove([storagePath]);
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(`${collectionsPath}?${type}=${encodeURIComponent(message)}`);
}

function parseSortOrder(formData: FormData) {
  const value = Number(formData.get("sort_order") ?? 0);

  if (!Number.isInteger(value) || value < 0) {
    return 0;
  }

  return value;
}

function friendlyDatabaseError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "A collection with this name or URL already exists.";
  }

  return message;
}

async function requireAdministrator() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/admin/login");
  }

  const { data: administrator, error } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (error || !administrator?.is_active) {
    redirect("/admin/login");
  }

  return supabase;
}

export async function createCollection(formData: FormData) {
  const supabase = await requireAdministrator();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  const collectionImage = getCollectionImage(formData);

  if (!name) {
    redirectWithMessage("error", "Collection name is required.");
  }

  if (!slug) {
    redirectWithMessage(
      "error",
      "Enter a collection name that can be used in a website URL.",
    );
  }

  const { data: collection, error } = await supabase
    .from("collections")
    .insert({
      name,
      slug,
      description: description || null,
      sort_order: parseSortOrder(formData),
      is_featured: formData.get("is_featured") === "on",
      is_active: formData.get("is_active") === "on",
    })
    .select("id")
    .single();

  if (error || !collection) {
    redirectWithMessage(
      "error",
      friendlyDatabaseError(
        error?.message ?? "The collection could not be created.",
      ),
    );
  }

  if (collectionImage) {
    let uploadedStoragePath: string | null = null;

    try {
      const uploaded = await uploadCollectionImage(
        supabase,
        collection.id,
        collectionImage,
      );

      uploadedStoragePath = uploaded.storagePath;

      const { error: imageUpdateError } = await supabase
        .from("collections")
        .update({
          image_url: uploaded.imageUrl,
          storage_path: uploaded.storagePath,
        })
        .eq("id", collection.id);

      if (imageUpdateError) {
        throw new Error(imageUpdateError.message);
      }
    } catch (uploadError) {
      await removeCollectionImage(supabase, uploadedStoragePath);

      await supabase.from("collections").delete().eq("id", collection.id);

      redirectWithMessage(
        "error",
        uploadError instanceof Error
          ? uploadError.message
          : "The collection image could not be uploaded.",
      );
    }
  }

  revalidatePath(collectionsPath);
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");

  redirectWithMessage("success", "Collection created successfully.");
}

export async function updateCollection(formData: FormData) {
  const supabase = await requireAdministrator();

  const collectionId = String(formData.get("collection_id") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  const collectionImage = getCollectionImage(formData);

  if (!collectionId) {
    redirectWithMessage("error", "Collection could not be identified.");
  }

  if (!name || !slug) {
    redirectWithMessage("error", "Enter a valid collection name.");
  }

  const { data: existingCollection, error: existingCollectionError } =
    await supabase
      .from("collections")
      .select("storage_path")
      .eq("id", collectionId)
      .single();

  if (existingCollectionError) {
    redirectWithMessage("error", existingCollectionError.message);
  }

  let newImageUrl: string | undefined;

  let newStoragePath: string | undefined;

  if (collectionImage) {
    try {
      const uploaded = await uploadCollectionImage(
        supabase,
        collectionId,
        collectionImage,
      );

      newImageUrl = uploaded.imageUrl;

      newStoragePath = uploaded.storagePath;
    } catch (uploadError) {
      redirectWithMessage(
        "error",
        uploadError instanceof Error
          ? uploadError.message
          : "The collection image could not be uploaded.",
      );
    }
  }

  const collectionUpdate: {
    name: string;
    slug: string;
    description: string | null;
    sort_order: number;
    is_featured: boolean;
    is_active: boolean;
    updated_at: string;
    image_url?: string;
    storage_path?: string;
  } = {
    name,
    slug,
    description: description || null,
    sort_order: parseSortOrder(formData),
    is_featured: formData.get("is_featured") === "on",
    is_active: formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };

  if (newImageUrl && newStoragePath) {
    collectionUpdate.image_url = newImageUrl;

    collectionUpdate.storage_path = newStoragePath;
  }

  const { error } = await supabase
    .from("collections")
    .update(collectionUpdate)
    .eq("id", collectionId);

  if (error) {
    await removeCollectionImage(supabase, newStoragePath ?? null);

    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  if (
    newStoragePath &&
    existingCollection?.storage_path &&
    existingCollection.storage_path !== newStoragePath
  ) {
    await removeCollectionImage(supabase, existingCollection.storage_path);
  }

  revalidatePath(collectionsPath);
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");

  redirectWithMessage("success", "Collection updated successfully.");
}

export async function toggleCollection(formData: FormData) {
  const supabase = await requireAdministrator();

  const collectionId = String(formData.get("collection_id") ?? "").trim();

  const nextActive = String(formData.get("next_active") ?? "") === "true";

  if (!collectionId) {
    redirectWithMessage("error", "Collection could not be identified.");
  }

  const { error } = await supabase
    .from("collections")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(collectionsPath);
  revalidatePath("/");
  revalidatePath("/shop");

  redirectWithMessage(
    "success",
    nextActive ? "Collection activated." : "Collection deactivated.",
  );
}

export async function deleteCollection(formData: FormData) {
  const supabase = await requireAdministrator();

  const collectionId = String(formData.get("collection_id") ?? "").trim();

  if (!collectionId) {
    redirectWithMessage("error", "Collection could not be identified.");
  }

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("collection_id", collectionId);

  if (countError) {
    redirectWithMessage("error", countError.message);
  }

  if ((count ?? 0) > 0) {
    redirectWithMessage(
      "error",
      "This collection contains products. Remove or reassign those products before deleting it.",
    );
  }

  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(collectionsPath);
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");

  redirectWithMessage("success", "Collection deleted successfully.");
}
