export type HomepageSettings = {
  id: string;
  hero_eyebrow: string;
  hero_line_one: string;
  hero_line_two: string;
  hero_line_three: string;
  hero_description: string;
  primary_button_label: string;
  primary_button_href: string;
  secondary_button_label: string;
  secondary_button_href: string;
  hero_product_id: string | null;
  products_eyebrow: string;
  products_heading: string;
  products_button_label: string;
  products_button_href: string;
  products_enabled: boolean;
  products_limit: number;
  products_sort_mode:
    "newest" | "featured_first" | "new_arrivals_first" | "manual";
  manual_product_ids: string[];
  section_order: Array<"products" | "collections" | "categories">;
  collections_enabled: boolean;
  collections_eyebrow: string;
  collections_heading: string;
  collections_button_label: string;
  collections_button_href: string;
  collections_limit: number;
  collections_auto_scroll_enabled: boolean;
  collections_auto_scroll_speed: "slow" | "normal" | "fast";
  categories_enabled: boolean;
  categories_limit: number;
  categories_eyebrow: string;
  categories_heading: string;
  final_eyebrow: string;
  final_line_one: string;
  final_line_two: string;
  final_button_label: string;
  final_button_href: string;
};

export const defaultHomepageSettings: HomepageSettings = {
  id: "default",
  hero_eyebrow: "Selected electronics and technology",
  hero_line_one: "Modern",
  hero_line_two: "Italian",
  hero_line_three: "Style",
  hero_description:
    "Discover selected consumer electronics and technology designed for modern elegance, distinctive details, and effortless everyday styling.",
  primary_button_label: "Shop collection",
  primary_button_href: "/shop",
  secondary_button_label: "Our story",
  secondary_button_href: "/about",
  hero_product_id: null,
  products_eyebrow: "Selected for you",
  products_heading: "New arrivals",
  products_button_label: "Shop all products",
  products_button_href: "/shop",
  products_enabled: true,
  products_limit: 4,
  products_sort_mode: "featured_first",
  manual_product_ids: [],
  section_order: ["products", "collections", "categories"],
  collections_enabled: true,
  collections_eyebrow: "Curated selections",
  collections_heading: "Collections",
  collections_button_label: "View all collections",
  collections_button_href: "/collections",
  collections_limit: 4,
  collections_auto_scroll_enabled: true,
  collections_auto_scroll_speed: "normal",
  categories_enabled: true,
  categories_limit: 6,
  categories_eyebrow: "Explore",
  categories_heading: "Shop by category",
  final_eyebrow: "Explore the full selection",
  final_line_one: "Find your next",
  final_line_two: "signature piece",
  final_button_label: "Shop now",
  final_button_href: "/shop",
};

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.trunc(numberValue)));
}

function readText(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value.trim();
}

function readCollectionScrollSpeed(value: unknown): "slow" | "normal" | "fast" {
  if (value === "slow" || value === "normal" || value === "fast") {
    return value;
  }

  return defaultHomepageSettings.collections_auto_scroll_speed;
}

export function normalizeHomepageSettings(
  input: Partial<HomepageSettings> | null | undefined,
): HomepageSettings {
  return {
    id: "default",

    hero_eyebrow: readText(
      input?.hero_eyebrow,
      defaultHomepageSettings.hero_eyebrow,
    ),

    hero_line_one: readText(
      input?.hero_line_one,
      defaultHomepageSettings.hero_line_one,
    ),

    hero_line_two: readText(
      input?.hero_line_two,
      defaultHomepageSettings.hero_line_two,
    ),

    hero_line_three: readText(
      input?.hero_line_three,
      defaultHomepageSettings.hero_line_three,
    ),

    hero_description: readText(
      input?.hero_description,
      defaultHomepageSettings.hero_description,
    ),

    primary_button_label: readText(
      input?.primary_button_label,
      defaultHomepageSettings.primary_button_label,
    ),

    primary_button_href: readText(
      input?.primary_button_href,
      defaultHomepageSettings.primary_button_href,
    ),

    secondary_button_label: readText(
      input?.secondary_button_label,
      defaultHomepageSettings.secondary_button_label,
    ),

    secondary_button_href: readText(
      input?.secondary_button_href,
      defaultHomepageSettings.secondary_button_href,
    ),

    hero_product_id:
      typeof input?.hero_product_id === "string" && input.hero_product_id
        ? input.hero_product_id
        : null,

    products_eyebrow: readText(
      input?.products_eyebrow,
      defaultHomepageSettings.products_eyebrow,
    ),

    products_heading: readText(
      input?.products_heading,
      defaultHomepageSettings.products_heading,
    ),

    products_button_label: readText(
      input?.products_button_label,
      defaultHomepageSettings.products_button_label,
    ),

    products_button_href: readText(
      input?.products_button_href,
      defaultHomepageSettings.products_button_href,
    ),

    products_enabled: readBoolean(
      input?.products_enabled,
      defaultHomepageSettings.products_enabled,
    ),

    products_limit: (() => {
      const limit = readInteger(
        input?.products_limit,
        defaultHomepageSettings.products_limit,
        4,
        12,
      );

      if (limit <= 4) {
        return 4;
      }

      if (limit <= 8) {
        return 8;
      }

      return 12;
    })(),

    products_sort_mode:
      input?.products_sort_mode === "newest" ||
      input?.products_sort_mode === "featured_first" ||
      input?.products_sort_mode === "new_arrivals_first" ||
      input?.products_sort_mode === "manual"
        ? input.products_sort_mode
        : defaultHomepageSettings.products_sort_mode,

    manual_product_ids: Array.isArray(input?.manual_product_ids)
      ? Array.from(
          new Set(
            input.manual_product_ids
              .filter(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0,
              )
              .map((value) => value.trim()),
          ),
        ).slice(0, 12)
      : [],

    section_order: (() => {
      const allowedSections = [
        "products",
        "collections",
        "categories",
      ] as const;

      const requestedOrder = Array.isArray(input?.section_order)
        ? input.section_order.filter(
            (section): section is "products" | "collections" | "categories" =>
              allowedSections.includes(
                section as "products" | "collections" | "categories",
              ),
          )
        : [];

      if (requestedOrder.length === 3 && new Set(requestedOrder).size === 3) {
        return requestedOrder;
      }

      return [...defaultHomepageSettings.section_order];
    })(),

    collections_enabled: readBoolean(
      input?.collections_enabled,
      defaultHomepageSettings.collections_enabled,
    ),

    collections_eyebrow: readText(
      input?.collections_eyebrow,
      defaultHomepageSettings.collections_eyebrow,
    ),

    collections_heading: readText(
      input?.collections_heading,
      defaultHomepageSettings.collections_heading,
    ),

    collections_button_label: readText(
      input?.collections_button_label,
      defaultHomepageSettings.collections_button_label,
    ),

    collections_button_href: readText(
      input?.collections_button_href,
      defaultHomepageSettings.collections_button_href,
    ),

    collections_limit: readInteger(
      input?.collections_limit,
      defaultHomepageSettings.collections_limit,
      1,
      6,
    ),

    categories_enabled: readBoolean(
      input?.categories_enabled,
      defaultHomepageSettings.categories_enabled,
    ),

    collections_auto_scroll_enabled:
      typeof input?.collections_auto_scroll_enabled === "boolean"
        ? input.collections_auto_scroll_enabled
        : defaultHomepageSettings.collections_auto_scroll_enabled,

    collections_auto_scroll_speed: readCollectionScrollSpeed(
      input?.collections_auto_scroll_speed,
    ),

    categories_limit: readInteger(
      input?.categories_limit,
      defaultHomepageSettings.categories_limit,
      1,
      12,
    ),

    categories_eyebrow: readText(
      input?.categories_eyebrow,
      defaultHomepageSettings.categories_eyebrow,
    ),

    categories_heading: readText(
      input?.categories_heading,
      defaultHomepageSettings.categories_heading,
    ),

    final_eyebrow: readText(
      input?.final_eyebrow,
      defaultHomepageSettings.final_eyebrow,
    ),

    final_line_one: readText(
      input?.final_line_one,
      defaultHomepageSettings.final_line_one,
    ),

    final_line_two: readText(
      input?.final_line_two,
      defaultHomepageSettings.final_line_two,
    ),

    final_button_label: readText(
      input?.final_button_label,
      defaultHomepageSettings.final_button_label,
    ),

    final_button_href: readText(
      input?.final_button_href,
      defaultHomepageSettings.final_button_href,
    ),
  };
}
