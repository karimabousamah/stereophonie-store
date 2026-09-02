import type { Metadata, Viewport } from "next";

import FirstOrderWelcomePopup from "@/components/storefront/first-order-welcome-popup";
import { CartProvider } from "@/components/cart/cart-provider";
import GlobalStorefrontAssistant from "@/components/storefront/global-storefront-assistant";
import StoreAvailabilityGate from "@/components/storefront/store-availability-gate";
import { StoreSettingsProvider } from "@/components/storefront/store-settings-provider";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import { normalizeHomepageSettings } from "@/lib/homepage-settings";
import { getPublicStoreSettings } from "@/lib/store-settings";
import { createClient } from "@/lib/supabase/server";

import "./globals.css";
import "../styles/stereophonie-v3.css";
import "../styles/stereophonie-retail-utility.css";
import "../styles/stereophonie-v3-admin.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicStoreSettings();

  return {
    title: {
      default: settings.storeName,
      template: `%s | ${settings.storeName}`,
    },
    description: `Selected consumer electronics and technology from ${settings.storeName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicStoreSettings();

  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    homepageSettingsResult,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("homepage_settings")
      .select("welcome_discount_enabled, welcome_discount_percentage")
      .eq("id", "default")
      .maybeSingle(),
  ]);

  const homepageSettings = normalizeHomepageSettings(
    homepageSettingsResult.data ?? null,
  );

  return (
    <html lang="en">
      <body>
        <StoreSettingsProvider settings={settings}>
          <StoreAvailabilityGate>
            <CartProvider>
              <WishlistProvider>
                {children}

                <FirstOrderWelcomePopup
                  shouldShow={
                    !user && homepageSettings.welcome_discount_enabled
                  }
                  discountPercentage={
                    homepageSettings.welcome_discount_percentage
                  }
                />

                <GlobalStorefrontAssistant />
              </WishlistProvider>
            </CartProvider>
          </StoreAvailabilityGate>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
