import {
  choosePhrase,
  type ParsedAssistantRequest,
} from "./local-intelligence";

import {
  assistantAvailableAlternatives,
  assistantProductAvailability,
  assistantProductIsPurchasable,
  assistantResultRelationship,
  type RankedProductResult,
  type RankedAssistantProduct,
} from "./product-ranking";

import type { AssistantConversationMemory } from "./conversation-memory";

function money(value: number | null) {
  if (value === null) {
    return null;
  }

  return `$${value.toFixed(Number.isInteger(value) ? 0 : 2)}`;
}

function productNames(products: RankedProductResult[]) {
  return products.map((item) => item.product.name).filter(Boolean);
}

function sentenceJoin(values: string[]) {
  const clean = values.filter(Boolean);

  if (clean.length === 0) {
    return "";
  }

  if (clean.length === 1) {
    return clean[0];
  }

  if (clean.length === 2) {
    return `${clean[0]} and ${clean[1]}`;
  }

  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

function strongestReason(item: RankedProductResult) {
  const priority = [
    "category match",
    "brand match",
    "within budget",
    "fits budget",
    "on sale",
    "gaming fit",
    "work fit",
    "school fit",
    "photography fit",
    "audio fit",
    "fitness fit",
    "travel fit",
    "available",
  ];

  return (
    priority.find((reason) => item.reasons.includes(reason)) ??
    item.reasons[0] ??
    null
  );
}

function EnglishRecommendationIntro(request: ParsedAssistantRequest) {
  if (request.intent === "gift") {
    return choosePhrase(
      [
        "I found a few options that make sense as a gift.",
        "These are the strongest gift options I found from the current catalog.",
        "Based on what you described, I’d start with these gift options.",
      ],
      request.raw,
    );
  }

  if (request.budgetMax !== null) {
    return choosePhrase(
      [
        `I found a few strong options within your budget of ${money(
          request.budgetMax,
        )}.`,
        `These are the best matches I found around your ${money(
          request.budgetMax,
        )} budget.`,
        `I’d look at these first based on your budget and preferences.`,
      ],
      request.raw,
    );
  }

  return choosePhrase(
    [
      "These are the strongest matches I found.",
      "I’d start with these options.",
      "These products match what you described best.",
      "I found a few options worth looking at.",
    ],
    request.raw,
  );
}

function FrenchRecommendationIntro(request: ParsedAssistantRequest) {
  if (request.intent === "gift") {
    return choosePhrase(
      [
        "J’ai trouvé quelques options qui conviennent bien pour un cadeau.",
        "Voici les options cadeau les plus pertinentes que j’ai trouvées.",
        "D’après ce que vous cherchez, je commencerais par ces options.",
      ],
      request.raw,
    );
  }

  return choosePhrase(
    [
      "Voici les options les plus pertinentes que j’ai trouvées.",
      "Je commencerais par ces produits.",
      "Ces produits correspondent le mieux à votre recherche.",
    ],
    request.raw,
  );
}

function ArabicRecommendationIntro(request: ParsedAssistantRequest) {
  if (request.intent === "gift") {
    return choosePhrase(
      [
        "وجدت بعض الخيارات المناسبة كهدية.",
        "هذه أفضل الخيارات التي وجدتها حسب طلبك.",
        "بناءً على ما تبحث عنه، أنصح أن تبدأ بهذه الخيارات.",
      ],
      request.raw,
    );
  }

  return choosePhrase(
    [
      "هذه أفضل الخيارات التي وجدتها حسب طلبك.",
      "أنصح أن تبدأ بهذه المنتجات.",
      "هذه المنتجات تتناسب أكثر مع ما وصفته.",
    ],
    request.raw,
  );
}

function requestedProductLabel(request: ParsedAssistantRequest) {
  return (
    request.productQuery?.trim() ||
    request.category?.trim() ||
    request.brand?.trim() ||
    "that product"
  );
}

function productAvailabilitySentence(
  product: RankedAssistantProduct,
  language: ParsedAssistantRequest["language"],
) {
  const status = assistantProductAvailability(product);

  if (language === "fr") {
    if (status === "in_stock") {
      return `${product.name} est actuellement disponible.`;
    }

    if (status === "low_stock") {
      return `${product.name} est disponible, mais le stock est limité.`;
    }

    if (status === "partially_available") {
      return `${product.name} est disponible dans certaines configurations, tandis que d’autres sont actuellement indisponibles ou arrivent prochainement.`;
    }

    if (status === "coming_soon") {
      return `${product.name} est déjà référencé dans notre boutique et arrive prochainement.`;
    }

    if (status === "out_of_stock") {
      return `Nous proposons bien ${product.name}, mais il est actuellement en rupture de stock.`;
    }

    return `${product.name} est référencé dans notre boutique, mais il n’est pas disponible actuellement.`;
  }

  if (language === "ar") {
    if (status === "in_stock") {
      return `${product.name} متوفر حالياً.`;
    }

    if (status === "low_stock") {
      return `${product.name} متوفر، لكن الكمية محدودة.`;
    }

    if (status === "partially_available") {
      return `${product.name} متوفر ببعض النسخ، بينما توجد نسخ أخرى غير متوفرة حالياً أو ستتوفر قريباً.`;
    }

    if (status === "coming_soon") {
      return `${product.name} موجود بالفعل ضمن المتجر وسيكون متوفراً قريباً.`;
    }

    if (status === "out_of_stock") {
      return `${product.name} من المنتجات التي نوفرها، لكنه غير متوفر في المخزون حالياً.`;
    }

    return `${product.name} موجود ضمن المتجر، لكنه غير متوفر حالياً.`;
  }

  if (status === "in_stock") {
    return `${product.name} is currently in stock.`;
  }

  if (status === "low_stock") {
    return `${product.name} is available, but stock is limited.`;
  }

  if (status === "partially_available") {
    return `${product.name} is available in some configurations, while others are currently out of stock or coming soon.`;
  }

  if (status === "coming_soon") {
    return `${product.name} is already listed in the store and is coming soon.`;
  }

  if (status === "out_of_stock") {
    return `We do carry ${product.name}, but it is currently out of stock.`;
  }

  return `${product.name} is listed in the store, but it is not currently available.`;
}

function alternativeIntro(
  request: ParsedAssistantRequest,
  alternatives: RankedProductResult[],
) {
  const requested = requestedProductLabel(request);
  const names = sentenceJoin(productNames(alternatives));

  if (request.language === "fr") {
    if (names) {
      return `Je n’ai pas trouvé exactement « ${requested} » dans le catalogue actuel. Les alternatives disponibles les plus proches que j’ai trouvées sont ${names}.`;
    }

    return `Je n’ai pas trouvé exactement « ${requested} » dans le catalogue actuel.`;
  }

  if (request.language === "ar") {
    if (names) {
      return `لم أجد «${requested}» بالضبط ضمن الكتالوج الحالي. أقرب البدائل المتوفرة التي وجدتها هي ${names}.`;
    }

    return `لم أجد «${requested}» بالضبط ضمن الكتالوج الحالي.`;
  }

  if (names) {
    return `I don’t see the exact ${requested} in the current catalog. The closest available alternatives I found are ${names}.`;
  }

  return `I don’t see the exact ${requested} in the current catalog.`;
}

function unavailableProductWithAlternatives(
  request: ParsedAssistantRequest,
  exact: RankedProductResult,
  ranked: RankedProductResult[],
) {
  const availability = productAvailabilitySentence(
    exact.product,
    request.language,
  );

  const alternatives = assistantAvailableAlternatives(
    ranked,
    exact.product.id,
    3,
  );

  if (alternatives.length === 0) {
    return availability;
  }

  const names = sentenceJoin(productNames(alternatives));

  if (request.language === "fr") {
    return `${availability} Si vous avez besoin d’une option disponible maintenant, je regarderais plutôt ${names}.`;
  }

  if (request.language === "ar") {
    return `${availability} إذا كنت بحاجة إلى خيار متوفر الآن، فأنصحك بالنظر إلى ${names}.`;
  }

  return `${availability} If you need something available now, I’d look at ${names} instead.`;
}

export function composeRecommendationResponse(
  request: ParsedAssistantRequest,
  ranked: RankedProductResult[],
) {
  if (ranked.length === 0) {
    const requested = requestedProductLabel(request);

    if (request.language === "fr") {
      return `Je ne vois pas exactement « ${requested} » dans notre catalogue actuel. Je peux toutefois vous proposer les options les plus proches si elles sont disponibles.`;
    }

    if (request.language === "ar") {
      return `لا أرى «${requested}» بالضبط ضمن الكتالوج الحالي. يمكنني مع ذلك اقتراح أقرب الخيارات المتوفرة إذا كانت موجودة.`;
    }

    return `I don’t see the exact ${requested} in our current catalog. I can still recommend the closest available options when we have relevant alternatives.`;
  }

  const exact =
    ranked.find((item) => assistantResultRelationship(item) === "exact") ??
    null;

  if (exact) {
    if (!assistantProductIsPurchasable(exact.product)) {
      return unavailableProductWithAlternatives(request, exact, ranked);
    }

    const availability = productAvailabilitySentence(
      exact.product,
      request.language,
    );

    const firstPrice = money(exact.product.price);

    if (request.language === "fr") {
      return firstPrice
        ? `${availability} Son prix commence actuellement à ${firstPrice}.`
        : availability;
    }

    if (request.language === "ar") {
      return firstPrice
        ? `${availability} ويبدأ سعره حالياً من ${firstPrice}.`
        : availability;
    }

    return firstPrice
      ? `${availability} It currently starts at ${firstPrice}.`
      : availability;
  }

  const accessoryFallback = ranked.every(
    (item) => assistantResultRelationship(item) === "accessory",
  );

  if (accessoryFallback) {
    const requested = requestedProductLabel(request);

    if (request.language === "fr") {
      return `Je n’ai pas trouvé ${requested} lui-même dans notre catalogue actuel. J’ai seulement trouvé des accessoires compatibles, que je vous affiche séparément.`;
    }

    if (request.language === "ar") {
      return `لم أجد ${requested} نفسه ضمن الكتالوج الحالي. وجدت فقط بعض الإكسسوارات المتوافقة، وسأعرضها بشكل منفصل.`;
    }

    return `I don’t see ${requested} itself in our current catalog. I only found compatible accessories for it, so I’m showing those separately.`;
  }

  const actualProducts = ranked.filter(
    (item) => assistantResultRelationship(item) !== "accessory",
  );

  const purchasableAlternatives = assistantAvailableAlternatives(
    actualProducts,
    null,
    4,
  );

  if (purchasableAlternatives.length > 0) {
    return alternativeIntro(request, purchasableAlternatives);
  }

  const first = actualProducts[0];

  if (first) {
    const availability = productAvailabilitySentence(
      first.product,
      request.language,
    );

    if (request.language === "fr") {
      return `Je n’ai pas trouvé le produit exact demandé, mais ${first.product.name} est l’option la plus proche que j’ai trouvée. ${availability}`;
    }

    if (request.language === "ar") {
      return `لم أجد المنتج المطلوب بالضبط، لكن ${first.product.name} هو أقرب خيار وجدته. ${availability}`;
    }

    return `I couldn’t find the exact product you asked for, but ${first.product.name} is the closest match I found. ${availability}`;
  }

  return alternativeIntro(request, []);
}

export function composeComparisonResponse(
  products: RankedAssistantProduct[],
  request: ParsedAssistantRequest,
) {
  if (products.length < 2) {
    if (request.language === "fr") {
      return "J’ai besoin d’au moins deux produits précis pour faire une comparaison utile.";
    }

    if (request.language === "ar") {
      return "أحتاج إلى منتجين محددين على الأقل حتى أتمكن من إجراء مقارنة مفيدة.";
    }

    return "I need at least two specific products to make a useful comparison.";
  }

  const first = products[0];

  const second = products[1];

  const firstPrice = first.price;

  const secondPrice = second.price;

  if (request.language === "fr") {
    let response = `Entre ${first.name} et ${second.name}, `;

    if (firstPrice !== null && secondPrice !== null) {
      if (firstPrice < secondPrice) {
        response += `${first.name} est l’option la moins chère.`;
      } else if (secondPrice < firstPrice) {
        response += `${second.name} est l’option la moins chère.`;
      } else {
        response += "les deux commencent au même prix.";
      }
    } else {
      response += "le meilleur choix dépend surtout de votre usage.";
    }

    return response;
  }

  if (request.language === "ar") {
    let response = `بين ${first.name} و ${second.name}، `;

    if (firstPrice !== null && secondPrice !== null) {
      if (firstPrice < secondPrice) {
        response += `${first.name} هو الخيار الأرخص.`;
      } else if (secondPrice < firstPrice) {
        response += `${second.name} هو الخيار الأرخص.`;
      } else {
        response += "السعر الابتدائي للمنتجين متقارب.";
      }
    } else {
      response += "الاختيار الأفضل يعتمد على طريقة الاستخدام التي تريدها.";
    }

    return response;
  }

  let response = `Between ${first.name} and ${second.name}, `;

  if (firstPrice !== null && secondPrice !== null) {
    if (firstPrice < secondPrice) {
      response += `${first.name} is the cheaper option at ${money(firstPrice)}, compared with ${money(secondPrice)} for ${second.name}.`;
    } else if (secondPrice < firstPrice) {
      response += `${second.name} is the cheaper option at ${money(secondPrice)}, compared with ${money(firstPrice)} for ${first.name}.`;
    } else {
      response += `both currently start at ${money(firstPrice)}.`;
    }
  } else {
    response += "the better choice depends mainly on how you plan to use it.";
  }

  return response;
}

export function composeGreeting(request: ParsedAssistantRequest) {
  if (request.language === "fr") {
    return choosePhrase(
      [
        "Bonjour. Je peux vous aider à trouver un produit, comparer des options, vérifier les offres ou vous guider dans votre commande.",
        "Bonjour. Dites-moi ce que vous recherchez et je vous aiderai à trouver les meilleures options disponibles.",
      ],
      request.raw,
    );
  }

  if (request.language === "ar") {
    return choosePhrase(
      [
        "مرحباً. يمكنني مساعدتك في العثور على منتج، مقارنة الخيارات، التحقق من العروض أو متابعة طلبك.",
        "أهلاً. أخبرني ما الذي تبحث عنه وسأساعدك في إيجاد أفضل الخيارات المتوفرة.",
      ],
      request.raw,
    );
  }

  return choosePhrase(
    [
      "Hi. I can help you find products, compare options, check offers, or guide you with an order.",
      "Welcome. Tell me what you’re looking for and I’ll help narrow down the best available options.",
      "Hello. I can help with products, recommendations, comparisons, offers, and store support.",
    ],
    request.raw,
  );
}

export function composeStoreInfo(request: ParsedAssistantRequest) {
  if (request.language === "fr") {
    return "Stereophonie se trouve à Mtaileb, au Liban. Le magasin est ouvert du lundi au samedi de 10h00 à 20h00 et fermé le dimanche.";
  }

  if (request.language === "ar") {
    return "متجر Stereophonie موجود في المطيلب، لبنان. يفتح من الاثنين إلى السبت من الساعة 10 صباحاً حتى 8 مساءً، ويغلق يوم الأحد.";
  }

  return "Stereophonie is located in Mtaileb, Lebanon. The store is open Monday through Saturday from 10:00 AM to 8:00 PM and closed on Sunday.";
}

export function composeOfferResponse(
  ranked: RankedProductResult[],
  request: ParsedAssistantRequest,
) {
  if (ranked.length === 0) {
    if (request.language === "fr") {
      return "Je n’ai trouvé aucune offre correspondante disponible pour le moment.";
    }

    if (request.language === "ar") {
      return "لم أجد حالياً عروضاً متوفرة تطابق طلبك.";
    }

    return "I couldn’t find a matching available offer right now.";
  }

  const names = productNames(ranked.slice(0, 3));

  if (request.language === "fr") {
    return `J’ai trouvé des offres intéressantes sur ${sentenceJoin(names)}.`;
  }

  if (request.language === "ar") {
    return `وجدت عروضاً مناسبة على ${sentenceJoin(names)}.`;
  }

  return `I found current offers worth checking on ${sentenceJoin(names)}.`;
}

export function composeHelpResponse(request: ParsedAssistantRequest) {
  if (request.language === "fr") {
    return "Je peux rechercher les produits disponibles, vous aider à choisir selon votre budget, comparer des options, vérifier les offres, vous guider vers le panier ou le suivi de commande.";
  }

  if (request.language === "ar") {
    return "يمكنني البحث في المنتجات المتوفرة، مساعدتك حسب الميزانية، مقارنة المنتجات، التحقق من العروض، ومساعدتك في السلة أو متابعة الطلب.";
  }

  return "I can search the live catalog, recommend products based on your budget or needs, compare options, check offers, help with the cart or wishlist, and guide you to order tracking.";
}

export function composeFallbackResponse(
  request: ParsedAssistantRequest,
  memory: AssistantConversationMemory,
) {
  if (request.language === "fr") {
    if (memory.category) {
      return `Je peux continuer à vous aider avec la catégorie ${memory.category}. Dites-moi simplement ce que vous souhaitez comparer ou trouver.`;
    }

    return "Je peux vous aider avec les produits, les prix, les recommandations, les offres et les commandes. Reformulez simplement ce que vous recherchez.";
  }

  if (request.language === "ar") {
    if (memory.category) {
      return `يمكنني متابعة مساعدتك ضمن فئة ${memory.category}. أخبرني ماذا تريد أن تجد أو تقارن.`;
    }

    return "يمكنني مساعدتك بالمنتجات والأسعار والتوصيات والعروض والطلبات. أخبرني بطريقة بسيطة ما الذي تبحث عنه.";
  }

  if (memory.category) {
    return `I can keep helping with ${memory.category}. Tell me what you want to find, compare, or narrow down.`;
  }

  return "I can help with products, prices, recommendations, offers, comparisons, and orders. Tell me what you’re trying to find in a little more detail.";
}
