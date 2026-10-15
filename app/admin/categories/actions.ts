"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  SHOP_CATALOGUE_CACHE_TAG,
  STOREFRONT_CATEGORY_CACHE_TAG,
  STOREFRONT_RECOMMENDATION_CACHE_TAG,
} from "@/lib/storefront-cache-tags";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { processStoreImage } from "@/lib/stereophonie-v3/images/process-store-image";

const categoriesPath = "/admin/categories";
const SHOP_CATEGORY_FILTER_TAG =
  "storefront-shop-category-filters";

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

function isInlineCategoryMutation(
  formData: FormData,
) {
  return (
    String(
      formData.get("_st_category_inline") ?? "",
    ) === "1"
  );
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

  const name = String(
    formData.get("category_name") ??
      formData.get("name") ??
      "",
  ).trim();

  const description = String(
    formData.get("description") ?? "",
  ).trim();

  const slug = slugify(name);

  if (!name) {
    redirectWithMessage(
      "error",
      "Category name is required.",
    );
  }

  if (!slug) {
    redirectWithMessage(
      "error",
      "Enter a category name that can be used in a website URL.",
    );
  }

  const requestedHomepageTheme = String(
    formData.get("homepage_theme") ?? "light",
  )
    .trim()
    .toLowerCase();

  const homepageTheme =
    requestedHomepageTheme === "dark"
      ? "dark"
      : "light";

  const isActive =
    formData.get("is_active") === "on";

  const showOnHomepage =
    formData.get("show_on_homepage") === "on";

  let imageUrl: string | null = null;
  let uploadedObjectPath: string | null = null;

  const image =
    formData.get("wallpaper");

  if (
    image instanceof File &&
    image.size > 0
  ) {
    if (
      image.size >
      10 * 1024 * 1024
    ) {
      redirectWithMessage(
        "error",
        "Category wallpaper must be smaller than 10 MB.",
      );
    }

    if (!safeImageExtension(image)) {
      redirectWithMessage(
        "error",
        "Upload a JPG, PNG, WEBP or AVIF image.",
      );
    }

    uploadedObjectPath =
      `${slug}/` +
      `${Date.now()}-${crypto.randomUUID()}.webp`;

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

    const { error: uploadError } =
      await supabase.storage
        .from("category-images")
        .upload(
          uploadedObjectPath,
          new Uint8Array(
            processedImage,
          ),
          {
            contentType: "image/webp",
            cacheControl: "31536000",
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
        .getPublicUrl(
          uploadedObjectPath,
        );

    imageUrl =
      publicUrlData.publicUrl;
  }

  const { error } =
    await supabase
      .from("categories")
      .insert({
        name,
        slug,
        description:
          description || null,
        sort_order:
          parseSortOrder(formData),
        is_active:
          isActive,
        show_on_homepage:
          showOnHomepage,
        homepage_theme:
          homepageTheme,
        image_url:
          imageUrl,
      });

  if (error) {
    if (uploadedObjectPath) {
      await supabase.storage
        .from("category-images")
        .remove([
          uploadedObjectPath,
        ]);
    }

    redirectWithMessage(
      "error",
      friendlyDatabaseError(
        error.message,
      ),
    );
  }

  revalidatePath(categoriesPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  revalidateTag(
    SHOP_CATEGORY_FILTER_TAG,
    "max",
  );

  revalidateTag(
    SHOP_CATALOGUE_CACHE_TAG,
    "max",
  );

  revalidateTag(
    STOREFRONT_RECOMMENDATION_CACHE_TAG,
    "max",
  );

  revalidateTag(
    STOREFRONT_CATEGORY_CACHE_TAG,
    "max",
  );

  revalidatePath("/");

  /*
   * Categories V2 inline editor:
   * successful saves return to the mounted client instead
   * of navigating back to /admin/categories.
   */
  if (isInlineCategoryMutation(formData)) {
    return;
  }

  redirectWithMessage(
    "success",
    "Category created successfully.",
  );
}

export async function updateCategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const categoryId = String(
    formData.get("category_id") ?? "",
  ).trim();

  const name = String(
    formData.get("category_name") ?? "",
  ).trim();

  const description = String(
    formData.get("description") ?? "",
  ).trim();

  const slug = slugify(name);

  if (!categoryId) {
    redirectWithMessage(
      "error",
      "Category could not be identified.",
    );
  }

  if (!name || !slug) {
    redirectWithMessage(
      "error",
      "Enter a valid category name.",
    );
  }

  const requestedHomepageTheme = String(
    formData.get("homepage_theme") ?? "light",
  )
    .trim()
    .toLowerCase();

  const homepageTheme =
    requestedHomepageTheme === "dark" ? "dark" : "light";

  const showOnHomepage =
    formData.get("show_on_homepage") === "on";

  const {
    data: currentCategory,
    error: currentError,
  } = await supabase
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

  let nextImageUrl =
    currentCategory.image_url ?? null;

  let newObjectPath: string | null = null;

  const image = formData.get("wallpaper");

  if (image instanceof File && image.size > 0) {
    if (image.size > 10 * 1024 * 1024) {
      redirectWithMessage(
        "error",
        "Category wallpaper must be smaller than 10 MB.",
      );
    }

    if (!safeImageExtension(image)) {
      redirectWithMessage(
        "error",
        "Upload a JPG, PNG, WEBP or AVIF image.",
      );
    }

    const safeSlug = String(
      currentCategory.slug || categoryId,
    )
      .replace(/[^a-z0-9-]/gi, "-")
      .toLowerCase();

    newObjectPath =
      `${safeSlug}/` +
      `${Date.now()}-${crypto.randomUUID()}.webp`;

    let processedImage: Buffer;

    try {
      processedImage = await processStoreImage({
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

    const { error: uploadError } =
      await supabase.storage
        .from("category-images")
        .upload(
          newObjectPath,
          new Uint8Array(processedImage),
          {
            contentType: "image/webp",
            cacheControl: "31536000",
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
        .getPublicUrl(newObjectPath);

    nextImageUrl =
      publicUrlData.publicUrl;
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
      description: description || null,
      sort_order: parseSortOrder(formData),
      is_active:
        formData.get("is_active") === "on",
      show_on_homepage: showOnHomepage,
      homepage_theme: homepageTheme,
      image_url: nextImageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) {
    if (newObjectPath) {
      await supabase.storage
        .from("category-images")
        .remove([newObjectPath]);
    }

    redirectWithMessage(
      "error",
      friendlyDatabaseError(error.message),
    );
  }

  if (newObjectPath) {
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

  revalidatePath(categoriesPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidateTag(SHOP_CATEGORY_FILTER_TAG, "max");
  revalidateTag(SHOP_CATALOGUE_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_RECOMMENDATION_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_CATEGORY_CACHE_TAG, "max");
  revalidatePath("/");

  /*
   * Categories V2 inline editor:
   * successful saves return to the mounted client instead
   * of navigating back to /admin/categories.
   */
  if (isInlineCategoryMutation(formData)) {
    return;
  }

  redirectWithMessage(
    "success",
    "Category updated successfully.",
  );
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
  revalidateTag(SHOP_CATEGORY_FILTER_TAG, "max");
  revalidateTag(SHOP_CATALOGUE_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_RECOMMENDATION_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_CATEGORY_CACHE_TAG, "max");
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
  revalidateTag(SHOP_CATEGORY_FILTER_TAG, "max");
  revalidateTag(SHOP_CATALOGUE_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_RECOMMENDATION_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_CATEGORY_CACHE_TAG, "max");
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

  return decodeURIComponent(value.slice(markerIndex + marker.length));
}

export async function updateCategoryHomepagePresentation(formData: FormData) {
  const supabase = await requireAdministrator();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  if (!categoryId) {
    redirectWithMessage("error", "Category could not be identified.");
  }

  const showOnHomepage = formData.get("show_on_homepage") === "on";

  const requestedHomepageTheme = String(
    formData.get("homepage_theme") ?? "light",
  )
    .trim()
    .toLowerCase();

  const homepageTheme = requestedHomepageTheme === "dark" ? "dark" : "light";

  const { data: currentCategory, error: currentError } = await supabase
    .from("categories")
    .select("id, slug, image_url")
    .eq("id", categoryId)
    .single();

  if (currentError || !currentCategory) {
    redirectWithMessage("error", "Category could not be loaded.");
  }

  let nextImageUrl = currentCategory.image_url ?? null;

  const image = formData.get("wallpaper");

  if (image instanceof File && image.size > 0) {
    if (image.size > 10 * 1024 * 1024) {
      redirectWithMessage(
        "error",
        "Category wallpaper must be smaller than 10 MB.",
      );
    }

    const extension = safeImageExtension(image);

    if (!extension) {
      redirectWithMessage("error", "Upload a JPG, PNG, WEBP or AVIF image.");
    }

    const safeSlug = String(currentCategory.slug || categoryId)
      .replace(/[^a-z0-9-]/gi, "-")
      .toLowerCase();

    const objectPath = `${safeSlug}/${Date.now()}-${crypto.randomUUID()}.webp`;

    let processedImage: Buffer;

    try {
      processedImage = await processStoreImage({
        input: Buffer.from(await image.arrayBuffer()),
        kind: "category",
      });
    } catch (error) {
      console.error("Category image processing failed:", error);

      redirectWithMessage(
        "error",
        "The category image could not be prepared. Please try another photograph.",
      );
    }

    const bytes = new Uint8Array(processedImage);

    const { error: uploadError } = await supabase.storage
      .from("category-images")
      .upload(objectPath, bytes, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      redirectWithMessage(
        "error",
        `Wallpaper upload failed: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("category-images")
      .getPublicUrl(objectPath);

    nextImageUrl = publicUrlData.publicUrl;

    const oldStoragePath = storagePathFromPublicUrl(
      currentCategory.image_url ?? null,
    );

    if (oldStoragePath) {
      await supabase.storage.from("category-images").remove([oldStoragePath]);
    }
  }

  const { error } = await supabase
    .from("categories")
    .update({
      show_on_homepage: showOnHomepage,
      homepage_theme: homepageTheme,
      image_url: nextImageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(categoriesPath);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidateTag(SHOP_CATEGORY_FILTER_TAG, "max");
  revalidateTag(SHOP_CATALOGUE_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_RECOMMENDATION_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_CATEGORY_CACHE_TAG, "max");

  redirectWithMessage("success", "Homepage category presentation updated.");
}

export async function removeCategoryWallpaper(formData: FormData) {
  const supabase = await requireAdministrator();

  const categoryId = String(formData.get("category_id") ?? "").trim();

  if (!categoryId) {
    redirectWithMessage("error", "Category could not be identified.");
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("image_url")
    .eq("id", categoryId)
    .single();

  if (categoryError || !category) {
    redirectWithMessage("error", "Category could not be loaded.");
  }

  const storagePath = storagePathFromPublicUrl(category.image_url ?? null);

  if (storagePath) {
    await supabase.storage.from("category-images").remove([storagePath]);
  }

  const { error } = await supabase
    .from("categories")
    .update({
      image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(categoriesPath);
  revalidatePath("/");

  redirectWithMessage("success", "Category wallpaper removed.");
}


function parseParentSubcategoryId(formData: FormData) {
  const value = String(formData.get("parent_subcategory_id") ?? "").trim();

  return value || null;
}

async function revalidateCategoryArchitecture() {
  revalidatePath(categoriesPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/api/storefront/header-categories");

  revalidateTag(SHOP_CATEGORY_FILTER_TAG, "max");
  revalidateTag(SHOP_CATALOGUE_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_RECOMMENDATION_CACHE_TAG, "max");
  revalidateTag(STOREFRONT_CATEGORY_CACHE_TAG, "max");
}

export async function createSubcategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const categoryId = String(formData.get("category_id") ?? "").trim();
  const parentSubcategoryId = parseParentSubcategoryId(formData);
  const name = String(formData.get("subcategory_name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slug = slugify(name);

  if (!categoryId) {
    redirectWithMessage("error", "Top-level category could not be identified.");
  }

  if (!name || !slug) {
    redirectWithMessage("error", "Enter a valid subcategory name.");
  }

  if (parentSubcategoryId) {
    const { data: parent, error: parentError } = await supabase
      .from("subcategories")
      .select("id, category_id")
      .eq("id", parentSubcategoryId)
      .single();

    if (parentError || !parent) {
      redirectWithMessage("error", "Parent subcategory could not be loaded.");
    }

    if (parent.category_id !== categoryId) {
      redirectWithMessage(
        "error",
        "The selected parent belongs to another top-level category.",
      );
    }
  }

  /*
   * Determine the next Order from siblings under this exact parent.
   *
   * Root-level children compete only with root-level children.
   * Nested children compete only with children of the same parent.
   */
  const siblingOrderQuery = supabase
    .from("subcategories")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", {
      ascending: false,
    })
    .limit(1);

  const {
    data: siblingOrderRows,
    error: siblingOrderError,
  } = parentSubcategoryId
    ? await siblingOrderQuery.eq(
        "parent_subcategory_id",
        parentSubcategoryId,
      )
    : await siblingOrderQuery.is(
        "parent_subcategory_id",
        null,
      );

  if (siblingOrderError) {
    redirectWithMessage(
      "error",
      "The next subcategory order could not be calculated.",
    );
  }

  const automaticSortOrder =
    Number(siblingOrderRows?.[0]?.sort_order ?? 0) + 1;

  const submittedSortOrder = Math.max(
    1,
    parseSortOrder(formData),
  );

  const suggestedSortOrder = Number(
    formData.get("suggested_sort_order"),
  );

  /*
   * If the administrator left the suggested value untouched,
   * use the freshly calculated server value.
   *
   * If they manually changed Order, preserve their value.
   */
  const sortOrder =
    Number.isInteger(suggestedSortOrder) &&
    suggestedSortOrder >= 1 &&
    submittedSortOrder !== suggestedSortOrder
      ? submittedSortOrder
      : automaticSortOrder;

  const { error } = await supabase.from("subcategories").insert({
    category_id: categoryId,
    parent_subcategory_id: parentSubcategoryId,
    name,
    slug,
    description: description || null,
    sort_order: sortOrder,
    is_active: formData.get("is_active") === "on",
  });

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  await revalidateCategoryArchitecture();

  /*
   * Categories V2 inline editor:
   * successful saves return to the mounted client instead
   * of navigating back to /admin/categories.
   */
  if (isInlineCategoryMutation(formData)) {
    return;
  }

  redirectWithMessage(
    "success",
    "Subcategory created successfully.",
  );
}

export async function updateSubcategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const subcategoryId = String(
    formData.get("subcategory_id") ?? "",
  ).trim();

  const name = String(
    formData.get("subcategory_name") ?? "",
  ).trim();

  const description = String(
    formData.get("description") ?? "",
  ).trim();

  const slug = slugify(name);

  if (!subcategoryId) {
    redirectWithMessage(
      "error",
      "Subcategory could not be identified.",
    );
  }

  if (!name || !slug) {
    redirectWithMessage(
      "error",
      "Enter a valid subcategory name.",
    );
  }

  const requestedHomepageTheme = String(
    formData.get("homepage_theme") ?? "light",
  )
    .trim()
    .toLowerCase();

  const homepageTheme =
    requestedHomepageTheme === "dark" ? "dark" : "light";

  const {
    data: current,
    error: currentError,
  } = await supabase
    .from("subcategories")
    .select("id, slug, image_url")
    .eq("id", subcategoryId)
    .single();

  if (currentError || !current) {
    redirectWithMessage(
      "error",
      "Subcategory could not be loaded.",
    );
  }

  let nextImageUrl =
    current.image_url ?? null;

  let newObjectPath: string | null = null;

  const image =
    formData.get("wallpaper");

  if (image instanceof File && image.size > 0) {
    if (image.size > 10 * 1024 * 1024) {
      redirectWithMessage(
        "error",
        "Subcategory wallpaper must be smaller than 10 MB.",
      );
    }

    if (!safeImageExtension(image)) {
      redirectWithMessage(
        "error",
        "Upload a JPG, PNG, WEBP or AVIF image.",
      );
    }

    const safeSlug = String(
      current.slug || subcategoryId,
    )
      .replace(/[^a-z0-9-]/gi, "-")
      .toLowerCase();

    newObjectPath =
      `subcategories/${safeSlug}/` +
      `${Date.now()}-${crypto.randomUUID()}.webp`;

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
        "Subcategory image processing failed:",
        error,
      );

      redirectWithMessage(
        "error",
        "The subcategory image could not be prepared. Please try another photograph.",
      );
    }

    const { error: uploadError } =
      await supabase.storage
        .from("category-images")
        .upload(
          newObjectPath,
          new Uint8Array(processedImage),
          {
            contentType: "image/webp",
            cacheControl: "31536000",
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
        .getPublicUrl(newObjectPath);

    nextImageUrl =
      publicUrlData.publicUrl;
  }

  const updatePayload = {
    name,
    slug,
    description: description || null,
    sort_order: parseSortOrder(formData),
    is_active:
      formData.get("is_active") === "on",
    image_url: nextImageUrl,
    homepage_theme: homepageTheme,
    updated_at: new Date().toISOString(),
  };

  let { error } = await (
    supabase.from("subcategories") as any
  )
    .update(updatePayload)
    .eq("id", subcategoryId);

  if (
    error &&
    String(error.message ?? "")
      .toLowerCase()
      .includes("homepage_theme")
  ) {
    const fallback =
      await supabase
        .from("subcategories")
        .update({
          name,
          slug,
          description: description || null,
          sort_order: parseSortOrder(formData),
          is_active:
            formData.get("is_active") === "on",
          image_url: nextImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subcategoryId);

    error = fallback.error;
  }

  if (error) {
    if (newObjectPath) {
      await supabase.storage
        .from("category-images")
        .remove([newObjectPath]);
    }

    redirectWithMessage(
      "error",
      friendlyDatabaseError(error.message),
    );
  }

  if (newObjectPath) {
    const oldStoragePath =
      storagePathFromPublicUrl(
        current.image_url ?? null,
      );

    if (oldStoragePath) {
      await supabase.storage
        .from("category-images")
        .remove([oldStoragePath]);
    }
  }

  await revalidateCategoryArchitecture();

  /*
   * Categories V2 inline editor:
   * successful saves return to the mounted client instead
   * of navigating back to /admin/categories.
   */
  if (isInlineCategoryMutation(formData)) {
    return;
  }

  redirectWithMessage(
    "success",
    "Subcategory updated successfully.",
  );
}

export async function toggleSubcategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const subcategoryId = String(formData.get("subcategory_id") ?? "").trim();
  const nextActive = String(formData.get("next_active") ?? "") === "true";

  if (!subcategoryId) {
    redirectWithMessage("error", "Subcategory could not be identified.");
  }

  const { error } = await supabase
    .from("subcategories")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subcategoryId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  await revalidateCategoryArchitecture();

  redirectWithMessage(
    "success",
    nextActive ? "Subcategory activated." : "Subcategory deactivated.",
  );
}

export async function deleteSubcategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const subcategoryId = String(formData.get("subcategory_id") ?? "").trim();

  if (!subcategoryId) {
    redirectWithMessage("error", "Subcategory could not be identified.");
  }

  const [{ count: productCount, error: productError }, { count: childCount, error: childError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("subcategory_id", subcategoryId),

      supabase
        .from("subcategories")
        .select("id", { count: "exact", head: true })
        .eq("parent_subcategory_id", subcategoryId),
    ]);

  if (productError) {
    redirectWithMessage("error", productError.message);
  }

  if (childError) {
    redirectWithMessage("error", childError.message);
  }

  if ((productCount ?? 0) > 0) {
    redirectWithMessage(
      "error",
      "This subcategory contains products. Reassign those products before deleting it.",
    );
  }

  if ((childCount ?? 0) > 0) {
    redirectWithMessage(
      "error",
      "This subcategory contains child categories. Move or delete those children first.",
    );
  }

  const { data: current, error: currentError } = await supabase
    .from("subcategories")
    .select("image_url")
    .eq("id", subcategoryId)
    .single();

  if (currentError || !current) {
    redirectWithMessage("error", "Subcategory could not be loaded.");
  }

  const storagePath = storagePathFromPublicUrl(current.image_url ?? null);

  const { error } = await supabase
    .from("subcategories")
    .delete()
    .eq("id", subcategoryId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  if (storagePath) {
    await supabase.storage.from("category-images").remove([storagePath]);
  }

  await revalidateCategoryArchitecture();

  redirectWithMessage("success", "Subcategory deleted successfully.");
}

export async function updateSubcategoryWallpaper(formData: FormData) {
  const supabase = await requireAdministrator();

  const subcategoryId = String(
    formData.get("subcategory_id") ?? "",
  ).trim();

  if (!subcategoryId) {
    redirectWithMessage(
      "error",
      "Subcategory could not be identified.",
    );
  }

  const requestedHomepageTheme = String(
    formData.get("homepage_theme") ?? "light",
  )
    .trim()
    .toLowerCase();

  const homepageTheme =
    requestedHomepageTheme === "dark" ? "dark" : "light";

  const { data: current, error: currentError } = await supabase
    .from("subcategories")
    .select("id, slug, image_url")
    .eq("id", subcategoryId)
    .single();

  if (currentError || !current) {
    redirectWithMessage(
      "error",
      "Subcategory could not be loaded.",
    );
  }

  let nextImageUrl = current.image_url ?? null;
  let newObjectPath: string | null = null;

  const image = formData.get("wallpaper");

  if (image instanceof File && image.size > 0) {
    if (image.size > 10 * 1024 * 1024) {
      redirectWithMessage(
        "error",
        "Subcategory wallpaper must be smaller than 10 MB.",
      );
    }

    if (!safeImageExtension(image)) {
      redirectWithMessage(
        "error",
        "Upload a JPG, PNG, WEBP or AVIF image.",
      );
    }

    const safeSlug = String(current.slug || subcategoryId)
      .replace(/[^a-z0-9-]/gi, "-")
      .toLowerCase();

    newObjectPath =
      `subcategories/${safeSlug}/` +
      `${Date.now()}-${crypto.randomUUID()}.webp`;

    let processedImage: Buffer;

    try {
      processedImage = await processStoreImage({
        input: Buffer.from(await image.arrayBuffer()),
        kind: "category",
      });
    } catch (error) {
      console.error(
        "Subcategory image processing failed:",
        error,
      );

      redirectWithMessage(
        "error",
        "The subcategory image could not be prepared. Please try another photograph.",
      );
    }

    const { error: uploadError } = await supabase.storage
      .from("category-images")
      .upload(
        newObjectPath,
        new Uint8Array(processedImage),
        {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        },
      );

    if (uploadError) {
      redirectWithMessage(
        "error",
        `Wallpaper upload failed: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("category-images")
      .getPublicUrl(newObjectPath);

    nextImageUrl = publicUrlData.publicUrl;
  }

  const updatePayload = {
    image_url: nextImageUrl,
    homepage_theme: homepageTheme,
    updated_at: new Date().toISOString(),
  };

  let { error } = await (
    supabase.from("subcategories") as any
  )
    .update(updatePayload)
    .eq("id", subcategoryId);

  // Migration compatibility:
  // until homepage_theme exists remotely, keep wallpaper
  // functionality operational rather than breaking the page.
  if (
    error &&
    String(error.message ?? "")
      .toLowerCase()
      .includes("homepage_theme")
  ) {
    const fallback = await supabase
      .from("subcategories")
      .update({
        image_url: nextImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subcategoryId);

    error = fallback.error;
  }

  if (error) {
    if (newObjectPath) {
      await supabase.storage
        .from("category-images")
        .remove([newObjectPath]);
    }

    redirectWithMessage(
      "error",
      friendlyDatabaseError(error.message),
    );
  }

  if (newObjectPath) {
    const oldStoragePath = storagePathFromPublicUrl(
      current.image_url ?? null,
    );

    if (oldStoragePath) {
      await supabase.storage
        .from("category-images")
        .remove([oldStoragePath]);
    }
  }

  await revalidateCategoryArchitecture();

  redirectWithMessage(
    "success",
    "Subcategory presentation updated.",
  );
}

export async function removeSubcategoryWallpaper(formData: FormData) {
  const supabase = await requireAdministrator();

  const subcategoryId = String(formData.get("subcategory_id") ?? "").trim();

  if (!subcategoryId) {
    redirectWithMessage("error", "Subcategory could not be identified.");
  }

  const { data: current, error: currentError } = await supabase
    .from("subcategories")
    .select("image_url")
    .eq("id", subcategoryId)
    .single();

  if (currentError || !current) {
    redirectWithMessage("error", "Subcategory could not be loaded.");
  }

  const { error } = await supabase
    .from("subcategories")
    .update({
      image_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subcategoryId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  const storagePath = storagePathFromPublicUrl(current.image_url ?? null);

  if (storagePath) {
    await supabase.storage.from("category-images").remove([storagePath]);
  }

  await revalidateCategoryArchitecture();

  redirectWithMessage("success", "Subcategory wallpaper removed.");
}

// STEREOPHONIE MOVIES SERIES CATEGORY ACTION START

export async function createMoviesSeriesCategory(formData: FormData) {
  const supabase = await requireAdministrator();

  const requestedOrder = Number(formData.get("sort_order") ?? 20);

  const sortOrder =
    Number.isInteger(requestedOrder) && requestedOrder >= 0
      ? requestedOrder
      : 20;

  /*
   * Search for any existing version first.
   * This makes the action safe to run multiple times.
   */
  const { data: existingRows, error: lookupError } = await supabase
    .from("categories")
    .select(
      `
          id,
          name,
          slug
        `,
    )
    .in("slug", [
      "movies-series",
      "movies-and-series",
      "films-series",
      "films-and-series",
    ])
    .limit(1);

  if (lookupError) {
    redirectWithMessage(
      "error",
      `Movies & Series could not be checked: ${lookupError.message}`,
    );
  }

  const existing = existingRows?.[0] ?? null;

  /*
   * IMPORTANT:
   * Only use category columns already present in the
   * Stereophonie database.
   */
  const categoryData = {
    name: "Movies & Series",

    slug: "movies-series",

    description:
      "Movies and series sourcing through Stereophonie. Browse featured entertainment, preview trailers and request availability and pricing directly through WhatsApp.",

    sort_order: sortOrder,

    is_active: true,

    show_on_homepage: true,

    homepage_theme: "dark",
  };

  const result = existing?.id
    ? await supabase
        .from("categories")
        .update({
          ...categoryData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    : await supabase.from("categories").insert(categoryData);

  if (result.error) {
    redirectWithMessage("error", friendlyDatabaseError(result.error.message));
  }

  revalidatePath("/admin/categories");

  revalidatePath("/");

  revalidatePath("/movies-series");

  revalidatePath("/api/storefront/header-categories");

  redirectWithMessage(
    "success",
    existing
      ? "Movies & Series was repaired and enabled."
      : "Movies & Series category created successfully.",
  );
}

// STEREOPHONIE MOVIES SERIES CATEGORY ACTION END
