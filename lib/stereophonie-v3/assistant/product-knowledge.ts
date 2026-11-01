/*
 * ST_ASSISTANT_VERIFIED_PRODUCT_KNOWLEDGE_V1
 *
 * Server-side structured product facts.
 *
 * All facts originate from published catalog records.
 * Never infer an option, price, feature, or availability.
 *
 * The model may interpret a question, but only verified
 * catalog data can establish the answer.
 */

export type AssistantKnowledgeSpecification = {
  name: string;
  value: string;
};

export type AssistantKnowledgeVariantInput = {
  id: string;
  size: string;
  variantName?: string | null;
  displayPosition?: number | null;
  attributes?: Record<string, unknown> | null;
  currentPrice: number;
  availabilityStatus: string;
  purchasable: boolean;
};

export type AssistantKnowledgeProductInput = {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  description?: string | null;
  variants: AssistantKnowledgeVariantInput[];
};

export type AssistantKnowledgeConfiguration = {
  id: string;
  label: string;
  options: AssistantKnowledgeSpecification[];
  technicalSpecifications: AssistantKnowledgeSpecification[];
  specificationSource: "selected" | "fallback" | "not_listed";
  price: number | null;
  availabilityStatus: string;
  purchasable: boolean;
};

export type AssistantVerifiedProductKnowledge = {
  id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  configurations: AssistantKnowledgeConfiguration[];
  configurationsTruncated: boolean;
};

const MAX_CONFIGURATIONS = 64;
const MAX_OPTIONS = 40;
const MAX_SPECS = 100;

const HIDDEN_KEYS = new Set([
  "color_hex",
  "colour_hex",
  "swatch_hex",
  "hex",
]);

const VALID_AVAILABILITY = new Set([
  "in_stock",
  "low_stock",
  "out_of_stock",
  "coming_soon",
  "ask_for_price",
]);

function objectAttributes(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function limitedText(value: string, maximum: number): string {
  return value.trim().slice(0, maximum).trim();
}

function displayValue(value: unknown): string | null {
  if (typeof value === "string") {
    return limitedText(value, 300) || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every(
      (entry) =>
        typeof entry === "string" ||
        typeof entry === "boolean" ||
        (typeof entry === "number" && Number.isFinite(entry)),
    )
  ) {
    return limitedText(value.join(", "), 300) || null;
  }

  return null;
}

function technicalSpecifications(
  value: unknown,
): AssistantKnowledgeSpecification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry) =>
        entry !== null &&
        typeof entry === "object" &&
        typeof entry.name === "string" &&
        typeof entry.value === "string",
    )
    .map((entry) => ({
      name: limitedText(entry.name, 120),
      value: limitedText(entry.value, 500),
    }))
    .filter((entry) => entry.name && entry.value)
    .slice(0, MAX_SPECS);
}

function configurationOptions(
  attributes: Record<string, unknown>,
): AssistantKnowledgeSpecification[] {
  return Object.entries(attributes)
    .filter(
      ([key]) =>
        !key.startsWith("__") &&
        !HIDDEN_KEYS.has(key.trim().toLowerCase()),
    )
    .map(([name, value]) => ({
      name: limitedText(name, 120),
      value: displayValue(value),
    }))
    .filter(
      (entry): entry is AssistantKnowledgeSpecification =>
        Boolean(entry.name && entry.value),
    )
    .slice(0, MAX_OPTIONS);
}

function normalizedAvailability(value: string): string {
  const status = value.trim().toLowerCase();

  return VALID_AVAILABILITY.has(status)
    ? status
    : "unavailable";
}

function labelOf(variant: AssistantKnowledgeVariantInput): string {
  return limitedText(
    variant.variantName || variant.size || "Standard",
    180,
  ) || "Standard";
}

export function buildAssistantVerifiedProductKnowledge(
  product: AssistantKnowledgeProductInput,
): AssistantVerifiedProductKnowledge {
  /*
   * Follow the product-page configuration ordering.
   * Do not replace it with price-based ordering.
   */
  const ordered = [...product.variants].sort((a, b) => {
    const positions =
      Number(a.displayPosition ?? 0) -
      Number(b.displayPosition ?? 0);

    return positions || labelOf(a).localeCompare(
      labelOf(b),
      undefined,
      { numeric: true },
    );
  });

  /*
   * Match the storefront's technical-spec fallback:
   * a selected variant's own array takes precedence.
   * Otherwise use the first configuration's attributes.
   */
  const fallbackAttributes = objectAttributes(
    ordered.find(
      (variant) =>
        variant.attributes &&
        typeof variant.attributes === "object" &&
        !Array.isArray(variant.attributes),
    )?.attributes,
  );

  const configurations = ordered
    .slice(0, MAX_CONFIGURATIONS)
    .map((variant) => {
      const attributes = objectAttributes(variant.attributes);
      const selectedHasSpecs =
        Array.isArray(attributes.__technical_specs);

      const sourceAttributes =
        selectedHasSpecs ? attributes : fallbackAttributes;

      const specifications = technicalSpecifications(
        sourceAttributes.__technical_specs,
      );

      const availabilityStatus =
        normalizedAvailability(variant.availabilityStatus);

      const price =
        availabilityStatus !== "ask_for_price" &&
        Number.isFinite(variant.currentPrice) &&
        variant.currentPrice > 0
          ? variant.currentPrice
          : null;

      return {
        id: variant.id,
        label: labelOf(variant),
        options: configurationOptions(attributes),
        technicalSpecifications: specifications,
        specificationSource:
          specifications.length === 0
            ? "not_listed" as const
            : selectedHasSpecs
              ? "selected" as const
              : "fallback" as const,
        price,
        availabilityStatus,
        purchasable:
          Boolean(variant.purchasable) &&
          (
            availabilityStatus === "in_stock" ||
            availabilityStatus === "low_stock"
          ),
      };
    });

  return {
    id: product.id,
    name: limitedText(product.name, 250),
    category: limitedText(product.category ?? "", 120),
    brand: limitedText(product.brand ?? "", 120),
    description: limitedText(product.description ?? "", 1200),
    configurations,
    configurationsTruncated:
      ordered.length > MAX_CONFIGURATIONS,
  };
}

function normalizeMatch(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\bcolour\b/g, "color")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(\d+)\s+(gb|tb)\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesValue(actual: string, requested: string): boolean {
  const actualValue = normalizeMatch(actual);
  const requestedValue = normalizeMatch(requested);

  if (!requestedValue) {
    return false;
  }

  return (
    actualValue === requestedValue ||
    (` ${actualValue} `).includes(` ${requestedValue} `)
  );
}

/*
 * Every requested option must match the SAME configuration.
 *
 * Example: Burgundy 256GB and Black 512GB do not prove
 * the existence of a Burgundy 512GB model.
 */
export function findAssistantKnowledgeConfigurations(
  product: AssistantVerifiedProductKnowledge,
  requestedOptions: Record<string, string>,
): AssistantKnowledgeConfiguration[] {
  const constraints = Object.entries(requestedOptions)
    .filter(
      ([name, value]) =>
        Boolean(name.trim()) &&
        Boolean(value.trim()),
    );

  if (constraints.length === 0) {
    return [];
  }

  return product.configurations.filter((configuration) =>
    constraints.every(([name, requested]) => {
      const key = normalizeMatch(name);

      const matchingOptions = configuration.options.filter(
        (option) => normalizeMatch(option.name) === key,
      );

      if (matchingOptions.length > 0) {
        return matchingOptions.some(
          (option) => matchesValue(option.value, requested),
        );
      }

      // Some legacy records store their option in the variant label.
      return matchesValue(configuration.label, requested);
    }),
  );
}
