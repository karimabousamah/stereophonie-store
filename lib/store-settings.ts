import { createAdminClient } from "@/lib/supabase/admin";

export type PublicStoreSettings = {
  storeName: string;
  supportEmail: string;
  whatsappNumber: string;
  instagramHandle: string;

  deliveryFee: number;
  freeDeliveryThreshold: number;
  deliveryEstimate: string;
  deliveryCountry: string;

  codEnabled: boolean;
  orderPrefix: string;

  assistantEnabled: boolean;
  assistantWelcomeMessage: string;

  storeStatus: "operational" | "maintenance" | "closed";

  maintenanceMessage: string;
};

export const defaultPublicStoreSettings: PublicStoreSettings = {
  storeName: "Stereophonie",
  supportEmail: "info@stereophonie.com",
  whatsappNumber: "+961 3 161 285",
  instagramHandle: "@stereophoniestore",

  deliveryFee: 5,
  freeDeliveryThreshold: 150,
  deliveryEstimate: "3–4 working days",
  deliveryCountry: "Lebanon",

  codEnabled: true,
  orderPrefix: "STER",

  assistantEnabled: true,
  assistantWelcomeMessage:
    "Hello! I can help you discover products, check available sizes and assist with your order.",

  storeStatus: "operational",

  maintenanceMessage:
    "Our online store is temporarily unavailable. Please check again shortly.",
};

export async function getPublicStoreSettings(): Promise<PublicStoreSettings> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("store_settings")
      .select(
        `
          store_name,
          support_email,
          whatsapp_number,
          instagram_handle,
          delivery_fee,
          free_delivery_threshold,
          delivery_estimate,
          delivery_country,
          cod_enabled,
          order_prefix,
          assistant_enabled,
          assistant_welcome_message,
          store_status,
          maintenance_message
        `,
      )
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("Public store settings could not be loaded:", error);
      }

      return defaultPublicStoreSettings;
    }

    const storeStatus =
      data.store_status === "maintenance" || data.store_status === "closed"
        ? data.store_status
        : "operational";

    return {
      storeName:
        data.store_name?.trim() || defaultPublicStoreSettings.storeName,

      supportEmail:
        data.support_email?.trim() || defaultPublicStoreSettings.supportEmail,

      whatsappNumber:
        data.whatsapp_number?.trim() ||
        defaultPublicStoreSettings.whatsappNumber,

      instagramHandle:
        data.instagram_handle?.trim() ||
        defaultPublicStoreSettings.instagramHandle,

      deliveryFee: Number(
        data.delivery_fee ?? defaultPublicStoreSettings.deliveryFee,
      ),

      freeDeliveryThreshold: Number(
        data.free_delivery_threshold ??
          defaultPublicStoreSettings.freeDeliveryThreshold,
      ),

      deliveryEstimate:
        data.delivery_estimate?.trim() ||
        defaultPublicStoreSettings.deliveryEstimate,

      deliveryCountry:
        data.delivery_country?.trim() ||
        defaultPublicStoreSettings.deliveryCountry,

      codEnabled: data.cod_enabled ?? defaultPublicStoreSettings.codEnabled,

      orderPrefix:
        data.order_prefix?.trim().toUpperCase() ||
        defaultPublicStoreSettings.orderPrefix,

      assistantEnabled:
        data.assistant_enabled ?? defaultPublicStoreSettings.assistantEnabled,

      assistantWelcomeMessage:
        data.assistant_welcome_message?.trim() ||
        defaultPublicStoreSettings.assistantWelcomeMessage,

      storeStatus,

      maintenanceMessage:
        data.maintenance_message?.trim() ||
        defaultPublicStoreSettings.maintenanceMessage,
    };
  } catch (error) {
    console.error("Unexpected public store settings error:", error);

    return defaultPublicStoreSettings;
  }
}
