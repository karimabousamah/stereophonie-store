"use client";

import { useEffect } from "react";

import StorefrontServiceUnavailable from "@/components/storefront/storefront-service-unavailable";

export default function ShopError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Stereophonie shop error:", error);
  }, [error]);

  return (
    <StorefrontServiceUnavailable
      title="The shop is temporarily unavailable."
      description="We could not load the Stereophonie catalogue right now. Please try again shortly or contact us directly on WhatsApp."
      retryHref="/shop"
    />
  );
}
