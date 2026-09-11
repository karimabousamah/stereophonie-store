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

      welcome_discount_enabled:
        formData.get("welcome_discount_enabled") === "on",

      welcome_discount_percentage: (() => {
        const requestedPercentage = Number.parseInt(
          String(formData.get("welcome_discount_percentage") ?? "10"),
          10,
        );

        if (
          !Number.isFinite(requestedPercentage) ||
          requestedPercentage < 1 ||
          requestedPercentage > 100
        ) {
          redirectWithMessage(
            "error",
            "First-order discount percentage must be between 1% and 100%.",
          );
        }

        return requestedPercentage;
      })(),

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

/* === ST HOMEPAGE HERO MEDIA ACTIONS START === */

const HOMEPAGE_HERO_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const HOMEPAGE_HERO_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

function homepageHeroMediaKind(file: File): "image" | "video" | null {
  const type = file.type.toLowerCase();

  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp" ||
    type === "image/avif"
  ) {
    return "image";
  }

  if (type === "video/mp4" || type === "video/webm") {
    return "video";
  }

  return null;
}

function homepageHeroVideoExtension(file: File) {
  const type = file.type.toLowerCase();

  if (type === "video/mp4") {
    return "mp4";
  }

  if (type === "video/webm") {
    return "webm";
  }

  return null;
}

function readHeroMediaId(formData: FormData) {
  const mediaId = String(formData.get("hero_media_id") ?? "").trim();

  if (!mediaId) {
    redirectWithMessage("error", "Hero media item could not be identified.");
  }

  return mediaId;
}

export async function uploadHomepageHeroMedia(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const mediaInput = formData.get("hero_media");

  if (!(mediaInput instanceof File) || mediaInput.size <= 0) {
    redirectWithMessage(
      "error",
      "Choose an image or video to add to the hero carousel.",
    );
  }

  const mediaType = homepageHeroMediaKind(mediaInput);

  if (!mediaType) {
    redirectWithMessage(
      "error",
      "Upload a JPG, PNG, WEBP, AVIF, MP4 or WEBM hero media file.",
    );
  }

  if (
    mediaType === "image" &&
    mediaInput.size > HOMEPAGE_HERO_IMAGE_MAX_BYTES
  ) {
    redirectWithMessage("error", "Hero images must be smaller than 10 MB.");
  }

  if (
    mediaType === "video" &&
    mediaInput.size > HOMEPAGE_HERO_VIDEO_MAX_BYTES
  ) {
    redirectWithMessage("error", "Hero videos must be smaller than 50 MB.");
  }

  const { data: lastRows, error: orderError } = await supabase
    .from("homepage_hero_media")
    .select("sort_order")
    .order("sort_order", {
      ascending: false,
    })
    .limit(1);

  if (orderError) {
    console.error("Hero media order lookup failed:", orderError);

    redirectWithMessage(
      "error",
      `Hero media could not be prepared: ${orderError.message}`,
    );
  }

  const nextSortOrder =
    typeof lastRows?.[0]?.sort_order === "number"
      ? lastRows[0].sort_order + 1
      : 0;

  let objectPath = "";

  if (mediaType === "image") {
    let processedImage: Buffer;

    try {
      processedImage = await processStoreImage({
        input: Buffer.from(await mediaInput.arrayBuffer()),
        kind: "category",
      });
    } catch (error) {
      console.error("Homepage hero carousel image processing failed:", error);

      redirectWithMessage(
        "error",
        "The hero carousel image could not be processed.",
      );
    }

    objectPath =
      `hero-media/${Date.now()}-${crypto.randomUUID()}.webp`;

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
  } else {
    const extension = homepageHeroVideoExtension(mediaInput);

    if (!extension) {
      redirectWithMessage(
        "error",
        "The selected hero video format is not supported.",
      );
    }

    objectPath =
      `hero-media/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const videoBytes = new Uint8Array(await mediaInput.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("homepage-images")
      .upload(objectPath, videoBytes, {
        contentType: mediaInput.type.toLowerCase(),
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      redirectWithMessage(
        "error",
        `Hero video upload failed: ${uploadError.message}`,
      );
    }
  }

  const { data: publicUrlData } = supabase.storage
    .from("homepage-images")
    .getPublicUrl(objectPath);

  const { error: insertError } = await supabase
    .from("homepage_hero_media")
    .insert({
      media_type: mediaType,
      media_url: publicUrlData.publicUrl,
      storage_path: objectPath,
      sort_order: nextSortOrder,
      is_active: true,
    });

  if (insertError) {
    const { error: cleanupError } = await supabase.storage
      .from("homepage-images")
      .remove([objectPath]);

    if (cleanupError) {
      console.error(
        "Hero media cleanup failed after database insert error:",
        cleanupError,
      );
    }

    redirectWithMessage(
      "error",
      `Hero media could not be saved: ${insertError.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage(
    "success",
    mediaType === "video"
      ? "Hero video added successfully."
      : "Hero image added successfully.",
  );
}

export async function moveHomepageHeroMedia(formData: FormData) {
  const { supabase } = await requireAdministrator();

  const combinedMove = String(
    formData.get("hero_media_move") ?? "",
  ).trim();

  const separatorIndex = combinedMove.lastIndexOf(":");

  const combinedId =
    separatorIndex > 0
      ? combinedMove.slice(0, separatorIndex).trim()
      : "";

  const combinedDirection =
    separatorIndex > 0
      ? combinedMove.slice(separatorIndex + 1).trim()
      : "";

  const mediaId =
    combinedId || readHeroMediaId(formData);

  const direction = (
    combinedDirection ||
    String(formData.get("direction") ?? "").trim()
  ).toLowerCase();

  if (direction !== "up" && direction !== "down") {
    redirectWithMessage(
      "error",
      "Hero media movement direction is invalid.",
    );
  }

  const { data: mediaRows, error: mediaError } = await supabase
    .from("homepage_hero_media")
    .select("id, sort_order")
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (mediaError) {
    redirectWithMessage(
      "error",
      `Hero media order could not be loaded: ${mediaError.message}`,
    );
  }

  const rows = mediaRows ?? [];

  const currentIndex = rows.findIndex((row) => row.id === mediaId);

  if (currentIndex < 0) {
    redirectWithMessage("error", "Hero media item was not found.");
  }

  const targetIndex =
    direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= rows.length) {
    redirectWithMessage(
      "success",
      "Hero media item is already at that edge of the carousel.",
    );
  }

  const current = rows[currentIndex];
  const target = rows[targetIndex];

  const currentOrder = current.sort_order;
  const targetOrder = target.sort_order;

  const temporarySortOrder =
    Math.max(
      ...rows.map((row) =>
        typeof row.sort_order === "number" ? row.sort_order : 0,
      ),
      0,
    ) + 1000;

  const { error: temporaryError } = await supabase
    .from("homepage_hero_media")
    .update({
      sort_order: temporarySortOrder,
    })
    .eq("id", current.id);

  if (temporaryError) {
    redirectWithMessage(
      "error",
      `Hero media could not be reordered: ${temporaryError.message}`,
    );
  }

  const { error: targetError } = await supabase
    .from("homepage_hero_media")
    .update({
      sort_order: currentOrder,
    })
    .eq("id", target.id);

  if (targetError) {
    await supabase
      .from("homepage_hero_media")
      .update({
        sort_order: currentOrder,
      })
      .eq("id", current.id);

    redirectWithMessage(
      "error",
      `Hero media could not be reordered: ${targetError.message}`,
    );
  }

  const { error: currentError } = await supabase
    .from("homepage_hero_media")
    .update({
      sort_order: targetOrder,
    })
    .eq("id", current.id);

  if (currentError) {
    console.error(
      "Hero media final reorder update failed:",
      currentError,
    );

    redirectWithMessage(
      "error",
      `Hero media could not be reordered: ${currentError.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage("success", "Hero media order updated.");
}

export async function deleteHomepageHeroMedia(
  mediaIdInput: string,
  _formData: FormData,
) {
  const { supabase } = await requireAdministrator();

  const mediaId = String(mediaIdInput ?? "").trim();

  if (!mediaId) {
    redirectWithMessage(
      "error",
      "Hero media item could not be identified.",
    );
  }

  const { data: mediaRow, error: mediaError } = await supabase
    .from("homepage_hero_media")
    .select("id, storage_path")
    .eq("id", mediaId)
    .single();

  if (mediaError || !mediaRow) {
    redirectWithMessage(
      "error",
      mediaError?.message ?? "Hero media item was not found.",
    );
  }

  const { error: deleteError } = await supabase
    .from("homepage_hero_media")
    .delete()
    .eq("id", mediaId);

  if (deleteError) {
    redirectWithMessage(
      "error",
      `Hero media could not be deleted: ${deleteError.message}`,
    );
  }

  if (mediaRow.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("homepage-images")
      .remove([mediaRow.storage_path]);

    if (storageError) {
      console.error(
        "Hero media storage cleanup failed:",
        storageError,
      );
    }
  }

  revalidatePath("/");
  revalidatePath(homepageAdminPath);

  redirectWithMessage("success", "Hero media deleted successfully.");
}

/* === ST HOMEPAGE HERO MEDIA ACTIONS END === */
