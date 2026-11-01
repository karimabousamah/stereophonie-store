import { assistantFeatureExplicitlyNegated } from "./feature-evidence-safety";
/*
 * ST_ASSISTANT_AI_VERIFIED_ANSWERS_V1
 *
 * Model interpretation is untrusted.
 * Products, variants and specifications come only from
 * the freshly loaded published server catalogue.
 */

import {
  buildAssistantVerifiedProductKnowledge,
  findAssistantKnowledgeConfigurations,
  type AssistantKnowledgeProductInput,
  type AssistantKnowledgeConfiguration,
} from "./product-knowledge";

import type {
  AssistantAIInterpretation,
} from "./ai-interpretation";

type Product = AssistantKnowledgeProductInput & {
  slug?: string;
};

type ProductRef = {
  id: string;
  name?: string;
  slug?: string | null;
};

type Context = {
  focusedProduct?: ProductRef | null;
  displayedProducts?: ProductRef[];
};

type Language = "en" | "fr" | "ar";

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\bcolour\b/g, "color")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\b(\d+)\s+(gb|tb)\b/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(source: string, phrase: string): boolean {
  const text = normalize(source);
  const needle = normalize(phrase);

  return Boolean(needle) &&
    (` ${text} `).includes(` ${needle} `);
}

function referencedProduct<T extends Product>(
  question: string,
  interpretation: AssistantAIInterpretation,
  context: Context,
  catalog: T[],
): T | null {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const raw = normalize(question);
  const query = normalize(interpretation.query);

  /*
   * ST_ASSISTANT_UNIQUE_MODEL_REFERENCE_V1
   *
   * When the customer explicitly identifies a unique model
   * such as G3416 or MG2541S, prefer that verified product
   * over an unrelated focused item from the previous turn.
   *
   * Do not guess if multiple models share the identifier.
   */
  const modelTokens = Array.from(
    new Set(
      raw.match(/\b[a-z]{1,6}\d{3,}[a-z0-9]*\b/g) ?? [],
    ),
  );

  if (modelTokens.length === 1) {
    const token = modelTokens[0];

    const modelMatches = catalog.filter(
      (product) =>
        (` ${normalize(product.name)} `).includes(
          ` ${token} `,
        ),
    );

    if (modelMatches.length === 1) {
      return modelMatches[0];
    }
  }

  // Prefer a clearly named product in the customer's own message.
  const explicitlyNamed = catalog
    .filter((product) => {
      const name = normalize(product.name);
      const words = name.split(" ");

      return (
        name.length >= 8 &&
        (
          hasPhrase(raw, name) ||
          (
            words.length >= 4 &&
            hasPhrase(raw, words.slice(1).join(" "))
          ) ||
          (
            query.length >= 8 &&
            hasPhrase(name, query)
          )
        )
      );
    })
    .sort((a, b) => b.name.length - a.name.length);

  if (explicitlyNamed.length > 0) {
    return explicitlyNamed[0];
  }

  const list = context.displayedProducts ?? [];
  const reference = interpretation.reference;

  const indexes: Record<string, number> = {
    first: 0,
    second: 1,
    third: 2,
    fourth: 3,
  };

  if (reference in indexes) {
    const selected = list[indexes[reference]];
    return selected ? byId.get(selected.id) ?? null : null;
  }

  if (reference === "last") {
    const selected = list.at(-1);
    return selected ? byId.get(selected.id) ?? null : null;
  }

  if (context.focusedProduct) {
    const focused = byId.get(context.focusedProduct.id);

    if (
      focused &&
      (
        reference === "focused" ||
        /\b(it|this|that|one|same)\b/.test(raw)
      )
    ) {
      return focused;
    }
  }

  if (list.length === 1) {
    return byId.get(list[0].id) ?? null;
  }

  return null;
}

function aliases(feature: string): string[] {
  const normalized = normalize(feature);

  const synonyms: Record<string, string[]> = {
    scan: ["scan", "scanner", "scanning"],
    scanner: ["scan", "scanner", "scanning"],
    scanning: ["scan", "scanner", "scanning"],
    copy: ["copy", "copying", "copies"],
    copying: ["copy", "copying", "copies"],
    wifi: ["wifi", "wi fi", "wireless"],
    wireless: ["wifi", "wi fi", "wireless"],
    "wi fi": ["wifi", "wi fi", "wireless"],
    bluetooth: ["bluetooth"],
    duplex: ["duplex", "double sided", "two sided"],
  };

  return synonyms[normalized] ?? [normalized];
}

function evidenceFor(
  configuration: AssistantKnowledgeConfiguration,
  feature: string,
): string | null {
  const terms = aliases(feature);
  const facts = [
    ...configuration.options,
    ...configuration.technicalSpecifications,
  ];

  /*
   * ST_ASSISTANT_NEGATIVE_FEATURE_EVIDENCE_V1
   *
   * An explicit negative specification in the same
   * configuration vetoes positive capability evidence.
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
    const matched = terms.some(
      (term) =>
        hasPhrase(fact.name, term) ||
        hasPhrase(fact.value, term),
    );

    if (!matched) continue;

    const value = normalize(fact.value);

    if (
      /^(no|false|none|not supported|unavailable|n a)$/.test(
        value,
      )
    ) {
      continue;
    }

    return `${fact.name}: ${fact.value}`;
  }

  return null;
}

function missingProduct(language: Language): string {
  if (language === "fr") {
    return "De quel produit parlez-vous ? Je peux vérifier ses informations dans notre catalogue.";
  }
  if (language === "ar") {
    return "عن أي منتج تتحدث؟ يمكنني التحقق من تفاصيله في الكتالوج.";
  }
  return "Which product are you referring to? I can check its details in our current catalogue.";
}

function formatPrice(value: number | null): string {
  return value === null ? "" : ` — $${value.toFixed(2)}`;
}

export function resolveAssistantVerifiedAIAnswer<T extends Product>({
  question,
  interpretation,
  context,
  catalog,
  language,
}: {
  question: string;
  interpretation: AssistantAIInterpretation | null;
  context: Context;
  catalog: T[];
  language: Language;
}): {
  kind: string;
  message: string;
  products: T[];
} | null {
  if (
    !interpretation ||
    !["feature_question", "variant_question"].includes(
      interpretation.intent,
    )
  ) {
    return null;
  }

  const product = referencedProduct(
    question,
    interpretation,
    context,
    catalog,
  );

  if (!product) {
    return {
      kind: "ai-clarification",
      message: missingProduct(language),
      products: [],
    };
  }

  const knowledge = buildAssistantVerifiedProductKnowledge(
    product,
  );

  if (interpretation.intent === "variant_question") {
    const options = interpretation.options;

    if (options.length === 0) {
      return null;
    }

    const requested: Record<string, string> = {};

    for (const option of options) {
      const key = normalize(option.name);
      const value = option.value.trim();

      if (!key || !value) return null;

      if (
        requested[key] &&
        normalize(requested[key]) !== normalize(value)
      ) {
        return null;
      }

      requested[key] = value;
    }

    /*
     * Avoid silently discarding numerical requirements.
     * Numbers in the named product are distinguished from
     * configuration numbers such as 256GB and 512GB.
     */
    const rawNumbers: string[] = normalize(question).match(/\d+/g) ?? [];
    const optionNumbers: string[] = normalize(
      Object.values(requested).join(" "),
    ).match(/\d+/g) ?? [];
    const productNumbers: string[] = normalize(product.name)
      .match(/\d+/g) ?? [];

    if (
      rawNumbers.some(
        (number) =>
          !optionNumbers.includes(number) &&
          !productNumbers.includes(number),
      )
    ) {
      return null;
    }

    const matching = findAssistantKnowledgeConfigurations(
      knowledge,
      requested,
    );

    const requestLabel = Object.values(requested).join(" / ");

    if (matching.length === 0) {
      const uncertainty = knowledge.configurationsTruncated
        ? "I couldn't verify that exact combination in the available configuration data."
        : `I couldn't find a listed ${requestLabel} configuration for ${product.name}.`;

      return {
        kind: "ai-configuration-not-found",
        message: uncertainty,
        products: [product],
      };
    }

    const details = matching.slice(0, 6).map((config) => {
      const status: Record<string, string> = {
        in_stock: "In stock",
        low_stock: "Low stock",
        out_of_stock: "Out of stock",
        coming_soon: "Coming soon",
        ask_for_price: "Ask for Price",
      };

      return `${config.label}: ${
        status[config.availabilityStatus] ?? "Availability unconfirmed"
      }${formatPrice(config.price)}`;
    });

    return {
      kind: "ai-configuration-verified",
      message:
        `${product.name} — matching ${requestLabel} configurations:\n` +
        details.join("\n") +
        (matching.length > 6
          ? "\nAdditional matching configurations may be available."
          : ""),
      products: [product],
    };
  }

  const features = interpretation.features
    .map((feature) => feature.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (features.length === 0) {
    return null;
  }

  const confirmed: string[] = [];
  const unknown: string[] = [];

  for (const feature of features) {
    const match = knowledge.configurations
      .map((configuration) => ({
        configuration,
        evidence: evidenceFor(configuration, feature),
      }))
      .find((entry) => Boolean(entry.evidence));

    if (match) {
      confirmed.push(
        `${feature} (${match.evidence})`,
      );
    } else {
      unknown.push(feature);
    }
  }

  const parts: string[] = [];

  if (confirmed.length > 0) {
    parts.push(
      `The published specifications for ${product.name} confirm ` +
      confirmed.join(" and ") + " in at least one configuration.",
    );
  }

  if (unknown.length > 0) {
    parts.push(
      `I couldn't verify ${unknown.join(" or ")} ` +
      "from the listed specifications.",
    );
  }

  parts.push(
    "Specifications may vary by configuration.",
  );

  return {
    kind: "ai-features-verified",
    message: parts.join(" "),
    products: [product],
  };
}
