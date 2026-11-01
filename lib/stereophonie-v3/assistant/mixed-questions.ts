/*
 * ST_ASSISTANT_MIXED_QUESTIONS_V1
 *
 * Separate informational questions, reuse the existing
 * verified assistant for each question, and preserve
 * product references and answer order.
 */

export type MixedLanguage = "en" | "fr" | "ar";

export type MixedMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MixedReference = {
  id: string;
  name: string;
  slug: string;
};

export type MixedContext = {
  focusedProduct: MixedReference | null;
  displayedProducts: MixedReference[];
};

export type MixedAnswer = {
  message?: unknown;
  products?: unknown;
  links?: unknown;
};

export type MixedCard =
  MixedReference & Record<string, unknown>;

export type MixedCombined = {
  message: string;
  products: MixedCard[];
  links: { label: string; url: string }[];
};

export function parseAssistantMixedQuestions(
  raw: string,
): string[] | null {
  const text = raw.trim();

  if (
    text.length < 12 ||
    text.length > 1400 ||
    !/[?؟]/.test(text)
  ) {
    return null;
  }

  const parts = text
    .split(/[?؟]+/)
    .map((part) =>
      part
        .replace(
          /^\s*(?:(?:\d{1,2}[.)]\s*)|(?:[-•]\s*))/,
          "",
        )
        .trim(),
    )
    .filter(Boolean);

  if (
    parts.length < 2 ||
    parts.length > 5 ||
    parts.some(
      (part) =>
        part.length < 2 ||
        part.length > 360,
    )
  ) {
    return null;
  }

  return parts;
}


/*
 * ST_ASSISTANT_PICKUP_FALSE_POSITIVE_FIX_V2
 *
 * Asking whether an order can be picked up is a
 * general store-policy question, not a request to
 * access or modify the customer's personal order.
 */
function isGenericFrenchPickupInquiry(
  question: string,
): boolean {
  const text = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'-]/g, " ")
    .toLowerCase();

  const generalPickup =
    /\b(?:peux|puis|possible|proposez|offrez)\b.{0,100}\b(?:retirer|recuperer|retrait)\b.{0,80}\b(?:commande|magasin|boutique)\b/.test(text) &&
    /\b(?:magasin|boutique)\b/.test(text);

  const personalAction =
    /\b(?:annuler|modifier|changer|payer|suivre|suivi|statut|status|prete|pret|ready|rembourser|adresse|checkout|tracking)\b/.test(text);

  return (
    text.length <= 180 &&
    generalPickup &&
    !personalAction
  );
}

export function mixedQuestionsNeedSeparateHandling(
  questions: readonly string[],
): boolean {
  return questions
    .filter((question) => !isGenericFrenchPickupInquiry(question))
    .some(
      (question) =>
      /\b(?:checkout|check out|buy now|purchase now|place (?:an?|the|my) order|track (?:my|our) order|my orders?|my account|my refund|my return|sign me in|log me in|log out|sign out|payment details|credit card number|cancel (?:my|the) order)\b/i.test(
        question,
      ) ||
      /\b(?:add|remove|delete|clear|update|modify|change|save|apply|redeem)\b.{0,65}\b(?:cart|wishlist|order|shipping address|delivery address|coupon)\b/i.test(
        question,
      ) ||
      /\b(?:mon compte|ma commande|mes commandes|suivre ma commande|payer maintenant|passer commande|ajoute.{0,40}panier|supprime.{0,40}panier)\b/i.test(
        question,
      ) ||
      /(?:طلبي|طلباتي|حسابي|تتبع طلبي|اضف.{0,30}السلة|حط.{0,30}بالسلة|الغي الطلب|اكمل الطلب)/.test(
        question,
      ),
  );
}

export function mixedQuestionsSeparateMessage(
  language: MixedLanguage,
): string {
  if (language === "fr") {
    return "Je peux répondre à plusieurs questions sur les produits et le magasin. Envoyez les demandes de panier, de paiement ou de suivi d'une commande personnelle séparément pour que je puisse les traiter en sécurité.";
  }

  if (language === "ar") {
    return "فيني جاوب على عدة أسئلة عن المنتجات والمحل. بس تعديل السلة أو الدفع أو متابعة طلب شخصي، ابعت هالطلب لحاله لنقدر نعالجه بأمان.";
  }

  return "I can answer several product and store questions together. Please send cart changes, checkout, or personal order requests separately so I can handle them securely.";
}

function fallback(language: MixedLanguage): string {
  return language === "fr"
    ? "Je ne peux pas vérifier cette réponse pour le moment."
    : language === "ar"
      ? "ما قدرت أتأكد من جواب هالسؤال حالياً."
      : "I couldn't verify that answer right now.";
}

function isCard(value: unknown): value is MixedCard {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const card = value as Record<string, unknown>;

  return ["id", "name", "slug"].every(
    (key) =>
      typeof card[key] === "string" &&
      (card[key] as string).trim().length > 0,
  );
}

function isLink(
  value: unknown,
): value is { label: string; url: string } {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const link = value as Record<string, unknown>;

  return (
    typeof link.label === "string" &&
    typeof link.url === "string" &&
    /^https?:\/\//.test(link.url)
  );
}

export async function combineAssistantMixedQuestions(
  questions: readonly string[],
  language: MixedLanguage,
  initialHistory: readonly MixedMessage[],
  initialContext: MixedContext,
  answerOne: (
    question: string,
    history: readonly MixedMessage[],
    context: MixedContext,
  ) => Promise<MixedAnswer>,
  signal?: AbortSignal,
): Promise<MixedCombined> {
  const history = [...initialHistory];

  let context: MixedContext = {
    focusedProduct: initialContext.focusedProduct,
    displayedProducts: [...initialContext.displayedProducts],
  };

  const parts: string[] = [];
  const cards = new Map<string, MixedCard>();
  const links = new Map<
    string,
    { label: string; url: string }
  >();

  for (let index = 0; index < questions.length; index++) {
    if (signal?.aborted) {
      throw new Error("Mixed request aborted");
    }

    const question = questions[index];
    let response: MixedAnswer = {};

    try {
      response = await answerOne(
        question,
        history,
        context,
      );
    } catch {
      if (signal?.aborted) {
        throw new Error("Mixed request aborted");
      }
    }

    const answer =
      typeof response.message === "string" &&
      response.message.trim()
        ? response.message.trim()
        : fallback(language);

    parts.push(
      `${index + 1}. ${question}?\n${answer}`,
    );

    history.push(
      {
        role: "user",
        content: question + "?",
      },
      {
        role: "assistant",
        content: answer,
      },
    );

    const freshCards = Array.isArray(response.products)
      ? response.products.filter(isCard)
      : [];

    if (freshCards.length > 0) {
      const references = freshCards
        .slice(0, 8)
        .map(({ id, name, slug }) => ({
          id,
          name,
          slug,
        }));

      context = {
        focusedProduct:
          references.length === 1
            ? references[0]
            : null,
        displayedProducts: references,
      };

      for (const card of freshCards) {
        cards.set(card.id, card);
      }
    }

    const freshLinks = Array.isArray(response.links)
      ? response.links.filter(isLink)
      : [];

    for (const link of freshLinks) {
      links.set(link.url, link);
    }
  }

  return {
    message: parts.join("\n\n"),
    products: [...cards.values()].slice(0, 8),
    links: [...links.values()].slice(0, 12),
  };
}
