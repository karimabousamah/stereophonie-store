export type AssistantLanguage = "en" | "fr" | "ar";

export type AssistantIntent =
  | "greeting"
  | "help"
  | "product_search"
  | "recommendation"
  | "gift"
  | "comparison"
  | "price_question"
  | "availability"
  | "offers"
  | "cart"
  | "wishlist"
  | "order_tracking"
  | "store_info"
  | "unknown";

export type ParsedAssistantRequest = {
  raw: string;
  normalized: string;
  language: AssistantLanguage;
  intent: AssistantIntent;

  budgetMin: number | null;
  budgetMax: number | null;

  category: string | null;
  brand: string | null;
  productQuery: string | null;

  useCases: string[];
  recipient: string | null;

  ordinal: number | null;

  wantsCheapest: boolean;
  wantsBestValue: boolean;
  wantsPremium: boolean;
  wantsAvailableOnly: boolean;

  confidence: number;
  needsClarification: boolean;
};

const categoryDictionary: Record<string, string[]> = {
  phones: [
    "phone",
    "phones",
    "smartphone",
    "smartphones",
    "iphone",
    "samsung phone",
    "mobile",
    "telephone",
    "téléphone",
    "هاتف",
    "موبايل",
  ],

  tablets: [
    "tablet",
    "tablets",
    "ipad",
    "galaxy tab",
    "tablette",
    "تابلت",
  ],

  gaming: [
    "gaming",
    "gamer",
    "console",
    "playstation",
    "ps5",
    "xbox",
    "nintendo",
    "switch",
    "jeu",
    "ألعاب",
  ],

  audio: [
    "audio",
    "headphone",
    "headphones",
    "earbuds",
    "earphones",
    "airpods",
    "speaker",
    "microphone",
    "mic",
    "casque",
    "écouteurs",
    "سماعات",
    "مايك",
  ],

  cameras: [
    "camera",
    "cameras",
    "gopro",
    "instax",
    "polaroid",
    "photo",
    "photography",
    "caméra",
    "كاميرا",
  ],

  watches: [
    "watch",
    "smartwatch",
    "fitness watch",
    "apple watch",
    "montre",
    "ساعة",
  ],

  computers: [
    "computer",
    "desktop",
    "pc",
    "gaming pc",
    "laptop",
    "macbook",
    "ordinateur",
    "حاسوب",
    "لابتوب",
  ],

  monitors: [
    "monitor",
    "monitors",
    "screen",
    "display",
    "écran",
    "شاشة",
  ],

  accessories: [
    "accessory",
    "accessories",
    "charger",
    "cable",
    "adapter",
    "power bank",
    "accessoire",
    "اكسسوار",
  ],

  "phone cases": [
    "phone case",
    "phone cases",
    "iphone case",
    "cover",
    "covers",
    "coque",
    "كفر",
  ],
};

const brandDictionary = [
  "apple",
  "samsung",
  "sony",
  "microsoft",
  "xbox",
  "playstation",
  "nintendo",
  "logitech",
  "jbl",
  "bose",
  "anker",
  "huawei",
  "xiaomi",
  "lenovo",
  "asus",
  "acer",
  "hp",
  "dell",
  "canon",
  "nikon",
  "gopro",
  "instax",
  "polaroid",
  "rode",
];

const useCaseDictionary: Record<string, string[]> = {
  gaming: [
    "gaming",
    "game",
    "gamer",
    "fps",
    "play games",
  ],

  work: [
    "work",
    "office",
    "professional",
    "business",
    "bureau",
  ],

  school: [
    "school",
    "university",
    "college",
    "student",
    "study",
    "étudiant",
  ],

  travel: [
    "travel",
    "trip",
    "vacation",
    "voyage",
  ],

  fitness: [
    "fitness",
    "gym",
    "sport",
    "running",
    "workout",
  ],

  photography: [
    "photo",
    "photography",
    "video",
    "vlogging",
    "creator",
  ],

  gift: [
    "gift",
    "present",
    "birthday",
    "christmas",
    "cadeau",
    "هدية",
  ],

  music: [
    "music",
    "audio",
    "listen",
    "sound",
    "musique",
  ],
};

function clean(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}$€£\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(clean(word)));
}

function detectLanguage(raw: string): AssistantLanguage {
  if (/[\u0600-\u06FF]/.test(raw)) {
    return "ar";
  }

  const value = clean(raw);

  if (
    containsAny(value, [
      "bonjour",
      "salut",
      "je veux",
      "je cherche",
      "pour moi",
      "cadeau",
      "combien",
      "quel",
      "quelle",
      "moins de",
    ])
  ) {
    return "fr";
  }

  return "en";
}

function extractMoney(text: string) {
  const numbers = Array.from(
    text.matchAll(
      /(?:\$|usd|dollars?|€|eur)?\s*(\d+(?:\.\d+)?)/gi,
    ),
  ).map((match) => Number(match[1]));

  let min: number | null = null;
  let max: number | null = null;

  const under = text.match(
    /(?:under|below|less than|max(?:imum)?|up to|moins de|maximum)\s*\$?\s*(\d+(?:\.\d+)?)/i,
  );

  if (under) {
    max = Number(under[1]);
  }

  const over = text.match(
    /(?:over|above|more than|min(?:imum)?|at least|plus de)\s*\$?\s*(\d+(?:\.\d+)?)/i,
  );

  if (over) {
    min = Number(over[1]);
  }

  const between = text.match(
    /(?:between|from|entre)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to|-|et|a)\s*\$?\s*(\d+(?:\.\d+)?)/i,
  );

  if (between) {
    min = Number(between[1]);
    max = Number(between[2]);
  }

  if (
    min === null &&
    max === null &&
    numbers.length === 1 &&
    containsAny(text, [
      "budget",
      "spend",
      "price",
      "cost",
      "around",
      "about",
      "approximately",
    ])
  ) {
    max = numbers[0];
  }

  return {
    min,
    max,
  };
}

function detectCategory(text: string) {
  for (const [category, aliases] of Object.entries(categoryDictionary)) {
    if (containsAny(text, aliases)) {
      return category;
    }
  }

  return null;
}

function detectBrand(text: string) {
  return (
    brandDictionary.find((brand) =>
      text.includes(brand),
    ) ?? null
  );
}

function detectUseCases(text: string) {
  return Object.entries(useCaseDictionary)
    .filter(([, aliases]) => containsAny(text, aliases))
    .map(([name]) => name);
}

function detectRecipient(text: string) {
  const recipients = [
    "brother",
    "sister",
    "mother",
    "mom",
    "father",
    "dad",
    "boyfriend",
    "girlfriend",
    "husband",
    "wife",
    "friend",
    "son",
    "daughter",
    "kid",
    "child",
  ];

  return recipients.find((recipient) => text.includes(recipient)) ?? null;
}

function detectOrdinal(text: string) {
  const values: [RegExp, number][] = [
    [/\b(first|1st|number one)\b/, 1],
    [/\b(second|2nd|number two)\b/, 2],
    [/\b(third|3rd|number three)\b/, 3],
    [/\b(fourth|4th|number four)\b/, 4],
  ];

  for (const [pattern, value] of values) {
    if (pattern.test(text)) {
      return value;
    }
  }

  return null;
}

function detectIntent(text: string): AssistantIntent {
  if (
    containsAny(text, [
      "hello",
      "hi",
      "hey",
      "bonjour",
      "salut",
      "مرحبا",
      "اهلا",
    ])
  ) {
    return "greeting";
  }

  if (
    containsAny(text, [
      "track my order",
      "track order",
      "track my latest order",
      "track my last order",
      "track latest order",
      "track last order",
      "where is my order",
      "where is my latest order",
      "where is my last order",
      "where is my package",
      "where is my parcel",
      "order status",
      "latest order",
      "last order",
      "my latest order",
      "my last order",
      "status of my order",
      "status of my latest order",
      "what is happening with my order",
      "what happened to my order",
      "has my order shipped",
      "did my order ship",
      "is my order shipped",
      "is my order ready",
      "when will my order arrive",
      "when is my order arriving",
      "delivery status",
      "package status",
      "parcel status",
      "suivre ma commande",
      "suivre ma derniere commande",
      "ma derniere commande",
      "statut de ma commande",
      "ou est ma commande",
      "ou est mon colis",
      "commande livree",
      "commande expediee",
      "تتبع طلبي",
      "تتبع الطلب",
      "اخر طلب",
      "طلبي الاخير",
      "اين طلبي",
      "أين طلبي",
      "حالة طلبي",
      "حالة الطلب",
      "وين طلبي",
    ])
  ) {
    return "order_tracking";
  }

  if (
    containsAny(text, [
      "opening hours",
      "opening time",
      "where are you",
      "location",
      "address",
      "store hours",
    ])
  ) {
    return "store_info";
  }

  if (
    containsAny(text, [
      "compare",
      "difference between",
      "versus",
      " vs ",
      "better between",
      "comparer",
    ])
  ) {
    return "comparison";
  }

  if (
    containsAny(text, [
      "gift",
      "present",
      "birthday",
      "cadeau",
      "هدية",
    ])
  ) {
    return "gift";
  }

  if (
    containsAny(text, [
      "recommend",
      "recommendation",
      "what should i buy",
      "which should i buy",
      "help me choose",
      "best for",
      "suggest",
      "conseille",
    ])
  ) {
    return "recommendation";
  }

  if (
    containsAny(text, [
      "in stock",
      "available",
      "availability",
      "stock",
    ])
  ) {
    return "availability";
  }

  if (
    containsAny(text, [
      "offer",
      "offers",
      "sale",
      "discount",
      "promotion",
    ])
  ) {
    return "offers";
  }

  if (
    containsAny(text, [
      "add to cart",
      "my cart",
      "remove from cart",
      "checkout",
    ])
  ) {
    return "cart";
  }

  if (
    containsAny(text, [
      "wishlist",
      "favorites",
      "favourites",
      "save this",
    ])
  ) {
    return "wishlist";
  }

  if (
    containsAny(text, [
      "price",
      "cost",
      "how much",
      "combien",
    ])
  ) {
    return "price_question";
  }

  if (
    detectCategory(text) ||
    detectBrand(text) ||
    containsAny(text, [
      "find",
      "looking for",
      "show me",
      "do you have",
      "search",
      "cherche",
    ])
  ) {
    return "product_search";
  }

  if (
    containsAny(text, [
      "help",
      "what can you do",
      "assist",
    ])
  ) {
    return "help";
  }

  return "unknown";
}

function buildProductQuery(
  text: string,
  category: string | null,
  brand: string | null,
) {
  const generic = new Set([
    "i",
    "want",
    "need",
    "find",
    "show",
    "me",
    "please",
    "a",
    "an",
    "the",
    "some",
    "product",
    "products",
    "recommend",
    "help",
    "looking",
    "for",
  ]);

  const words = text
    .split(" ")
    .filter((word) => word.length > 1)
    .filter((word) => !generic.has(word));

  const query = words.join(" ").trim();

  if (query.length >= 2) {
    return query;
  }

  return brand ?? category;
}

export function parseAssistantRequest(
  raw: string,
): ParsedAssistantRequest {
  const normalized = clean(raw);

  const language = detectLanguage(raw);
  const intent = detectIntent(normalized);

  const money = extractMoney(normalized);
  const category = detectCategory(normalized);
  const brand = detectBrand(normalized);
  const useCases = detectUseCases(normalized);
  const recipient = detectRecipient(normalized);
  const ordinal = detectOrdinal(normalized);

  const wantsCheapest = containsAny(normalized, [
    "cheapest",
    "lowest price",
    "least expensive",
    "moins cher",
  ]);

  const wantsBestValue = containsAny(normalized, [
    "best value",
    "value for money",
    "worth it",
    "good deal",
  ]);

  const wantsPremium = containsAny(normalized, [
    "premium",
    "best",
    "high end",
    "flagship",
    "top",
  ]);

  const wantsAvailableOnly = containsAny(normalized, [
    "in stock",
    "available now",
    "available",
  ]);

  let confidence = 0.35;

  if (intent !== "unknown") confidence += 0.25;
  if (category) confidence += 0.12;
  if (brand) confidence += 0.1;
  if (money.min !== null || money.max !== null) confidence += 0.08;
  if (useCases.length > 0) confidence += 0.05;

  confidence = Math.min(0.98, confidence);

  const needsClarification =
    intent === "unknown" ||
    (
      ["recommendation", "gift"].includes(intent) &&
      !category &&
      !brand &&
      useCases.length === 0
    );

  return {
    raw,
    normalized,
    language,
    intent,

    budgetMin: money.min,
    budgetMax: money.max,

    category,
    brand,

    productQuery: buildProductQuery(
      normalized,
      category,
      brand,
    ),

    useCases,
    recipient,

    ordinal,

    wantsCheapest,
    wantsBestValue,
    wantsPremium,
    wantsAvailableOnly,

    confidence,
    needsClarification,
  };
}

export function choosePhrase(
  values: readonly string[],
  seed: string,
) {
  if (values.length === 0) {
    return "";
  }

  let hash = 0;

  for (const character of seed) {
    hash =
      (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return values[hash % values.length];
}

export function buildClarification(
  request: ParsedAssistantRequest,
) {
  if (request.language === "fr") {
    return choosePhrase(
      [
        "Bien sûr. Quel type de produit recherchez-vous ?",
        "Je peux vous aider. Quel produit ou quelle catégorie avez-vous en tête ?",
        "Pour mieux vous conseiller, dites-moi simplement quel type de produit vous cherchez.",
      ],
      request.raw,
    );
  }

  if (request.language === "ar") {
    return choosePhrase(
      [
        "أكيد. ما نوع المنتج الذي تبحث عنه؟",
        "يمكنني مساعدتك. أخبرني ما المنتج أو الفئة التي تريدها.",
        "لأعطيك اقتراحاً مناسباً، ما نوع المنتج الذي تبحث عنه؟",
      ],
      request.raw,
    );
  }

  return choosePhrase(
    [
      "Absolutely. What type of product are you looking for?",
      "I can help with that. What product or category do you have in mind?",
      "To narrow it down properly, tell me what type of product you’re looking for.",
    ],
    request.raw,
  );
}
