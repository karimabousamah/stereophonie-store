"use client";

import { useEffect, useMemo, useState } from "react";

type AvailabilityStatus =
  "in_stock" | "low_stock" | "out_of_stock" | "coming_soon";

type ProductVariant = {
  id: string;
  variant_name?: string | null;
  display_position?: number | null;
  regular_price: number | null;
  sale_price: number | null;
  stock_quantity: number;
  availability_status: AvailabilityStatus;
};

type Props = {
  variants: ProductVariant[];
};

function variantName(variant: ProductVariant) {
  return String(variant.variant_name ?? "").trim() || "Standard";
}

function validPositivePrice(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function priceForVariant(variant: ProductVariant | null) {
  if (!variant) {
    return null;
  }

  const regular = validPositivePrice(variant.regular_price)
    ? Number(variant.regular_price)
    : null;

  const rawSale = validPositivePrice(variant.sale_price)
    ? Number(variant.sale_price)
    : null;

  const sale =
    regular !== null && rawSale !== null && rawSale < regular ? rawSale : null;

  const current = sale ?? regular;

  if (current === null) {
    return null;
  }

  return {
    current,
    regular,
    sale,
  };
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

    return variantName(first).localeCompare(variantName(second), undefined, {
      numeric: true,
    });
  });
}

export default function ProductConfigurationPrice({ variants }: Props) {
  const ordered = useMemo(() => orderedVariants(variants), [variants]);

  /*
   * Match ProductPurchaseControls exactly:
   * first purchasable configuration, otherwise first configuration.
   */
  const initialVariant =
    ordered.find((variant) => purchasable(variant)) ?? ordered[0] ?? null;

  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariant?.id ?? "",
  );

  useEffect(() => {
    function handleConfigurationChange(event: Event) {
      const customEvent = event as CustomEvent<{
        variantId?: string;
      }>;

      const nextVariantId = String(customEvent.detail?.variantId ?? "").trim();

      if (!nextVariantId) {
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
  }, []);

  const selected =
    ordered.find((variant) => variant.id === selectedVariantId) ??
    initialVariant;

  const price = priceForVariant(selected);

  return (
    <div
      className="st-product-v5__price"
      data-product-configuration-price="true"
      data-selected-variant-id={selected?.id ?? ""}
    >
      {price ? (
        <>
          <strong>${price.current.toFixed(2)}</strong>

          {price.sale && price.regular ? (
            <del>${price.regular.toFixed(2)}</del>
          ) : null}
        </>
      ) : (
        <strong>Price unavailable</strong>
      )}
    </div>
  );
}
