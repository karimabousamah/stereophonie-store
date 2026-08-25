import type {
  ParsedAssistantRequest,
} from "./local-intelligence";

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
  imageUrl: string | null;
  imageAlt: string;
  price: number | null;
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

function purchasableVariants(
  product: RankedAssistantProduct,
) {
  return product.variants.filter((variant) => {
    if (variant.stockQuantity <= 0) {
      return false;
    }

    const status = normalize(
      variant.availabilityStatus,
    );

    return (
      status === "in_stock" ||
      status === "low_stock" ||
      status === "available"
    );
  });
}

function productMinimumPrice(
  product: RankedAssistantProduct,
) {
  const variants = purchasableVariants(product);

  if (variants.length === 0) {
    return product.price;
  }

  return Math.min(
    ...variants.map((variant) => variant.currentPrice),
  );
}

function productHasSale(
  product: RankedAssistantProduct,
) {
  return product.variants.some(
    (variant) =>
      variant.salePrice !== null &&
      variant.salePrice > 0 &&
      variant.regularPrice > variant.salePrice,
  );
}

function scoreBudget(
  price: number | null,
  request: ParsedAssistantRequest,
) {
  let score = 0;
  const reasons: string[] = [];

  if (price === null) {
    return { score, reasons };
  }

  if (
    request.budgetMin !== null &&
    price < request.budgetMin
  ) {
    score -= 8;
  }

  if (
    request.budgetMax !== null &&
    price > request.budgetMax
  ) {
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
  } else if (
    request.budgetMax !== null &&
    price <= request.budgetMax
  ) {
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
    [
      product.name,
      product.category,
      product.description ?? "",
    ].join(" "),
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
  const ranked: RankedProductResult[] =
    products.map((product) => {
      let score = 0;
      const reasons: string[] = [];

      const price = productMinimumPrice(product);
      const available =
        purchasableVariants(product).length > 0;

      if (available) {
        score += 20;
        reasons.push("available");
      } else {
        score -= 100;
      }

      if (
        request.category &&
        contains(product.category, request.category)
      ) {
        score += 36;
        reasons.push("category match");
      }

      if (
        request.brand &&
        contains(product.name, request.brand)
      ) {
        score += 34;
        reasons.push("brand match");
      }

      if (
        request.productQuery &&
        (
          contains(product.name, request.productQuery) ||
          contains(product.description ?? "", request.productQuery)
        )
      ) {
        score += 30;
        reasons.push("query match");
      }

      const budget = scoreBudget(
        price,
        request,
      );

      score += budget.score;
      reasons.push(...budget.reasons);

      const useCases = scoreUseCases(
        product,
        request,
      );

      score += useCases.score;
      reasons.push(...useCases.reasons);

      if (
        request.wantsAvailableOnly &&
        available
      ) {
        score += 12;
      }

      if (
        request.wantsBestValue &&
        productHasSale(product)
      ) {
        score += 16;
        reasons.push("on sale");
      }

      if (
        request.wantsPremium &&
        price !== null
      ) {
        score += Math.min(
          14,
          price / 100,
        );
      }

      if (
        request.wantsCheapest &&
        price !== null
      ) {
        score += Math.max(
          0,
          25 - price / 20,
        );
      }

      if (
        request.intent === "gift" &&
        available
      ) {
        score += 5;
        reasons.push("gift-ready");
      }

      return {
        product,
        score,
        reasons: Array.from(
          new Set(reasons),
        ),
      };
    });

  ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    const aPrice =
      productMinimumPrice(a.product) ??
      Number.POSITIVE_INFINITY;

    const bPrice =
      productMinimumPrice(b.product) ??
      Number.POSITIVE_INFINITY;

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

const strictCategoryFamilies: Record<string, string[]> = {
  phones: [
    "phone",
    "phones",
    "smartphone",
    "smartphones",
    "iphone",
    "mobile",
  ],

  tablets: [
    "tablet",
    "tablets",
    "ipad",
    "galaxy tab",
  ],

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

  cameras: [
    "camera",
    "cameras",
    "gopro",
    "instax",
    "polaroid",
    "photography",
  ],

  monitors: [
    "monitor",
    "monitors",
    "screen",
    "screens",
    "display",
  ],

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

  const searchable = normalizeCatalogMatch(
    [
      product.name,
      product.category,
      product.description ?? "",
    ].join(" "),
  );

  const family =
    strictCategoryFamilies[category] ??
    [category];

  return family.some((term) =>
    searchable.includes(
      normalizeCatalogMatch(term),
    ),
  );
}

function explicitQueryMatches(
  product: RankedAssistantProduct,
  query: string,
) {
  const searchable = normalizeCatalogMatch(
    [
      product.name,
      product.category,
      product.description ?? "",
    ].join(" "),
  );

  const words = normalizeCatalogMatch(query)
    .split(" ")
    .filter((word) => word.length >= 3)
    .filter(
      (word) =>
        ![
          "the",
          "and",
          "for",
          "with",
          "want",
          "have",
          "show",
          "find",
          "buy",
          "new",
          "any",
          "available",
          "looking",
        ].includes(word),
    );

  if (words.length === 0) {
    return true;
  }

  return words.some((word) =>
    searchable.includes(word),
  );
}

function passesExplicitCatalogGate(
  item: ReturnType<typeof rankAssistantProducts>[number],
  request: ParsedAssistantRequest,
) {
  if (request.category) {
    return explicitCategoryMatches(
      item.product,
      request.category,
    );
  }

  if (request.productQuery) {
    return explicitQueryMatches(
      item.product,
      request.productQuery,
    );
  }

  return true;
}

export function topAssistantProducts(
  products: RankedAssistantProduct[],
  request: ParsedAssistantRequest,
  limit = 4,
) {
  return rankAssistantProducts(
    products,
    request,
  )
    .filter((item) =>
      passesExplicitCatalogGate(
        item,
        request,
      ),
    )
    .filter((item) => item.score > -50)
    .slice(
      0,
      Math.max(
        1,
        Math.min(limit, 8),
      ),
    );
}
