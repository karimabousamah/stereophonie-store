import type {
  ParsedAssistantRequest,
} from "./local-intelligence";

import type {
  RankedAssistantProduct,
} from "./product-ranking";

export type MemoryMessage = {
  role: "assistant" | "user";
  content: string;
};

export type AssistantConversationMemory = {
  category: string | null;
  brand: string | null;

  budgetMin: number | null;
  budgetMax: number | null;

  useCases: string[];
  recipient: string | null;

  displayedProducts: RankedAssistantProduct[];

  lastUserMessage: string | null;
};

export const emptyAssistantMemory: AssistantConversationMemory = {
  category: null,
  brand: null,

  budgetMin: null,
  budgetMax: null,

  useCases: [],
  recipient: null,

  displayedProducts: [],

  lastUserMessage: null,
};


function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}


function unique(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}


export function mergeAssistantMemory(
  memory: AssistantConversationMemory,
  request: ParsedAssistantRequest,
): AssistantConversationMemory {
  return {
    category:
      request.category ??
      memory.category,

    brand:
      request.brand ??
      memory.brand,

    budgetMin:
      request.budgetMin ??
      memory.budgetMin,

    budgetMax:
      request.budgetMax ??
      memory.budgetMax,

    useCases:
      request.useCases.length > 0
        ? unique([
            ...memory.useCases,
            ...request.useCases,
          ])
        : memory.useCases,

    recipient:
      request.recipient ??
      memory.recipient,

    displayedProducts:
      memory.displayedProducts,

    lastUserMessage:
      request.raw,
  };
}


export function withDisplayedProducts(
  memory: AssistantConversationMemory,
  products: RankedAssistantProduct[],
) {
  return {
    ...memory,
    displayedProducts:
      products.slice(0, 8),
  };
}


function extractOrdinalFromLooseLanguage(
  text: string,
) {
  const normalized = normalize(text);

  const mappings: [RegExp, number][] = [
    [/\b(first|1st|number 1|one)\b/, 1],
    [/\b(second|2nd|number 2|two)\b/, 2],
    [/\b(third|3rd|number 3|three)\b/, 3],
    [/\b(fourth|4th|number 4|four)\b/, 4],
    [/\b(last)\b/, -1],
  ];

  for (const [pattern, value] of mappings) {
    if (pattern.test(normalized)) {
      return value;
    }
  }

  return null;
}


export function resolveReferencedProduct(
  raw: string,
  memory: AssistantConversationMemory,
) {
  const products =
    memory.displayedProducts;

  if (products.length === 0) {
    return null;
  }

  const normalized =
    normalize(raw);

  const ordinal =
    extractOrdinalFromLooseLanguage(
      normalized,
    );

  if (ordinal !== null) {
    if (ordinal === -1) {
      return products.at(-1) ?? null;
    }

    return products[ordinal - 1] ?? null;
  }


  if (
    /\b(that one|this one|it|the one)\b/.test(
      normalized,
    )
  ) {
    return products.at(-1) ?? null;
  }


  for (const product of products) {
    const productName =
      normalize(product.name);

    if (
      normalized.includes(productName) ||
      productName.includes(normalized)
    ) {
      return product;
    }
  }


  const words =
    normalized
      .split(" ")
      .filter((word) => word.length >= 4);

  const scored =
    products
      .map((product) => {
        const text = normalize(
          [
            product.name,
            product.category,
            product.description ?? "",
          ].join(" "),
        );

        const matches =
          words.filter((word) =>
            text.includes(word),
          ).length;

        return {
          product,
          matches,
        };
      })
      .sort(
        (first, second) =>
          second.matches - first.matches,
      );


  if (
    scored.length > 0 &&
    scored[0].matches > 0
  ) {
    return scored[0].product;
  }


  return null;
}


export function resolveCheapestDisplayedProduct(
  memory: AssistantConversationMemory,
) {
  const products =
    memory.displayedProducts.filter(
      (product) =>
        product.price !== null,
    );

  if (products.length === 0) {
    return null;
  }

  return [...products].sort(
    (first, second) =>
      (first.price ?? Infinity) -
      (second.price ?? Infinity),
  )[0];
}


export function resolveMostExpensiveDisplayedProduct(
  memory: AssistantConversationMemory,
) {
  const products =
    memory.displayedProducts.filter(
      (product) =>
        product.price !== null,
    );

  if (products.length === 0) {
    return null;
  }

  return [...products].sort(
    (first, second) =>
      (second.price ?? -Infinity) -
      (first.price ?? -Infinity),
  )[0];
}


export function applyMemoryToRequest(
  request: ParsedAssistantRequest,
  memory: AssistantConversationMemory,
): ParsedAssistantRequest {
  const normalized =
    normalize(request.raw);

  const followUp =
    /\b(cheaper|cheaper one|less expensive|another|another one|similar|something else|more premium|better one|same brand|same category|encore|moins cher|autre)\b/.test(
      normalized,
    );


  if (!followUp) {
    return request;
  }


  return {
    ...request,

    category:
      request.category ??
      memory.category,

    brand:
      request.brand ??
      (
        normalized.includes("same brand")
          ? memory.brand
          : null
      ),

    budgetMin:
      request.budgetMin ??
      memory.budgetMin,

    budgetMax:
      request.budgetMax ??
      memory.budgetMax,

    useCases:
      request.useCases.length > 0
        ? request.useCases
        : memory.useCases,

    recipient:
      request.recipient ??
      memory.recipient,

    confidence:
      Math.min(
        0.98,
        request.confidence + 0.12,
      ),

    needsClarification:
      false,
  };
}
