import { createAdminClient } from "@/lib/supabase/admin";

/*
 * ST_ASSISTANT_VERIFIED_STORE_KNOWLEDGE_V1
 *
 * Public business facts only.
 * Prices and delivery settings come from the live database.
 * Store history, opening hours and directions match the About page.
 *
 * No customer data and no LLM-generated business facts.
 */

type Language = "en" | "fr" | "ar";

export type StoreKnowledgeIntent =
  | "hours"
  | "location"
  | "founding"
  | "ownership"
  | "delivery_fee"
  | "delivery_time"
  | "pickup"
  | null;

export type StoreKnowledgeAnswer = {
  message: string;
  links?: {
    label: string;
    url: string;
  }[];
};

/*
 * Official Stereophonie Store Google Maps destination.
 * A Place ID prevents ambiguous name-based searches.
 * Maps URLs require no paid Google Maps API key.
 */
const STORE_MAP_URL =
  "https://www.google.com/maps/dir/?api=1&destination=Stereophonie+Store%2C+Mtaileb%2C+Lebanon&destination_place_id=ChIJ70H5JvE-HxURCdXRMYTxE_c";

const STORE_APPLE_MAP_URL =
  "https://maps.apple.com/?daddr=Stereophonie%20Store%2C%20Mtaileb%2C%20Lebanon";


function normalizeQuestion(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function classifyStoreKnowledgeIntent(
  message: string,
): StoreKnowledgeIntent {
  const q = normalizeQuestion(message);

  if (!q) return null;

  /*
   * ST_ASSISTANT_PICKUP_KNOWLEDGE_V1
   * Answer availability of STORE PICKUP, not the status
   * of a particular customer's order.
   */
  const pickupArabic = message
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي");

  const pickupAvailability =
    /\b(?:do you|do u|can i|could i|may i|is it|is there|how can i|how do i|i want to|i d like to)\b.{0,100}\b(?:pickups?|pick up|pick(?:\s+(?:my|the|an|your))?(?:\s+order)?(?:\s+up)?|collect|collection|click and collect)\b/.test(q) ||
    /\b(?:pickups?|pick up|collection|store collection|click and collect)\b.{0,60}\b(?:available|possible|offered|option|in store|from the store|at the store)\b/.test(q) ||
    /\b(?:offer|allow|provide|have|support)\b.{0,65}\b(?:pickups?|pick up|collection|click and collect)\b/.test(q) ||
    /\b(?:peux|possible|proposez|offrez|faites|est ce que|je peux|est il possible)\b.{0,100}\b(?:retrait|retirer|recuperer|collecter|click and collect)\b/.test(q) ||
    /\b(?:retrait|retirer|recuperer)\b.{0,30}\b(?:magasin|boutique)\b/.test(q) ||
    /(?:فيني|ممكن|هل|في|عندكم|كيف|بتعملوا|بتقدروا|بقدر).{0,90}(?:استلام|استلم|بستلم|استلمه)/.test(pickupArabic);

  const individualOrderStatus =
    /\b(?:yet|ready|already|status|track|tracking|where is|when will)\b/.test(q) ||
    /(?:طلبي جاهز|وين طلبي|وصل طلبي)/.test(pickupArabic);

  const productSpecificPickup =
    /\b(?:iphone|ipad|galaxy|macbook|airpods|headphones|laptop|power bank|printer|playstation)\b/.test(q);

  if (
    pickupAvailability &&
    !individualOrderStatus &&
    !productSpecificPickup
  ) {
    return "pickup";
  }


  // Personal orders must continue through the existing
  // authenticated order-tracking branch.
  if (
    /\b(my|our) (order|package|parcel|shipment)\b/.test(q) ||
    /\b(ma commande|mon colis|mes commandes)\b/.test(q) ||
    /(طلبي|طلباتي|شحنتي)/.test(message)
  ) {
    return null;
  }

  const storeReference =
    /\b(stereophonie|styrophonie|stereofonie|store|shop|company|business|you|your|u|guys|magasin|boutique|vous|votre)\b/.test(q) ||
    /(متجر|محل|عندكم|محلكم)/.test(message);


  /*
   * ST_ASSISTANT_OWNERSHIP_KNOWLEDGE_V1
   *
   * Official business information supplied by the
   * Stereophonie store operator.
   *
   * Person questions must not be mistaken for
   * questions asking when the store was established.
   */
  const ownershipPersonQuestion =
    /\b(?:who|whos|whose|by whom|which person|name of|qui|quel est|quelle est)\b/.test(q) ||
    /(?:مين|من هو|من هي|شو اسم|اسم مين)/.test(message);

  const ownershipTopic =
    /\b(?:owner|owns|owned|founder|founded|creator|created|made|started|ceo|chief executive|boss|proprietaire|proprio|fondateur|fondatrice|fonde|cree|createur|creatrice|pdg|patron|directeur general)\b/.test(q) ||
    /(?:صاحب|مالك|مؤسس|اسس|أسس|الرئيس التنفيذي|مدير عام)/.test(message);

  const ownershipStoreReference =
    storeReference ||
    /\b(?:stereophony|styrophony|stereofony)\b/.test(q) ||
    /(?:ستيريوفوني|ستريوفوني|ستيروفوني)/.test(message);

  if (
    ownershipPersonQuestion &&
    ownershipTopic &&
    ownershipStoreReference
  ) {
    return "ownership";
  }

  const founding =
    (
      storeReference &&
      /\b(when|what year|since when|how old)\b/.test(q) &&
      /\b(founded|established|created|started|start|began|begin|launched|formed)\b/.test(q)
    ) ||
    /\b(?:quand|quelle annee)\b.*\b(?:cree(?:e|s|es)?|fonde(?:e|s|es)?|commence(?:e|s|es)?)\b/.test(q) ||
    /(متى تأسس|سنة التأسيس|امتى تأسس)/.test(message);

  if (founding) return "founding";

  /*
   * ST_LOCATION_NATURAL_PHRASES_V2
   *
   * Customers may simply ask "location please" or
   * "send me location". These are store-location requests.
   * Personal location and order requests are excluded.
   */
  const directStoreLocation =
    !/\b(?:my|our) (?:location|address|order|package)\b/.test(q) &&
    !/\bwhere am i\b/.test(q) &&
    !/(?:موقعي|عنواني|طلبي)/.test(message) &&
    (
      /^(?:please\s+)?(?:send|share|give|drop)(?:\s+(?:me|us))?\s+(?:(?:your|the|store|shop|exact|business)\s+){0,4}(?:location|address|map|pin)(?:\s+(?:of\s+(?:your|the)\s+(?:shop|store)))?(?:\s+(?:please|pls))?$/.test(q) ||
      /^(?:(?:your|the|store|shop)\s+)?(?:location|address|directions|map|pin)(?:\s+(?:please|pls))?$/.test(q) ||
      /^where (?:are|r) (?:you|u)(?: (?:located|based))?$/.test(q) ||
      /^where (?:is|s) (?:your|the) (?:shop|store|location)$/.test(q) ||
      /\bhow (?:do|can) i (?:get|come|reach) (?:to )?(?:your|the) (?:shop|store)\b/.test(q) ||
      /\b(?:navigate|directions) to (?:your|the) (?:shop|store)\b/.test(q) ||
      /\b(?:envoyez|envoie|donnez|donne|partagez|partage)(?: moi)? (?:votre |la |l )?(?:localisation|adresse|position)\b/.test(q) ||
      /^(?:localisation|adresse|itineraire)(?: svp| s il vous plait)?$/.test(q) ||
      /(?:ارسل|أرسل|ابعث|بعت|شاركني).{0,25}(?:موقع|الموقع|عنوان|العنوان|لوكيشن)/.test(message) ||
      /^(?:وين المحل|وين محلكم|موقع المحل|عنوان المحل|لوكيشن المحل)$/.test(message.trim())
    );

  const location =
    directStoreLocation ||
    (
      storeReference &&
      /\b(where|address|location|located|directions|find|visit|map)\b/.test(q)
    ) ||
    /\b(ou se trouve|ou est votre magasin|adresse du magasin|votre adresse)\b/.test(q) ||
    /(وين محلكم|وين المتجر|عنوان المحل|موقع المتجر|أين متجركم)/.test(message);

  if (location) return "location";

  const deliveryWords =
    /\b(delivery|deliver|delivered|delivering|deliveri|delivry|dilevery|shipping|ship|shiping|shippng|livraison|livraision|livrasion|livraon|expedition)\b/.test(q) ||
    /(توصيل|التوصيل|شحن|الشحن)/.test(message);

  const feeWords =
    /\b(fee|fees|cost|costs|charge|charges|price|rate|rates|how much|free|frais|cout|combien|gratuit)\b/.test(q) ||
    /(رسوم|سعر|تكلفة|كلفة|قديش|مجاني)/.test(message);

  if (deliveryWords && feeWords) return "delivery_fee";

  const deliveryTimeWords =
    /\b(how long|how many days|delivery time|shipping time|estimated delivery|delivery estimate|take|duration|delai|combien de jours)\b/.test(q) ||
    /(قديش بياخد|مدة التوصيل|وقت التوصيل)/.test(message);

  if (deliveryWords && deliveryTimeWords) {
    return "delivery_time";
  }

  // Avoid mistaking product-search requests for store hours.
  if (
    /\bopen box\b/.test(q) ||
    /\bopen (the|this|my|a|an) (product|page|link|cart|wishlist|website)\b/.test(q)
  ) {
    return null;
  }

  const hoursPhrase =
    /\b(opening hours|business hours|store hours|shop hours|working hours|hours of operation|opening time|closing time|store schedule)\b/.test(q);

  const hoursQuestion =
    storeReference &&
    /\b(when|what|which|are|is|do|does|can|days|day|time|hours|hour)\b/.test(q) &&
    /\b(open|opening|close|closed|closing|operate|operating|working|hours|weekdays|weekends|sunday|saturday)\b/.test(q);

  const localizedHours =
    /\b(horaires|heures d ouverture|quand ouvrez|quand fermez|jours d ouverture)\b/.test(q) ||
    /(متى تفتح|متى تسكر|ساعات العمل|أوقات الدوام|ايام الدوام)/.test(message);

  // Existing date/time-aware logic handles "open now/today".
  if (
    /\b(right now|currently|today|tomorrow|at the moment)\b/.test(q)
  ) {
    return null;
  }

  if (hoursPhrase || hoursQuestion || localizedHours) {
    return "hours";
  }

  return null;
}

function messageFor(
  language: Language,
  en: string,
  fr: string,
  ar: string,
) {
  return language === "fr"
    ? fr
    : language === "ar"
      ? ar
      : en;
}

export async function resolveStoreKnowledge(
  question: string,
  language: Language,
): Promise<StoreKnowledgeAnswer | null> {
  const intent = classifyStoreKnowledgeIntent(question);

  if (!intent) return null;


  if (intent === "ownership") {
    return {
      message: messageFor(
        language,
        "Stereophonie was created by Alain Salameh, who is its owner and CEO.",
        "Stereophonie a été créée par Alain Salameh, qui en est le propriétaire et le PDG.",
        "أسّس Alain Salameh متجر Stereophonie، وهو مالكه ورئيسه التنفيذي.",
      ),
    };
  }

  if (intent === "founding") {
    return {
      message: messageFor(
        language,
        "Stereophonie was established in 2008 in Lebanon.",
        "Stereophonie a été fondée en 2008 au Liban.",
        "تأسس متجر Stereophonie في لبنان سنة 2008.",
      ),
    };
  }

  if (intent === "location") {
    return {
      message: messageFor(
        language,
        "Stereophonie Store is located in Mtaileb, Mount Lebanon, Lebanon.",
        "Stereophonie Store se trouve à Mtaileb, au Mont-Liban, au Liban.",
        "يقع متجر Stereophonie في المطيلب، جبل لبنان.",
      ),
      links: [
        {
          label: messageFor(
            language,
            "Google Maps",
            "Google Maps",
            "خرائط Google",
          ),
          url: STORE_MAP_URL,
        },
        {
          label: messageFor(
            language,
            "Apple Maps",
            "Plans Apple",
            "خرائط Apple",
          ),
          url: STORE_APPLE_MAP_URL,
        },
      ],
    };
  }


  if (intent === "pickup") {
    return {
      message: messageFor(
        language,
        "Yes! You can place an order online and select Store Pickup at checkout. Pickup orders use Cash at Pickup. Please wait until your order is ready before collecting it from Stereophonie Store in Mtaileb.",
        "Oui ! Vous pouvez commander en ligne et choisir le retrait en magasin lors du paiement. Le règlement se fait en espèces au retrait. Attendez que votre commande soit prête avant de la récupérer chez Stereophonie Store à Mtaileb.",
        "أكيد! فيك تطلب أونلاين وتختار الاستلام من المحل عند إتمام الطلب. الدفع للاستلام بيكون نقداً عند الاستلام. ناطر تأكيد إن طلبك صار جاهز قبل ما تستلمه من Stereophonie بالمطيلب.",
      ),
      links: [
        {
          label: "Google Maps",
          url: STORE_MAP_URL,
        },
        {
          label: "Apple Maps",
          url: STORE_APPLE_MAP_URL,
        },
      ],
    };
  }

  if (intent === "hours") {
    return {
      message: messageFor(
        language,
        "Stereophonie is open Monday through Saturday, from 10:00 AM to 8:00 PM. The store is closed on Sundays. Holiday hours may vary.",
        "Stereophonie est ouvert du lundi au samedi, de 10h00 à 20h00. Le magasin est fermé le dimanche. Les horaires peuvent varier les jours fériés.",
        "يفتح Stereophonie من الاثنين إلى السبت، من الساعة 10 صباحاً حتى 8 مساءً. المتجر مغلق يوم الأحد، وقد تختلف المواعيد خلال الأعياد.",
      ),
    };
  }

  // Prices and delivery estimates are never guessed.
  // Read the same public settings used by the storefront.
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("store_settings")
      .select(
        "delivery_fee, free_delivery_threshold, delivery_estimate",
      )
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return {
        message: messageFor(
          language,
          "I couldn't verify the current delivery details. Please check the delivery information at checkout.",
          "Je ne peux pas vérifier les informations actuelles de livraison. Consultez les détails lors du checkout.",
          "تعذّر التحقق من معلومات التوصيل الحالية. يمكنك مراجعتها عند إتمام الطلب.",
        ),
      };
    }

    if (intent === "delivery_time") {
      const estimate =
        typeof data.delivery_estimate === "string"
          ? data.delivery_estimate.trim()
          : "";

      return {
        message: estimate
          ? messageFor(
              language,
              `The current standard delivery estimate is ${estimate}. This is an estimate, not a guaranteed arrival date.`,
              `Le délai de livraison standard indiqué est de ${estimate}. Il s'agit d'une estimation et non d'une date garantie.`,
              `مدة التوصيل العادية المتوقعة هي ${estimate}. هذا تقدير وليس موعد وصول مضموناً.`,
            )
          : messageFor(
              language,
              "I can't verify the current delivery estimate.",
              "Je ne peux pas confirmer le délai actuel de livraison.",
              "لا يمكنني تأكيد مدة التوصيل حالياً.",
            ),
      };
    }

    const fee = Number(data.delivery_fee);

    if (!Number.isFinite(fee) || fee < 0) {
      return {
        message: messageFor(
          language,
          "I can't verify the current delivery fee.",
          "Je ne peux pas confirmer les frais de livraison actuels.",
          "لا يمكنني تأكيد رسوم التوصيل حالياً.",
        ),
      };
    }

    const feeText = `$${fee.toFixed(2)}`;
    const threshold = Number(data.free_delivery_threshold);
    const hasThreshold =
      data.free_delivery_threshold !== null &&
      Number.isFinite(threshold) &&
      threshold > 0;

    const freeText = hasThreshold
      ? `$${threshold.toFixed(2)}`
      : null;

    return {
      message: messageFor(
        language,
        `Standard delivery costs ${feeText}.${freeText ? ` Free delivery applies to eligible orders of ${freeText} or more.` : ""} The final fee is shown at checkout.`,
        `Les frais de livraison standard sont de ${feeText}.${freeText ? ` La livraison gratuite s'applique aux commandes éligibles dès ${freeText}.` : ""} Le montant final est indiqué au checkout.`,
        `رسوم التوصيل العادية هي ${feeText}.${freeText ? ` يتوفر توصيل مجاني للطلبات المؤهلة بقيمة ${freeText} أو أكثر.` : ""} تظهر الرسوم النهائية عند إتمام الطلب.`,
      ),
    };
  } catch {
    return {
      message: messageFor(
        language,
        "I couldn't verify the current delivery details. Please check checkout for the latest information.",
        "Je ne peux pas vérifier les détails actuels de livraison. Consultez le checkout.",
        "تعذّر التحقق من تفاصيل التوصيل الحالية. يرجى مراجعة صفحة إتمام الطلب.",
      ),
    };
  }
}

/*
 * ST_ASSISTANT_COMPOUND_STORE_QUESTIONS_V2
 *
 * Combine independently verified public store answers.
 * Preserve existing product, account and order processing.
 * Arabic matching uses a separate script-safe normalizer.
 */
export async function resolveCompoundStoreKnowledge(
  question: string,
  language: Language,
): Promise<StoreKnowledgeAnswer | null> {
  const raw = question.trim();

  if (!raw || raw.length > 600) return null;

  const q = normalizeQuestion(raw);

  // NFKD + letter-only cleanup in normalizeQuestion()
  // can split Arabic hamza forms, e.g. أوقات -> ا وقات.
  // Keep Arabic detection independent of that cleanup.
  const arabic = raw
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "");

  // Mixed product/order/account requests must continue
  // to the specialized existing handlers.
  if (
    /\b(?:my|our|mon|ma|mes)\s+(?:order|orders|commande|commandes|account|compte)\b/.test(q) ||
    /\b(?:track|tracking|checkout|refund|return|payment|warranty|guarantee|in stock|availability|available|product|products|iphone|ipad|airpods|macbook|samsung|galaxy|charger|headphones|speaker|printer|laptop|tablet|price of|do you sell|do you have|can i buy|how much is)\b/.test(q) ||
    /(?:طلبي|طلباتي|شحنتي|حسابي|المنتج|المنتجات|متوفر|ضمان|استرجاع|عندكم من)/.test(arabic)
  ) {
    return null;
  }


  /*
   * ST_ASSISTANT_FIVE_QUESTION_STORE_KNOWLEDGE_V1
   *
   * Preserve the customer's question order and allow
   * multiple questions of the same intent.
   *
   * An unrecognized or mixed product question does NOT
   * receive a misleading partial store-only answer.
   */
  const individualQuestions = raw
    .split(/[?؟\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (
    individualQuestions.length >= 2 &&
    individualQuestions.length <= 8
  ) {
    const intents = individualQuestions.map(
      (part) => classifyStoreKnowledgeIntent(part),
    );

    if (intents.every((intent) => intent !== null)) {
      const results = await Promise.all(
        individualQuestions.map(
          (part) => resolveStoreKnowledge(part, language),
        ),
      );

      if (results.every((answer) => answer !== null)) {
        const answers = results as StoreKnowledgeAnswer[];
        const links = new Map<
          string,
          { label: string; url: string }
        >();

        for (const answer of answers) {
          for (const link of answer.links ?? []) {
            links.set(link.url, link);
          }
        }

        return {
          message: answers
            .map((answer) => answer.message)
            .join("\n\n"),
          links: [...links.values()],
        };
      }
    }
  }

  type CompoundIntent =
    Exclude<StoreKnowledgeIntent, null>;

  const candidates: {
    intent: CompoundIntent;
    latin: RegExp;
    arabic: RegExp;
    canonical: string;
  }[] = [
    {
      intent: "location",
      latin:
        /\b(?:where(?:\s+is|\s+are)?|location|address|located|directions|maps?|localisation|adresse|itineraire|ou se trouve|ou est)\b/,
      arabic: /(?:وين|اين|عنوان|موقع|لوكيشن)/,
      canonical: "Where is your store location?",
    },
    {
      intent: "hours",
      latin:
        /\b(?:opening hours?|business hours?|store hours?|shop hours?|working hours?|opening time|closing time|hours of operation|when (?:do you|are you|does the store|is the store) (?:open|close)|what time (?:do you|does the store|are you) (?:open|close)|horaires|heures d ouverture|quand (?:ouvrez|fermez)|a quelle heure (?:ouvrez|fermez))\b/,
      arabic:
        /(?:ساعات العمل|اوقات الدوام|متى تفتح|متى تسكر|امتى بتفتح|امتى بتسكر|دوام المحل)/,
      canonical: "What are your opening hours?",
    },
    {
      intent: "pickup",
      latin:
        /\b(?:pickups?|pick up|pick my order|collect|collection|click and collect|retrait|retirer|recuperer)\b/,
      arabic:
        /(?:استلام|استلم|بستلم)/,
      canonical: "Do you offer store pickup?",
    },
    {
      intent: "ownership",
      latin:
        /\b(?:who|whose|by whom|qui|par qui)\b.{0,70}\b(?:founded|created|owns|owned|owner|founder|creator|ceo|fonde|fondee|cree|creee|proprietaire|pdg)\b|\b(?:owner|founder|creator|ceo|proprietaire|fondateur|createur|pdg)\b/,
      arabic:
        /(?:مين|من هو|من هي).{0,65}(?:صاحب|مالك|مؤسس|اسس|الرئيس)|(?:صاحب المحل|مالك المتجر|مؤسس المتجر)/,
      canonical: "Who owns Stereophonie?",
    },
    {
      intent: "founding",
      latin:
        /\b(?:founded|established|founding|created the store|since what year|year was .* founded|fonde|fondation|annee de creation)\b/,
      arabic: /(?:تاسس|تاسيس)/,
      canonical: "When was Stereophonie founded?",
    },
    {
      intent: "delivery_fee",
      latin:
        /\b(?:(?:delivery|shipping|livraison).{0,45}(?:fee|cost|price|charge|how much|frais|cout|combien)|(?:how much|fee|cost|price|frais|combien).{0,45}(?:delivery|shipping|livraison))\b/,
      arabic:
        /(?:رسوم التوصيل|تكلفة التوصيل|كلفة التوصيل|قديش التوصيل)/,
      canonical: "What is your delivery fee?",
    },
    {
      intent: "delivery_time",
      latin:
        /\b(?:(?:delivery|shipping|livraison).{0,45}(?:time|days|estimate|duration|take|delai)|(?:how long|how many days|when|combien de jours|delai).{0,45}(?:delivery|shipping|livraison))\b/,
      arabic:
        /(?:مدة التوصيل|وقت التوصيل|قديش بياخد التوصيل)/,
      canonical: "How long does delivery take?",
    },
  ];

  let found = candidates
    .map((candidate) => {
      const matches = [
        q.search(candidate.latin),
        arabic.search(candidate.arabic),
      ].filter((index) => index >= 0);

      return {
        ...candidate,
        index: matches.length
          ? Math.min(...matches)
          : -1,
      };
    })
    .filter((candidate) => candidate.index >= 0)
    .sort((a, b) => a.index - b.index);

  const explicitlyAsksFoundingTime =
    /\b(?:when|what year|which year|since when|year|quand|annee)\b/.test(q) ||
    /(?:متى|امتى|سنة|عام التأسيس)/.test(arabic);

  if (
    found.some((item) => item.intent === "ownership") &&
    !explicitlyAsksFoundingTime
  ) {
    found = found.filter(
      (item) => item.intent !== "founding",
    );
  }


  // Single questions stay in the original resolver.
  if (found.length < 2) return null;

  const answers: StoreKnowledgeAnswer[] = [];

  for (const item of found) {
    const answer = await resolveStoreKnowledge(
      item.canonical,
      language,
    );

    if (!answer) return null;

    answers.push(answer);
  }

  const links = new Map<
    string,
    { label: string; url: string }
  >();

  for (const answer of answers) {
    for (const link of answer.links ?? []) {
      links.set(link.url, link);
    }
  }

  return {
    message: answers
      .map((answer) => answer.message)
      .join("\n\n"),
    links: [...links.values()],
  };
}
