/*
 * Shared conversational product-reference resolution.
 *
 * Product references establish identity only.
 * Callers must reverify prices, stock and specifications
 * against published server-side product records.
 */

export type ConversationProductReference = {
  id: string;
  name: string;
  slug: string;
};

export type ConversationReferenceContext = {
  focusedProduct: ConversationProductReference | null;
  displayedProducts: ConversationProductReference[];
};

export type ConversationReferenceMode =
  | "price"
  | "availability";

export type ConversationReferenceResult = {
  handled: boolean;
  reference: ConversationProductReference | null;
  reason:
    | "ordinal"
    | "named"
    | "focused"
    | "ambiguous"
    | "none";
};

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveAssistantConversationProductReference(
  question: string,
  context: ConversationReferenceContext,
  mode: ConversationReferenceMode,
): ConversationReferenceResult {
  const references = context.displayedProducts;
  const normalizedQuestion = normalize(question);

  const ordinal =
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|last)\b/i
      .exec(question)?.[1]?.toLowerCase() ?? "";

  const positions: Record<string, number> = {
    first: 0,
    "1st": 0,
    second: 1,
    "2nd": 1,
    third: 2,
    "3rd": 2,
    fourth: 3,
    "4th": 3,
    last: references.length - 1,
  };

  const ordinalReference = ordinal
    ? references[positions[ordinal]] ?? null
    : null;

  /*
   * Explicit product names and unique alphanumeric
   * model identifiers take precedence over the previous
   * focus. Never choose between ambiguous model matches.
   */
  const exactNames = references.filter((product) => {
    const name = normalize(product.name);
    return (
      name.length >= 8 &&
      normalizedQuestion.includes(name)
    );
  });

  const modelTokens = Array.from(
    new Set(
      normalizedQuestion.match(
        /\b[a-z]{1,6}\d{3,}[a-z0-9]*\b/g,
      ) ?? [],
    ),
  );

  const modelMatches = modelTokens.length
    ? references.filter((product) => {
        const name = ` ${normalize(product.name)} `;
        return modelTokens.some((token) =>
          name.includes(` ${token} `),
        );
      })
    : [];

  const namedCandidates =
    exactNames.length ? exactNames : modelMatches;

  const namedReference =
    namedCandidates.length === 1
      ? namedCandidates[0]
      : null;

  if (ordinal) {
    if (
      namedCandidates.length > 1 ||
      (
        namedReference &&
        ordinalReference &&
        namedReference.id !== ordinalReference.id
      )
    ) {
      return {
        handled: true,
        reference: null,
        reason: "ambiguous",
      };
    }

    return {
      handled: true,
      reference: ordinalReference,
      reason: "ordinal",
    };
  }

  if (namedCandidates.length > 1) {
    return {
      handled: true,
      reference: null,
      reason: "ambiguous",
    };
  }

  if (namedReference) {
    return {
      handled: true,
      reference: namedReference,
      reason: "named",
    };
  }

  const pronoun =
    /\b(?:it|its|this one|that one)\b/i.test(
      question,
    ) ||
    (
      mode === "price" &&
      /^price\??$/i.test(question.trim())
    );

  if (pronoun) {
    return {
      handled: true,
      reference:
        context.focusedProduct ??
        (references.length === 1
          ? references[0]
          : null),
      reason: "focused",
    };
  }

  return {
    handled: false,
    reference: null,
    reason: "none",
  };
}
