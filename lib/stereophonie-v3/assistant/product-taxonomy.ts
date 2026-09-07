export type AssistantProductConcept = {
  id: string;
  aliases: readonly string[];
  family: string;
  type: string;
  categories: readonly string[];
  brands?: readonly string[];
  accessoryFamily?: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * STEREOPHONIE PRODUCT INTELLIGENCE TAXONOMY
 *
 * This is intentionally independent from the live catalog.
 *
 * The taxonomy understands what a customer MEANS.
 * The live catalog remains authoritative for what Stereophonie
 * actually sells and what is currently available.
 *
 * Matching priority:
 *
 * exact model / concept
 * -> product family
 * -> product type
 * -> store category
 * -> broad category fallback
 */
export const assistantProductConcepts: readonly AssistantProductConcept[] = [
  {
    id: "ipad-pro",
    aliases: ["ipad pro", "apple ipad pro"],
    family: "ipad",
    type: "tablet",
    categories: ["tablets"],
    brands: ["apple"],
  },
  {
    id: "ipad-air",
    aliases: ["ipad air", "apple ipad air"],
    family: "ipad",
    type: "tablet",
    categories: ["tablets"],
    brands: ["apple"],
  },
  {
    id: "ipad-mini",
    aliases: ["ipad mini", "apple ipad mini"],
    family: "ipad",
    type: "tablet",
    categories: ["tablets"],
    brands: ["apple"],
  },
  {
    id: "ipad",
    aliases: ["ipad", "apple ipad"],
    family: "ipad",
    type: "tablet",
    categories: ["tablets"],
    brands: ["apple"],
  },
  {
    id: "galaxy-tab",
    aliases: [
      "galaxy tab",
      "samsung galaxy tab",
      "samsung tablet",
      "galaxy tablet",
    ],
    family: "galaxy tab",
    type: "tablet",
    categories: ["tablets"],
    brands: ["samsung"],
  },
  {
    id: "pixel-tablet",
    aliases: ["pixel tablet", "google pixel tablet", "google tablet"],
    family: "pixel tablet",
    type: "tablet",
    categories: ["tablets"],
    brands: ["google"],
  },

  {
    id: "iphone",
    aliases: ["iphone", "apple iphone"],
    family: "iphone",
    type: "smartphone",
    categories: ["phones"],
    brands: ["apple"],
  },
  {
    id: "galaxy-phone",
    aliases: [
      "galaxy phone",
      "samsung galaxy",
      "samsung phone",
      "galaxy smartphone",
    ],
    family: "galaxy",
    type: "smartphone",
    categories: ["phones"],
    brands: ["samsung"],
  },
  {
    id: "pixel-phone",
    aliases: ["pixel phone", "google pixel", "google phone"],
    family: "pixel",
    type: "smartphone",
    categories: ["phones"],
    brands: ["google"],
  },

  {
    id: "apple-pencil-pro",
    aliases: [
      "apple pencil pro",
      "apple pen pro",
      "ipad pencil pro",
      "ipad pen pro",
      "pencil pro",
    ],
    family: "apple pencil",
    type: "stylus",
    categories: ["electronic accessories", "accessories"],
    brands: ["apple"],
    accessoryFamily: "tablet accessories",
  },
  {
    id: "apple-pencil",
    aliases: [
      "apple pencil",
      "apple pen",
      "ipad pencil",
      "ipad pen",
      "pencil for ipad",
      "pen for ipad",
    ],
    family: "apple pencil",
    type: "stylus",
    categories: ["electronic accessories", "accessories"],
    brands: ["apple"],
    accessoryFamily: "tablet accessories",
  },
  {
    id: "stylus",
    aliases: [
      "stylus",
      "stylus pen",
      "tablet pen",
      "tablet pencil",
      "digital pen",
    ],
    family: "stylus",
    type: "stylus",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "tablet accessories",
  },

  {
    id: "airpods-max",
    aliases: ["airpods max", "apple airpods max"],
    family: "airpods",
    type: "over-ear headphones",
    categories: ["headphones"],
    brands: ["apple"],
  },
  {
    id: "airpods-pro",
    aliases: [
      "airpods pro",
      "apple airpods pro",
      "airpod pro",
      "apple airpod pro",
    ],
    family: "airpods",
    type: "wireless earbuds",
    categories: ["earphones"],
    brands: ["apple"],
  },
  {
    id: "airpods",
    aliases: ["airpods", "apple airpods", "airpod", "apple airpod"],
    family: "airpods",
    type: "wireless earbuds",
    categories: ["earphones"],
    brands: ["apple"],
  },
  {
    id: "galaxy-buds",
    aliases: [
      "galaxy buds",
      "samsung galaxy buds",
      "samsung buds",
      "galaxy earbuds",
    ],
    family: "galaxy buds",
    type: "wireless earbuds",
    categories: ["earphones"],
    brands: ["samsung"],
  },
  {
    id: "pixel-buds",
    aliases: ["pixel buds", "google pixel buds", "google buds"],
    family: "pixel buds",
    type: "wireless earbuds",
    categories: ["earphones"],
    brands: ["google"],
  },

  {
    id: "wireless-earbuds",
    aliases: [
      "wireless earbuds",
      "bluetooth earbuds",
      "true wireless earbuds",
      "tws earbuds",
      "wireless earphones",
      "bluetooth earphones",
      "earbuds",
      "earphones",
    ],
    family: "earbuds",
    type: "wireless earbuds",
    categories: ["earphones"],
  },
  {
    id: "headphones",
    aliases: [
      "headphones",
      "headphone",
      "over ear headphones",
      "over-ear headphones",
      "wireless headphones",
      "bluetooth headphones",
    ],
    family: "headphones",
    type: "headphones",
    categories: ["headphones"],
  },
  {
    id: "gaming-headset",
    aliases: [
      "gaming headset",
      "gaming headphones",
      "gamer headset",
      "gaming earphones",
    ],
    family: "gaming headset",
    type: "gaming headset",
    categories: ["headphones", "gaming"],
    accessoryFamily: "gaming accessories",
  },
  {
    id: "speaker",
    aliases: [
      "speaker",
      "speakers",
      "bluetooth speaker",
      "wireless speaker",
      "portable speaker",
    ],
    family: "speaker",
    type: "speaker",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "audio accessories",
  },

  {
    id: "apple-watch",
    aliases: ["apple watch", "iwatch", "apple smartwatch"],
    family: "apple watch",
    type: "smartwatch",
    categories: ["smartwatches"],
    brands: ["apple"],
  },
  {
    id: "galaxy-watch",
    aliases: ["galaxy watch", "samsung watch", "samsung smartwatch"],
    family: "galaxy watch",
    type: "smartwatch",
    categories: ["smartwatches"],
    brands: ["samsung"],
  },
  {
    id: "pixel-watch",
    aliases: ["pixel watch", "google pixel watch", "google watch"],
    family: "pixel watch",
    type: "smartwatch",
    categories: ["smartwatches"],
    brands: ["google"],
  },
  {
    id: "whoop",
    aliases: [
      "whoop",
      "whoop band",
      "whoop fitness tracker",
      "whoop fitness watch",
    ],
    family: "whoop",
    type: "fitness tracker",
    categories: ["fitness watches"],
    brands: ["whoop"],
  },
  {
    id: "fitbit",
    aliases: ["fitbit", "fitbit watch", "fitbit tracker"],
    family: "fitbit",
    type: "fitness tracker",
    categories: ["fitness watches"],
    brands: ["fitbit"],
  },
  {
    id: "fitness-tracker",
    aliases: [
      "fitness tracker",
      "fitness band",
      "sport watch",
      "sports watch",
      "activity tracker",
    ],
    family: "fitness tracker",
    type: "fitness tracker",
    categories: ["fitness watches"],
  },

  {
    id: "macbook-pro",
    aliases: ["macbook pro", "apple macbook pro"],
    family: "macbook",
    type: "laptop",
    categories: ["laptops", "gaming laptops"],
    brands: ["apple"],
  },
  {
    id: "macbook-air",
    aliases: ["macbook air", "apple macbook air"],
    family: "macbook",
    type: "laptop",
    categories: ["laptops", "gaming laptops"],
    brands: ["apple"],
  },
  {
    id: "macbook",
    aliases: ["macbook", "apple laptop", "apple notebook"],
    family: "macbook",
    type: "laptop",
    categories: ["laptops", "gaming laptops"],
    brands: ["apple"],
  },
  {
    id: "gaming-laptop",
    aliases: [
      "gaming laptop",
      "gaming laptops",
      "gamer laptop",
      "gaming notebook",
      "rog laptop",
      "alienware laptop",
    ],
    family: "gaming laptop",
    type: "gaming laptop",
    categories: ["gaming laptops"],
  },

  {
    id: "playstation-5",
    aliases: ["playstation 5", "playstation5", "ps5", "ps 5"],
    family: "playstation",
    type: "game console",
    categories: ["gaming", "video games"],
    brands: ["sony"],
  },
  {
    id: "playstation",
    aliases: ["playstation", "play station", "sony playstation"],
    family: "playstation",
    type: "game console",
    categories: ["gaming", "video games"],
    brands: ["sony"],
  },
  {
    id: "xbox",
    aliases: ["xbox", "xbox series x", "xbox series s", "microsoft xbox"],
    family: "xbox",
    type: "game console",
    categories: ["gaming", "video games"],
    brands: ["microsoft"],
  },
  {
    id: "nintendo-switch",
    aliases: [
      "nintendo switch",
      "switch console",
      "switch oled",
      "nintendo switch oled",
    ],
    family: "nintendo switch",
    type: "game console",
    categories: ["gaming", "video games"],
    brands: ["nintendo"],
  },
  {
    id: "game-controller",
    aliases: [
      "gaming controller",
      "game controller",
      "controller",
      "gamepad",
      "joypad",
      "ps5 controller",
      "playstation controller",
      "xbox controller",
      "switch controller",
    ],
    family: "game controller",
    type: "game controller",
    categories: ["gaming", "electronic accessories", "accessories"],
    accessoryFamily: "gaming accessories",
  },

  {
    id: "iphone-case",
    aliases: [
      "iphone case",
      "iphone cover",
      "apple phone case",
      "case for iphone",
      "cover for iphone",
    ],
    family: "iphone case",
    type: "phone case",
    categories: ["phone covers"],
    brands: ["apple"],
    accessoryFamily: "phone protection",
  },
  {
    id: "phone-case",
    aliases: [
      "phone case",
      "phone cover",
      "mobile case",
      "mobile cover",
      "smartphone case",
      "smartphone cover",
    ],
    family: "phone case",
    type: "phone case",
    categories: ["phone covers"],
    accessoryFamily: "phone protection",
  },

  {
    id: "magsafe-charger",
    aliases: [
      "magsafe charger",
      "apple magsafe charger",
      "magsafe charging",
      "magsafe wireless charger",
    ],
    family: "magsafe",
    type: "wireless charger",
    categories: ["electronic accessories", "accessories"],
    brands: ["apple"],
    accessoryFamily: "charging",
  },
  {
    id: "apple-charger",
    aliases: [
      "apple charger",
      "iphone charger",
      "ipad charger",
      "macbook charger",
      "apple charging brick",
      "iphone charging brick",
    ],
    family: "apple charger",
    type: "charger",
    categories: ["electronic accessories", "accessories"],
    brands: ["apple"],
    accessoryFamily: "charging",
  },
  {
    id: "usb-c-charger",
    aliases: [
      "usb c charger",
      "usb-c charger",
      "type c charger",
      "type-c charger",
      "usb c brick",
      "type c brick",
      "fast usb c charger",
    ],
    family: "usb c charger",
    type: "charger",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "charging",
  },
  {
    id: "wireless-charger",
    aliases: [
      "wireless charger",
      "wireless charging pad",
      "charging pad",
      "qi charger",
      "qi2 charger",
    ],
    family: "wireless charger",
    type: "wireless charger",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "charging",
  },
  {
    id: "charger",
    aliases: [
      "charger",
      "chargers",
      "fast charger",
      "wall charger",
      "charging brick",
      "power adapter",
    ],
    family: "charger",
    type: "charger",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "charging",
  },
  {
    id: "power-bank",
    aliases: [
      "power bank",
      "powerbank",
      "portable charger",
      "portable battery",
      "battery pack",
    ],
    family: "power bank",
    type: "power bank",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "charging",
  },
  {
    id: "charging-cable",
    aliases: [
      "charging cable",
      "charger cable",
      "usb c cable",
      "usb-c cable",
      "type c cable",
      "type-c cable",
      "lightning cable",
      "iphone cable",
      "apple cable",
    ],
    family: "charging cable",
    type: "cable",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "cables",
  },
  {
    id: "adapter",
    aliases: [
      "adapter",
      "adaptor",
      "usb adapter",
      "usb c adapter",
      "usb-c adapter",
      "type c adapter",
      "dongle",
      "hub",
      "usb hub",
      "usb c hub",
      "usb-c hub",
    ],
    family: "adapter",
    type: "adapter",
    categories: ["electronic accessories", "accessories"],
    accessoryFamily: "connectivity",
  },

  {
    id: "router",
    aliases: [
      "router",
      "wifi router",
      "wi fi router",
      "wireless router",
      "internet router",
    ],
    family: "router",
    type: "router",
    categories: ["networking"],
  },
  {
    id: "wifi-extender",
    aliases: [
      "wifi extender",
      "wi fi extender",
      "wifi repeater",
      "range extender",
      "wireless extender",
    ],
    family: "wifi extender",
    type: "network extender",
    categories: ["networking"],
  },
  {
    id: "mesh-wifi",
    aliases: [
      "mesh wifi",
      "mesh wi fi",
      "mesh router",
      "mesh system",
      "wifi mesh",
    ],
    family: "mesh wifi",
    type: "mesh network",
    categories: ["networking"],
  },

  {
    id: "camera",
    aliases: [
      "camera",
      "digital camera",
      "photo camera",
      "mirrorless camera",
      "dslr",
    ],
    family: "camera",
    type: "camera",
    categories: ["camera"],
  },
  {
    id: "gopro",
    aliases: ["gopro", "go pro", "action camera", "gopro camera"],
    family: "gopro",
    type: "action camera",
    categories: ["camera"],
    brands: ["gopro"],
  },
  {
    id: "instax",
    aliases: ["instax", "fujifilm instax", "instant camera"],
    family: "instax",
    type: "instant camera",
    categories: ["camera"],
    brands: ["fujifilm"],
  },

  {
    id: "monitor",
    aliases: [
      "monitor",
      "computer monitor",
      "pc monitor",
      "display monitor",
      "gaming monitor",
    ],
    family: "monitor",
    type: "monitor",
    categories: ["electronic accessories", "gaming"],
  },
  {
    id: "desktop",
    aliases: [
      "desktop",
      "desktop computer",
      "desktop pc",
      "pc",
      "computer tower",
      "gaming desktop",
      "gaming pc",
    ],
    family: "desktop",
    type: "desktop computer",
    categories: ["desktops", "gaming"],
  },

  {
    id: "keyboard",
    aliases: [
      "keyboard",
      "wireless keyboard",
      "bluetooth keyboard",
      "gaming keyboard",
      "mechanical keyboard",
    ],
    family: "keyboard",
    type: "keyboard",
    categories: ["electronic accessories", "gaming"],
    accessoryFamily: "computer accessories",
  },
  {
    id: "mouse",
    aliases: [
      "mouse",
      "computer mouse",
      "wireless mouse",
      "bluetooth mouse",
      "gaming mouse",
    ],
    family: "mouse",
    type: "computer mouse",
    categories: ["electronic accessories", "gaming"],
    accessoryFamily: "computer accessories",
  },
  {
    id: "webcam",
    aliases: ["webcam", "web camera", "computer camera", "streaming camera"],
    family: "webcam",
    type: "webcam",
    categories: ["electronic accessories", "camera"],
    accessoryFamily: "computer accessories",
  },
  {
    id: "microphone",
    aliases: [
      "microphone",
      "mic",
      "usb microphone",
      "gaming microphone",
      "streaming microphone",
    ],
    family: "microphone",
    type: "microphone",
    categories: ["electronic accessories", "gaming"],
    accessoryFamily: "audio accessories",
  },
];

export type AssistantProductUnderstanding = {
  normalizedQuery: string;
  concept: AssistantProductConcept | null;
  matchedAlias: string | null;
};

export function understandAssistantProductQuery(
  rawQuery: string | null | undefined,
): AssistantProductUnderstanding {
  const normalizedQuery = normalize(rawQuery ?? "");

  if (!normalizedQuery) {
    return {
      normalizedQuery,
      concept: null,
      matchedAlias: null,
    };
  }

  let best: {
    concept: AssistantProductConcept;
    alias: string;
    score: number;
  } | null = null;

  for (const concept of assistantProductConcepts) {
    for (const rawAlias of concept.aliases) {
      const alias = normalize(rawAlias);

      if (!alias) {
        continue;
      }

      const exact = normalizedQuery === alias;

      const contained =
        normalizedQuery.includes(alias) || alias.includes(normalizedQuery);

      if (!exact && !contained) {
        continue;
      }

      const score = (exact ? 10_000 : 1_000) + alias.length;

      if (!best || score > best.score) {
        best = {
          concept,
          alias,
          score,
        };
      }
    }
  }

  return {
    normalizedQuery,
    concept: best?.concept ?? null,
    matchedAlias: best?.alias ?? null,
  };
}

export function assistantConceptSearchTerms(
  understanding: AssistantProductUnderstanding,
) {
  const concept = understanding.concept;

  if (!concept) {
    return [];
  }

  return Array.from(
    new Set(
      [
        understanding.matchedAlias,
        concept.family,
        concept.type,
        concept.accessoryFamily,
        ...concept.categories,
        ...(concept.brands ?? []),
      ]
        .filter((value): value is string => Boolean(value))
        .map(normalize)
        .filter(Boolean),
    ),
  );
}
