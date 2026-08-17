export type ProductAvailabilityStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "coming_soon";

export type ProductVariantAttributes = Record<string, string>;

export type ElectronicsProductVariant = {
  id?: string | null;
  variant_name: string;
  attributes: ProductVariantAttributes;
  sku: string;
  regular_price: number;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  availability_status: ProductAvailabilityStatus;
};

export const PRODUCT_AVAILABILITY_STATUSES: ProductAvailabilityStatus[] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "coming_soon",
];

export const PRODUCT_ATTRIBUTE_PRESETS = [
  { key: "storage", label: "Storage" },
  { key: "memory", label: "Memory" },
  { key: "color", label: "Color" },
  { key: "processor", label: "Processor" },
  { key: "connectivity", label: "Connectivity" },
  { key: "edition", label: "Edition" },
  { key: "screen_size", label: "Screen size" },
  { key: "capacity", label: "Capacity" },
] as const;

export function normalizeVariantName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeVariantAttributeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeVariantAttributes(
  value: unknown,
): ProductVariantAttributes {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([rawKey, rawValue]) => {
      const key = normalizeVariantAttributeKey(rawKey);
      const attributeValue = String(rawValue ?? "").trim();

      return [key, attributeValue] as const;
    })
    .filter(([key, attributeValue]) => key && attributeValue);

  return Object.fromEntries(entries);
}

export function createVariantNameFromAttributes(
  attributes: ProductVariantAttributes,
) {
  return Object.values(normalizeVariantAttributes(attributes))
    .filter(Boolean)
    .join(" / ");
}

export function resolveVariantName({
  variantName,
  legacySize,
  attributes,
}: {
  variantName?: unknown;
  legacySize?: unknown;
  attributes?: unknown;
}) {
  const explicitName = normalizeVariantName(variantName);

  if (explicitName) {
    return explicitName;
  }

  const generatedName = createVariantNameFromAttributes(
    normalizeVariantAttributes(attributes),
  );

  if (generatedName) {
    return generatedName;
  }

  return normalizeVariantName(legacySize);
}

export function createLegacyVariantCompatibilityValue(
  variantName: string,
) {
  return normalizeVariantName(variantName);
}

export function variantIsPurchasable({
  availability_status,
  stock_quantity,
}: {
  availability_status: ProductAvailabilityStatus;
  stock_quantity: number;
}) {
  return (
    (availability_status === "in_stock" ||
      availability_status === "low_stock") &&
    Number(stock_quantity) > 0
  );
}

export function calculateProductAvailability(
  variants: Array<{
    availability_status: ProductAvailabilityStatus;
    stock_quantity?: number;
  }>,
): "in_stock" | "out_of_stock" | "coming_soon" {
  if (
    variants.length > 0 &&
    variants.every(
      (variant) => variant.availability_status === "coming_soon",
    )
  ) {
    return "coming_soon";
  }

  const hasAvailableVariant = variants.some(
    (variant) =>
      (variant.availability_status === "in_stock" ||
        variant.availability_status === "low_stock") &&
      Number(variant.stock_quantity ?? 0) > 0,
  );

  return hasAvailableVariant ? "in_stock" : "out_of_stock";
}

export function validateElectronicsVariants(
  variants: ElectronicsProductVariant[],
) {
  if (!Array.isArray(variants) || variants.length === 0) {
    return {
      valid: false as const,
      message: "Add at least one product configuration.",
    };
  }

  const usedNames = new Set<string>();

  for (const variant of variants) {
    const variantName = normalizeVariantName(variant.variant_name);

    if (!variantName) {
      return {
        valid: false as const,
        message: "Every product configuration needs a name.",
      };
    }

    const normalizedName = variantName.toLowerCase();

    if (usedNames.has(normalizedName)) {
      return {
        valid: false as const,
        message: `Configuration "${variantName}" was added more than once.`,
      };
    }

    usedNames.add(normalizedName);

    if (
      !PRODUCT_AVAILABILITY_STATUSES.includes(
        variant.availability_status,
      )
    ) {
      return {
        valid: false as const,
        message: `Select a valid availability for "${variantName}".`,
      };
    }

    if (
      !Number.isFinite(Number(variant.regular_price)) ||
      Number(variant.regular_price) <= 0
    ) {
      return {
        valid: false as const,
        message: `Enter a valid price for "${variantName}".`,
      };
    }

    if (
      variant.sale_price !== null &&
      (!Number.isFinite(Number(variant.sale_price)) ||
        Number(variant.sale_price) < 0 ||
        Number(variant.sale_price) >= Number(variant.regular_price))
    ) {
      return {
        valid: false as const,
        message: `Enter a valid sale price for "${variantName}".`,
      };
    }

    if (
      !Number.isFinite(Number(variant.stock_quantity)) ||
      Number(variant.stock_quantity) < 0
    ) {
      return {
        valid: false as const,
        message: `Enter valid stock for "${variantName}".`,
      };
    }

    if (
      !Number.isFinite(Number(variant.low_stock_threshold)) ||
      Number(variant.low_stock_threshold) < 0
    ) {
      return {
        valid: false as const,
        message: `Enter a valid low-stock warning for "${variantName}".`,
      };
    }
  }

  return {
    valid: true as const,
  };
}
