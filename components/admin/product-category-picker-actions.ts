"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type InlineCategoryResult =
  | {
      ok: true;
      category: {
        id: string;
        name: string;
      };
      created: boolean;
    }
  | {
      ok: false;
      error: string;
    };

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

async function requireAdministrator() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const { data: administrator, error } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (error || !administrator?.is_active) {
    return null;
  }

  return supabase;
}

export type InlineCategoryRenameResult =
  | {
      ok: true;
      category: {
        id: string;
        name: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export async function renameCategoryInline(
  categoryId: string,
  rawName: string,
): Promise<InlineCategoryRenameResult> {
  const supabase = await requireAdministrator();

  if (!supabase) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const id = categoryId.trim();
  const name = rawName.replace(/\s+/g, " ").trim();

  if (!id) {
    return {
      ok: false,
      error: "Category could not be identified.",
    };
  }

  if (!name) {
    return {
      ok: false,
      error: "Enter a category name.",
    };
  }

  if (name.length > 120) {
    return {
      ok: false,
      error: "Category name is too long.",
    };
  }

  const slug = slugify(name);

  if (!slug) {
    return {
      ok: false,
      error: "Enter a valid category name.",
    };
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", name)
    .neq("id", id)
    .limit(1)
    .maybeSingle();

  if (duplicateError) {
    return {
      ok: false,
      error: duplicateError.message,
    };
  }

  if (duplicate) {
    return {
      ok: false,
      error: "A category with this name already exists.",
    };
  }

  const { data: updatedCategory, error } = await supabase
    .from("categories")
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, name")
    .single();

  if (error || !updatedCategory) {
    return {
      ok: false,
      error: error?.message ?? "The category could not be renamed.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");

  return {
    ok: true,
    category: updatedCategory,
  };
}

export async function renameSubcategoryInline(
  subcategoryId: string,
  rawName: string,
): Promise<InlineCategoryRenameResult> {
  const supabase =
    await requireAdministrator();

  if (!supabase) {
    return {
      ok: false,
      error:
        "Administrator authentication is required.",
    };
  }

  const id =
    subcategoryId.trim();

  const name =
    rawName
      .replace(/\s+/g, " ")
      .trim();

  if (!id) {
    return {
      ok: false,
      error:
        "Subcategory could not be identified.",
    };
  }

  if (!name) {
    return {
      ok: false,
      error:
        "Enter a subcategory name.",
    };
  }

  if (name.length > 120) {
    return {
      ok: false,
      error:
        "Subcategory name is too long.",
    };
  }

  const slug =
    slugify(name);

  if (!slug) {
    return {
      ok: false,
      error:
        "Enter a valid subcategory name.",
    };
  }

  /*
   * Load the current hierarchy location so duplicate checking
   * is limited to this exact sibling directory.
   *
   * Example:
   *
   * Gaming
   *   Gaming Headsets
   *
   * Audio
   *   Headsets
   *
   * Similar names in unrelated branches are allowed.
   */
  const {
    data: currentSubcategory,
    error: currentError,
  } = await supabase
    .from("subcategories")
    .select(
      "id, category_id, parent_subcategory_id",
    )
    .eq("id", id)
    .single();

  if (
    currentError ||
    !currentSubcategory
  ) {
    return {
      ok: false,
      error:
        currentError?.message ??
        "The subcategory could not be loaded.",
    };
  }

  const duplicateQuery =
    supabase
      .from("subcategories")
      .select("id")
      .eq(
        "category_id",
        currentSubcategory.category_id,
      )
      .ilike("name", name)
      .neq("id", id)
      .limit(1);

  const {
    data: duplicate,
    error: duplicateError,
  } =
    currentSubcategory.parent_subcategory_id
      ? await duplicateQuery
          .eq(
            "parent_subcategory_id",
            currentSubcategory.parent_subcategory_id,
          )
          .maybeSingle()
      : await duplicateQuery
          .is(
            "parent_subcategory_id",
            null,
          )
          .maybeSingle();

  if (duplicateError) {
    return {
      ok: false,
      error:
        duplicateError.message,
    };
  }

  if (duplicate) {
    return {
      ok: false,
      error:
        "A subcategory with this name already exists in this directory.",
    };
  }

  /*
   * Match the existing Category inline-rename behavior:
   * change the display name while preserving the stored slug.
   *
   * This avoids unexpectedly changing Storefront URLs merely
   * because an administrator corrected a display name.
   */
  const {
    data: updatedSubcategory,
    error,
  } = await supabase
    .from("subcategories")
    .update({
      name,
    })
    .eq("id", id)
    .select("id, name")
    .single();

  if (
    error ||
    !updatedSubcategory
  ) {
    return {
      ok: false,
      error:
        error?.message ??
        "The subcategory could not be renamed.",
    };
  }

  /*
   * Refresh every surface that can display Category hierarchy
   * names without navigating the Product editor away.
   */
  revalidatePath(
    "/admin/categories",
  );

  revalidatePath(
    "/admin/products",
  );

  revalidatePath(
    "/shop",
  );

  revalidatePath(
    "/",
  );

  revalidatePath(
    "/api/storefront/header-categories",
  );

  return {
    ok: true,
    category: updatedSubcategory,
  };
}


export async function createCategoryInline(
  rawName: string,
): Promise<InlineCategoryResult> {
  const supabase = await requireAdministrator();

  if (!supabase) {
    return {
      ok: false,
      error: "Administrator authentication is required.",
    };
  }

  const name = rawName.replace(/\s+/g, " ").trim();

  if (!name) {
    return {
      ok: false,
      error: "Enter a category name.",
    };
  }

  if (name.length > 120) {
    return {
      ok: false,
      error: "Category name is too long.",
    };
  }

  const slug = slugify(name);

  if (!slug) {
    return {
      ok: false,
      error: "Enter a valid category name.",
    };
  }

  const { data: existingCategory, error: existingError } = await supabase
    .from("categories")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      error: existingError.message,
    };
  }

  if (existingCategory) {
    return {
      ok: true,
      category: existingCategory,
      created: false,
    };
  }

  const { data: createdCategory, error: createError } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      description: null,
      sort_order: 0,
      is_active: true,
      show_on_homepage: false,
    })
    .select("id, name")
    .single();

  if (createError || !createdCategory) {
    const { data: raceExisting } = await supabase
      .from("categories")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    if (raceExisting) {
      return {
        ok: true,
        category: raceExisting,
        created: false,
      };
    }

    return {
      ok: false,
      error: createError?.message ?? "The category could not be created.",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");

  return {
    ok: true,
    category: createdCategory,
    created: true,
  };
}
