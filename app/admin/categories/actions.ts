"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  processStoreImage,
} from "@/lib/stereophonie-v3/images/process-store-image";

const categoriesPath = "/admin/categories";

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
  redirect(`${categoriesPath}?${type}=${encodeURIComponent(message)}`);
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
    return "A category with this name or URL already exists.";
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

export async function createCategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  if (!name) {
    redirectWithMessage("error", "Category name is required.");
  }

  if (!slug) {
    redirectWithMessage(
      "error",
      "Enter a category name that can be used in a website URL.",
    );
  }

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    description: description || null,
    sort_order: parseSortOrder(formData),
    is_active: formData.get("is_active") === "on",
  });

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(categoriesPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");

  redirectWithMessage("success", "Category created successfully.");
}

export async function updateCategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  if (!categoryId) {
    redirectWithMessage("error", "Category could not be identified.");
  }

  if (!name || !slug) {
    redirectWithMessage("error", "Enter a valid category name.");
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      description: description || null,
      sort_order: parseSortOrder(formData),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(categoriesPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");

  redirectWithMessage("success", "Category updated successfully.");
}

export async function toggleCategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  const nextActive = String(formData.get("next_active") ?? "") === "true";

  if (!categoryId) {
    redirectWithMessage("error", "Category could not be identified.");
  }

  const { error } = await supabase
    .from("categories")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(categoriesPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");

  redirectWithMessage(
    "success",
    nextActive ? "Category activated." : "Category deactivated.",
  );
}

export async function deleteCategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  if (!categoryId) {
    redirectWithMessage("error", "Category could not be identified.");
  }

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("category_id", categoryId);

  if (countError) {
    redirectWithMessage("error", countError.message);
  }

  if ((count ?? 0) > 0) {
    redirectWithMessage(
      "error",
      "This category contains products. Move those products to another category before deleting it.",
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(categoriesPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");

  redirectWithMessage("success", "Category deleted successfully.");
}


function safeImageExtension(file: File) {
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };

  return mimeMap[file.type] ?? null;
}

function storagePathFromPublicUrl(value: string | null) {
  if (!value) {
    return null;
  }

  const marker = "/storage/v1/object/public/category-images/";

  const markerIndex = value.indexOf(marker);

  if (markerIndex < 0) {
    return null;
  }

  return decodeURIComponent(
    value.slice(markerIndex + marker.length),
  );
}

export async function updateCategoryHomepagePresentation(
  formData: FormData,
) {
  const supabase = await requireAdministrator();

  const categoryId = String(
    formData.get("category_id") ?? "",
  ).trim();

  if (!categoryId) {
    redirectWithMessage(
      "error",
      "Category could not be identified.",
    );
  }

  const showOnHomepage =
    formData.get("show_on_homepage") === "on";

  const { data: currentCategory, error: currentError } =
    await supabase
      .from("categories")
      .select("id, slug, image_url")
      .eq("id", categoryId)
      .single();

  if (currentError || !currentCategory) {
    redirectWithMessage(
      "error",
      "Category could not be loaded.",
    );
  }

  let nextImageUrl = currentCategory.image_url ?? null;

  const image = formData.get("wallpaper");

  if (
    image instanceof File &&
    image.size > 0
  ) {
    if (image.size > 10 * 1024 * 1024) {
      redirectWithMessage(
        "error",
        "Category wallpaper must be smaller than 10 MB.",
      );
    }

    const extension =
      safeImageExtension(image);

    if (!extension) {
      redirectWithMessage(
        "error",
        "Upload a JPG, PNG, WEBP or AVIF image.",
      );
    }

    const safeSlug =
      String(currentCategory.slug || categoryId)
        .replace(/[^a-z0-9-]/gi, "-")
        .toLowerCase();

    const objectPath =
      `${safeSlug}/${Date.now()}-${crypto.randomUUID()}.png`;

    let processedImage: Buffer;

    try {
      processedImage =
        await processStoreImage({
          input: Buffer.from(
            await image.arrayBuffer(),
          ),
          kind: "category",
        });
    } catch (error) {
      console.error(
        "Category image processing failed:",
        error,
      );

      redirectWithMessage(
        "error",
        "The category image could not be prepared. Please try another photograph.",
      );
    }

    const bytes =
      new Uint8Array(
        processedImage,
      );

    const { error: uploadError } =
      await supabase.storage
        .from("category-images")
        .upload(
          objectPath,
          bytes,
          {
            contentType:
              "image/png",
            cacheControl:
              "3600",
            upsert: false,
          },
        );

    if (uploadError) {
      redirectWithMessage(
        "error",
        `Wallpaper upload failed: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } =
      supabase.storage
        .from("category-images")
        .getPublicUrl(objectPath);

    nextImageUrl = publicUrlData.publicUrl;

    const oldStoragePath =
      storagePathFromPublicUrl(
        currentCategory.image_url ?? null,
      );

    if (oldStoragePath) {
      await supabase.storage
        .from("category-images")
        .remove([oldStoragePath]);
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({
      show_on_homepage: showOnHomepage,
      image_url: nextImageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) {
    redirectWithMessage(
      "error",
      friendlyDatabaseError(error.message),
    );
  }

  revalidatePath(categoriesPath);
  revalidatePath("/");
  revalidatePath("/shop");

  redirectWithMessage(
    "success",
    "Homepage category presentation updated.",
  );
}

export async function removeCategoryWallpaper(
  formData: FormData,
) {
  const supabase = await requireAdministrator();

  const categoryId = String(
    formData.get("category_id") ?? "",
  ).trim();

  if (!categoryId) {
    redirectWithMessage(
      "error",
      "Category could not be identified.",
    );
  }

  const { data: category, error: categoryError } =
    await supabase
      .from("categories")
      .select("image_url")
      .eq("id", categoryId)
      .single();

  if (categoryError || !category) {
    redirectWithMessage(
      "error",
      "Category could not be loaded.",
    );
  }

  const storagePath =
    storagePathFromPublicUrl(
      category.image_url ?? null,
    );

  if (storagePath) {
    await supabase.storage
      .from("category-images")
      .remove([storagePath]);
  }

  const { error } = await supabase
    .from("categories")
    .update({
      image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) {
    redirectWithMessage(
      "error",
      error.message,
    );
  }

  revalidatePath(categoriesPath);
  revalidatePath("/");

  redirectWithMessage(
    "success",
    "Category wallpaper removed.",
  );
}
