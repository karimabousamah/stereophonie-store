import type { Metadata } from "next";

import { CartProvider } from "@/components/cart/cart-provider";
import StoreAvailabilityGate from "@/components/storefront/store-availability-gate";
import { StoreSettingsProvider } from "@/components/storefront/store-settings-provider";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";
import { getPublicStoreSettings } from "@/lib/store-settings";

import "./globals.css";
import "../styles/stereophonie-v3.css";

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

  return (
    <html lang="en">
      <body>
        <StoreSettingsProvider settings={settings}>
          <StoreAvailabilityGate>
            <CartProvider>
              <WishlistProvider>
                {children}
              </WishlistProvider>
            </CartProvider>
          </StoreAvailabilityGate>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
