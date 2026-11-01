/*
 * ST_ASSISTANT_GUIDED_SHOPPING_V1
 *
 * Budget ceilings and purpose-aware product discovery.
 * All products and prices must come from the published catalogue.
 * Missing evidence must not be presented as a verified feature.
 */

type Language = "en" | "fr" | "ar";
type Purpose = "gaming" | "office" | "university" | "home";

export type GuidedRequest = {
  subject: string;
  budget: number | null;
  purpose: Purpose | null;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  variants?: {
    currentPrice: number;
    purchasable: boolean;
  }[];
};

const ignored = new Set(
  ("i im my me we our a an the and or of in at to for with " +
  "which what who how is are do does can could you your have " +
  "need want looking find show recommend recommendation best " +
  "better suitable ideal good product products item items " +
  "one ones something any some dollar dollars usd price range " +
  "budget maximum max limit less more than not exceed dont don " +
  "t under below up within spend spending only about around " +
  "between like use using that this should would there be " +
  "gaming game games office business work home household " +
  "school schooling university college student studying " +
  "studies education educational use").split(" ")
);

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseGuidedShoppingRequest(
  message: string,
): GuidedRequest | null {
  const q = normalize(message);

  if (
    /\b(order|checkout|cart|wishlist|refund|tracking|return)\b/.test(q) ||
    /\b(?:iphone|ipad|galaxy|pixel)\s+\d+\b/.test(q)
  ) {
    return null;
  }

  const purpose: Purpose | null =
    /\b(gaming|video games?)\b/.test(q)
      ? "gaming"
      : /\b(office|business|work)\b/.test(q)
        ? "office"
        : /\b(university|college|school|schooling|student|studying)\b/.test(q)
          ? "university"
          : /\b(home|household)\b/.test(q)
            ? "home"
            : null;

  const money =
    q.match(
      /\b(?:don t want to exceed|dont want to exceed|not exceed|under|below|up to|less than|maximum|max|budget(?: is| of)?|price range(?: is| of)?|limit(?: is)?)\s*(?:usd\s*)?(\d{1,6})\b/
    ) ||
    message.match(/\$\s*(\d{1,6})\b/) ||
    q.match(/\b(\d{1,6})\s*(?:usd|dollars?)\b/);

  const amount = money ? Number(money[1]) : null;
  const budget =
    amount !== null &&
    Number.isFinite(amount) &&
    amount > 0
      ? amount
      : null;

  if (budget === null && purpose === null) return null;

  if (
    budget === null &&
    !/\b(best|better|recommend|suitable|ideal|need|want|looking)\b/.test(q)
  ) {
    return null;
  }

  const subject = q
    .split(" ")
    .filter(
      (word) =>
        word.length > 1 &&
        !ignored.has(word) &&
        !/^\d+$/.test(word)
    )
    .slice(0, 6)
    .join(" ");

  return { subject, budget, purpose };
}

const evidence: Record<Purpose, Array<[RegExp, string]>> = {
  gaming: [
    [/\bgaming\b/i, "gaming-focused design"],
    [/\brtx\b/i, "RTX graphics"],
    [/\bgeforce\b/i, "GeForce graphics"],
    [/\bradeon\b/i, "Radeon graphics"],
    [/\bdedicated graphics\b/i, "dedicated graphics"],
  ],
  office: [
    [/\bscann?(?:er|ing)?\b/i, "scanning"],
    [/\bcopy|copier\b/i, "copying"],
    [/\bwi[\s-]?fi|wireless\b/i, "wireless connectivity"],
    [/\bink tank\b/i, "ink-tank printing"],
    [/\bduplex\b/i, "duplex capability"],
  ],
  university: [
    [/\blightweight\b/i, "lightweight design"],
    [/\bportable\b/i, "portability"],
    [/\bbattery\b/i, "battery information"],
    [/\bssd\b/i, "SSD storage"],
  ],
  home: [
    [/\bcompact\b/i, "compact design"],
    [/\bwireless|wi[\s-]?fi\b/i, "wireless connectivity"],
    [/\ball.in.one\b/i, "all-in-one functionality"],
  ],
};


/*
 * ST_GUIDED_MAIN_PRODUCT_GUARD_V2
 *
 * Never confuse a computer with an accessory, or a printer
 * with its replacement supplies.
 *
 * An explicitly requested accessory remains eligible.
 */
export function guidedProductMatchesRequestedType(
  name: string,
  subject: string,
): boolean {
  const requested = normalize(subject);
  const title = normalize(name);

  const laptopRequested =
    /\b(?:laptops?|notebooks?)\b/.test(requested);

  const laptopAccessories =
    /\b(?:stands?|holders?|mounts?|docks?|hubs?|bags?|sleeves?|cases?|covers?|chargers?|adapters?|cables?|coolers?|cooling|fans?|pads?|keyboards?|mice|mouse|protectors?)\b/;

  if (
    laptopRequested &&
    !laptopAccessories.test(requested) &&
    laptopAccessories.test(title)
  ) {
    return false;
  }

  const printerRequested =
    /\bprinters?\b/.test(requested);

  const printerSupplies =
    /\b(?:cartridges?|toners?|refills?|papers?|trays?)\b/;

  const printerSupplyPhrases =
    /\b(?:printer ink|ink bottles?|printer cables?|printer stands?|replacement inks?)\b/;

  if (
    printerRequested &&
    !printerSupplies.test(requested) &&
    !printerSupplyPhrases.test(requested) &&
    (
      printerSupplies.test(title) ||
      printerSupplyPhrases.test(title)
    )
  ) {
    return false;
  }

  return true;
}

export function resolveGuidedShopping<
  T extends Product
>(
  request: GuidedRequest,
  candidates: T[],
  language: Language,
): { message: string; products: T[] } {
  if (!request.subject && candidates.length === 0) {
    return {
      message:
        language === "fr"
          ? "Quel type de produit recherchez-vous ? Je pourrai alors respecter votre budget et vous proposer des options adaptées."
          : language === "ar"
            ? "ما نوع المنتج الذي تبحث عنه؟ يمكنني مساعدتك في اختيار خيارات مناسبة ضمن ميزانيتك."
            : "What type of product are you looking for? I'll use your budget and preferences to narrow down the options.",
      products: [],
    };
  }

  const subjectLabel = request.subject || "product";

  const ranked = candidates
    .filter((product) =>
      guidedProductMatchesRequestedType(
        product.name,
        request.subject,
      ),
    )
    .map((product) => {
    const eligible = (product.variants ?? [])
      .filter(
        (variant) =>
          variant.purchasable === true &&
          Number.isFinite(variant.currentPrice) &&
          variant.currentPrice > 0 &&
          (
            request.budget === null ||
            variant.currentPrice <= request.budget
          )
      )
      .map((variant) => variant.currentPrice);

    const facts = `${product.name} ${product.description ?? ""}`;
    const signals = request.purpose
      ? evidence[request.purpose]
          .filter(([pattern]) => pattern.test(facts))
          .map(([, label]) => label)
      : [];

    return {
      product,
      minPrice: eligible.length
        ? Math.min(...eligible)
        : null,
      signals,
    };
  });

  const eligible = ranked
    .filter(
      (entry): entry is typeof entry & { minPrice: number } =>
        entry.minPrice !== null
    )
    .sort(
      (a, b) =>
        b.signals.length - a.signals.length ||
        a.minPrice - b.minPrice
    );

  if (!eligible.length) {
    const message = request.budget !== null
      ? `I couldn't verify a currently purchasable ${subjectLabel} within your maximum budget of $${request.budget}. Would you like to consider a different budget or another product type?`
      : `I couldn't verify an available ${subjectLabel} matching your requirements in our current catalogue. Would you like to explore another option?`;

    return {
      message:
        language === "fr"
          ? request.budget !== null
            ? `Je n’ai trouvé aucune option actuellement achetable correspondant à votre recherche à ${request.budget} $ ou moins. Souhaitez-vous ajuster votre budget ?`
            : "Je n’ai pas pu confirmer de produit disponible correspondant à ces critères."
          : language === "ar"
            ? request.budget !== null
              ? `لم أتمكن من تأكيد توفر منتج مطابق ضمن ميزانيتك القصوى البالغة ${request.budget} دولار. هل ترغب في تعديل الميزانية؟`
              : "لم أتمكن من تأكيد توفر منتج يطابق هذه المتطلبات حالياً."
            : message,
      products: [],
    };
  }

  const selected = eligible.slice(0, 4);
  const first = selected[0];
  const purpose = request.purpose
    ? ` for ${request.purpose} use`
    : "";
  const budget = request.budget !== null
    ? ` within your $${request.budget} maximum`
    : "";

  const supported = first.signals.length
    ? ` Its listed information mentions ${first.signals.join(", ")}.`
    : " The published details don't establish a definitive best choice.";

  const message =
    `I found ${selected.length} currently purchasable ${subjectLabel} option${selected.length === 1 ? "" : "s"}${purpose}${budget}. ` +
    `A useful starting point is ${first.product.name}, with a listed configuration from $${first.minPrice.toFixed(2)}.` +
    supported +
    " Would you like to compare specifications or prioritize a particular feature?";

  return {
    message:
      language === "fr"
        ? `J’ai trouvé ${selected.length} option(s) correspondant à votre recherche${request.budget !== null ? ` à ${request.budget} $ ou moins` : ""}. Je vous propose de commencer par ${first.product.name}, disponible à partir de ${first.minPrice.toFixed(2)} $. Souhaitez-vous comparer les caractéristiques ?`
        : language === "ar"
          ? `وجدت ${selected.length} من الخيارات المتاحة المطابقة لطلبك${request.budget !== null ? ` ضمن ${request.budget} دولار` : ""}. يمكننا البدء بمقارنة ${first.product.name}، بسعر يبدأ من ${first.minPrice.toFixed(2)} دولار. هل تريد مقارنة المواصفات؟`
          : message,
    products: selected.map((entry) => entry.product),
  };
}
