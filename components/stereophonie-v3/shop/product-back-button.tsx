"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductBackButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window === "undefined") {
      return;
    }

    /*
     * Use the browser history as the source of truth.
     *
     * This returns the customer to the exact page they visited
     * immediately before the product page, preserving that route's
     * category, search, filters, query parameters and native browser
     * scroll restoration.
     */
    if (window.history.length > 1) {
      router.back();
      return;
    }

    /*
     * A product opened directly with no usable previous history
     * falls back safely to the main storefront.
     */
    router.replace("/shop");
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
