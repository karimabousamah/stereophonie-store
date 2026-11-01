import { assistantFeatureExplicitlyNegated } from "./feature-evidence-safety";
import { resolveAssistantConversationProductReference } from "./conversation-product-reference";
/*
 * ST_ASSISTANT_SHOPPING_CONTEXT_V1
 *
 * Grounded category discovery and conversational relevance.
 * No model-generated products, prices, features or inventory.
 */

import {
  buildAssistantVerifiedProductKnowledge,
  type AssistantKnowledgeProductInput,
} from "./product-knowledge";

type Ref = {
  id: string;
  name?: string;
  slug?: string | null;
};

type Context = {
  focusedProduct?: Ref | null;
  displayedProducts?: Ref[];
};

type Item = AssistantKnowledgeProductInput & {
  price?: number | null;
};

type Language = "en" | "fr" | "ar";

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singular(word: string): string {
  if (/[^aeiou]ies$/.test(word)) {
    return word.slice(0, -3) + "y";
  }

  if (/(?:sses|shes|ches|xes|zzes)$/.test(word)) {
    return word.slice(0, -2);
  }

  if (/s$/.test(word) && !/(?:ss|us|is)$/.test(word)) {
    return word.slice(0, -1);
  }

  return word;
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter(Boolean)
    .map(singular);
}

function directNoun(question: string): string | null {
  const text = normalize(question)
    .replace(
      /^(?:(?:hello|hi|hey|bonjour|please)\s+)+/,
      "",
    )
    .replace(
      /^(?:do (?:you|u) (?:have|sell|carry|stock)|have (?:you|u) got|show me|find me|any|got any)\s+/,
      "",
    )
    .replace(/^(?:a|an|the|some|any)\s+/, "")
    .trim();

  if (!text || text.includes(" ") || text.length < 3) {
    return null;
  }

  if (
    [
      "help",
      "products",
      "product",
      "anything",
      "offers",
      "discounts",
    ].includes(text)
  ) {
    return null;
  }

  return singular(text);
}

function allFacts(
  item: Item,
): Array<{ name: string; value: string }> {
  const knowledge = buildAssistantVerifiedProductKnowledge(item);

  return knowledge.configurations.flatMap(
    (configuration) => [
      ...configuration.options,
      ...configuration.technicalSpecifications,
    ],
  );
}

function hasFactFor(
  facts: Array<{ name: string; value: string }>,
  feature: string,
): string | null {
  /*
   * ST_ASSISTANT_NEGATIVE_FEATURE_EVIDENCE_V1
   *
   * Fail closed when a published fact explicitly denies
   * this feature. Never treat "No Wi-Fi" as confirmation.
   */
  if (
    facts.some((fact) =>
      assistantFeatureExplicitlyNegated(
        fact.name,
        fact.value,
        feature,
      ),
    )
  ) {
    return null;
  }

  for (const fact of facts) {
    const name = normalize(fact.name);
    const value = normalize(fact.value);

    const disabled =
      /^(?:no|none|false|not supported|unavailable|n a)$/.test(
        value,
      );

    if (disabled) continue;

    if (
      feature === "scan" &&
      (
        /\bscann?(?:er|ing)?\b/.test(name) ||
        (
          name === "functions" &&
          /\bscan\b/.test(value)
        )
      )
    ) {
      return `${fact.name}: ${fact.value}`;
    }

    if (
      feature === "copy" &&
      (
        /\bcopy(?:ing|er|\s+speed|\s+resolution)?\b/.test(name) ||
        (
          name === "functions" &&
          /\bcopy\b/.test(value)
        )
      )
    ) {
      return `${fact.name}: ${fact.value}`;
    }

    if (
      feature === "wireless" &&
      (
        /\b(?:wifi|wi fi|wireless)\b/.test(name) ||
        (
          /\b(?:connectivity|network|features)\b/.test(name) &&
          /\b(?:wifi|wi fi|wireless)\b/.test(value)
        )
      )
    ) {
      return `${fact.name}: ${fact.value}`;
    }

    if (
      feature === "bluetooth" &&
      (
        /\bbluetooth\b/.test(name) ||
        /\bbluetooth\b/.test(value)
      )
    ) {
      return `${fact.name}: ${fact.value}`;
    }
  }

  return null;
}

const FEATURES: Array<{
  label: string;
  term: RegExp;
}> = [
  {
    label: "scan",
    term: /\b(?:scan|scans|scanning|scanner)\b/,
  },
  {
    label: "copy",
    term: /\b(?:copy|copies|copying|photocopy)\b/,
  },
  {
    label: "wireless",
    term: /\b(?:wifi|wi fi|wireless)\b/,
  },
  {
    label: "bluetooth",
    term: /\bbluetooth\b/,
  },
];

function featureQuestion(text: string): string[] {
  if (
    !/\b(?:can|could|does|do|is|are|has|have|support|supports|capability|capable)\b/.test(
      text,
    )
  ) {
    return [];
  }

  return FEATURES
    .filter((feature) => feature.term.test(text))
    .map((feature) => feature.label);
}

function recommendationFollowUp(text: string): boolean {
  const comparative =
    /\b(?:best|better|recommend|choose|suitable|good|ideal)\b/.test(
      text,
    );

  const refersBack =
    /\b(?:which|wich)\s+(?:one|of (?:these|those|them))\b/.test(
      text,
    ) ||
    /\b(?:of those|of these|among them)\b/.test(text);

  return comparative && refersBack;
}

export function resolveAssistantShoppingContext<T extends Item>({
  question,
  intent,
  context,
  catalog,
  language,
  allowNounSearch,
}: {
  question: string;
  intent: string;
  context: Context;
  catalog: T[];
  language: Language;
  allowNounSearch: boolean;
}): {
  message: string;
  products: T[];
  kind: string;
} | null {
  const text = normalize(question);

  const byId = new Map(
    catalog.map((item) => [item.id, item]),
  );

  /*
   * Singular/plural discovery using the real published
   * catalogue, rather than a fixed category dictionary.
   *
   * Existing specialized discovery always gets priority.
   */
  if (
    allowNounSearch &&
    (
      ["product_search", "availability", "unknown"].includes(
        intent,
      ) ||
      /\bdo (?:you|u) have\b/.test(text)
    )
  ) {
    const noun = directNoun(question);

    if (noun) {
      const found = catalog
        .filter(
          (item) =>
            [
              ...tokens(item.name),
              ...tokens(item.category ?? ""),
            ].includes(noun),
        )
        .slice(0, 4);

      if (found.length > 0) {
        return {
          kind: "catalog-noun",
          products: found,
          message:
            language === "fr"
              ? "Voici les produits correspondants de notre catalogue actuel."
              : language === "ar"
                ? "إليك المنتجات المطابقة في الكتالوج الحالي."
                : `Here are ${found.length} matching products from our current catalogue.`,
        };
      }
    }
  }

  /*
   * Re-resolve client-provided product references against
   * the freshly loaded, published server catalogue.
   */
  const remembered = (context.displayedProducts ?? [])
    .map((ref) => byId.get(ref.id))
    .filter((item): item is T => Boolean(item));

  /*
   * Follow-up recommendations must stay within the
   * products the customer was actually discussing.
   */
  if (
    remembered.length >= 2 &&
    recommendationFollowUp(text)
  ) {
    const office =
      /\b(?:office|work|business|company|bureau|maktab)\b/.test(
        text,
      );

    const scored = remembered.map((item) => {
      const facts = allFacts(item);

      const signals = office
        ? ["scan", "copy", "wireless"].filter(
            (feature) => hasFactFor(facts, feature),
          )
        : [];

      return { item, signals };
    });

    const ordered = [...scored].sort(
      (a, b) => b.signals.length - a.signals.length,
    );

    const shortlist = ordered
      .slice(0, 4)
      .map((entry) => entry.item);

    const lead = ordered[0];

    const alternatives = ordered
      .slice(1, 3)
      .map((entry) => entry.item.name)
      .join(", ");

    const evidence = lead.signals.length
      ? `Its listed specifications confirm ${lead.signals.join(", ")}. `
      : "The available specifications don't establish a clear winner yet. ";

    const message =
      language === "fr"
        ? `Parmi les produits discutés, examinons ${lead.item.name} et ${alternatives}. Quel est votre budget et votre volume d'utilisation ?`
        : language === "ar"
          ? `من بين المنتجات التي ناقشناها، لنقارن ${lead.item.name} مع ${alternatives}. ما الميزانية وحجم الاستخدام؟`
          : `For your needs, I'd start by comparing ${lead.item.name} with ${alternatives}. ${evidence}Which matters more: frequent use, particular features, or budget?`;

    return {
      kind: "context-recommendation",
      message,
      products: shortlist,
    };
  }

  /*
   * Verify capability questions from published attributes.
   * Missing evidence never becomes an invented yes or no.
   */
  const features = featureQuestion(text);

  if (features.length === 0) {
    return null;
  }

  const explicit = [...catalog]
    .filter(
      (item) =>
        normalize(item.name).length >= 9 &&
        text.includes(normalize(item.name)),
    )
    .sort(
      (a, b) => b.name.length - a.name.length,
    )[0];

  const focused = context.focusedProduct
    ? byId.get(context.focusedProduct.id)
    : null;

  /*
   * ST_ASSISTANT_SAFE_MODEL_FALLBACK_V1
   *
   * An explicitly named model must not silently become
   * the previously focused product.
   *
   * An ordinal refers to the preserved multi-product list.
   * Model identifiers must uniquely match published items.
   */
  const sharedReference =
    resolveAssistantConversationProductReference(
      question,
      {
        focusedProduct: context.focusedProduct
          ? {
              id: context.focusedProduct.id,
              name: context.focusedProduct.name ?? "",
              slug: context.focusedProduct.slug ?? "",
            }
          : null,
        displayedProducts: (
          context.displayedProducts ?? []
        ).map((item) => ({
          id: item.id,
          name: item.name ?? "",
          slug: item.slug ?? "",
        })),
      },
      "availability",
    );

  const namedModelTokens = Array.from(
    new Set(
      text.match(
        /\b[a-z]{1,6}\d{3,}[a-z0-9]*\b/g,
      ) ?? [],
    ),
  );

  const namedModelMatches =
    namedModelTokens.length === 1
      ? catalog.filter((item) =>
          (` ${normalize(item.name)} `).includes(
            ` ${namedModelTokens[0]} `,
          ),
        )
      : [];

  const uniqueNamedModel =
    namedModelTokens.length === 1 &&
    namedModelMatches.length === 1
      ? namedModelMatches[0]
      : null;

  const modelReferenceConflicts =
    sharedReference.handled &&
    (
      sharedReference.reason === "ambiguous" ||
      (
        sharedReference.reason === "ordinal" &&
        sharedReference.reference?.id !==
          uniqueNamedModel?.id
      )
    );

  const product: T | null =
    namedModelTokens.length > 0
      ? (
          modelReferenceConflicts
            ? null
            : uniqueNamedModel
        )
      : sharedReference.handled
        ? (
            sharedReference.reference
              ? byId.get(sharedReference.reference.id) ?? null
              : null
          )
        : (
            explicit ??
            focused ??
            (remembered.length === 1
              ? remembered[0]
              : null)
          );

  if (
    !product &&
    (
      namedModelTokens.length > 0 ||
      sharedReference.handled
    )
  ) {
    return {
      kind: "context-feature-clarification",
      products: [],
      message:
        language === "fr"
          ? "Je ne peux pas identifier ce modèle avec certitude. Pouvez-vous préciser le produit ?"
          : language === "ar"
            ? "لا أستطيع تحديد هذا الموديل بثقة. هل يمكنك توضيح المنتج المقصود؟"
            : "I can't identify that model confidently. Which product do you mean?",
    };
  }


  if (!product) {
    return null;
  }

  const facts = allFacts(product);

  const confirmed: string[] = [];
  const unconfirmed: string[] = [];

  for (const feature of features) {
    const evidence = hasFactFor(facts, feature);

    if (evidence) {
      confirmed.push(`${feature} (${evidence})`);
    } else {
      unconfirmed.push(feature);
    }
  }

  let message = `${product.name}: `;

  if (confirmed.length > 0) {
    message +=
      `At least one listed configuration confirms ${confirmed.join(" and ")}. `;
  }

  if (unconfirmed.length > 0) {
    message +=
      `I couldn't verify ${unconfirmed.join(" or ")} from the published specifications. `;
  }

  message +=
    "Features can differ by configuration; please verify the exact option before purchasing.";

  return {
    kind: "context-feature",
    message,
    products: [product],
  };
}
