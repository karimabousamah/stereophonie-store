import type { ParsedAssistantRequest } from "./local-intelligence";

import {
  assistantConceptSearchTerms,
  understandAssistantProductQuery,
  type AssistantProductUnderstanding,
} from "./product-taxonomy";

export type RankedAssistantVariant = {
  id: string;
  size: string;
  currentPrice: number;
  regularPrice: number;
  salePrice: number | null;
  stockQuantity: number;
  availabilityStatus: string;
};

export type RankedAssistantProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  knowledgeText?: string;
  imageUrl: string | null;
  imageAlt: string;
  price: number | null;
  availabilityStatus?:
    | "coming_soon"
    | "in_stock"
    | "low_stock"
    | "out_of_stock"
    | "mixed"
    | "unavailable";

  variants: RankedAssistantVariant[];
};

export type RankedProductResult = {
  product: RankedAssistantProduct;
  score: number;
  reasons: string[];
};

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function contains(haystack: string, needle: string | null) {
  if (!needle) return false;

  return normalize(haystack).includes(normalize(needle));
}

function purchasableVariants(product: RankedAssistantProduct) {
  return product.variants.filter((variant) => {
    if (variant.stockQuantity <= 0) {
      return false;
    }

    const status = normalize(variant.availabilityStatus);

    return (
      status === "in_stock" || status === "low_stock" || status === "available"
    );
  });
}

function productMinimumPrice(product: RankedAssistantProduct) {
  const variants = purchasableVariants(product);

  if (variants.length === 0) {
    return product.price;
  }

  return Math.min(...variants.map((variant) => variant.currentPrice));
}

function productHasSale(product: RankedAssistantProduct) {
  return product.variants.some(
    (variant) =>
      variant.salePrice !== null &&
      variant.salePrice > 0 &&
      variant.regularPrice > variant.salePrice,
  );
}

function scoreBudget(price: number | null, request: ParsedAssistantRequest) {
  let score = 0;
  const reasons: string[] = [];

  if (price === null) {
    return { score, reasons };
  }

  if (request.budgetMin !== null && price < request.budgetMin) {
    score -= 8;
  }

  if (request.budgetMax !== null && price > request.budgetMax) {
    score -= 40;
    reasons.push("above budget");
  }

  if (
    request.budgetMin !== null &&
    request.budgetMax !== null &&
    price >= request.budgetMin &&
    price <= request.budgetMax
  ) {
    score += 28;
    reasons.push("fits budget");
  } else if (request.budgetMax !== null && price <= request.budgetMax) {
    score += 24;
    reasons.push("within budget");
  }

  return {
    score,
    reasons,
  };
}

function scoreUseCases(
  product: RankedAssistantProduct,
  request: ParsedAssistantRequest,
) {
  let score = 0;
  const reasons: string[] = [];

  const text = normalize(
    [product.name, product.category, product.description ?? ""].join(" "),
  );

  for (const useCase of request.useCases) {
    const normalizedUseCase = normalize(useCase);

    if (text.includes(normalizedUseCase)) {
      score += 10;
      reasons.push(`matches ${useCase}`);
    }

    if (
      normalizedUseCase === "gaming" &&
      /(gaming|gamer|playstation|xbox|nintendo|fps|console)/.test(text)
    ) {
      score += 14;
      reasons.push("gaming fit");
    }

    if (
      normalizedUseCase === "work" &&
      /(office|work|business|productivity|laptop|monitor|desktop)/.test(text)
    ) {
      score += 12;
      reasons.push("work fit");
    }

    if (
      normalizedUseCase === "school" &&
      /(student|school|study|tablet|laptop|notebook)/.test(text)
    ) {
      score += 12;
      reasons.push("school fit");
    }

    if (
      normalizedUseCase === "photography" &&
      /(camera|photo|video|gopro|instax|polaroid)/.test(text)
    ) {
      score += 14;
      reasons.push("photography fit");
    }

    if (
      normalizedUseCase === "music" &&
      /(audio|headphone|earbud|speaker|microphone|sound)/.test(text)
    ) {
      score += 14;
      reasons.push("audio fit");
    }

    if (
      normalizedUseCase === "fitness" &&
      /(fitness|watch|sport|running|workout)/.test(text)
    ) {
      score += 12;
      reasons.push("fitness fit");
    }

    if (
      normalizedUseCase === "travel" &&
      /(portable|wireless|compact|battery|travel)/.test(text)
    ) {
      score += 10;
      reasons.push("travel fit");
    }
  }

  return {
    score,
    reasons,
  };
}

export function rankAssistantProducts(
  products: RankedAssistantProduct[],
  request: ParsedAssistantRequest,
) {
  const understanding = requestProductUnderstanding(request);

  const ranked: RankedProductResult[] = products.map((product) => {
    let score = 0;
    const reasons: string[] = [];

    const price = productMinimumPrice(product);
    const available = purchasableVariants(product).length > 0;

    if (available) {
      score += 20;
      reasons.push("available");
    } else {
      score -= 100;
    }

    if (understanding.concept) {
      const intelligence = productIntelligenceTier(product, understanding);

      score += intelligence.score;

      if (
        request.productQuery &&
        explicitQueryMatches(product, request.productQuery)
      ) {
        score += understanding.concept ? 18 : 72;
        reasons.push(
          understanding.concept ? "query match" : "live catalog match",
        );
      }
    }

    if (request.category && contains(product.category, request.category)) {
      score += 36;
      reasons.push("category match");
    }

    if (request.brand && contains(product.name, request.brand)) {
      score += 34;
      reasons.push("brand match");
    }

    if (
      request.productQuery &&
      (contains(product.name, request.productQuery) ||
        contains(product.description ?? "", request.productQuery))
    ) {
      score += understanding.concept ? 18 : 30;
      reasons.push("query match");
    }

    const budget = scoreBudget(price, request);

    score += budget.score;
    reasons.push(...budget.reasons);

    const useCases = scoreUseCases(product, request);

    score += useCases.score;
    reasons.push(...useCases.reasons);

    if (request.wantsAvailableOnly && available) {
      score += 12;
    }

    if (request.wantsBestValue && productHasSale(product)) {
      score += 16;
      reasons.push("on sale");
    }

    if (request.wantsPremium && price !== null) {
      score += Math.min(14, price / 100);
    }

    if (request.wantsCheapest && price !== null) {
      score += Math.max(0, 25 - price / 20);
    }

    if (request.intent === "gift" && available) {
      score += 5;
      reasons.push("gift-ready");
    }

    return {
      product,
      score,
      reasons: Array.from(new Set(reasons)),
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    const aPrice = productMinimumPrice(a.product) ?? Number.POSITIVE_INFINITY;

    const bPrice = productMinimumPrice(b.product) ?? Number.POSITIVE_INFINITY;

    return aPrice - bPrice;
  });

  return ranked;
}

function normalizeCatalogMatch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function catalogProductText(product: RankedAssistantProduct) {
  return normalizeCatalogMatch(
    [
      product.name,
      product.category,
      product.description ?? "",
      product.knowledgeText ?? "",
    ].join(" "),
  );
}

function normalizedProductName(product: RankedAssistantProduct) {
  return normalizeCatalogMatch(product.name);
}

function phraseContained(haystack: string, needle: string) {
  const cleanNeedle = normalizeCatalogMatch(needle);

  if (!cleanNeedle) {
    return false;
  }

  return haystack.includes(cleanNeedle);
}

function productCategoryMatchesConcept(
  product: RankedAssistantProduct,
  understanding: AssistantProductUnderstanding,
) {
  const concept = understanding.concept;

  if (!concept) {
    return false;
  }

  const category = normalizeCatalogMatch(product.category);

  return concept.categories.some((candidate) => {
    const normalizedCandidate = normalizeCatalogMatch(candidate);

    if (!normalizedCandidate || !category) {
      return false;
    }

    return (
      category === normalizedCandidate ||
      category.includes(normalizedCandidate) ||
      normalizedCandidate.includes(category)
    );
  });
}

function productLooksLikeAccessory(product: RankedAssistantProduct) {
  const searchable = normalizeCatalogMatch(
    [product.name, product.category].join(" "),
  );

  return [
    "accessory",
    "accessories",
    "keyboard",
    "case",
    "cover",
    "charger",
    "charging",
    "cable",
    "adapter",
    "hub",
    "dock",
    "stand",
    "stylus",
    "pencil",
    "pen",
    "screen protector",
    "protector",
    "power bank",
    "mount",
  ].some((term) => searchable.includes(term));
}

function conceptAliases(understanding: AssistantProductUnderstanding) {
  const concept = understanding.concept;

  if (!concept) {
    return [];
  }

  return [understanding.matchedAlias, ...concept.aliases]
    .filter((value): value is string => Boolean(value))
    .map(normalizeCatalogMatch)
    .filter(Boolean)
    .sort((first, second) => second.length - first.length);
}

function productMatchesExactConcept(
  product: RankedAssistantProduct,
  understanding: AssistantProductUnderstanding,
) {
  const concept = understanding.concept;

  if (!concept) {
    return false;
  }

  const productName = normalizedProductName(product);

  const aliases = conceptAliases(understanding);

  const brands = (concept.brands ?? [])
    .map(normalizeCatalogMatch)
    .filter(Boolean);

  /*
   * Model/generation numbers are meaningful product identity.
   *
   * Example:
   *   request:  AirPods Max 2
   *   catalog:  Apple AirPods Max 2  -> valid exact match
   *   catalog:  Apple AirPods Max    -> not exact
   *   catalog:  Apple AirPods Max 3  -> not exact
   *
   * The same protection applies to product families such as
   * iPhone 17 Pro, Galaxy S26, Watch 11, etc.
   */
  const requestedNumbers: string[] =
    understanding.normalizedQuery.match(/\b\d+(?:\.\d+)?\b/g) ?? [];

  const productNumbers: string[] =
    productName.match(/\b\d+(?:\.\d+)?\b/g) ?? [];

  if (
    requestedNumbers.length > 0 &&
    !requestedNumbers.every((number) => productNumbers.includes(number))
  ) {
    return false;
  }

  return aliases.some((alias) => {
    if (!alias) {
      return false;
    }

    /*
     * Direct/unbranded product title:
     *
     *   AirPods Max
     *   AirPods Max 2
     *   iPad Pro 11-inch
     */
    if (productName === alias || productName.startsWith(`${alias} `)) {
      return true;
    }

    /*
     * Official brand-prefixed title:
     *
     *   Requested concept: AirPods Max
     *   Catalog title:     Apple AirPods Max 2
     *
     * A leading official brand must not downgrade a real product
     * to an "alternative" match.
     *
     * We only accept the brand at the beginning of the title.
     * This keeps accessory titles such as:
     *
     *   Magic Keyboard for iPad Pro
     *
     * from being classified as the exact requested product.
     */
    return brands.some((brand) => {
      const brandedAlias = alias.startsWith(`${brand} `)
        ? alias
        : `${brand} ${alias}`;

      return (
        productName === brandedAlias ||
        productName.startsWith(`${brandedAlias} `)
      );
    });
  });
}

function productMatchesConceptFamilyName(
  product: RankedAssistantProduct,
  understanding: AssistantProductUnderstanding,
) {
  const concept = understanding.concept;

  if (!concept) {
    return false;
  }

  const name = normalizedProductName(product);
  const family = normalizeCatalogMatch(concept.family);

  if (!family) {
    return false;
  }

  if (name === family || name.startsWith(`${family} `)) {
    return true;
  }

  return (concept.brands ?? []).some((brand) => {
    const normalizedBrand = normalizeCatalogMatch(brand);

    if (!normalizedBrand) {
      return false;
    }

    return (
      name === `${normalizedBrand} ${family}` ||
      name.startsWith(`${normalizedBrand} ${family} `)
    );
  });
}

function productMatchesCompatibleAccessory(
  product: RankedAssistantProduct,
  understanding: AssistantProductUnderstanding,
) {
  const concept = understanding.concept;

  if (!concept || !productLooksLikeAccessory(product)) {
    return false;
  }

  const searchable = catalogProductText(product);

  if (
    conceptAliases(understanding).some(
      (alias) => alias && searchable.includes(alias),
    )
  ) {
    return true;
  }

  const family = normalizeCatalogMatch(concept.family);

  if (family && searchable.includes(family)) {
    return true;
  }

  return false;
}

function productIntelligenceTier(
  product: RankedAssistantProduct,
  understanding: AssistantProductUnderstanding,
) {
  const concept = understanding.concept;

  if (!concept) {
    return {
      tier: 0,
      score: 0,
      reason: null as string | null,
    };
  }

  if (productMatchesExactConcept(product, understanding)) {
    return {
      tier: 5,
      score: 320,
      reason: "exact product match",
    };
  }

  /*
   * A true same-family product must present itself as that family.
   * Mentioning the family inside an accessory title is insufficient.
   */
  if (
    !productLooksLikeAccessory(product) &&
    productMatchesConceptFamilyName(product, understanding)
  ) {
    return {
      tier: 4,
      score: 190,
      reason: "product family match",
    };
  }

  /*
   * The catalog category is the strongest source of truth for
   * broader core-product fallback.
   *
   * iPad -> Tablets
   * MacBook -> Laptops
   * Apple Watch -> Smartwatches
   */
  if (
    !productLooksLikeAccessory(product) &&
    productCategoryMatchesConcept(product, understanding)
  ) {
    return {
      tier: 3,
      score: 130,
      reason: "semantic category match",
    };
  }

  const type = normalizeCatalogMatch(concept.type);
  const name = normalizedProductName(product);

  if (
    !productLooksLikeAccessory(product) &&
    type &&
    (name === type || name.startsWith(`${type} `) || name.includes(` ${type} `))
  ) {
    return {
      tier: 2,
      score: 100,
      reason: "product type match",
    };
  }

  /*
   * Accessories are deliberately LAST.
   *
   * This allows the assistant to say:
   *
   *   "I couldn't find the iPad itself, but I did find
   *    compatible accessories."
   *
   * instead of silently pretending a keyboard is an iPad.
   */
  if (productMatchesCompatibleAccessory(product, understanding)) {
    return {
      tier: 1,
      score: 55,
      reason: "compatible accessory",
    };
  }

  return {
    tier: 0,
    score: -140,
    reason: null as string | null,
  };
}

export type AssistantProductAvailability =
  | "in_stock"
  | "low_stock"
  | "partially_available"
  | "coming_soon"
  | "out_of_stock"
  | "unavailable";

export function assistantProductAvailability(
  product: RankedAssistantProduct,
): AssistantProductAvailability {
  const variants = product.variants;

  if (variants.length === 0) {
    return "unavailable";
  }

  const inStock = variants.some(
    (variant) =>
      variant.availabilityStatus === "in_stock" && variant.stockQuantity > 0,
  );

  const lowStock = variants.some(
    (variant) =>
      variant.availabilityStatus === "low_stock" && variant.stockQuantity > 0,
  );

  const comingSoon = variants.some(
    (variant) => variant.availabilityStatus === "coming_soon",
  );

  const unavailable = variants.some(
    (variant) =>
      variant.availabilityStatus === "out_of_stock" ||
      variant.availabilityStatus === "unavailable" ||
      (variant.stockQuantity <= 0 &&
        variant.availabilityStatus !== "coming_soon"),
  );

  if ((inStock || lowStock) && (comingSoon || unavailable)) {
    return "partially_available";
  }

  if (inStock) {
    return "in_stock";
  }

  if (lowStock) {
    return "low_stock";
  }

  if (comingSoon && !unavailable) {
    return "coming_soon";
  }

  if (unavailable) {
    return "out_of_stock";
  }

  return "unavailable";
}

export function assistantProductIsPurchasable(product: RankedAssistantProduct) {
  return product.variants.some(
    (variant) =>
      variant.stockQuantity > 0 &&
      variant.availabilityStatus !== "out_of_stock" &&
      variant.availabilityStatus !== "coming_soon" &&
      variant.availabilityStatus !== "unavailable",
  );
}

export function assistantResultRelationship(item: RankedProductResult) {
  if (item.reasons.includes("exact product match")) {
    return "exact" as const;
  }

  if (
    item.reasons.includes("product family match") ||
    item.reasons.includes("query match") ||
    item.reasons.includes("live catalog match")
  ) {
    return "close" as const;
  }

  if (
    item.reasons.includes("semantic category match") ||
    item.reasons.includes("category match") ||
    item.reasons.includes("brand match")
  ) {
    return "alternative" as const;
  }

  if (item.reasons.includes("compatible accessory")) {
    return "accessory" as const;
  }

  return "alternative" as const;
}

export function assistantAvailableAlternatives(
  ranked: RankedProductResult[],
  excludedProductId?: string | null,
  limit = 3,
) {
  const seen = new Set<string>();

  return ranked
    .filter(
      (item) =>
        item.product.id !== excludedProductId &&
        assistantResultRelationship(item) !== "accessory" &&
        assistantProductIsPurchasable(item.product),
    )
    .filter((item) => {
      if (seen.has(item.product.id)) {
        return false;
      }

      seen.add(item.product.id);
      return true;
    })
    .slice(0, limit);
}

function requestProductUnderstanding(request: ParsedAssistantRequest) {
  return understandAssistantProductQuery(request.productQuery || request.raw);
}

const strictCategoryFamilies: Record<string, string[]> = {
  phones: ["phone", "phones", "smartphone", "smartphones", "iphone", "mobile"],

  tablets: ["tablet", "tablets", "ipad", "galaxy tab"],

  watches: [
    "watch",
    "watches",
    "smartwatch",
    "smartwatches",
    "fitness watch",
    "fitness watches",
    "apple watch",
  ],

  computers: [
    "computer",
    "computers",
    "desktop",
    "desktops",
    "pc",
    "pcs",
    "laptop",
    "laptops",
    "macbook",
    "macbook pro",
    "macbook air",
  ],

  gaming: [
    "gaming",
    "console",
    "playstation",
    "xbox",
    "nintendo",
    "switch",
    "video game",
    "video games",
  ],

  audio: [
    "audio",
    "headphone",
    "headphones",
    "earphone",
    "earphones",
    "earbuds",
    "airpods",
    "speaker",
    "speakers",
    "microphone",
  ],

  cameras: ["camera", "cameras", "gopro", "instax", "polaroid", "photography"],

  monitors: ["monitor", "monitors", "screen", "screens", "display"],

  accessories: [
    "accessory",
    "accessories",
    "charger",
    "chargers",
    "cable",
    "cables",
    "adapter",
    "adapters",
    "power bank",
  ],

  "phone cases": [
    "phone case",
    "phone cases",
    "iphone case",
    "iphone cases",
    "cover",
    "covers",
    "case",
    "cases",
  ],
};

function explicitCategoryMatches(
  product: RankedAssistantProduct,
  requestedCategory: string,
) {
  const category = normalizeCatalogMatch(requestedCategory);
  const searchable = catalogProductText(product);

  const family = strictCategoryFamilies[category] ?? [category];

  return family.some((term) =>
    searchable.includes(normalizeCatalogMatch(term)),
  );
}

function catalogWordRoot(value: string) {
  const word = normalizeCatalogMatch(value);

  if (!word) {
    return "";
  }

  if (word.endsWith("ies") && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }

  if (
    word.endsWith("es") &&
    word.length > 4 &&
    /(ches|shes|xes|zes|sses)$/.test(word)
  ) {
    return word.slice(0, -2);
  }

  if (
    word.endsWith("s") &&
    word.length > 3 &&
    !word.endsWith("ss") &&
    !word.endsWith("us") &&
    !word.endsWith("is")
  ) {
    return word.slice(0, -1);
  }

  return word;
}

function catalogEditDistance(first: string, second: string) {
  if (first === second) {
    return 0;
  }

  if (!first.length) {
    return second.length;
  }

  if (!second.length) {
    return first.length;
  }

  const previous = Array.from(
    { length: second.length + 1 },
    (_, index) => index,
  );

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let diagonal = previous[0];
    previous[0] = firstIndex;

    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const oldPrevious = previous[secondIndex];

      const insertion = previous[secondIndex - 1] + 1;
      const deletion = previous[secondIndex] + 1;
      const substitution =
        diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1);

      previous[secondIndex] = Math.min(insertion, deletion, substitution);

      diagonal = oldPrevious;
    }
  }

  return previous[second.length];
}

function catalogTermsAreFuzzyMatch(requested: string, candidate: string) {
  if (!requested || !candidate) {
    return false;
  }

  if (requested === candidate) {
    return true;
  }

  const lengthDifference = Math.abs(requested.length - candidate.length);

  if (lengthDifference > 2) {
    return false;
  }

  const shortestLength = Math.min(requested.length, candidate.length);

  if (shortestLength < 4) {
    return false;
  }

  const distance = catalogEditDistance(requested, candidate);

  if (shortestLength <= 5) {
    return distance <= 1;
  }

  if (shortestLength <= 8) {
    return distance <= 2;
  }

  return distance <= 2;
}

function catalogTermMatchesVocabulary(
  requested: string,
  searchableRoots: Set<string>,
) {
  if (searchableRoots.has(requested)) {
    return true;
  }

  for (const candidate of searchableRoots) {
    if (catalogTermsAreFuzzyMatch(requested, candidate)) {
      return true;
    }
  }

  return false;
}

function catalogWordRoots(value: string) {
  return normalizeCatalogMatch(value)
    .split(/\s+/)
    .map(catalogWordRoot)
    .filter(Boolean);
}

function meaningfulCatalogQueryTerms(query: string) {
  const ignored = new Set([
    "a",
    "about",
    "actually",
    "all",
    "am",
    "an",
    "and",
    "any",
    "anything",
    "are",
    "around",
    "at",
    "available",
    "availability",
    "be",
    "been",
    "being",
    "best",
    "buy",
    "buying",
    "can",
    "could",
    "do",
    "does",
    "for",
    "find",
    "from",
    "get",
    "getting",
    "give",
    "good",
    "got",
    "have",
    "has",
    "hello",
    "help",
    "hey",
    "hi",
    "i",
    "id",
    "ill",
    "im",
    "in",
    "is",
    "it",
    "ive",
    "just",
    "like",
    "look",
    "looking",
    "me",
    "my",
    "need",
    "needed",
    "needs",
    "new",
    "of",
    "on",
    "one",
    "our",
    "please",
    "purchase",
    "recommend",
    "recommendation",
    "search",
    "searching",
    "show",
    "some",
    "something",
    "the",
    "there",
    "to",
    "trying",
    "want",
    "wanted",
    "wants",
    "was",
    "we",
    "were",
    "with",
    "would",
    "you",
    "your",

    "bonjour",
    "bonsoir",
    "cherche",
    "chercher",
    "cherches",
    "cherchez",
    "je",
    "jai",
    "j",
    "veux",
    "voudrais",
    "besoin",
    "montre",
    "montrez",
    "moi",
    "svp",
    "sil",
    "vous",
    "plait",
    "avez",
    "avoir",
    "un",
    "une",
    "des",
    "du",
    "de",
    "le",
    "la",
    "les",
    "pour",
    "avec",
    "dans",
    "sur",
    "quelque",
    "chose",

    "بدي",
    "اريد",
    "أريد",
    "عندك",
    "عندكم",
    "في",
    "من",
    "على",
    "لو",
    "سمحت",
    "اعطيني",
    "أعطيني",
    "فرجيني",
  ]);

  return normalizeCatalogMatch(query)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        (word.length >= 2 || /^\d+(?:\.\d+)?$/.test(word)) &&
        !ignored.has(word),
    );
}

function explicitQueryMatches(
  product: RankedAssistantProduct,
  requestedQuery: string,
) {
  const searchable = catalogProductText(product);
  const normalizedQuery = normalizeCatalogMatch(requestedQuery);

  if (!normalizedQuery) {
    return true;
  }

  if (searchable.includes(normalizedQuery)) {
    return true;
  }

  const terms = meaningfulCatalogQueryTerms(requestedQuery);

  if (terms.length === 0) {
    return true;
  }

  const searchableRoots = new Set(catalogWordRoots(searchable));

  const termRoots = terms.map(catalogWordRoot).filter(Boolean);

  const matchedRoots = termRoots.filter((term) =>
    catalogTermMatchesVocabulary(term, searchableRoots),
  );

  if (termRoots.length === 1) {
    return matchedRoots.length === 1;
  }

  /*
   * Natural customer sentences frequently contain extra
   * descriptive words that may not exist literally in the
   * product record. A strong catalog term should therefore be
   * enough for short queries, while longer searches still
   * require multiple pieces of evidence.
   */
  const requiredMatches =
    termRoots.length <= 3 ? 1 : Math.max(2, Math.ceil(termRoots.length * 0.5));

  return matchedRoots.length >= requiredMatches;
}

function passesExplicitCatalogGate(
  item: ReturnType<typeof rankAssistantProducts>[number],
  request: ParsedAssistantRequest,
) {
  const understanding = requestProductUnderstanding(request);

  if (understanding.concept) {
    return productIntelligenceTier(item.product, understanding).tier > 0;
  }

  if (request.productQuery) {
    return explicitQueryMatches(item.product, request.productQuery);
  }

  if (request.category) {
    return explicitCategoryMatches(item.product, request.category);
  }

  return true;
}

export function topAssistantProducts(
  products: RankedAssistantProduct[],
  request: ParsedAssistantRequest,
  limit = 4,
) {
  const understanding = requestProductUnderstanding(request);

  const ranked = rankAssistantProducts(products, request)
    .filter((item) => passesExplicitCatalogGate(item, request))
    .filter((item) => item.score > -50);

  if (understanding.concept) {
    const exactMatches = ranked.filter(
      (item) => productIntelligenceTier(item.product, understanding).tier === 5,
    );

    if (exactMatches.length > 0) {
      return exactMatches.slice(0, 1);
    }

    const highestSemanticTier = ranked.reduce(
      (highest, item) =>
        Math.max(
          highest,
          productIntelligenceTier(item.product, understanding).tier,
        ),
      0,
    );

    if (highestSemanticTier > 0) {
      const strongestMatches = ranked.filter(
        (item) =>
          productIntelligenceTier(item.product, understanding).tier ===
          highestSemanticTier,
      );

      if (strongestMatches.length > 0) {
        return strongestMatches.slice(0, Math.max(1, Math.min(limit, 8)));
      }
    }
  }

  return ranked.slice(0, Math.max(1, Math.min(limit, 8)));
}
