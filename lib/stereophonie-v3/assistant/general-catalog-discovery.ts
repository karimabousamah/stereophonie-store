/*
 * ST_ASSISTANT_GENERAL_CATALOG_DISCOVERY_V1
 *
 * Discover published products using authentic product names,
 * assigned categories, subcategory hierarchy and brands.
 *
 * The AI can suggest a search phrase but never supplies products.
 * Every returned ID must exist in the live published catalogue.
 *
 * Existing exact-model and accessory compatibility paths remain
 * authoritative. Ambiguous follow-ups must not be treated as
 * unrelated product searches.
 */

type Named = { name?: string | null } | null;

type Relation = Named | Named[];

type IndexedItem = {
  id: string;
  name: string;
  categories?: Relation;
  brands?: Relation;
  searchCategoryNames?: string[];
  product_category_assignments?: Array<{
    categories?: Relation;
  }> | null;
};

type Language = "en" | "fr" | "ar";

export type GeneralCatalogQuery = {
  query: string;
  explicit: boolean;
};

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function singular(value: string): string {
  if (value === "mice") return "mouse";
  if (value === "men") return "man";
  if (value === "women") return "woman";

  if (value.length > 4 && value.endsWith("ies")) {
    return value.slice(0, -3) + "y";
  }

  if (
    value.length > 4 &&
    /(?:ches|shes|sses|xes|zes)$/.test(value)
  ) {
    return value.slice(0, -2);
  }

  if (
    value.length > 3 &&
    value.endsWith("s") &&
    !value.endsWith("ss") &&
    !value.endsWith("us")
  ) {
    return value.slice(0, -1);
  }

  return value;
}

function terms(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter(Boolean)
    .map(singular);
}

function relationNames(value: Relation | undefined): string[] {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];

  return values
    .map((item) => item?.name?.trim() ?? "")
    .filter(Boolean);
}

function containsTerms(
  request: string[],
  candidate: string
): boolean {
  const available = new Set(terms(candidate));

  return request.every((term) => available.has(term));
}

function allRequiredTerms(
  request: string[],
  ...fields: string[]
): boolean {
  return containsTerms(request, fields.join(" "));
}

function isModelSensitive(query: string): boolean {
  return (
    /\b(?:iphone|ipad|galaxy|pixel|macbook)\b.*\b\d+\b/.test(
      query
    ) ||
    /\b(?:ps[345]|playstation [345])\b/.test(query)
  );
}

const directShopping =
  /^(?:(?:hello|hi|hey) )?(?:do (?:you|u) (?:have|sell|carry|stock)|(?:can|could) (?:you|u) (?:show|find|sell)|(?:show|find) me|(?:i am|i m|im) looking for|looking for|(?:i want|i need)|(?:have|got) (?:you|u) got|are there any|is there (?:a|an|any)|any |(?:what|which) (?:products|items) do (?:you|u) have)\b/;

export function getGeneralCatalogQuery(
  originalMessage: string,
  interpretedMessage: string,
  parsedIntent: string,
  aiIntent: string | null,
): GeneralCatalogQuery | null {
  const original = normalize(originalMessage);
  const rawQuery = normalize(interpretedMessage);

  const explicit = directShopping.test(original);

  if (
    !["product_search", "availability", "unknown"].includes(
      parsedIntent
    )
  ) {
    return null;
  }

  if (
    aiIntent &&
    !["product_search", "availability"].includes(aiIntent)
  ) {
    return null;
  }

  if (
    /\b(?:recommend|recommendation|best|better|compare|comparison|versus|vs|budget|cheapest|discount|offers?|sale)\b/.test(
      original
    )
  ) {
    return null;
  }

  if (
    /\b(?:my order|my cart|my wishlist|track my|refund|return my|opening hours|your location|your address)\b/.test(
      original
    )
  ) {
    return null;
  }

  if (
    !explicit &&
    parsedIntent !== "product_search" &&
    aiIntent !== "product_search" &&
    !(
      parsedIntent === "unknown" &&
      original.length > 2 &&
      original.split(" ").length <= 3 &&
      !/\b(?:hello|hi|hey|thanks|thank|bye|yes|no|ok|okay|help|where|when|why|how|who|what)\b/.test(
        original
      )
    )
  ) {
    return null;
  }

  let query = rawQuery
    .replace(
      /^(?:(?:hello|hi|hey) )?(?:do (?:you|u) (?:have|sell|carry|stock)|(?:can|could) (?:you|u) (?:show|find|sell)(?: me)?|(?:show|find) me|(?:i am|i m|im) looking for|looking for|(?:i want|i need)|(?:have|got) (?:you|u) got|are there any|is there (?:a|an|any)|any|(?:what|which) (?:products|items) do (?:you|u) have)\s+/,
      "",
    )
    .replace(/^(?:a|an|the|some|any)\s+/, "")
    .replace(/\b(?:please|in stock|right now|currently)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    query.length < 2 ||
    query.length > 100 ||
    query.split(" ").length > 7 ||
    isModelSensitive(query)
  ) {
    return null;
  }

  if (
    /^(?:something|anything|everything|product|products|stuff|things|it|this|that|one|ones)$/.test(
      query
    )
  ) {
    return null;
  }

  return { query, explicit };
}

function score(
  item: IndexedItem,
  query: string
): number {
  const requested = terms(query);

  if (!requested.length) return 0;

  const name = normalize(item.name);
  const directCategories = relationNames(item.categories);
  const assignmentCategories = (
    item.product_category_assignments ?? []
  ).flatMap((assignment) =>
    relationNames(assignment.categories)
  );
  const hierarchy = item.searchCategoryNames ?? [];
  const brands = relationNames(item.brands);

  if (name === query) return 200;

  if (containsTerms(requested, name)) {
    return 160;
  }

  if (
    directCategories.some(
      (category) => normalize(category) === query
    )
  ) {
    return 145;
  }

  if (
    [...directCategories, ...assignmentCategories].some(
      (category) => containsTerms(requested, category)
    )
  ) {
    return 130;
  }

  if (
    hierarchy.some(
      (category) => containsTerms(requested, category)
    )
  ) {
    return 115;
  }

  if (
    allRequiredTerms(
      requested,
      item.name,
      brands.join(" "),
    )
  ) {
    return 105;
  }

  if (
    brands.some(
      (brand) => containsTerms(requested, brand)
    )
  ) {
    return 95;
  }

  return 0;
}

export function matchGeneralCatalogProducts<
  T extends { id: string; name: string }
>(
  indexed: IndexedItem[],
  publishedCatalog: T[],
  query: string,
  limit = 4,
): T[] {
  const byId = new Map(
    publishedCatalog.map((item) => [item.id, item])
  );

  const matches: Array<{
    product: T;
    score: number;
    order: number;
  }> = [];

  for (const [order, item] of indexed.entries()) {
    const product = byId.get(item.id);

    if (!product) continue;

    const relevance = score(item, normalize(query));

    if (relevance <= 0) continue;

    matches.push({
      product,
      score: relevance,
      order,
    });
  }

  matches.sort(
    (a, b) =>
      b.score - a.score ||
      a.order - b.order
  );

  return matches
    .slice(0, Math.max(1, Math.min(limit, 12)))
    .map((entry) => entry.product);
}

export function generalCatalogFoundMessage(
  count: number,
  language: Language,
): string {
  if (language === "fr") {
    return `J’ai trouvé ${count} produit${count > 1 ? "s" : ""} correspondant à votre recherche dans notre catalogue actuel. Souhaitez-vous comparer les options ou vérifier une caractéristique en particulier ?`;
  }

  if (language === "ar") {
    return `وجدت ${count} من المنتجات المطابقة لطلبك في كتالوجنا الحالي. هل ترغب في مقارنة الخيارات أو التحقق من ميزة معينة؟`;
  }

  return `I found ${count} matching product${count === 1 ? "" : "s"} in our current catalogue. Would you like help comparing the options or checking a particular feature?`;
}

export function generalCatalogNotFoundMessage(
  language: Language,
): string {
  if (language === "fr") {
    return "Je n’ai pas trouvé de produit correspondant à votre demande dans notre catalogue publié actuel. Si vous avez une marque ou un modèle précis en tête, je peux vous aider à vérifier d’autres options pertinentes.";
  }

  if (language === "ar") {
    return "لم أجد منتجاً مطابقاً لطلبك ضمن كتالوجنا المنشور حالياً. إذا كان لديك اسم علامة تجارية أو موديل محدد، يمكنني مساعدتك في التحقق من خيارات أخرى مناسبة.";
  }

  return "I couldn't find a matching product in our current published catalogue. If you have a particular brand or model in mind, I can help check other relevant options.";
}
