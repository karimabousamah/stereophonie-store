"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductBackButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window === "undefined") {
      return;
    }

    const referrer = document.referrer;

    if (referrer) {
      try {
        const previousUrl = new URL(referrer);

        if (previousUrl.origin === window.location.origin) {
          router.back();
          return;
        }
      } catch {
        // Fall through to the safe storefront destination.
      }
    }

    router.push("/shop");
  }

  return (
    <button
      type="button"
      className="st-product-v5__back"
      onClick={handleBack}
      aria-label="Go back"
    >
      <span className="st-product-v5__back-icon" aria-hidden="true">
        <ArrowLeft />
      </span>

      <span>Back</span>
    </button>
  );
}
