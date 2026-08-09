"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const homepageAdminPath = "/admin/homepage";

function redirectWithMessage(
  type: "success" | "error",
  message: string,
): never {
  redirect(`${homepageAdminPath}?${type}=${encodeURIComponent(message)}`);
}

function readRequiredText(
  formData: FormData,
  name: string,
  label: string,
  maximumLength = 500,
) {
  const value = String(formData.get(name) ?? "").trim();

  if (!value) {
    redirectWithMessage("error", `${label} is required.`);
  }

  return value.slice(0, maximumLength);
}

function readInternalHref(formData: FormData, name: string, label: string) {
  const value = readRequiredText(formData, name, label, 300);

  if (!value.startsWith("/") || value.startsWith("//")) {
    redirectWithMessage("error", `${label} must begin with one forward slash.`);
  }

  return value;
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

  return {
    supabase,
    userId,
  };
}

export async function updateHomepageSettings(formData: FormData) {
  const { supabase, userId } = await requireAdministrator();

  const heroProductId = String(formData.get("hero_product_id") ?? "").trim();

  const { error } = await supabase.from("homepage_settings").upsert(
    {
      id: "default",

      hero_eyebrow: readRequiredText(
        formData,
        "hero_eyebrow",
        "Hero eyebrow",
        120,
      ),

      hero_line_one: readRequiredText(
        formData,
        "hero_line_one",
        "Hero first line",
        80,
      ),

      hero_line_two: readRequiredText(
        formData,
        "hero_line_two",
        "Hero second line",
        80,
      ),

      hero_line_three: readRequiredText(
        formData,
        "hero_line_three",
        "Hero third line",
        80,
      ),

      hero_description: readRequiredText(
        formData,
        "hero_description",
        "Hero description",
        700,
      ),

      primary_button_label: readRequiredText(
        formData,
        "primary_button_label",
        "Primary button label",
        80,
      ),

      primary_button_href: readInternalHref(
        formData,
        "primary_button_href",
        "Primary button link",
      ),

      secondary_button_label: readRequiredText(
        formData,
        "secondary_button_label",
        "Secondary button label",
        80,
      ),

      secondary_button_href: readInternalHref(
        formData,
        "secondary_button_href",
        "Secondary button link",
      ),

      hero_product_id: heroProductId || null,

      products_eyebrow: readRequiredText(
        formData,
        "products_eyebrow",
        "Product-section eyebrow",
        120,
      ),

      products_heading: readRequiredText(
        formData,
        "products_heading",
        "Product-section heading",
        140,
      ),

      products_button_label: readRequiredText(
        formData,
        "products_button_label",
        "Product-section button label",
        80,
      ),

      products_button_href: readInternalHref(
        formData,
        "products_button_href",
        "Product-section button link",
      ),

      section_order: (() => {
        const requestedOrder = [
          String(formData.get("section_order_first") ?? ""),
          String(formData.get("section_order_second") ?? ""),
          String(formData.get("section_order_third") ?? ""),
        ];

        const allowedSections = ["products", "collections", "categories"];

        const isValid =
          requestedOrder.length === 3 &&
          requestedOrder.every((section) =>
            allowedSections.includes(section),
          ) &&
          new Set(requestedOrder).size === 3;

        if (!isValid) {
          throw new Error("Each homepage section must have a unique position.");
        }

        return requestedOrder;
      })(),

      products_enabled: formData.get("products_enabled") === "on",

      products_limit: (() => {
        const requestedLimit = Number.parseInt(
          String(formData.get("products_limit") ?? "4"),
          10,
        );

        if (requestedLimit === 8) {
          return 8;
        }

        if (requestedLimit === 12) {
          return 12;
        }

        return 4;
      })(),

      products_sort_mode: (() => {
        const requestedMode = String(formData.get("products_sort_mode") ?? "");

        if (
          requestedMode === "newest" ||
          requestedMode === "new_arrivals_first"
        ) {
          return requestedMode;
        }

        return "featured_first";
      })(),

      collections_enabled: formData.get("collections_enabled") === "on",

      collections_eyebrow: readRequiredText(
        formData,
        "collections_eyebrow",
        "Collections-section eyebrow",
        120,
      ),

      collections_heading: readRequiredText(
        formData,
        "collections_heading",
        "Collections-section heading",
        140,
      ),

      collections_button_label: readRequiredText(
        formData,
        "collections_button_label",
        "Collections-section button label",
        80,
      ),

      collections_button_href: readInternalHref(
        formData,
        "collections_button_href",
        "Collections-section button link",
      ),

      collections_auto_scroll_enabled:
        formData.get("collections_auto_scroll_enabled") === "on",

      collections_auto_scroll_speed: (() => {
        const value = String(
          formData.get("collections_auto_scroll_speed") ?? "normal",
        );

        return value === "slow" || value === "fast" ? value : "normal";
      })(),

      collections_limit: Math.max(
        1,
        Math.min(
          6,
          Number.parseInt(
            String(formData.get("collections_limit") ?? "6"),
            10,
          ) || 6,
        ),
      ),

      categories_enabled: formData.get("categories_enabled") === "on",

      categories_limit: Math.max(
        1,
        Math.min(
          12,
          Number.parseInt(
            String(formData.get("categories_limit") ?? "6"),
            10,
          ) || 6,
        ),
      ),

      categories_eyebrow: readRequiredText(
        formData,
        "categories_eyebrow",
        "Category-section eyebrow",
        120,
      ),

      categories_heading: readRequiredText(
        formData,
        "categories_heading",
        "Category-section heading",
        140,
      ),

      final_eyebrow: readRequiredText(
        formData,
        "final_eyebrow",
        "Final-section eyebrow",
        120,
      ),

      final_line_one: readRequiredText(
        formData,
        "final_line_one",
        "Final-section first line",
        120,
      ),

      final_line_two: readRequiredText(
        formData,
        "final_line_two",
        "Final-section second line",
        120,
      ),

      final_button_label: readRequiredText(
        formData,
        "final_button_label",
        "Final button label",
        80,
      ),

      final_button_href: readInternalHref(
        formData,
        "final_button_href",
        "Final button link",
      ),

      updated_at: new Date().toISOString(),

      updated_by: userId,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage("success", "Homepage settings saved successfully.");
}
