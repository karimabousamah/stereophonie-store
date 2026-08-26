"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { processStoreImage } from "@/lib/stereophonie-v3/images/process-store-image";

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

function safeHeroImageExtension(file: File) {
  const type = file.type.toLowerCase();

  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp" ||
    type === "image/avif"
  ) {
    return true;
  }

  return false;
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

export async function updateAnnouncementAppearance(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const rawMode = String(formData.get("announcement_background_mode") ?? "")
    .trim()
    .toLowerCase();

  let announcementBackgroundMode: "animated" | "still" | "none";

  if (rawMode === "animated") {
    announcementBackgroundMode = "animated";
  } else if (rawMode === "still") {
    announcementBackgroundMode = "still";
  } else if (rawMode === "none") {
    announcementBackgroundMode = "none";
  } else {
    redirectWithMessage(
      "error",
      "Please select a valid announcement background.",
    );
  }

  const { data, error } = await supabase
    .from("homepage_settings")
    .update({
      announcement_background_mode: announcementBackgroundMode,
    })
    .eq("id", "default")
    .select("announcement_background_mode")
    .single();

  if (error) {
    console.error("Announcement appearance update failed:", error);

    redirectWithMessage(
      "error",
      `Announcement appearance could not be saved: ${error.message}`,
    );
  }

  if (data?.announcement_background_mode !== announcementBackgroundMode) {
    console.error("Announcement background verification failed.", {
      requested: announcementBackgroundMode,
      saved: data?.announcement_background_mode,
    });

    redirectWithMessage(
      "error",
      "The announcement background did not save correctly. Please try again.",
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/homepage");

  const successLabel =
    announcementBackgroundMode === "animated"
      ? "Animated loader"
      : announcementBackgroundMode === "still"
        ? "Still mustard"
        : "No wallpaper";

  redirectWithMessage(
    "success",
    `${successLabel} announcement background saved successfully.`,
  );
}

export async function updateHomepageSettings(formData: FormData) {
  const { supabase, userId } = await requireAdministrator();

  const heroProductId = String(formData.get("hero_product_id") ?? "").trim();

  const removeHeroImage =
    String(formData.get("remove_hero_image") ?? "") === "1";

  const heroImageInput = formData.get("hero_image");

  const { data: existingHomepage } = await supabase
    .from("homepage_settings")
    .select("hero_image_url, hero_image_storage_path")
    .eq("id", "default")
    .maybeSingle();

  let heroImageUrl = existingHomepage?.hero_image_url ?? null;

  let heroImageStoragePath = existingHomepage?.hero_image_storage_path ?? null;

  if (removeHeroImage) {
    if (heroImageStoragePath) {
      await supabase.storage
        .from("homepage-images")
        .remove([heroImageStoragePath]);
    }

    heroImageUrl = null;
    heroImageStoragePath = null;
  }

  if (heroImageInput instanceof File && heroImageInput.size > 0) {
    if (heroImageInput.size > 10 * 1024 * 1024) {
      redirectWithMessage("error", "Hero image must be smaller than 10 MB.");
    }

    if (!safeHeroImageExtension(heroImageInput)) {
      redirectWithMessage(
        "error",
        "Upload a JPG, PNG, WEBP or AVIF hero image.",
      );
    }

    let processedImage: Buffer;

    try {
      processedImage = await processStoreImage({
        input: Buffer.from(await heroImageInput.arrayBuffer()),
        kind: "category",
      });
    } catch (error) {
      console.error("Homepage hero image processing failed:", error);

      redirectWithMessage("error", "The hero image could not be processed.");
    }

    const objectPath = `hero/${Date.now()}-${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await supabase.storage
      .from("homepage-images")
      .upload(objectPath, new Uint8Array(processedImage), {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      redirectWithMessage(
        "error",
        `Hero image upload failed: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("homepage-images")
      .getPublicUrl(objectPath);

    const previousPath = heroImageStoragePath;

    heroImageStoragePath = objectPath;

    heroImageUrl = publicUrlData.publicUrl;

    if (previousPath && previousPath !== objectPath) {
      await supabase.storage.from("homepage-images").remove([previousPath]);
    }
  }

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

      hero_image_url: heroImageUrl,
      hero_image_storage_path: heroImageStoragePath,

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

/* === ST HOMEPAGE ANNOUNCEMENTS ACTIONS START === */

function readAnnouncementText(
  formData: FormData,
  field: string,
  maximumLength: number,
) {
  return String(formData.get(field) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function readAnnouncementHref(formData: FormData, field: string) {
  const href = String(formData.get(field) ?? "").trim();

  if (!href) {
    return null;
  }

  if (href.startsWith("/") && !href.startsWith("//")) {
    return href.slice(0, 500);
  }

  try {
    const parsed = new URL(href);

    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return href.slice(0, 500);
    }
  } catch {
    // handled below
  }

  redirectWithMessage(
    "error",
    "Announcement links must be a website path or a valid http/https URL.",
  );
}

function readAnnouncementOrder(formData: FormData) {
  const value = Number(formData.get("sort_order") ?? 0);

  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.trunc(value);
}

export async function createHomepageAnnouncement(formData: FormData) {
  const { supabase, userId } = await requireAdministrator();

  const message = readAnnouncementText(formData, "message", 300);

  const linkLabel = readAnnouncementText(formData, "link_label", 80);

  const linkHref = readAnnouncementHref(formData, "link_href");

  if (!message) {
    redirectWithMessage("error", "Announcement text is required.");
  }

  if ((linkLabel && !linkHref) || (!linkLabel && linkHref)) {
    redirectWithMessage(
      "error",
      "Complete both the announcement link label and destination, or leave both empty.",
    );
  }

  const { error } = await supabase.from("homepage_announcements").insert({
    message,
    link_label: linkLabel || null,
    link_href: linkHref,
    is_active: formData.get("is_active") === "on",
    sort_order: readAnnouncementOrder(formData),
    created_by: userId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage("success", "Announcement created successfully.");
}

export async function updateHomepageAnnouncement(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const announcementId = String(formData.get("announcement_id") ?? "").trim();

  const message = readAnnouncementText(formData, "message", 300);

  const linkLabel = readAnnouncementText(formData, "link_label", 80);

  const linkHref = readAnnouncementHref(formData, "link_href");

  if (!announcementId) {
    redirectWithMessage("error", "Announcement could not be identified.");
  }

  if (!message) {
    redirectWithMessage("error", "Announcement text is required.");
  }

  if ((linkLabel && !linkHref) || (!linkLabel && linkHref)) {
    redirectWithMessage(
      "error",
      "Complete both the announcement link label and destination, or leave both empty.",
    );
  }

  const { error } = await supabase
    .from("homepage_announcements")
    .update({
      message,
      link_label: linkLabel || null,
      link_href: linkHref,
      is_active: formData.get("is_active") === "on",
      sort_order: readAnnouncementOrder(formData),
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage("success", "Announcement updated successfully.");
}

export async function toggleHomepageAnnouncement(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const announcementId = String(formData.get("announcement_id") ?? "").trim();

  const nextActive = String(formData.get("next_active") ?? "") === "true";

  if (!announcementId) {
    redirectWithMessage("error", "Announcement could not be identified.");
  }

  const { error } = await supabase
    .from("homepage_announcements")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage(
    "success",
    nextActive
      ? "Announcement activated."
      : "Announcement hidden from the storefront.",
  );
}

export async function deleteHomepageAnnouncement(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const announcementId = String(formData.get("announcement_id") ?? "").trim();

  if (!announcementId) {
    redirectWithMessage("error", "Announcement could not be identified.");
  }

  const { error } = await supabase
    .from("homepage_announcements")
    .delete()
    .eq("id", announcementId);

  if (error) {
    redirectWithMessage("error", error.message);
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage("success", "Announcement deleted successfully.");
}

/* === ST HOMEPAGE ANNOUNCEMENTS ACTIONS END === */
