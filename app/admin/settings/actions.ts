"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type SaveSettingsResult = {
  success: boolean;
  message: string;
};

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function readMoney(formData: FormData, name: string) {
  const value = Number(cleanText(formData.get(name)));

  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export async function saveStoreSettings(
  formData: FormData,
): Promise<SaveSettingsResult> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return {
      success: false,
      message: "Your administrator session has expired.",
    };
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("user_id", userId)
    .single();

  if (adminError || !admin?.is_active) {
    return {
      success: false,
      message: "You are not authorized to update store settings.",
    };
  }

  const storeName = cleanText(formData.get("store_name"));

  const supportEmail = cleanText(formData.get("support_email")).toLowerCase();

  const whatsappNumber = cleanText(formData.get("whatsapp_number"));

  const instagramHandle = cleanText(formData.get("instagram_handle"));

  const deliveryEstimate = cleanText(formData.get("delivery_estimate"));

  const deliveryCountry = cleanText(formData.get("delivery_country"));

  const orderPrefix = cleanText(formData.get("order_prefix")).toUpperCase();

  const assistantModel = cleanText(formData.get("assistant_model"));

  const assistantLanguages = cleanText(formData.get("assistant_languages"));

  const assistantWelcomeMessage = cleanText(
    formData.get("assistant_welcome_message"),
  );

  const storeStatus = cleanText(formData.get("store_status"));

  const maintenanceMessage = cleanText(formData.get("maintenance_message"));

  if (
    !storeName ||
    !supportEmail ||
    !whatsappNumber ||
    !deliveryEstimate ||
    !deliveryCountry ||
    !orderPrefix
  ) {
    return {
      success: false,
      message: "Complete all required store and delivery fields.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    return {
      success: false,
      message: "Enter a valid support email address.",
    };
  }

  if (!["operational", "maintenance", "closed"].includes(storeStatus)) {
    return {
      success: false,
      message: "The selected store status is invalid.",
    };
  }

  const payload = {
    id: "default",

    store_name: storeName,
    support_email: supportEmail,
    whatsapp_number: whatsappNumber,
    instagram_handle: instagramHandle,

    delivery_fee: readMoney(formData, "delivery_fee"),

    free_delivery_threshold: readMoney(formData, "free_delivery_threshold"),

    delivery_estimate: deliveryEstimate,

    delivery_country: deliveryCountry,

    cod_enabled: readBoolean(formData, "cod_enabled"),

    order_prefix: orderPrefix,

    order_confirmation_emails_enabled: readBoolean(
      formData,
      "order_confirmation_emails_enabled",
    ),

    stock_alert_emails_enabled: readBoolean(
      formData,
      "stock_alert_emails_enabled",
    ),

    assistant_enabled: readBoolean(formData, "assistant_enabled"),

    assistant_model: assistantModel || "qwen3:8b",

    assistant_languages: assistantLanguages || "English, French, Arabic",

    assistant_welcome_message: assistantWelcomeMessage,

    store_status: storeStatus,

    maintenance_message: maintenanceMessage,

    updated_at: new Date().toISOString(),

    updated_by: userId,
  };

  const { error } = await supabase.from("store_settings").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    console.error("Store settings update failed:", error);

    const migrationMissing = error.message
      .toLowerCase()
      .includes("store_settings");

    return {
      success: false,
      message: migrationMissing
        ? "The store settings database migration has not been applied yet."
        : error.message || "Store settings could not be saved.",
    };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");

  return {
    success: true,
    message: "Store settings saved successfully.",
  };
}
