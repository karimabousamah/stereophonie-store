import type { Metadata } from "next";
import { Suspense } from "react";

import FreeShoppingAssistant from "@/components/assistant/free-shopping-assistant";
import CartDrawer from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import CollectionsAutoScroll from "@/components/home/collections-auto-scroll";
import StoreAvailabilityGate from "@/components/storefront/store-availability-gate";
import PageTransition from "@/components/storefront/page-transition";
import PremiumMotionController from "@/components/storefront/premium-motion-controller";
import PremiumMerchandiseBadges from "@/components/storefront/premium-merchandise-badges";
import { StoreSettingsProvider } from "@/components/storefront/store-settings-provider";
import WebsiteIntro from "@/components/storefront/website-intro";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import { getPublicStoreSettings } from "@/lib/store-settings";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicStoreSettings();

  return {
    title: {
      default: settings.storeName,
      template: `%s | ${settings.storeName}`,
    },

    description: `Selected Italian women’s apparel from ${settings.storeName}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicStoreSettings();

  return (
    <html lang="en">
      <body>
        <StoreSettingsProvider settings={settings}>
          <PremiumMotionController />
          <PremiumMerchandiseBadges />
          <StoreAvailabilityGate>
            <CartProvider>
              <WishlistProvider>
                <WebsiteIntro
                  showOnFirstRender
                  cookieName="nita-style-intro-current-load"
                />

                <Suspense fallback={null}>
                  <PageTransition />
                </Suspense>

                {children}

                <CollectionsAutoScroll />
                <CartDrawer />

                {settings.assistantEnabled ? <FreeShoppingAssistant /> : null}
              </WishlistProvider>
            </CartProvider>
          </StoreAvailabilityGate>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
