/* ST_ASSISTANT_FRENCH_LANGUAGE_FIX_V2 */
/*
 * ST_ASSISTANT_CONVERSATION_LANGUAGE_LOCK_V1
 *
 * The reply language belongs to the conversation,
 * not necessarily to the latest customer message.
 *
 * Identify the first meaningful language, keep it
 * stable across code-switching, and respect explicit
 * customer requests to change the reply language.
 *
 * Stateless on the server: reconstruct the preference
 * from the user conversation history already provided.
 */

export type ConversationLanguage = "en" | "fr" | "ar";

type Message = {
  role: string;
  content: string;
};

function normalized(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .trim();
}

function requestedLanguage(
  message: string,
): ConversationLanguage | null {
  const text = normalized(message);

  // Only explicit response-language instructions
  // should change an established conversation.
  const englishDirective =
    /\b(?:answer|reply|respond|speak|talk|write|continue|switch|change)\b.{0,45}\b(?:in|to)\s+(?:the\s+)?(english|french|arabic)\b/;

  const frenchDirective =
    /\b(?:parle|parlez|reponds|repondez|ecris|ecrivez|continue|passe|passez|change|changez)\b.{0,45}\b(?:en|au)\s+(francais|anglais|arabe)\b/;

  const directlyRequested =
    /^(?:in\s+(english|french|arabic)|en\s+(francais|anglais|arabe))\s*(?:please|s'il vous plait|svp)?[.!?]*$/;

  const arabicDirective =
    /(?:احكي|جاوب|رد|تكلم|اتكلم|اكتب|كمل|غير|حول).{0,35}(?:بال|ب)(فرنسي|انجليزي|عربي)/;

  const match =
    text.match(englishDirective) ??
    text.match(frenchDirective);

  const direct = text.match(directlyRequested);
  const arabic = text.match(arabicDirective);

  const target =
    match?.[1] ??
    direct?.[1] ??
    direct?.[2] ??
    arabic?.[1];

  if (!target) return null;

  if (
    target === "french" ||
    target === "francais" ||
    target === "فرنسي"
  ) return "fr";

  if (
    target === "arabic" ||
    target === "arabe" ||
    target === "عربي"
  ) return "ar";

  if (
    target === "english" ||
    target === "anglais" ||
    target === "انجليزي"
  ) return "en";

  return null;
}

function detectMeaningfulLanguage(
  message: string,
): ConversationLanguage | null {
  const text = normalized(message);

  // Arabic script is strong evidence of Arabic speech.
  // Numeric Arabic-Indic digits alone are not sufficient.
  if (/[\u0621-\u064a]/.test(text)) {
    return "ar";
  }

  const french =
    /\b(?:bonjour|bonsoir|salut|merci|quand|qui|par|fonde|fondee|cree|creee|ete|proprietaire|fondateur|horaires|retirer|je|nous|vous|votre|vos|voudrais|veux|cherche|cherchez|besoin|avez|auriez|pourriez|pouvez|est-ce|c'est|j'ai|j'aimerais|combien|quel|quelle|quels|quelles|comment|pourquoi|livraison|magasin|boutique|disponibilite|retrait|ouverture|fermeture|prix|ecouteurs|casque|commander|commande)\b/g;

  const english =
    /\b(?:hello|hi|hey|thanks|thank|please|what|where|when|why|how|who|whose|which|i|i'm|my|we|our|you|your|do|does|can|could|would|want|need|looking|show|find|have|has|shipping|delivery|pickup|opening|hours|available|availability)\b/g;

  const frenchCount = [...text.matchAll(french)].length;
  const englishCount = [...text.matchAll(english)].length;

  if (frenchCount > englishCount && frenchCount > 0) {
    return "fr";
  }

  if (englishCount > frenchCount && englishCount > 0) {
    return "en";
  }

  // A genuinely ambiguous brand/model-only question
  // must not establish a language preference.
  return null;
}

export function resolveAssistantConversationLanguage(
  messages: readonly Message[],
  latestParsedLanguage: ConversationLanguage,
  browserPreference?: unknown,
): ConversationLanguage {
  let selected: ConversationLanguage | null =
    browserPreference === "en" ||
    browserPreference === "fr" ||
    browserPreference === "ar"
      ? browserPreference
      : null;

  for (const message of messages) {
    if (
      message.role !== "user" ||
      typeof message.content !== "string"
    ) {
      continue;
    }

    const explicit = requestedLanguage(message.content);

    if (explicit) {
      // A deliberate language change has priority.
      selected = explicit;
      continue;
    }

    if (selected === null) {
      const detected =
        detectMeaningfulLanguage(message.content);

      if (detected) {
        selected = detected;
      }
    }
  }

  return selected ?? latestParsedLanguage;
}
