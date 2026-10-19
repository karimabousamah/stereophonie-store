"use client";

import { useEffect, useMemo, useState } from "react";

type AvailabilityStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "coming_soon";

type ProductVariant = {
  id: string;
  variant_name?: string | null;
  display_position?: number | null;
  attributes?: Record<string, unknown> | null;
  stock_quantity: number;
  availability_status: AvailabilityStatus;
};

type Props = {
  brandName: string;
  categoryName: string;
  variants: ProductVariant[];
};

type TechnicalSpecification = {
  name: string;
  value: string;
};

function variantName(variant: ProductVariant) {
  return (
    String(variant.variant_name ?? "").trim() ||
    "Standard"
  );
}

function purchasable(variant: ProductVariant) {
  return (
    Number(variant.stock_quantity) > 0 &&
    (
      variant.availability_status === "in_stock" ||
      variant.availability_status === "low_stock"
    )
  );
}

function orderedVariants(
  variants: ProductVariant[],
) {
  return [...variants].sort((first, second) => {
    const firstPosition =
      Number(first.display_position ?? 0);

    const secondPosition =
      Number(second.display_position ?? 0);

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

function attributesForVariant(
  variant: ProductVariant | null,
) {
  const attributes = variant?.attributes;

  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    return {} as Record<string, unknown>;
  }

  return attributes;
}

function technicalSpecifications(
  value: unknown,
): TechnicalSpecification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      specification,
    ): specification is TechnicalSpecification =>
      typeof specification === "object" &&
      specification !== null &&
      typeof (
        specification as {
          name?: unknown;
        }
      ).name === "string" &&
      typeof (
        specification as {
          value?: unknown;
        }
      ).value === "string",
  );
}

const hiddenStorefrontSpecificationKeys =
  new Set([
    "color_hex",
    "colour_hex",
    "swatch_hex",
    "hex",
  ]);

export default function ProductConfigurationSpecifications({
  brandName,
  categoryName,
  variants,
}: Props) {
  const ordered = useMemo(
    () => orderedVariants(variants),
    [variants],
  );

  /*
   * Match the initial configuration semantics already used by
   * ProductPurchaseControls, price and availability:
   *
   * first purchasable configuration, otherwise first configuration.
   */
  const initialVariant =
    ordered.find((variant) => purchasable(variant)) ??
    ordered[0] ??
    null;

  const [selectedVariantId, setSelectedVariantId] =
    useState(initialVariant?.id ?? "");

  useEffect(() => {
    function handleConfigurationChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          variantId?: string;
        }>;

      const nextVariantId =
        String(
          customEvent.detail?.variantId ?? "",
        ).trim();

      if (!nextVariantId) {
        return;
      }

      if (
        !ordered.some(
          (variant) =>
            variant.id === nextVariantId,
        )
      ) {
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

  const selectedVariant =
    ordered.find(
      (variant) =>
        variant.id === selectedVariantId,
    ) ??
    initialVariant;

  const selectedAttributes =
    attributesForVariant(selectedVariant);

  /*
   * Preserve the old storefront behaviour for common technical
   * specifications when they are stored only on one configuration.
   *
   * If the selected configuration has its own technical-spec array,
   * that exact configuration wins.
   */
  const fallbackAttributes =
    attributesForVariant(
      ordered.find(
        (variant) =>
          variant.attributes &&
          typeof variant.attributes === "object",
      ) ??
      null,
    );

  const selectedTechnicalSpecs =
    technicalSpecifications(
      selectedAttributes.__technical_specs,
    );

  const fallbackTechnicalSpecs =
    technicalSpecifications(
      fallbackAttributes.__technical_specs,
    );

  const technicalSpecs =
    Array.isArray(
      selectedAttributes.__technical_specs,
    )
      ? selectedTechnicalSpecs
      : fallbackTechnicalSpecs;

  /*
   * Configuration attributes are always taken from the exact
   * selected variant.
   *
   * Example:
   * Oxygen -> Color: Oxygen
   * Berry -> Color: Berry
   * Lavender -> Color: Lavender
   */
  const configurationSpecs =
    Object.entries(selectedAttributes)
      .filter(
        ([key]) =>
          !key.startsWith("__") &&
          !hiddenStorefrontSpecificationKeys.has(
            key.trim().toLowerCase(),
          ),
      );

  return (
    <div
      className="st-product-v5__specifications"
      data-product-configuration-specifications="true"
      data-selected-variant-id={
        selectedVariant?.id ?? ""
      }
    >
      <span>Specifications</span>

      <h2>Specifications.</h2>

      <dl>
        <div>
          <dt>Brand</dt>
          <dd>{brandName}</dd>
        </div>

        <div>
          <dt>Category</dt>
          <dd>{categoryName}</dd>
        </div>

        {technicalSpecs.map(
          (specification, index) => (
            <div
              key={`technical-${specification.name}-${index}`}
            >
              <dt>{specification.name}</dt>
              <dd>{specification.value}</dd>
            </div>
          ),
        )}

        {configurationSpecs.map(
          ([key, value]) => (
            <div key={`configuration-${key}`}>
              <dt>
                {key
                  .replace(/[_-]+/g, " ")
                  .replace(
                    /\b\w/g,
                    (character) =>
                      character.toUpperCase(),
                  )}
              </dt>

              <dd>{String(value)}</dd>
            </div>
          ),
        )}
      </dl>
    </div>
  );
}
