import { unstable_cache } from "next/cache";

import { normalizeHomepageSettings } from "@/lib/homepage-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicWelcomeOfferSettings = {
  welcome_discount_enabled: boolean;
  welcome_discount_percentage: number;
};

export const getPublicWelcomeOfferSettings = unstable_cache(
  async (): Promise<PublicWelcomeOfferSettings> => {
    try {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from("homepage_settings")
        .select(
          "welcome_discount_enabled, welcome_discount_percentage",
        )
        .eq("id", "default")
        .maybeSingle();

      if (error) {
        console.error(
          "Public welcome settings could not be loaded:",
          error,
        );
      }

      const settings = normalizeHomepageSettings(data ?? null);

      return {
        welcome_discount_enabled:
          settings.welcome_discount_enabled,
        welcome_discount_percentage:
          settings.welcome_discount_percentage,
      };
    } catch (error) {
      console.error(
        "Unexpected public welcome settings error:",
        error,
      );

      const settings = normalizeHomepageSettings(null);

      return {
        welcome_discount_enabled:
          settings.welcome_discount_enabled,
        welcome_discount_percentage:
          settings.welcome_discount_percentage,
      };
    }
  },
  ["stereophonie-public-welcome-offer"],
  {
    revalidate: 30,
    tags: ["homepage-settings"],
  },
);
