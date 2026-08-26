"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type InlineBrandResult =
  | {
      ok: true;
      brand: {
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

export async function createBrandInline(
  rawName: string,
): Promise<InlineBrandResult> {
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
      error: "Enter a brand name.",
    };
  }

  if (name.length > 120) {
    return {
      ok: false,
      error: "Brand name is too long.",
    };
  }

  const slug = slugify(name);

  if (!slug) {
    return {
      ok: false,
      error: "Enter a valid brand name.",
    };
  }

  /*
   * Slug is the canonical duplicate key already used
   * by Admin → Brands.
   *
   * Apple, APPLE, " Apple " and Apple! therefore
   * resolve to the same canonical brand.
   */
  const { data: existingBrand, error: existingError } = await supabase
    .from("brands")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      error: existingError.message,
    };
  }

  if (existingBrand) {
    return {
      ok: true,
      brand: existingBrand,
      created: false,
    };
  }

  const { data: createdBrand, error: createError } = await supabase
    .from("brands")
    .insert({
      name,
      slug,
      description: null,
      sort_order: 0,
      is_active: true,
    })
    .select("id, name")
    .single();

  /*
   * Handle a race condition where another administrator
   * creates the same brand at essentially the same time.
   */
  if (createError || !createdBrand) {
    const { data: raceExisting } = await supabase
      .from("brands")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();

    if (raceExisting) {
      return {
        ok: true,
        brand: raceExisting,
        created: false,
      };
    }

    return {
      ok: false,
      error: createError?.message ?? "The brand could not be created.",
    };
  }

  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  return {
    ok: true,
    brand: createdBrand,
    created: true,
  };
}
