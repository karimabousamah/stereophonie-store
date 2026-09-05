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

  const siteUrl = "https://www.stereophoniestore.com";
  const title = `${settings.storeName} | Electronics, Gaming & Tech in Lebanon`;
  const description =
    "Shop phones, laptops, gaming gear, smartwatches, audio, accessories and more at Stereophonie Store. Selected technology with delivery across Lebanon.";

  return {
    metadataBase: new URL(siteUrl),

    title: {
      default: title,
      template: `%s | ${settings.storeName}`,
    },

    description,

    icons: {
      icon: [
        {
          url: "/favicon.ico",
          sizes: "any",
        },
        {
          url: "/favicon-512.png",
          type: "image/png",
          sizes: "512x512",
        },
      ],
      shortcut: "/favicon.ico",
      apple: [
        {
          url: "/apple-touch-icon.png",
          type: "image/png",
          sizes: "180x180",
        },
      ],
    },

    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: settings.storeName,
      title,
      description,
      locale: "en_LB",
    },

    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicStoreSettings();

  const siteUrl = "https://www.stereophoniestore.com";

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: settings.storeName,
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/favicon-512.png`,
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: settings.storeName,
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        inLanguage: "en",
      },
    ],
  };

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />

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
