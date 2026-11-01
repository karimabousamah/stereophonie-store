/*
 * ST_ASSISTANT_ELLIPTICAL_FOLLOWUPS_V1
 *
 * Resolve short questions from recent user context.
 * Do not invent product identities or business facts.
 */

type Language = "en" | "fr" | "ar";

type Message = {
  role: string;
  content: string;
};

type Result =
  | { kind: "store"; question: string }
  | { kind: "clarify"; message: string };

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .trim()
    .replace(/[?!.,،؟;:]+$/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function clarify(
  language: Language,
  product: boolean = false,
): Result {
  return {
    kind: "clarify",
    message: product
      ? language === "fr"
        ? "De quel produit parlez-vous et que souhaitez-vous savoir exactement ?"
        : language === "ar"
          ? "أي منتج قصدك وشو حابب تعرف عنه بالتحديد؟"
          : "Which product do you mean, and what would you like to know about it?"
      : language === "fr"
        ? "Pouvez-vous préciser votre question ? Je veux être sûr de bien comprendre."
        : language === "ar"
          ? "فيني أعرف أكتر شو قصدك؟ بدي أتأكد إني فهمت سؤالك."
          : "Could you clarify your question? I want to make sure I understand.",
  };
}

function recentTopic(
  history: readonly Message[],
): "founding" | "ownership" | "location" | "hours" | null {
  const previous = [...history]
    .reverse()
    .find(
      (message) =>
        message.role === "user" &&
        typeof message.content === "string" &&
        message.content.trim() &&
        !/^(?:what|why|who|when|where|quoi|qui|quand|ou|pourquoi|شو|مين|وين|امتى)[?؟\s.]*$/i.test(
          message.content.trim(),
        ),
    );

  if (!previous) return null;

  const text = normalize(previous.content);

  const storeReference =
    /\b(?:stereophonie|styrophonie|stereofonie|stereophony|stereophoniestore)\b/.test(text) ||
    /\b(?:your|our|the|votre|notre)\s+(?:store|shop|business|company|magasin|boutique)\b/.test(text) ||
    /(?:ستيريوفوني|ستريوفوني|المحل|محلكم|متجركم)/.test(text);

  if (!storeReference) return null;

  if (
    /\b(?:who|whose|qui|owner|founder|creator|ceo|proprietaire|fondateur|pdg)\b/.test(text) ||
    /(?:مين|صاحب|مالك|مؤسس)/.test(text)
  ) return "ownership";

  if (
    /\b(?:founded|founding|established|created|fonde(?:e|s|es)?|cree(?:e|s|es)?|fondation|creation)\b/.test(text) ||
    /(?:تاسس|تأسس|تأسيس|اسس)/.test(text)
  ) return "founding";

  if (
    /\b(?:location|located|address|where|adresse|localisation|ou)\b/.test(text) ||
    /(?:وين|اين|عنوان|موقع)/.test(text)
  ) return "location";

  if (
    /\b(?:hours|open|close|opening|closing|horaires|ouverture|fermeture)\b/.test(text) ||
    /(?:دوام|يفتح|يسكر)/.test(text)
  ) return "hours";

  return null;
}

export function resolveAssistantEllipticalFollowUp(
  message: string,
  history: readonly Message[],
  displayedProductCount: number,
  language: Language,
): Result | null {
  if (!message.trim() || message.length > 160) {
    return null;
  }

  const text = normalize(message);
  const topic = recentTopic(history);

  const byWho =
    /^(?:by who|by whom|who|who exactly|and who|par qui|qui|et qui|مين|من|مين يعني)$/.test(text);

  const when =
    /^(?:when|when exactly|and when|quand|et quand|امتى|متى)$/.test(text);

  const where =
    /^(?:where|where exactly|and where|ou|et ou|وين|اين)$/.test(text);

  const vague =
    /^(?:why|and why|what|and what|pourquoi|et pourquoi|quoi|et quoi|ليش|لماذا|شو|ماذا)$/.test(text);

  const productReference =
    /^(?:(?:and|et)\s+)?(?:what about|how about|et pour|qu'en est-il de)\s+(?:that one|this one|it|celui-la|celle-la|celui-ci|celle-ci)$/.test(text);

  if (productReference) {
    return clarify(language, displayedProductCount > 0);
  }

  if (byWho) {
    if (topic === "founding" || topic === "ownership") {
      return {
        kind: "store",
        question: "Who owns Stereophonie?",
      };
    }
    return clarify(language);
  }

  if (when) {
    if (topic === "founding" || topic === "ownership") {
      return {
        kind: "store",
        question: "When was Stereophonie founded?",
      };
    }
    if (topic === "hours") {
      return {
        kind: "store",
        question: "What are your opening hours?",
      };
    }
    return clarify(language);
  }

  if (where) {
    if (topic === "location") {
      return {
        kind: "store",
        question: "Where is your store location?",
      };
    }
    return clarify(language);
  }

  if (vague) return clarify(language);

  return null;
}
