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
