import {
  normalizeStorefrontSearchText,
} from "@/lib/storefront-search";

import type {
  ShopCatalogueProduct,
} from "@/lib/storefront-shop-catalog";

/*
 * ST_ASSISTANT_CATEGORY_DISCOVERY_V1
 *
 * A deterministic product-discovery bridge between the
 * assistant and the authoritative storefront search index.
 *
 * A category match means a product is worth showing.
 * It does NOT prove compatibility with a particular model.
 */

export type AssistantDiscoveryRequest = {
  query: string;
  lookups: string[];
  deviceModel: string | null;
  kind: "case" | "headset" | "phone" | "other";
};

const productKinds =
  /\b(cases?|covers?|headsets?|headphones?|earbuds?|earphones?|phones?|smartphones?|tablets?|smartwatches?|watches?|monitors?|keyboards?|mouse|mice|speakers?|chargers?|cables?|adapters?|stands?|mounts?|pencils?)\b/;

export function parseAssistantDiscoveryRequest(
  rawMessage: string,
): AssistantDiscoveryRequest | null {
  let query = normalizeStorefrontSearchText(rawMessage);

  const prefixPatterns = [
    /^do (?:you|u) (?:have|sell|carry|stock) /,
    /^can (?:you|u) (?:show me|find me|show|find) /,
    /^have (?:you|u) got /,
    /^show me /,
    /^find me /,
    /^i am looking for /,
    /^im looking for /,
    /^looking for /,
    /^i need /,
    /^i want /,
    /^got any /,
    /^any /,
    /^are there any /,
    /^what (.+?) do (?:you|u) (?:have|sell|carry)$/,
  ];

  for (const pattern of prefixPatterns) {
    const match = query.match(pattern);

    if (!match) {
      continue;
    }

    query = match[1] && pattern.source.startsWith("^what")
      ? match[1]
      : query.replace(pattern, "");

    break;
  }

  query = query
    .replace(/^(?:a|an|the|some|any) /, "")
    .replace(/\b(?:please|right now|currently available)\b/g, "")
    .trim();

  const words = query.split(" ").filter(Boolean);

  if (
    words.length === 0 ||
    words.length > 7 ||
    !productKinds.test(query)
  ) {
    return null;
  }

  // Complex buying decisions continue through the original
  // recommendation and budget engines.
  if (
    /\b(?:best|better|cheapest|recommend|compare|versus|vs|under|below|budget|discount|sale|offer)\b/.test(query)
  ) {
    return null;
  }

  const wantsCase = /\b(?:cases?|covers?)\b/.test(query);
  const wantsHeadset =
    /\b(?:headsets?|headphones?)\b/.test(query);
  const wantsPhone =
    /\b(?:phones?|smartphones?)\b/.test(query) &&
    !wantsCase;

  const kind = wantsCase
    ? "case"
    : wantsHeadset
      ? "headset"
      : wantsPhone
        ? "phone"
        : "other";

  const deviceModelMatch = wantsCase
    ? query.match(
        /\b(?:ipad (?:pro|air|mini)(?: \d{1,2})?|iphone \d{1,2}(?: pro(?: max)?| plus)?|galaxy tab [a-z]\d{1,2})\b/,
      )
    : null;

  const deviceModel = deviceModelMatch?.[0] ?? null;
  const lookups = [query];

  // An exact model request must first search as written.
  // Only then can we search the broader case category,
  // and those results still need explicit compatibility.
  if (
    deviceModel?.startsWith("ipad ") &&
    !lookups.includes("ipad cases")
  ) {
    lookups.push("ipad cases");
  }

  if (
    deviceModel?.startsWith("iphone ") &&
    !lookups.includes("iphone cases")
  ) {
    lookups.push("iphone cases");
  }

  return {
    query,
    lookups,
    deviceModel,
    kind,
  };
}


/*
 * ST_ASSISTANT_MODEL_AWARE_DISCOVERY_V2
 *
 * Search actual product identity and configuration labels.
 * In particular, Pro and Pro Max are different device models.
 */
export function assistantProductSupportsModel(
  product: {
    name: string;
    description: string | null;
    variants?: { size: string }[];
  },
  requestedModel: string,
): boolean {
  const model = normalizeStorefrontSearchText(requestedModel);
  const modelWords = model.split(" ").filter(Boolean);

  if (modelWords.length === 0) return false;

  const sources = [
    product.name,
    product.description ?? "",
    ...(product.variants ?? []).map((variant) => variant.size),
  ];

  return sources.some((source) => {
    const words = normalizeStorefrontSearchText(source)
      .split(" ")
      .filter(Boolean);

    for (
      let i = 0;
      i <= words.length - modelWords.length;
      i += 1
    ) {
      const matches = modelWords.every(
        (word, offset) => words[i + offset] === word,
      );

      if (!matches) continue;

      const following = words[i + modelWords.length] ?? "";
      const last = modelWords[modelWords.length - 1];

      // "iPhone 18 Pro" cannot match "iPhone 18 Pro Max".
      if (last === "pro" && following === "max") {
        continue;
      }

      // "iPhone 18" cannot match "iPhone 18 Pro".
      if (
        /^iphone \d{1,2}$/.test(model) &&
        ["pro", "max", "plus"].includes(following)
      ) {
        continue;
      }

      return true;
    }

    return false;
  });
}

/*
 * Recognize a full named device even when the customer
 * adds a product description after the model.
 *
 * Examples:
 *   Apple Vision Pro
 *   Apple Vision Pro VR headset
 *
 * This resolver is not used for case requests.
 */
export function findAssistantNamedCatalogProduct<
  T extends { id: string; name: string },
>(
  catalog: T[],
  question: string,
): T | null {
  const normalized = normalizeStorefrontSearchText(question);

  const query = normalized
    .replace(
      /^(?:do you have|do u have|do you sell|do u sell|do you carry|do you stock|have you got|show me|find me|i want|i need|is there any|are there any)\s+/,
      "",
    )
    .replace(/^(?:a|an|the|any|some)\s+/, "")
    .trim();

  if (query.split(" ").length < 2) return null;

  const allowedSuffixes = new Set([
    "",
    "vr headset",
    "vr headsets",
    "virtual reality headset",
    "virtual reality headsets",
    "headset",
    "headsets",
    "smartphone",
    "smartphones",
    "mobile phone",
    "mobile phones",
    "phone",
    "phones",
    "tablet",
    "tablets",
    "device",
    "devices",
    "laptop",
    "laptops",
  ]);

  let best: { product: T; score: number } | null = null;

  for (const product of catalog) {
    const title = normalizeStorefrontSearchText(
      product.name.replace(
        /\s*[-–—]\s*\([^)]{1,30}\)\s*$/,
        "",
      ),
    );

    const titleWords = title.split(" ").filter(Boolean);

    if (titleWords.length < 2) continue;

    const aliases = [title];

    if (titleWords.length >= 3) {
      aliases.push(titleWords.slice(1).join(" "));
    }

    for (const alias of aliases) {
      if (!query.startsWith(alias)) continue;

      const suffix = query.slice(alias.length);

      if (suffix && !suffix.startsWith(" ")) continue;

      if (!allowedSuffixes.has(suffix.trim())) continue;

      const score =
        alias.length + (suffix.trim() ? 0 : 100);

      if (!best || score > best.score) {
        best = { product, score };
      }
    }
  }

  return best?.product ?? null;
}

function relationName(
  relation: ShopCatalogueProduct["categories"],
) {
  if (!relation) return "";

  return Array.isArray(relation)
    ? relation[0]?.name ?? ""
    : relation.name ?? "";
}

export function curateAssistantDiscoveryProducts<
  T extends {
    id: string;
    name: string;
    description: string | null;
    variants?: {
      size: string;
      availabilityStatus?: string;
    }[];
  },
>(
  indexedProducts: ShopCatalogueProduct[],
  catalog: T[],
  request: AssistantDiscoveryRequest,
): T[] {
  const catalogById = new Map(
    catalog.map((product) => [product.id, product]),
  );

  const results: T[] = [];

  for (const indexed of indexedProducts) {
    const product = catalogById.get(indexed.id);

    if (!product) continue;

    const name = normalizeStorefrontSearchText(product.name);
    const category = normalizeStorefrontSearchText(
      [
        relationName(indexed.categories),
        ...(indexed.searchCategoryNames ?? []),
      ].join(" "),
    );

    if (request.kind === "case") {
      const looksLikeCase =
        /\b(cases?|covers?|folio)\b/.test(name) ||
        /\b(cases?|covers?)\b/.test(category);

      if (!looksLikeCase) continue;

      if (
        request.deviceModel &&
        !assistantProductSupportsModel(
          product,
          request.deviceModel,
        )
      ) {
        // A category match alone does not prove compatibility.
        continue;
      }
    }

    if (request.kind === "headset") {
      const wantsStand =
        /\b(stands?|mounts?|holders?)\b/.test(request.query);

      if (
        !wantsStand &&
        /\b(stands?|mounts?|holders?|covers?|cases?)\b/.test(name)
      ) {
        continue;
      }

      if (
        !/\b(headsets?|headphones?)\b/.test(
          `${name} ${category}`,
        )
      ) {
        continue;
      }
    }

    if (request.kind === "phone") {
      if (
        !/\b(mobile phones?|smartphones?|phones?)\b/.test(category)
      ) {
        continue;
      }

      if (
        /\b(cases?|covers?|chargers?|stands?)\b/.test(name)
      ) {
        continue;
      }

      if (
        /\bapple\b/.test(request.query) &&
        normalizeStorefrontSearchText(
          Array.isArray(indexed.brands)
            ? indexed.brands[0]?.name ?? ""
            : indexed.brands?.name ?? "",
        ) !== "apple"
      ) {
        continue;
      }
    }

    results.push(product);
  }

  return results;
}
