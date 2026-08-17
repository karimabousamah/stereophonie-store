"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const brandsPath = "/admin/brands";

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
  redirect(`${brandsPath}?${type}=${encodeURIComponent(message)}`);
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
    return "A brand with this name or URL already exists.";
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

export async function createBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  if (!name) {
    redirectWithMessage("error", "Brand name is required.");
  }

  if (!slug) {
    redirectWithMessage(
      "error",
      "Enter a brand name that can be used in a website URL.",
    );
  }

  const { error } = await supabase.from("brands").insert({
    name,
    slug,
    description: description || null,
    sort_order: parseSortOrder(formData),
    is_active: formData.get("is_active") === "on",
  });

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage("success", "Brand created successfully.");
}

export async function updateBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  const slug = slugify(name);

  if (!brandId) {
    redirectWithMessage("error", "Brand could not be identified.");
  }

  if (!name || !slug) {
    redirectWithMessage("error", "Enter a valid brand name.");
  }

  const { error } = await supabase
    .from("brands")
    .update({
      name,
      slug,
      description: description || null,
      sort_order: parseSortOrder(formData),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", brandId);

  if (error) {
    redirectWithMessage("error", friendlyDatabaseError(error.message));
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage("success", "Brand updated successfully.");
}

export async function toggleBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  const nextActive = String(formData.get("next_active") ?? "") === "true";

  if (!brandId) {
    redirectWithMessage("error", "Brand could not be identified.");
  }

  const { error } = await supabase
    .from("brands")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", brandId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage(
    "success",
    nextActive ? "Brand activated." : "Brand deactivated.",
  );
}

export async function deleteBrand(formData: FormData) {
  const supabase = await requireAdministrator();

  const brandId = String(formData.get("brand_id") ?? "").trim();

  if (!brandId) {
    redirectWithMessage("error", "Brand could not be identified.");
  }

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("brand_id", brandId);

  if (countError) {
    redirectWithMessage("error", countError.message);
  }

  if ((count ?? 0) > 0) {
    redirectWithMessage(
      "error",
      "This brand contains products. Move those products to another brand before deleting it.",
    );
  }

  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("id", brandId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath(brandsPath);
  revalidatePath("/admin/products");
  revalidatePath("/shop");

  redirectWithMessage("success", "Brand deleted successfully.");
}
