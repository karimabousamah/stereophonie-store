"use client";

import { useEffect, useMemo, useState } from "react";

type AvailabilityStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "coming_soon";

type ProductVariant = {
  id: string;
  display_position?: number | null;
  variant_name?: string | null;
  stock_quantity: number;
  availability_status: AvailabilityStatus;
};

type Props = {
  variants: ProductVariant[];
};

function variantName(variant: ProductVariant) {
  return String(variant.variant_name ?? "").trim() || "Standard";
}

function purchasable(variant: ProductVariant) {
  return (
    Number(variant.stock_quantity) > 0 &&
    (variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock")
  );
}

function orderedVariants(variants: ProductVariant[]) {
  return [...variants].sort((first, second) => {
    const firstPosition = Number(first.display_position ?? 0);
    const secondPosition = Number(second.display_position ?? 0);

    if (firstPosition !== secondPosition) {
      return firstPosition - secondPosition;
    }

    return variantName(first).localeCompare(
      variantName(second),
      undefined,
      {
        numeric: true,
      },
    );
  });
}

function availabilityFor(variant: ProductVariant | null) {
  if (!variant) {
    return {
      className: "",
      label: "Out of stock",
    };
  }

  if (variant.availability_status === "coming_soon") {
    return {
      className: "",
      label: "Coming soon",
    };
  }

  if (
    variant.availability_status === "out_of_stock" ||
    Number(variant.stock_quantity) < 1
  ) {
    return {
      className: "",
      label: "Out of stock",
    };
  }

  if (variant.availability_status === "low_stock") {
    return {
      className: "is-low-stock",
      label: "Low Stock",
    };
  }

  return {
    className: "is-available",
    label: "In stock",
  };
}

export default function ProductConfigurationAvailability({
  variants,
}: Props) {
  const ordered = useMemo(
    () => orderedVariants(variants),
    [variants],
  );

  /*
   * Match ProductPurchaseControls and ProductConfigurationPrice:
   * first purchasable configuration, otherwise the first configuration.
   */
  const initialVariant =
    ordered.find((variant) => purchasable(variant)) ??
    ordered[0] ??
    null;

  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariant?.id ?? "",
  );

  useEffect(() => {
    function handleConfigurationChange(event: Event) {
      const customEvent = event as CustomEvent<{
        variantId?: string;
      }>;

      const nextVariantId = String(
        customEvent.detail?.variantId ?? "",
      ).trim();

      if (!nextVariantId) {
        return;
      }

      if (!ordered.some((variant) => variant.id === nextVariantId)) {
        return;
      }

      setSelectedVariantId(nextVariantId);
    }

    window.addEventListener(
      "stereophonie:product-configuration",
      handleConfigurationChange,
    );

    return () => {
      window.removeEventListener(
        "stereophonie:product-configuration",
        handleConfigurationChange,
      );
    };
  }, [ordered]);

  const selected =
    ordered.find(
      (variant) => variant.id === selectedVariantId,
    ) ??
    initialVariant;

  const availability = availabilityFor(selected);

  return (
    <span
      className={`st-product-v5__availability${
        availability.className
          ? ` ${availability.className}`
          : ""
      }`}
      data-product-configuration-availability="true"
      data-selected-variant-id={selected?.id ?? ""}
    >
      <i />
      {availability.label}
    </span>
  );
}
