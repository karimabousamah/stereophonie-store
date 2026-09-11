import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { storefrontConfigurationImages } from "@/lib/storefront-product-media";
import {
  buildClarification,
  parseAssistantRequest,
} from "@/lib/stereophonie-v3/assistant/local-intelligence";

import {
  applyMemoryToRequest,
  emptyAssistantMemory,
  mergeAssistantMemory,
} from "@/lib/stereophonie-v3/assistant/conversation-memory";

import {
  topAssistantProducts,
  type RankedAssistantProduct,
} from "@/lib/stereophonie-v3/assistant/product-ranking";

import {
  composeComparisonResponse,
  composeFallbackResponse,
  composeGreeting,
  composeHelpResponse,
  composeOfferResponse,
  composeRecommendationResponse,
  composeStoreInfo,
} from "@/lib/stereophonie-v3/assistant/response-composer";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Language = "en" | "fr" | "ar";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProductImageRow = {
  id?: string | null;
  image_url: string | null;
  storage_path?: string | null;
  alt_text: string | null;
  position: number;
  is_primary: boolean;
  variant_id?: string | null;
  variant_position?: number | null;
  is_variant_primary?: boolean | null;
  product_image_variants?:
    | {
        variant_id: string;
        position: number;
        is_primary: boolean;
      }[]
    | null;
};

type ProductVariantRow = {
  id: string;
  size?: string | null;
  regular_price?: number | string | null;
  sale_price?: number | string | null;
  stock_quantity?: number | null;
  availability_status?: string | null;
  variant_name?: string | null;
  attributes?: Record<string, unknown> | null;
  display_position?: number | null;
  is_active?: boolean | null;
};

type CategoryRelation =
  | {
      name?: string | null;
      slug?: string | null;
    }
  | {
      name?: string | null;
      slug?: string | null;
    }[]
  | null;

type BrandRelation =
  | {
      name?: string | null;
    }
  | {
      name?: string | null;
    }[]
  | null;

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categories: CategoryRelation;
  brands: BrandRelation;
  product_images: ProductImageRow[] | null;
  product_variants: ProductVariantRow[] | null;
};

type AssistantVariant = {
  id: string;
  size: string;
  regularPrice: number;
  salePrice: number | null;
  currentPrice: number;
  stockQuantity: number;
  availabilityStatus: string;
  purchasable: boolean;
};

type AssistantProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;

  /*
   * Internal searchable catalog metadata.
   *
   * Populated non-enumerably by mapProduct() from brand,
   * configuration names and variant attributes.
   */
  catalogKnowledge?: string;
  category: string;
  imageUrl: string | null;
  hoverImageUrl: string | null;
  imageAlt: string;
  price: number | null;
  variants: AssistantVariant[];
};

type IncomingCartItem = {
  position: number;
  cartItemId: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  size: string;
  unitPrice: number;
  quantity: number;
  maximumQuantity: number;
};

type IncomingCart = {
  items: IncomingCartItem[];
  subtotal: number;
};

type IncomingWishlistProduct = {
  position: number;
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categoryName: string;
  is_featured: boolean | null;
  is_trending: boolean | null;
  is_new_arrival: boolean | null;
  images: {
    image_url: string | null;
    alt_text: string | null;
    position: number;
    is_primary: boolean;
  }[];
  variants: {
    regular_price: number | null;
    sale_price: number | null;
    stock_quantity: number;
    availability_status:
      "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | null;
  }[];
};

type IncomingWishlist = {
  hydrated: boolean;
  products: IncomingWishlistProduct[];
};

/*
 * ASSISTANT_CONVERSATION_PRODUCT_MEMORY_V5
 *
 * Product identity remembered by the browser from the latest
 * assistant product cards.
 *
 * IMPORTANT:
 * - only IDs / names / slugs are trusted as references
 * - price and availability are always re-read from the LIVE catalog
 */
type IncomingAssistantContextProduct = {
  id: string;
  name: string;
  slug: string;
};

type IncomingAssistantContext = {
  focusedProduct: IncomingAssistantContextProduct | null;
  displayedProducts: IncomingAssistantContextProduct[];
};

type AssistantWishlistAction =
  | {
      type: "add_to_wishlist";
      product: Omit<IncomingWishlistProduct, "position">;
    }
  | {
      type: "remove_from_wishlist";
      productId: string;
      name: string;
    }
  | {
      type: "clear_wishlist";
    };

type AssistantNavigationAction = {
  type: "navigate";
  destination: "checkout" | "track_order" | "wishlist";
  path: "/checkout" | "/track-order" | "/wishlist";
};

type AssistantCartAction =
  | {
      type: "add_to_cart";
      productId: string;
      variantId: string;
      slug: string;
      name: string;
      imageUrl: string | null;
      size: string;
      unitPrice: number;
      regularPrice: number | null;
      maximumQuantity: number;
      quantity: number;
    }
  | {
      type: "remove_from_cart";
      cartItemId: string;
      name: string;
      size: string;
    }
  | {
      type: "update_cart_quantity";
      cartItemId: string;
      name: string;
      size: string;
      quantity: number;
    }
  | {
      type: "clear_cart";
    };

type OllamaToolCall = {
  function?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
};

type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
  tool_calls?: OllamaToolCall[];
};

type OllamaResponse = {
  message?: {
    role?: "assistant";
    content?: string;
    thinking?: string;
    tool_calls?: OllamaToolCall[];
  };
  done?: boolean;
  error?: string;
};

const OLLAMA_URL = process.env.OLLAMA_URL?.trim() || "http://127.0.0.1:11434";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || "qwen3:8b";

const MAX_MESSAGES = 14;
const MAX_MESSAGE_LENGTH = 1_000;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAssistantContextProduct(
  value: unknown,
): IncomingAssistantContextProduct | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  const id = cleanText(candidate.id);
  const name = cleanText(candidate.name);
  const slug = cleanText(candidate.slug);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    slug,
  };
}

function normalizeAssistantContext(
  value: unknown,
): IncomingAssistantContext {
  if (!value || typeof value !== "object") {
    return {
      focusedProduct: null,
      displayedProducts: [],
    };
  }

  const candidate = value as Record<string, unknown>;

  const focusedProduct =
    normalizeAssistantContextProduct(
      candidate.focusedProduct,
    );

  const displayedProducts =
    Array.isArray(candidate.displayedProducts)
      ? candidate.displayedProducts
          .map(normalizeAssistantContextProduct)
          .filter(
            (
              product,
            ): product is IncomingAssistantContextProduct =>
              Boolean(product),
          )
          .slice(0, 8)
      : [];

  return {
    focusedProduct,
    displayedProducts,
  };
}

function normalizeLanguage(value: unknown): Language {
  if (value === "fr" || value === "ar") {
    return value;
  }

  return "en";
}

function normalizeMessages(value: unknown): IncomingMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message) => {
      if (!message || typeof message !== "object") {
        return false;
      }

      const candidate = message as Partial<IncomingMessage>;

      return (
        (candidate.role === "user" || candidate.role === "assistant") &&
        typeof candidate.content === "string"
      );
    })
    .slice(-MAX_MESSAGES)
    .map((message) => {
      const candidate = message as IncomingMessage;

      return {
        role: candidate.role,
        content: candidate.content.trim().slice(0, MAX_MESSAGE_LENGTH),
      };
    })
    .filter((message) => message.content.length > 0);
}

function normalizeCart(value: unknown): IncomingCart {
  if (!value || typeof value !== "object") {
    return {
      items: [],
      subtotal: 0,
    };
  }

  const candidate = value as {
    items?: unknown;
    subtotal?: unknown;
  };

  const items = Array.isArray(candidate.items)
    ? candidate.items
        .filter((item) => item && typeof item === "object")
        .slice(0, 50)
        .map((item, index) => {
          const cartItem = item as Record<string, unknown>;

          return {
            position: index + 1,
            cartItemId: cleanText(cartItem.cartItemId),
            productId: cleanText(cartItem.productId),
            variantId: cleanText(cartItem.variantId),
            slug: cleanText(cartItem.slug),
            name: cleanText(cartItem.name),
            size: cleanText(cartItem.size) || "One Size",
            unitPrice: Math.max(0, Number(cartItem.unitPrice) || 0),
            quantity: Math.max(1, Math.floor(Number(cartItem.quantity) || 1)),
            maximumQuantity: Math.max(
              1,
              Math.floor(Number(cartItem.maximumQuantity) || 1),
            ),
          };
        })
        .filter(
          (item) =>
            item.cartItemId && item.productId && item.variantId && item.name,
        )
    : [];

  const calculatedSubtotal = items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );

  return {
    items,
    subtotal: calculatedSubtotal,
  };
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown) {
  return cleanText(value).toLowerCase().replaceAll(" ", "_");
}

function getCategoryName(relation: CategoryRelation) {
  if (!relation) {
    return "Collection";
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name?.trim() || "Collection";
  }

  return relation.name?.trim() || "Collection";
}

function mapVariant(variant: ProductVariantRow): AssistantVariant {
  const regularPrice = toNumber(variant.regular_price);

  const possibleSalePrice = toNumber(variant.sale_price);

  const hasSale =
    possibleSalePrice > 0 &&
    regularPrice > 0 &&
    possibleSalePrice < regularPrice;

  const currentPrice = hasSale ? possibleSalePrice : regularPrice;

  const stockQuantity = Math.max(0, variant.stock_quantity ?? 0);

  const availabilityStatus =
    normalizeStatus(variant.availability_status) || "unavailable";

  const purchasable =
    stockQuantity > 0 &&
    availabilityStatus !== "out_of_stock" &&
    availabilityStatus !== "coming_soon" &&
    availabilityStatus !== "unavailable";

  return {
    id: variant.id,
    size: cleanText(variant.size) || "One Size",
    regularPrice,
    salePrice: hasSale ? possibleSalePrice : null,
    currentPrice,
    stockQuantity,
    availabilityStatus,
    purchasable,
  };
}


function storefrontThumbnailPath(storagePath: string) {
  const normalized = storagePath.trim().replace(/^\/+/, "");
  const slash = normalized.lastIndexOf("/");
  const directory = slash >= 0 ? normalized.slice(0, slash) : "";
  const filename = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const dot = filename.lastIndexOf(".");
  const basename = dot > 0 ? filename.slice(0, dot) : filename;

  return directory
    ? `${directory}/storefront/${basename}.webp`
    : `storefront/${basename}.webp`;
}

function storefrontImageUrl(
  supabase: ReturnType<typeof createAdminClient>,
  storagePath: string | null | undefined,
) {
  const cleanStoragePath =
    typeof storagePath === "string" ? storagePath.trim() : "";

  if (!cleanStoragePath) {
    return null;
  }

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(storefrontThumbnailPath(cleanStoragePath));

  return data.publicUrl;
}

function mapProduct(
  product: ProductRow,
  supabase: ReturnType<typeof createAdminClient>,
): AssistantProduct {
  const variants = (product.product_variants ?? [])
    .map(mapVariant)
    /*
     * ASSISTANT_LIVE_VARIANTS_V5
     *
     * Do NOT remove a configuration merely because it has no
     * purchase price yet.
     *
     * Coming-soon products are commonly published before their
     * final price is available. Removing currentPrice === 0 here
     * made those products completely invisible to the assistant.
     *
     * The assistant knowledge layer must know about ALL published
     * configurations:
     *
     * - in_stock
     * - low_stock
     * - out_of_stock
     * - coming_soon
     *
     * Purchase eligibility remains controlled by `purchasable`.
     */
    .sort((first, second) => {
      const firstPrice =
        first.currentPrice > 0
          ? first.currentPrice
          : Number.POSITIVE_INFINITY;

      const secondPrice =
        second.currentPrice > 0
          ? second.currentPrice
          : Number.POSITIVE_INFINITY;

      return firstPrice - secondPrice;
    });

  const purchasablePrices = variants
    .filter((variant) => variant.purchasable)
    .map((variant) => variant.currentPrice);

  const canonicalImages = storefrontConfigurationImages(
    product.product_images ?? [],
    product.product_variants ?? [],
  );

  const primaryImage = canonicalImages[0];
  const hoverImage = canonicalImages[1];

  const brandName = Array.isArray(product.brands)
    ? (product.brands[0]?.name?.trim() ?? "")
    : (product.brands?.name?.trim() ?? "");

  const variantKnowledge = (product.product_variants ?? [])
    .flatMap((variant) => {
      const attributeKnowledge =
        variant.attributes &&
        typeof variant.attributes === "object" &&
        !Array.isArray(variant.attributes)
          ? Object.entries(variant.attributes).flatMap(([key, value]) => {
              if (value === null || value === undefined) {
                return [];
              }

              if (typeof value === "string") {
                return [key, value];
              }

              try {
                return [key, JSON.stringify(value)];
              } catch {
                return [key, String(value)];
              }
            })
          : [];

      return [
        variant.variant_name ?? "",
        variant.size ?? "",
        ...attributeKnowledge,
      ];
    })
    .filter(Boolean)
    .join(" ");

  const catalogKnowledge = [brandName, variantKnowledge]
    .filter(Boolean)
    .join(" ")
    .trim();

  const mappedProduct: AssistantProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug ?? product.id,
    description: product.description,
    category: getCategoryName(product.categories),
    imageUrl:
      storefrontImageUrl(
        supabase,
        primaryImage?.storage_path,
      ) ??
      primaryImage?.image_url ??
      null,

    hoverImageUrl:
      storefrontImageUrl(
        supabase,
        hoverImage?.storage_path,
      ) ??
      hoverImage?.image_url ??
      null,
    imageAlt: primaryImage?.alt_text || product.name,
    price: purchasablePrices.length > 0 ? Math.min(...purchasablePrices) : null,
    variants,
  };

  Object.defineProperty(mappedProduct, "catalogKnowledge", {
    value: catalogKnowledge,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return mappedProduct;
}

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2);
}

function productMatchesQuery(product: AssistantProduct, query: string) {
  const queryWords = normalizeWords(query);

  if (queryWords.length === 0) {
    return true;
  }

  const searchableWords = normalizeWords(
    [
      product.name,
      product.category,
      product.description ?? "",
      product.catalogKnowledge ?? "",
    ].join(" "),
  );

  const searchable = searchableWords.join(" ");
  const searchableWordSet = new Set(searchableWords);

  /*
   * A one-word search remains intentionally broad:
   *
   *   phone
   *   apple
   *   headphones
   *
   * But a multi-word PRODUCT query must no longer match because
   * one generic token happens to occur somewhere in the product.
   *
   * Old behavior:
   *
   *   "iPhone 18 Pro"
   *       ↓
   *   ANY ONE of iPhone / 18 / Pro matches
   *       ↓
   *   unrelated Apple accessories can survive
   *
   * New behavior:
   *
   *   all meaningful query tokens must be represented.
   */
  if (queryWords.length === 1) {
    const word = queryWords[0];

    return searchableWordSet.has(word) || searchable.includes(word);
  }

  const ignoredWords = new Set([
    "the",
    "this",
    "that",
    "with",
    "for",
    "and",
    "from",
    "have",
    "has",
    "show",
    "find",
    "want",
    "need",
    "please",
    "product",
    "products",
    "available",
    "availability",
    "price",
    "cost",
    "much",
    "what",
    "which",
    "where",
    "when",
    "your",
    "you",
    "give",
    "tell",
    "about",
  ]);

  const meaningfulWords = queryWords.filter(
    (word) => !ignoredWords.has(word),
  );

  const requiredWords =
    meaningfulWords.length > 0
      ? meaningfulWords
      : queryWords;

  return requiredWords.every(
    (word) =>
      searchableWordSet.has(word) ||
      searchable.includes(word),
  );
}

async function searchProducts(argumentsValue: Record<string, unknown>) {
  const query = cleanText(argumentsValue.query).slice(0, 100);

  const category = cleanText(argumentsValue.category)
    .toLowerCase()
    .slice(0, 60);

  const size = cleanText(argumentsValue.size).toLowerCase().slice(0, 30);

  const maximumPriceValue = Number(argumentsValue.maximum_price);

  const maximumPrice =
    Number.isFinite(maximumPriceValue) && maximumPriceValue > 0
      ? maximumPriceValue
      : null;

  const returnAll = argumentsValue.return_all === true;

  const requestedLimit = Number(argumentsValue.limit);

  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 6;

  const supabase = createAdminClient();

  /*
   * Load the published catalog in deterministic pages.
   *
   * This avoids the previous hard 100-product knowledge ceiling.
   * Public/tool searches still respect their requested result limit,
   * while the main assistant brain can explicitly request the full
   * published catalog with return_all: true.
   */
  const pageSize = 250;
  let offset = 0;

  const catalogRows: ProductRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
          id,
          name,
          slug,
          description,
          categories (
            name,
            slug
          ),
          brands (
            name
          ),
          product_images (
            id,
            image_url,
            storage_path,
            alt_text,
            position,
            is_primary,
            variant_id,
            variant_position,
            is_variant_primary,
            product_image_variants (
              variant_id,
              position,
              is_primary
            )
          ),
          product_variants (
            id,
            size,
            variant_name,
            attributes,
            display_position,
            is_active,
            regular_price,
            sale_price,
            stock_quantity,
            availability_status
          )
        `,
      )
      .eq("status", "published")
      .order("name", {
        ascending: true,
      })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error("Assistant catalog tool failed:", error);

      throw new Error("The live catalog could not be searched.");
    }

    const page = (data ?? []) as ProductRow[];

    catalogRows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  const matchingProducts = catalogRows.map((product) =>
    mapProduct(product, supabase),
  ).filter((product) => {
    if (category && !product.category.toLowerCase().includes(category)) {
      return false;
    }

    if (query && !productMatchesQuery(product, query)) {
      return false;
    }

    const matchingVariants = product.variants.filter((variant) => {
      if (size && variant.size.toLowerCase() !== size) {
        return false;
      }

      if (maximumPrice !== null && variant.currentPrice > maximumPrice) {
        return false;
      }

      return true;
    });

    product.variants = matchingVariants;

    const purchasablePrices = matchingVariants
      .filter((variant) => variant.purchasable)
      .map((variant) => variant.currentPrice);

    const listedPrices = matchingVariants
      .map((variant) => variant.currentPrice)
      .filter((price) => price > 0);

    product.price =
      purchasablePrices.length > 0
        ? Math.min(...purchasablePrices)
        : listedPrices.length > 0
          ? Math.min(...listedPrices)
          : null;

    return matchingVariants.length > 0;
  });

  return returnAll ? matchingProducts : matchingProducts.slice(0, limit);
}

function normalizeProductReference(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type AssistantAvailabilityCatalogFilter =
  | "coming_soon"
  | "low_stock"
  | "out_of_stock"
  | "in_stock";

function meaningfulCatalogWords(value: string) {
  const ignored = new Set([
    "a",
    "an",
    "the",
    "do",
    "does",
    "did",
    "you",
    "your",
    "we",
    "have",
    "has",
    "having",
    "is",
    "are",
    "was",
    "were",
    "what",
    "which",
    "who",
    "where",
    "when",
    "how",
    "much",
    "many",
    "show",
    "tell",
    "give",
    "find",
    "me",
    "please",
    "product",
    "products",
    "item",
    "items",
    "price",
    "cost",
    "available",
    "availability",
    "currently",
    "right",
    "now",
    "anything",
    "something",
    "about",
    "for",
    "of",
    "in",
    "on",
    "at",
    "to",
    "from",
    "with",
    "and",
    "or",
    "coming",
    "soon",
    "stock",
    "low",
    "out",
  ]);

  return normalizeProductReference(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 2 &&
        !ignored.has(word),
    );
}

function resolveExactCatalogProduct(
  products: AssistantProduct[],
  reference: string,
) {
  const normalizedReference =
    normalizeProductReference(reference);

  if (!normalizedReference) {
    return null;
  }

  /*
   * --------------------------------------------------------
   * LEVEL 1 — EXACT NORMALIZED NAME
   * --------------------------------------------------------
   */
  const exact = products.find(
    (product) =>
      normalizeProductReference(product.name) ===
      normalizedReference,
  );

  if (exact) {
    return exact;
  }

  /*
   * --------------------------------------------------------
   * LEVEL 2 — THE COMPLETE PRODUCT NAME EXISTS IN THE MESSAGE
   *
   * Example:
   *
   *   "how much is the iPhone 18 Pro"
   *
   * resolves:
   *
   *   iPhone 18 Pro
   *
   * without allowing Apple adapters/cases to steal the match.
   * --------------------------------------------------------
   */
  const contained = products
    .filter((product) => {
      const normalizedName =
        normalizeProductReference(product.name);

      return (
        normalizedName.length >= 3 &&
        normalizedReference.includes(normalizedName)
      );
    })
    .sort(
      (first, second) =>
        normalizeProductReference(second.name).length -
        normalizeProductReference(first.name).length,
    );

  if (contained.length > 0) {
    return contained[0];
  }

  /*
   * --------------------------------------------------------
   * LEVEL 3 — COMPLETE PRODUCT-NAME TOKEN COVERAGE
   *
   * Every meaningful token in the catalog product name must
   * occur in the customer's request.
   *
   * iPhone 18 Pro:
   *
   *   iphone ✓
   *   18     ✓
   *   pro    ✓
   *
   * Apple 20W USB-C Power Adapter:
   *
   *   apple  ✗
   *   20w    ✗
   *   usb-c  ✗
   *   power  ✗
   *   adapter✗
   *
   * Therefore the adapter can never become the answer.
   * --------------------------------------------------------
   */
  const requestWords = new Set(
    normalizeProductReference(reference)
      .split(" ")
      .filter(Boolean),
  );

  const fullyCovered = products
    .map((product) => {
      const productWords =
        normalizeProductReference(product.name)
          .split(" ")
          .filter((word) => word.length >= 2);

      if (productWords.length < 2) {
        return {
          product,
          covered: false,
          specificity: 0,
        };
      }

      const covered = productWords.every(
        (word) => requestWords.has(word),
      );

      return {
        product,
        covered,
        specificity: productWords.length,
      };
    })
    .filter((entry) => entry.covered)
    .sort(
      (first, second) =>
        second.specificity - first.specificity,
    );

  if (fullyCovered.length > 0) {
    return fullyCovered[0].product;
  }

  return null;
}

function assistantFollowUpOrdinal(
  rawMessage: string,
) {
  const normalized =
    normalizeProductReference(rawMessage);

  const mappings: Array<[RegExp, number]> = [
    [/\b(first|1st|number 1)\b/, 1],
    [/\b(second|2nd|number 2)\b/, 2],
    [/\b(third|3rd|number 3)\b/, 3],
    [/\b(fourth|4th|number 4)\b/, 4],
    [/\b(last)\b/, -1],
  ];

  for (const [pattern, position] of mappings) {
    if (pattern.test(normalized)) {
      return position;
    }
  }

  return null;
}

function isContextualProductFollowUp(
  rawMessage: string,
) {
  const normalized =
    normalizeProductReference(rawMessage);

  if (!normalized) {
    return false;
  }

  /*
   * Explicit whole-catalog requests must NEVER inherit the
   * previous product.
   *
   * Examples:
   *   "what products are coming soon?"
   *   "show low stock products"
   *   "do you have anything out of stock?"
   */
  if (
    /\b(products|items|anything|everything|catalog|catalogue)\b/.test(
      normalized,
    )
  ) {
    return false;
  }

  /*
   * Ordinal / pronoun references.
   */
  if (
    /\b(this one|that one|the one|it|this product|that product)\b/.test(
      normalized,
    ) ||
    assistantFollowUpOrdinal(normalized) !== null
  ) {
    return true;
  }

  /*
   * Very common compact ecommerce follow-ups.
   */
  if (
    /^(price|price\?|cost|cost\?|stock|stock\?|availability|availability\?|details|details\?|specs|specifications)$/i.test(
      normalized,
    )
  ) {
    return true;
  }

  /*
   * Natural follow-up sentences.
   */
  return (
    /\b(how much|what price|what is the price|what s the price)\b/.test(
      normalized,
    ) ||
    /\b(is it|is this|is that)\b/.test(normalized) ||
    /\b(in stock|low stock|out of stock|coming soon|available|unavailable)\b/.test(
      normalized,
    ) ||
    /\b(and the|what about|how about)\b/.test(normalized)
  );
}

function resolveContextualCatalogProduct(
  catalog: AssistantProduct[],
  rawMessage: string,
  context: IncomingAssistantContext,
) {
  if (!isContextualProductFollowUp(rawMessage)) {
    return null;
  }

  const ordinal =
    assistantFollowUpOrdinal(rawMessage);

  if (
    ordinal !== null &&
    context.displayedProducts.length > 0
  ) {
    const referenced =
      ordinal === -1
        ? context.displayedProducts.at(-1) ?? null
        : context.displayedProducts[ordinal - 1] ?? null;

    if (referenced) {
      const liveProduct = catalog.find(
        (product) => product.id === referenced.id,
      );

      if (liveProduct) {
        return liveProduct;
      }

      const bySlug = catalog.find(
        (product) =>
          referenced.slug &&
          product.slug === referenced.slug,
      );

      if (bySlug) {
        return bySlug;
      }
    }
  }

  if (context.focusedProduct) {
    const focusedById = catalog.find(
      (product) =>
        product.id === context.focusedProduct?.id,
    );

    if (focusedById) {
      return focusedById;
    }

    const focusedBySlug = catalog.find(
      (product) =>
        Boolean(context.focusedProduct?.slug) &&
        product.slug === context.focusedProduct?.slug,
    );

    if (focusedBySlug) {
      return focusedBySlug;
    }

    const focusedByName =
      resolveExactCatalogProduct(
        catalog,
        context.focusedProduct.name,
      );

    if (focusedByName) {
      return focusedByName;
    }
  }

  /*
   * If no explicit focused product survived, use the most recent
   * displayed product as the conversational fallback.
   */
  const lastDisplayed =
    context.displayedProducts.at(-1);

  if (lastDisplayed) {
    return (
      catalog.find(
        (product) => product.id === lastDisplayed.id,
      ) ??
      catalog.find(
        (product) =>
          Boolean(lastDisplayed.slug) &&
          product.slug === lastDisplayed.slug,
      ) ??
      resolveExactCatalogProduct(
        catalog,
        lastDisplayed.name,
      )
    );
  }

  return null;
}

function detectAvailabilityCatalogFilter(
  rawMessage: string,
): AssistantAvailabilityCatalogFilter | null {
  const normalized =
    normalizeProductReference(rawMessage);

  if (
    /\bcoming soon\b/.test(normalized) ||
    /\barriving soon\b/.test(normalized) ||
    /\bupcoming products?\b/.test(normalized)
  ) {
    return "coming_soon";
  }

  if (
    /\blow stock\b/.test(normalized) ||
    /\blimited stock\b/.test(normalized) ||
    /\blimited availability\b/.test(normalized)
  ) {
    return "low_stock";
  }

  if (
    /\bout of stock\b/.test(normalized) ||
    /\bsold out\b/.test(normalized) ||
    /\bunavailable products?\b/.test(normalized)
  ) {
    return "out_of_stock";
  }

  if (
    /\bin stock\b/.test(normalized) ||
    /\bavailable now\b/.test(normalized) ||
    /\bavailable products?\b/.test(normalized)
  ) {
    return "in_stock";
  }

  return null;
}

function catalogProductMatchesAvailabilityFilter(
  product: AssistantProduct,
  filter: AssistantAvailabilityCatalogFilter,
) {
  const status = assistantCatalogAvailability(product);

  if (filter === "coming_soon") {
    return status === "coming_soon";
  }

  if (filter === "low_stock") {
    return status === "low_stock";
  }

  if (filter === "out_of_stock") {
    return status === "out_of_stock";
  }

  /*
   * "What is in stock?" should include:
   *
   * - normal in-stock products
   * - low-stock products
   * - mixed products that have at least one configuration
   *   available right now
   */
  return (
    status === "in_stock" ||
    status === "low_stock" ||
    status === "mixed"
  );
}

function assistantProductForResponse(
  product: AssistantProduct,
) {
  return {
    ...product,

    /*
     * The browser card needs the product-level semantic status.
     */
    availabilityStatus:
      assistantCatalogAvailability(product),
  };
}

function availabilityCatalogResponse(
  filter: AssistantAvailabilityCatalogFilter,
  products: AssistantProduct[],
  language: Language,
) {
  const visibleProducts = products.slice(0, 4);

  if (language === "fr") {
    if (filter === "coming_soon") {
      return products.length > 0
        ? `Oui. Voici les produits qui arrivent prochainement chez Stereophonie : ${visibleProducts.map((product) => product.name).join(", ")}.`
        : "Aucun produit publié n’est actuellement marqué comme arrivant prochainement.";
    }

    if (filter === "low_stock") {
      return products.length > 0
        ? `Voici les produits actuellement disponibles avec un stock limité : ${visibleProducts.map((product) => product.name).join(", ")}.`
        : "Aucun produit publié n’est actuellement marqué avec un stock limité.";
    }

    if (filter === "out_of_stock") {
      return products.length > 0
        ? `Voici les produits actuellement en rupture de stock : ${visibleProducts.map((product) => product.name).join(", ")}.`
        : "Aucun produit publié n’est actuellement marqué en rupture de stock.";
    }

    return products.length > 0
      ? `Voici quelques produits actuellement disponibles : ${visibleProducts.map((product) => product.name).join(", ")}.`
      : "Je ne vois actuellement aucun produit publié disponible immédiatement.";
  }

  if (language === "ar") {
    if (filter === "coming_soon") {
      return products.length > 0
        ? `نعم. هذه بعض المنتجات القادمة قريباً لدى Stereophonie: ${visibleProducts.map((product) => product.name).join("، ")}.`
        : "لا توجد حالياً منتجات منشورة تحمل حالة قادم قريباً.";
    }

    if (filter === "low_stock") {
      return products.length > 0
        ? `هذه المنتجات متوفرة حالياً لكن مخزونها محدود: ${visibleProducts.map((product) => product.name).join("، ")}.`
        : "لا توجد حالياً منتجات منشورة بحالة مخزون محدود.";
    }

    if (filter === "out_of_stock") {
      return products.length > 0
        ? `هذه المنتجات غير متوفرة حالياً في المخزون: ${visibleProducts.map((product) => product.name).join("، ")}.`
        : "لا توجد حالياً منتجات منشورة تحمل حالة نفاد المخزون.";
    }

    return products.length > 0
      ? `هذه بعض المنتجات المتوفرة حالياً: ${visibleProducts.map((product) => product.name).join("، ")}.`
      : "لا أرى حالياً منتجات منشورة متوفرة للشراء مباشرة.";
  }

  if (filter === "coming_soon") {
    return products.length > 0
      ? `Yes. These products are currently listed as coming soon at Stereophonie: ${visibleProducts.map((product) => product.name).join(", ")}.`
      : "There are currently no published products marked as coming soon.";
  }

  if (filter === "low_stock") {
    return products.length > 0
      ? `These products are available right now, but availability is limited: ${visibleProducts.map((product) => product.name).join(", ")}.`
      : "There are currently no published products marked as low stock.";
  }

  if (filter === "out_of_stock") {
    return products.length > 0
      ? `These products are currently out of stock: ${visibleProducts.map((product) => product.name).join(", ")}.`
      : "There are currently no published products marked as out of stock.";
  }

  return products.length > 0
    ? `These are some products currently available to purchase: ${visibleProducts.map((product) => product.name).join(", ")}.`
    : "I don't currently see any published products available for immediate purchase.";
}

async function prepareAddToCart(argumentsValue: Record<string, unknown>) {
  const productReference = cleanText(argumentsValue.product_reference).slice(
    0,
    120,
  );

  const requestedSize = cleanText(argumentsValue.size)
    .toLowerCase()
    .slice(0, 30);

  const rawQuantity = Number(argumentsValue.quantity);

  const quantity = Number.isInteger(rawQuantity)
    ? Math.min(Math.max(rawQuantity, 1), 10)
    : 1;

  if (!productReference) {
    return {
      success: false,
      reason: "missing_product",
      message: "A specific product is required.",
      products: [] as AssistantProduct[],
      action: null as AssistantCartAction | null,
    };
  }

  const products = await searchProducts({
    query: productReference,
    category: "",
    size: "",
    maximum_price: 0,
    limit: 8,
  });

  const normalizedReference = normalizeProductReference(productReference);

  const exactProduct =
    products.find((product) => {
      const normalizedName = normalizeProductReference(product.name);

      return (
        normalizedName === normalizedReference ||
        normalizedName.includes(normalizedReference) ||
        normalizedReference.includes(normalizedName)
      );
    }) ?? (products.length === 1 ? products[0] : null);

  if (!exactProduct) {
    return {
      success: false,
      reason: products.length > 1 ? "ambiguous_product" : "product_not_found",
      message:
        products.length > 1
          ? "More than one product matches. Ask the customer to specify the exact product."
          : "No matching purchasable product was found.",
      products,
      action: null as AssistantCartAction | null,
    };
  }

  const purchasableVariants = exactProduct.variants.filter(
    (variant) => variant.purchasable,
  );

  let selectedVariant = requestedSize
    ? (purchasableVariants.find(
        (variant) => variant.size.toLowerCase() === requestedSize,
      ) ?? null)
    : purchasableVariants.length === 1
      ? purchasableVariants[0]
      : null;

  if (requestedSize && !selectedVariant) {
    return {
      success: false,
      reason: "size_unavailable",
      message: "The requested size is unavailable.",
      availableSizes: purchasableVariants.map((variant) => variant.size),
      products: [exactProduct],
      action: null as AssistantCartAction | null,
    };
  }

  if (!selectedVariant) {
    return {
      success: false,
      reason: "size_required",
      message:
        "The product has multiple available sizes. Ask the customer to select one.",
      availableSizes: purchasableVariants.map((variant) => variant.size),
      products: [exactProduct],
      action: null as AssistantCartAction | null,
    };
  }

  if (quantity > selectedVariant.stockQuantity) {
    return {
      success: false,
      reason: "insufficient_stock",
      message: "The requested quantity is not currently available.",
      products: [exactProduct],
      action: null as AssistantCartAction | null,
    };
  }

  const action: AssistantCartAction = {
    type: "add_to_cart",
    productId: exactProduct.id,
    variantId: selectedVariant.id,
    slug: exactProduct.slug,
    name: exactProduct.name,
    imageUrl: exactProduct.imageUrl,
    size: selectedVariant.size,
    unitPrice: selectedVariant.currentPrice,
    regularPrice:
      selectedVariant.salePrice !== null ? selectedVariant.regularPrice : null,
    maximumQuantity: selectedVariant.stockQuantity,
    quantity,
  };

  return {
    success: true,
    reason: "prepared",
    message: "The cart action has been validated and prepared for the browser.",
    product: {
      name: exactProduct.name,
      size: selectedVariant.size,
      quantity,
      price: selectedVariant.currentPrice,
    },
    products: [exactProduct],
    action,
  };
}

function prepareCartManagementAction(
  argumentsValue: Record<string, unknown>,
  cart: IncomingCart,
) {
  const operation = cleanText(argumentsValue.operation).toLowerCase();

  const productReference = normalizeProductReference(
    cleanText(argumentsValue.product_reference).slice(0, 150),
  );

  const requestedSize = normalizeProductReference(
    cleanText(argumentsValue.size).slice(0, 40),
  );

  const requestedPosition = Math.floor(Number(argumentsValue.position) || 0);

  const requestedQuantity = Math.floor(Number(argumentsValue.quantity) || 0);

  if (operation === "clear") {
    if (cart.items.length === 0) {
      return {
        success: false,
        reason: "cart_empty",
        message: "The cart is already empty.",
        action: null as AssistantCartAction | null,
      };
    }

    return {
      success: true,
      reason: "prepared",
      message: "The cart clear action has been prepared.",
      action: {
        type: "clear_cart",
      } satisfies AssistantCartAction,
    };
  }

  if (cart.items.length === 0) {
    return {
      success: false,
      reason: "cart_empty",
      message: "The cart is empty.",
      action: null as AssistantCartAction | null,
    };
  }

  let matches = cart.items.filter((item) => {
    if (requestedPosition > 0 && item.position !== requestedPosition) {
      return false;
    }

    if (
      productReference &&
      !normalizeProductReference(item.name).includes(productReference) &&
      !productReference.includes(normalizeProductReference(item.name))
    ) {
      return false;
    }

    if (
      requestedSize &&
      normalizeProductReference(item.size) !== requestedSize
    ) {
      return false;
    }

    return true;
  });

  if (matches.length === 0 && productReference) {
    matches = cart.items.filter((item) =>
      normalizeProductReference(item.name)
        .split(" ")
        .some((word) => productReference.includes(word)),
    );
  }

  if (matches.length !== 1) {
    return {
      success: false,
      reason:
        matches.length > 1 ? "ambiguous_cart_item" : "cart_item_not_found",
      message:
        matches.length > 1
          ? "More than one cart item matches. Ask the customer to specify the item or size."
          : "No matching item was found in the cart.",
      matchingItems: matches.map((item) => ({
        position: item.position,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
      })),
      action: null as AssistantCartAction | null,
    };
  }

  const item = matches[0];

  if (operation === "remove") {
    return {
      success: true,
      reason: "prepared",
      message: "The removal action has been prepared.",
      action: {
        type: "remove_from_cart",
        cartItemId: item.cartItemId,
        name: item.name,
        size: item.size,
      } satisfies AssistantCartAction,
    };
  }

  if (operation === "update_quantity") {
    if (requestedQuantity < 1) {
      return {
        success: false,
        reason: "invalid_quantity",
        message:
          "The requested quantity must be at least 1. Use remove when the customer wants zero.",
        action: null as AssistantCartAction | null,
      };
    }

    if (requestedQuantity > item.maximumQuantity) {
      return {
        success: false,
        reason: "insufficient_stock",
        message: "The requested quantity is not currently available.",
        action: null as AssistantCartAction | null,
      };
    }

    return {
      success: true,
      reason: "prepared",
      message: "The quantity update has been prepared.",
      action: {
        type: "update_cart_quantity",
        cartItemId: item.cartItemId,
        name: item.name,
        size: item.size,
        quantity: requestedQuantity,
      } satisfies AssistantCartAction,
    };
  }

  return {
    success: false,
    reason: "invalid_operation",
    message: "The requested cart operation is unsupported.",
    action: null as AssistantCartAction | null,
  };
}

function getCartContext(cart: IncomingCart) {
  if (cart.items.length === 0) {
    return `
Current browser cart:
- The cart is empty.
- Subtotal: $0.00
`.trim();
  }

  return `
Current browser cart:
${cart.items
  .map(
    (item) =>
      `${item.position}. ${item.name} | Size: ${item.size} | Quantity: ${item.quantity} | Unit price: $${item.unitPrice.toFixed(2)}`,
  )
  .join("\n")}
Subtotal: $${cart.subtotal.toFixed(2)}

Use the numbered order above when the customer says "first item", "second item", or similar.
`.trim();
}

function getStoreSupportContext() {
  return `
Verified Stereophonie checkout and customer-support information:

Checkout:
- Checkout begins at /checkout.
- The customer enters contact information and a delivery address during checkout.
- The customer reviews the products, contact information and delivery information before placing the order.
- No payment is collected on the checkout review page.
- After the order is placed, the customer is contacted to confirm delivery and payment arrangements.
- Card payment is not offered by Stereophonie Store and must never be presented as an available or coming-soon payment method. Only describe payment methods that are explicitly supported by the storefront.
- Never ask the customer to send card numbers, passwords, security codes or banking credentials in the assistant chat.

Order tracking:
- Order tracking is available at /track-order.
- To track an order, the customer must enter the order number and the email address used during checkout.
- An example order-number format shown on the tracking page is STEREO-000123.
- The assistant must not request or display order information directly because tracking is handled securely on the tracking page.

Returns:
- Stereophonie currently has a No Returns policy.
- There is currently no working /returns page.
- Explain the policy directly and never navigate the customer to /returns.

Navigation:
- Use prepare_navigation only when the customer explicitly asks to go, continue, open, visit or be taken to checkout or order tracking.
- Do not navigate merely because the customer asks a general question about checkout, payment, delivery or tracking.
`.trim();
}

function getSystemInstruction(language: Language) {
  const languageInstruction =
    language === "fr"
      ? "Always respond in French."
      : language === "ar"
        ? "Always respond in Arabic."
        : "Always respond in English.";

  return `
You are the official Stereophonie AI shopping assistant.

${languageInstruction}

Stereophonie sells selected consumer electronics, gaming, mobile, computing, audio and connected technology.

You are a professional, warm, elegant and concise ecommerce concierge.

Capabilities:
- Hold a natural conversation.
- Answer general consumer-electronics questions, including product differences, specifications, compatibility and practical buying guidance.
- Help customers choose products for occasions, colors, budgets and preferences.
- Search the real catalog using the search_products tool.
- Explain prices, available sizes and stock from tool results.
- Prepare secure cart additions using the prepare_add_to_cart tool.
- Read the customer's current browser cart from the provided cart context.
- Explain the cart contents and subtotal using only that current cart context.
- Prepare secure removal, quantity-update and clear-cart actions using the prepare_cart_action tool.
- Explain verified checkout, payment-confirmation, delivery, tracking and return-policy information using the supplied store-support context.
- Prepare safe browser navigation to checkout, order tracking or the wishlist using the prepare_navigation tool.
- Read the customer's current browser wishlist from the supplied wishlist context.
- Explain the current wishlist contents using only that supplied context.
- Prepare add, remove and clear-wishlist actions using the prepare_wishlist_action tool.
- Remember products discussed earlier in this conversation.
- Understand references such as "the first one", "the second one" and "that bag" from the displayed-product context.
- Compare products previously displayed during the conversation using their verified displayed-product context.
- Ask one clear follow-up question when essential information is missing.

Strict business rules:
- Whenever the customer asks what products are available, asks for a recommendation, names a category, color, budget, size or product, call search_products.
- Never invent a Stereophonie product, price, size, stock level, discount or availability.
- Never reveal exact inventory quantities, stock counts, remaining units or maximum purchasable quantities to customers.
- You may say that an item is available, has limited availability, is unavailable, or that the requested quantity is unavailable.
- Even when internal tool data contains a number, never repeat that number to the customer.
- Treat tool results as the only authority for catalog information.
- If the tool returns no product, clearly say that no matching published product is currently available.
- You may offer a sensible alternative based only on returned products.
- Mention at most four products in the written reply unless the customer asks for more.
- Product cards are displayed separately by the website, so do not output URLs or database IDs.
- When a customer explicitly asks to add, put or place a product in the cart, use prepare_add_to_cart.
- Before prepare_add_to_cart, use search_products whenever the exact product is unclear.
- For references such as "the second one", use the numbered displayed-product context included in the conversation.
- Never call prepare_add_to_cart merely because the customer asks to view or compare products.
- When the customer asks to compare previously displayed products, compare them directly from the verified displayed-product context.
- Resolve ordinal references such as "the first and second", "the second one" or "the last product" from the numbered displayed-product context.
- Compare only verified product name, category, current price, available sizes, sale status and verified description.
- Never invent fabric composition, material, quality, durability, comfort, fit, manufacturing details or styling characteristics that are absent from the verified description.
- You may objectively identify the cheaper product, the product with more available sizes or whether a product is on sale.
- Do not declare an overall best product unless the customer provides a preference and the verified product information supports the conclusion.
- If the customer asks which product is better for an occasion, use only wording present in the verified descriptions. Otherwise explain that the catalog does not provide enough information to determine occasion suitability.
- If a product has multiple sizes and the customer did not choose one, ask which size they want.
- Do not claim the product was successfully added. Say it has been prepared while the website completes the action.
- When the customer asks what is in the cart or asks for the subtotal, answer directly from the current browser cart context.
- When the customer asks to remove a cart item, update its quantity or empty the cart, call prepare_cart_action.
- Resolve phrases such as "the second cart item", "that bag" or "change it to two" using the current cart context and recent conversation.
- Never invent cart contents or use old catalog search results as proof that an item is currently in the cart.
- Never reveal maximum quantities or internal stock values from cart data.
- Do not claim a removal, quantity update or cart clear succeeded. Say it was prepared while the website completes the action.
- When the customer asks to add a product to the wishlist, call prepare_wishlist_action with operation "add".
- When the customer asks to remove a saved product, call prepare_wishlist_action with operation "remove".
- When the customer asks to empty the wishlist, call prepare_wishlist_action with operation "clear".
- Resolve saved-product ordinal references using the numbered current wishlist context.
- Never invent wishlist contents.
- Do not claim that a wishlist change succeeded before the website executes it.
- A signed-out customer may be asked for an email by the website's existing wishlist flow.
- Never invent supported payment methods.
- Explain that no payment is collected on the checkout review page and that payment arrangements are confirmed after order placement.
- Explain that order tracking requires the order number and checkout email.
- The current policy is No Returns.
- Never ask for payment-card numbers, passwords, security codes or banking credentials.
- Use prepare_navigation only when the customer explicitly asks to open or go to checkout, order tracking or the wishlist.
- Do not claim an order has been submitted.
- Conversational order submission will be connected in the next development stage.
- Never request payment-card details in chat.
- Keep most replies between 1 and 5 short sentences.
`.trim();
}

const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description:
        "Search Stereophonie's live published catalog and return purchasable products, variants, current prices, sizes and stock.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Useful descriptive keywords such as color, style, material, occasion or product name. Use an empty string when no keyword is required.",
          },
          category: {
            type: "string",
            description:
              "Catalog category such as Phones, Laptops, Gaming, Audio, TV & Displays or Accessories. Use an empty string when unspecified.",
          },
          size: {
            type: "string",
            description:
              "Exact requested size such as XS, S, M, L, XL or One Size. Use an empty string when unspecified.",
          },
          maximum_price: {
            type: "number",
            description: "Maximum price in US dollars. Use 0 when unspecified.",
          },
          limit: {
            type: "integer",
            description:
              "Maximum number of products to return, between 1 and 8.",
          },
        },
        required: ["query", "category", "size", "maximum_price", "limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_add_to_cart",
      description:
        "Validate a specific live catalog product, variant, quantity and stock, then prepare a secure browser-side add-to-cart action. Use only when the customer explicitly asks to add a product to the cart.",
      parameters: {
        type: "object",
        properties: {
          product_reference: {
            type: "string",
            description:
              "The exact product name or clearest product reference from the conversation. Resolve ordinal references using the displayed-product context.",
          },
          size: {
            type: "string",
            description:
              "The requested size, such as XS, S, M, L, XL or One Size. Use an empty string when the product has one variant or the customer did not specify a size.",
          },
          quantity: {
            type: "integer",
            description:
              "The number of units the customer explicitly requested. Default to 1.",
          },
        },
        required: ["product_reference", "size", "quantity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_cart_action",
      description:
        "Validate and prepare removal, quantity-update or clear-cart actions using the customer's current browser cart. Use only when the customer explicitly requests a cart change.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["remove", "update_quantity", "clear"],
            description:
              "The requested cart operation. Use remove for deleting one item, update_quantity for changing an item's quantity, and clear for emptying the full cart.",
          },
          product_reference: {
            type: "string",
            description:
              "The cart product name or clearest reference. Use an empty string when resolving by position or clearing the cart.",
          },
          size: {
            type: "string",
            description:
              "The cart item's size when needed to disambiguate. Use an empty string when unspecified.",
          },
          position: {
            type: "integer",
            description:
              "The 1-based position in the current cart. Use 0 when the customer did not specify an ordinal position.",
          },
          quantity: {
            type: "integer",
            description:
              "The desired final quantity for update_quantity. Use 0 for other operations.",
          },
        },
        required: [
          "operation",
          "product_reference",
          "size",
          "position",
          "quantity",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_wishlist_action",
      description:
        "Validate and prepare an add, remove or clear action for the customer's browser wishlist.",
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["add", "remove", "clear"],
          },
          product_reference: {
            type: "string",
            description:
              "The exact product name or clearest recent product reference. Use an empty string when clearing or when position alone identifies a saved product.",
          },
          position: {
            type: "integer",
            description:
              "The 1-based saved-product position for ordinal references. Use 0 when no saved-product position applies.",
          },
        },
        required: ["operation", "product_reference", "position"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_navigation",
      description:
        "Prepare safe browser navigation when the customer explicitly asks to go to checkout or order tracking.",
      parameters: {
        type: "object",
        properties: {
          destination: {
            type: "string",
            enum: ["checkout", "track_order", "wishlist"],
            description:
              "Use checkout for the checkout page and track_order for the secure order-tracking page.",
          },
        },
        required: ["destination"],
      },
    },
  },
];

async function callOllama(messages: OllamaMessage[]) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 110_000);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        tools,
        stream: false,
        think: false,
        keep_alive: "2h",
        options: {
          temperature: 0.25,
          num_predict: 260,
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = (await response.json()) as OllamaResponse;

    if (!response.ok || payload.error) {
      throw new Error(
        payload.error || `Ollama returned HTTP ${response.status}.`,
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function getUnavailableMessage(language: Language) {
  if (language === "fr") {
    return "L’assistante locale est momentanément indisponible. Vérifiez qu’Ollama est ouvert, puis réessayez.";
  }

  if (language === "ar") {
    return "المساعدة الذكية المحلية غير متاحة مؤقتًا. تأكدي من تشغيل Ollama ثم حاولي مجددًا.";
  }

  return "The local AI assistant is temporarily unavailable. Make sure Ollama is running, then try again.";
}

function normalizeWishlist(value: unknown): IncomingWishlist {
  if (!value || typeof value !== "object") {
    return {
      hydrated: false,
      products: [],
    };
  }

  const candidate = value as {
    hydrated?: unknown;
    products?: unknown;
  };

  if (!Array.isArray(candidate.products)) {
    return {
      hydrated: candidate.hydrated === true,
      products: [],
    };
  }

  const products = candidate.products
    .filter(
      (product): product is Record<string, unknown> =>
        Boolean(product) && typeof product === "object",
    )
    .slice(0, 200)
    .map((product, index) => {
      const images = Array.isArray(product.images)
        ? product.images
            .filter(
              (image): image is Record<string, unknown> =>
                Boolean(image) && typeof image === "object",
            )
            .map((image) => ({
              image_url: cleanText(image.image_url) || null,
              alt_text: cleanText(image.alt_text) || null,
              position: Math.max(0, Math.floor(Number(image.position) || 0)),
              is_primary: image.is_primary === true,
            }))
        : [];

      const variants = Array.isArray(product.variants)
        ? product.variants
            .filter(
              (variant): variant is Record<string, unknown> =>
                Boolean(variant) && typeof variant === "object",
            )
            .map((variant) => {
              const rawStatus = cleanText(variant.availability_status);

              const availabilityStatus:
                | "in_stock"
                | "low_stock"
                | "out_of_stock"
                | "coming_soon"
                | null =
                rawStatus === "in_stock" ||
                rawStatus === "low_stock" ||
                rawStatus === "out_of_stock" ||
                rawStatus === "coming_soon"
                  ? rawStatus
                  : null;

              return {
                regular_price:
                  variant.regular_price === null ||
                  variant.regular_price === undefined
                    ? null
                    : Math.max(0, Number(variant.regular_price) || 0),
                sale_price:
                  variant.sale_price === null ||
                  variant.sale_price === undefined
                    ? null
                    : Math.max(0, Number(variant.sale_price) || 0),
                stock_quantity: Math.max(
                  0,
                  Math.floor(Number(variant.stock_quantity) || 0),
                ),
                availability_status: availabilityStatus,
              };
            })
        : [];

      return {
        position: Math.max(
          1,
          Math.floor(Number(product.position) || index + 1),
        ),
        id: cleanText(product.id),
        name: cleanText(product.name),
        slug: cleanText(product.slug) || null,
        description: cleanText(product.description) || null,
        categoryName: cleanText(product.categoryName) || "Collection",
        is_featured:
          typeof product.is_featured === "boolean" ? product.is_featured : null,
        is_trending:
          typeof product.is_trending === "boolean" ? product.is_trending : null,
        is_new_arrival:
          typeof product.is_new_arrival === "boolean"
            ? product.is_new_arrival
            : null,
        images,
        variants,
      } satisfies IncomingWishlistProduct;
    })
    .filter((product) => product.id && product.name);

  return {
    hydrated: candidate.hydrated === true,
    products,
  };
}

function getWishlistContext(wishlist: IncomingWishlist) {
  if (!wishlist.hydrated) {
    return `
Current browser wishlist:
- The wishlist is still loading.
- Do not invent its contents.
- Do not prepare a removal or clear action until it is ready.
`.trim();
  }

  if (wishlist.products.length === 0) {
    return `
Current browser wishlist:
- The wishlist is empty.
- No products are currently saved.
`.trim();
  }

  return `
Current browser wishlist, in saved order:

${wishlist.products
  .map(
    (product, index) =>
      `${index + 1}. ${product.name} | Category: ${product.categoryName}`,
  )
  .join("\n")}

Resolve references such as "the first saved product", "the second one" and "the last item" using this numbered order.
`.trim();
}

function resolveSavedWishlistProduct(
  argumentsValue: Record<string, unknown>,
  wishlist: IncomingWishlist,
) {
  const requestedPosition = Math.floor(Number(argumentsValue.position) || 0);

  if (requestedPosition > 0) {
    return wishlist.products[requestedPosition - 1] ?? null;
  }

  const reference = cleanText(argumentsValue.product_reference).toLowerCase();

  if (!reference) {
    return null;
  }

  const exactMatch = wishlist.products.find(
    (product) => product.name.toLowerCase() === reference,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const partialMatches = wishlist.products.filter((product) =>
    product.name.toLowerCase().includes(reference),
  );

  return partialMatches.length === 1 ? partialMatches[0] : null;
}

function toWishlistProduct(
  product: AssistantProduct,
): Omit<IncomingWishlistProduct, "position"> {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: product.category,
    is_featured: null,
    is_trending: null,
    is_new_arrival: null,
    images: product.imageUrl
      ? [
          {
            image_url: product.imageUrl,
            alt_text: product.imageAlt,
            position: 0,
            is_primary: true,
          },
        ]
      : [],
    variants: product.variants.map((variant) => ({
      regular_price: variant.regularPrice,
      sale_price: variant.salePrice,
      stock_quantity: variant.stockQuantity,
      availability_status:
        variant.availabilityStatus === "in_stock" ||
        variant.availabilityStatus === "low_stock" ||
        variant.availabilityStatus === "out_of_stock" ||
        variant.availabilityStatus === "coming_soon"
          ? variant.availabilityStatus
          : null,
    })),
  };
}

async function prepareWishlistAction(
  argumentsValue: Record<string, unknown>,
  wishlist: IncomingWishlist,
) {
  const operation = cleanText(argumentsValue.operation).toLowerCase();

  if (!wishlist.hydrated) {
    return {
      success: false,
      reason: "wishlist_not_ready",
      message: "The browser wishlist is still loading.",
      products: [] as AssistantProduct[],
      action: null as AssistantWishlistAction | null,
    };
  }

  if (operation === "clear") {
    if (wishlist.products.length === 0) {
      return {
        success: false,
        reason: "wishlist_empty",
        message: "The wishlist is already empty.",
        products: [] as AssistantProduct[],
        action: null as AssistantWishlistAction | null,
      };
    }

    return {
      success: true,
      reason: null,
      message: "The clear-wishlist action has been prepared.",
      products: [] as AssistantProduct[],
      action: {
        type: "clear_wishlist",
      } satisfies AssistantWishlistAction,
    };
  }

  if (operation === "remove") {
    const product = resolveSavedWishlistProduct(argumentsValue, wishlist);

    if (!product) {
      return {
        success: false,
        reason: "wishlist_product_not_identified",
        message:
          "The requested saved product could not be uniquely identified.",
        products: [] as AssistantProduct[],
        action: null as AssistantWishlistAction | null,
      };
    }

    return {
      success: true,
      reason: null,
      message: "The wishlist removal has been prepared.",
      products: [] as AssistantProduct[],
      action: {
        type: "remove_from_wishlist",
        productId: product.id,
        name: product.name,
      } satisfies AssistantWishlistAction,
    };
  }

  if (operation === "add") {
    const reference = cleanText(argumentsValue.product_reference);

    if (!reference) {
      return {
        success: false,
        reason: "missing_product_reference",
        message: "A product must be identified before it can be saved.",
        products: [] as AssistantProduct[],
        action: null as AssistantWishlistAction | null,
      };
    }

    const products = await searchProducts({
      query: reference,
      limit: 6,
    });

    const normalizedReference = reference.toLowerCase();

    const exactMatch = products.find(
      (product) => product.name.toLowerCase() === normalizedReference,
    );

    const selectedProduct =
      exactMatch ?? (products.length === 1 ? products[0] : null);

    if (!selectedProduct) {
      return {
        success: false,
        reason: products.length > 1 ? "ambiguous_product" : "product_not_found",
        message:
          products.length > 1
            ? "Several catalog products match. Ask the customer to choose one."
            : "No matching published product is currently available.",
        products,
        action: null as AssistantWishlistAction | null,
      };
    }

    const alreadySaved = wishlist.products.some(
      (product) => product.id === selectedProduct.id,
    );

    if (alreadySaved) {
      return {
        success: false,
        reason: "already_saved",
        message: `${selectedProduct.name} is already in the wishlist.`,
        products: [selectedProduct],
        action: null as AssistantWishlistAction | null,
      };
    }

    return {
      success: true,
      reason: null,
      message: "The wishlist addition has been prepared.",
      products: [selectedProduct],
      action: {
        type: "add_to_wishlist",
        product: toWishlistProduct(selectedProduct),
      } satisfies AssistantWishlistAction,
    };
  }

  return {
    success: false,
    reason: "unsupported_operation",
    message: "That wishlist operation is not supported.",
    products: [] as AssistantProduct[],
    action: null as AssistantWishlistAction | null,
  };
}

function localNormalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequestedSize(value: string) {
  const match = value.match(/\b(xxs|xs|s|m|l|xl|xxl|xxxl|one size)\b/i);

  return match?.[1]?.trim() ?? "";
}

function extractRequestedQuantity(value: string) {
  const direct = value.match(/\b(?:qty|quantity|x)\s*(\d{1,2})\b/i);

  if (direct) {
    return Math.max(1, Math.min(10, Number(direct[1]) || 1));
  }

  const items = value.match(/\b(\d{1,2})\s+(?:items?|pieces?|units?)\b/i);

  if (items) {
    return Math.max(1, Math.min(10, Number(items[1]) || 1));
  }

  return 1;
}

function cleanProductReferenceFromAction(value: string) {
  return value
    .replace(
      /\b(please|can you|could you|i want to|i would like to|add|put|place|save|remove|delete|from|into|in|my|the|cart|bag|basket|wishlist|favorites|favourites|favorite|favourite|product|item)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function detectLocalAction(value: string) {
  const normalized = localNormalize(value);

  return {
    addCart:
      /\b(add|put|place)\b/.test(normalized) &&
      /\b(cart|bag|basket)\b/.test(normalized),

    removeCart:
      /\b(remove|delete)\b/.test(normalized) &&
      /\b(cart|bag|basket)\b/.test(normalized),

    clearCart:
      /\b(clear|empty)\b/.test(normalized) &&
      /\b(cart|bag|basket)\b/.test(normalized),

    addWishlist:
      /\b(add|save|put)\b/.test(normalized) &&
      /\b(wishlist|favorite|favourite|favorites|favourites)\b/.test(normalized),

    removeWishlist:
      /\b(remove|delete)\b/.test(normalized) &&
      /\b(wishlist|favorite|favourite|favorites|favourites)\b/.test(normalized),

    clearWishlist:
      /\b(clear|empty)\b/.test(normalized) &&
      /\b(wishlist|favorite|favourite|favorites|favourites)\b/.test(normalized),

    checkout: /\b(checkout|go to checkout|proceed to checkout)\b/.test(
      normalized,
    ),

    tracking:
      /\b(track my order|track order|order tracking|where is my order)\b/.test(
        normalized,
      ),
  };
}

function toRankedProduct(product: AssistantProduct): RankedAssistantProduct {
  const knowledgeProduct = product as AssistantProduct & {
    catalogKnowledge?: string;
  };

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    category: product.category,
    knowledgeText: knowledgeProduct.catalogKnowledge ?? "",
    imageUrl: product.imageUrl,
    imageAlt: product.imageAlt,
    price: product.price,

    /*
     * Product-level availability used by the assistant card.
     *
     * This is intentionally generated from the complete live
     * configuration set rather than copied from one variant.
     */
    availabilityStatus: assistantCatalogAvailability(product),

    variants: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      currentPrice: variant.currentPrice,
      regularPrice: variant.regularPrice,
      salePrice: variant.salePrice,
      stockQuantity: variant.stockQuantity,
      availabilityStatus: variant.availabilityStatus,
    })),
  };
}

function findComparisonProducts(
  products: AssistantProduct[],
  conversationText: string,
) {
  const normalizedMessage = normalizeProductReference(conversationText);

  const directMatches = products.filter((product) => {
    const normalizedName = normalizeProductReference(product.name);

    return (
      normalizedName.length >= 3 && normalizedMessage.includes(normalizedName)
    );
  });

  if (directMatches.length >= 2) {
    return directMatches.slice(0, 4);
  }

  const scored = products
    .map((product) => {
      const nameWords = normalizeProductReference(product.name)
        .split(" ")
        .filter((word) => word.length >= 3);

      const score = nameWords.filter((word) =>
        normalizedMessage.includes(word),
      ).length;

      return {
        product,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score);

  return scored.slice(0, 4).map((entry) => entry.product);
}

type AssistantCatalogAvailability =
  | "coming_soon"
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "mixed"
  | "unavailable";

function assistantCatalogAvailability(
  product: AssistantProduct,
): AssistantCatalogAvailability {
  const activeVariants = product.variants ?? [];

  if (activeVariants.length === 0) {
    return "unavailable";
  }

  const comingSoon = activeVariants.filter(
    (variant) => variant.availabilityStatus === "coming_soon",
  );

  const lowStock = activeVariants.filter(
    (variant) =>
      variant.availabilityStatus === "low_stock" &&
      variant.stockQuantity > 0,
  );

  const inStock = activeVariants.filter(
    (variant) =>
      variant.availabilityStatus === "in_stock" &&
      variant.stockQuantity > 0,
  );

  const outOfStock = activeVariants.filter(
    (variant) =>
      variant.availabilityStatus === "out_of_stock" ||
      variant.availabilityStatus === "unavailable" ||
      (
        variant.stockQuantity <= 0 &&
        variant.availabilityStatus !== "coming_soon"
      ),
  );

  const immediatelyAvailable = inStock.length + lowStock.length;

  /*
   * Entire product is coming soon.
   */
  if (
    comingSoon.length > 0 &&
    immediatelyAvailable === 0 &&
    outOfStock.length === 0
  ) {
    return "coming_soon";
  }

  /*
   * At least one configuration can be purchased now.
   */
  if (immediatelyAvailable > 0) {
    if (comingSoon.length > 0 || outOfStock.length > 0) {
      return "mixed";
    }

    if (inStock.length === 0 && lowStock.length > 0) {
      return "low_stock";
    }

    return "in_stock";
  }

  if (outOfStock.length > 0 && comingSoon.length > 0) {
    return "mixed";
  }

  if (outOfStock.length > 0) {
    return "out_of_stock";
  }

  if (comingSoon.length > 0) {
    return "coming_soon";
  }

  return "unavailable";
}

function directCatalogProductResponse(
  product: AssistantProduct,
  language: Language,
) {
  const availability = assistantCatalogAvailability(product);

  if (availability === "coming_soon") {
    if (language === "fr") {
      return `${product.name} est bien référencé chez Stereophonie et arrive prochainement. Il n’est pas encore disponible à l’achat — restez à l’écoute.`;
    }

    if (language === "ar") {
      return `${product.name} موجود بالفعل ضمن منتجات Stereophonie وسيصل قريباً. المنتج غير متاح للشراء بعد — ترقّبوا توفره.`;
    }

    return `Yes — ${product.name} is already listed at Stereophonie and is coming soon. It is not available to purchase yet, so stay tuned.`;
  }

  if (availability === "out_of_stock") {
    if (language === "fr") {
      return `Oui, nous proposons ${product.name}, mais il est actuellement en rupture de stock.`;
    }

    if (language === "ar") {
      return `نعم، ${product.name} موجود ضمن منتجاتنا، لكنه غير متوفر في المخزون حالياً.`;
    }

    return `Yes — we carry ${product.name}, but it is currently out of stock.`;
  }

  if (availability === "low_stock") {
    if (language === "fr") {
      return `Oui, ${product.name} est disponible actuellement, mais le stock est limité.`;
    }

    if (language === "ar") {
      return `نعم، ${product.name} متوفر حالياً، لكن الكمية محدودة.`;
    }

    return `Yes — ${product.name} is available right now, but stock is limited.`;
  }

  if (availability === "mixed") {
    if (language === "fr") {
      return `${product.name} est bien disponible dans notre catalogue. Certaines configurations sont disponibles maintenant, tandis que d’autres sont en rupture de stock ou arrivent prochainement.`;
    }

    if (language === "ar") {
      return `${product.name} موجود ضمن الكتالوج لدينا. بعض النسخ متوفرة الآن، بينما توجد نسخ غير متوفرة أو ستصل قريباً.`;
    }

    return `${product.name} is in our catalog. Some configurations are available now, while others are out of stock or coming soon.`;
  }

  if (availability === "in_stock") {
    if (language === "fr") {
      return `Oui, ${product.name} est actuellement disponible chez Stereophonie.`;
    }

    if (language === "ar") {
      return `نعم، ${product.name} متوفر حالياً لدى Stereophonie.`;
    }

    return `Yes — ${product.name} is currently available at Stereophonie.`;
  }

  if (language === "fr") {
    return `${product.name} est bien référencé dans notre catalogue, mais il n’est pas disponible actuellement.`;
  }

  if (language === "ar") {
    return `${product.name} موجود ضمن الكتالوج لدينا، لكنه غير متوفر حالياً.`;
  }

  return `${product.name} is listed in our catalog, but it is not currently available.`;
}


function priceResponse(product: AssistantProduct, language: Language) {
  const availability =
    assistantCatalogAvailability(product);

  /*
   * A coming-soon product may intentionally have no purchase
   * price yet. Explain that state rather than making it sound
   * like an unknown/broken catalog record.
   */
  if (
    availability === "coming_soon" &&
    (
      product.price === null ||
      product.price <= 0
    )
  ) {
    if (language === "fr") {
      return `${product.name} arrive prochainement. Son prix d’achat n’est pas encore disponible.`;
    }

    if (language === "ar") {
      return `${product.name} سيصل قريباً، وسعر الشراء غير متوفر بعد.`;
    }

    return `${product.name} is coming soon. Its purchase price is not available yet.`;
  }

  if (product.price === null || product.price <= 0) {
    if (language === "fr") {
      return `Le prix de ${product.name} n’est pas disponible actuellement.`;
    }

    if (language === "ar") {
      return `سعر ${product.name} غير متوفر حالياً.`;
    }

    return `The current price for ${product.name} is not available right now.`;
  }

  if (language === "fr") {
    return `${product.name} est disponible à partir de $${product.price.toFixed(
      2,
    )}.`;
  }

  if (language === "ar") {
    return `يبدأ سعر ${product.name} من $${product.price.toFixed(2)}.`;
  }

  return `${product.name} currently starts at $${product.price.toFixed(2)}.`;
}

function availabilityResponse(product: AssistantProduct, language: Language) {
  const variants = product.variants;

  const inStock = variants.filter(
    (variant) =>
      variant.availabilityStatus === "in_stock" && variant.stockQuantity > 0,
  );

  const lowStock = variants.filter(
    (variant) =>
      variant.availabilityStatus === "low_stock" && variant.stockQuantity > 0,
  );

  const comingSoon = variants.filter(
    (variant) => variant.availabilityStatus === "coming_soon",
  );

  const outOfStock = variants.filter(
    (variant) =>
      variant.availabilityStatus === "out_of_stock" ||
      variant.availabilityStatus === "unavailable" ||
      (variant.stockQuantity <= 0 &&
        variant.availabilityStatus !== "coming_soon"),
  );

  const availableCount = inStock.length + lowStock.length;

  if (variants.length === 0) {
    if (language === "fr") {
      return `${product.name} est bien référencé dans notre catalogue, mais aucune configuration n’est disponible actuellement.`;
    }

    if (language === "ar") {
      return `${product.name} موجود ضمن الكتالوج لدينا، ولكن لا توجد أي نسخة متوفرة حالياً.`;
    }

    return `${product.name} is listed in our catalog, but no configuration is currently available.`;
  }

  if (availableCount > 0) {
    if (language === "fr") {
      if (lowStock.length > 0 && inStock.length === 0) {
        return `${product.name} est disponible actuellement, mais le stock est limité.`;
      }

      if (comingSoon.length > 0 || outOfStock.length > 0) {
        return `${product.name} est disponible actuellement. Certaines configurations sont disponibles, tandis que d’autres sont en rupture de stock ou arrivent prochainement.`;
      }

      return `${product.name} est actuellement disponible.`;
    }

    if (language === "ar") {
      if (lowStock.length > 0 && inStock.length === 0) {
        return `${product.name} متوفر حالياً، لكن الكمية محدودة.`;
      }

      if (comingSoon.length > 0 || outOfStock.length > 0) {
        return `${product.name} متوفر حالياً. بعض النسخ متوفرة، بينما قد تكون نسخ أخرى غير متوفرة أو ستتوفر قريباً.`;
      }

      return `${product.name} متوفر حالياً.`;
    }

    if (lowStock.length > 0 && inStock.length === 0) {
      return `${product.name} is available right now, but stock is limited.`;
    }

    if (comingSoon.length > 0 || outOfStock.length > 0) {
      return `${product.name} is available. Some configurations are currently in stock, while others are out of stock or coming soon.`;
    }

    return `${product.name} is currently in stock.`;
  }

  if (comingSoon.length > 0 && outOfStock.length === 0) {
    if (language === "fr") {
      return `${product.name} est déjà référencé dans notre catalogue et arrive prochainement, mais il n’est pas encore disponible à l’achat.`;
    }

    if (language === "ar") {
      return `${product.name} موجود بالفعل ضمن الكتالوج وسيكون متوفراً قريباً، لكنه غير متاح للشراء بعد.`;
    }

    return `${product.name} is already listed in our catalog and is coming soon, but it is not available to purchase yet.`;
  }

  if (outOfStock.length > 0 && comingSoon.length === 0) {
    if (language === "fr") {
      return `Nous proposons bien ${product.name}, mais il est actuellement en rupture de stock.`;
    }

    if (language === "ar") {
      return `${product.name} من المنتجات التي نوفرها، لكنه غير متوفر في المخزون حالياً.`;
    }

    return `We do carry ${product.name}, but it is currently out of stock.`;
  }

  if (comingSoon.length > 0 && outOfStock.length > 0) {
    if (language === "fr") {
      return `${product.name} est bien référencé dans notre catalogue. Certaines configurations sont en rupture de stock et d’autres arrivent prochainement.`;
    }

    if (language === "ar") {
      return `${product.name} موجود ضمن الكتالوج لدينا. بعض النسخ غير متوفرة حالياً ونسخ أخرى ستتوفر قريباً.`;
    }

    return `${product.name} is listed in our catalog. Some configurations are currently out of stock, while others are coming soon.`;
  }

  if (language === "fr") {
    return `${product.name} est bien référencé dans notre catalogue, mais il n’est pas disponible actuellement.`;
  }

  if (language === "ar") {
    return `${product.name} موجود ضمن الكتالوج لدينا، لكنه غير متوفر حالياً.`;
  }

  return `We do carry ${product.name}, but it is not currently available.`;
}

type AssistantLatestOrder = {
  order_number: string;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "out_for_delivery"
    | "completed"
    | "cancelled";
  payment_status: "unpaid" | "paid" | "refunded";
  delivery_city: string | null;
  delivery_area: string | null;
  total: number | null;
  created_at: string;
  status_updated_at: string | null;
};

async function getLatestSignedInAssistantOrder() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      signedIn: false,
      order: null as AssistantLatestOrder | null,
    };
  }

  const email = user.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return {
      signedIn: true,
      order: null as AssistantLatestOrder | null,
    };
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        order_number,
        status,
        payment_status,
        delivery_city,
        delivery_area,
        total,
        created_at,
        status_updated_at
      `,
    )
    .ilike("customer_email", email)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Assistant latest-order lookup failed:", error);

    return {
      signedIn: true,
      order: null as AssistantLatestOrder | null,
    };
  }

  return {
    signedIn: true,
    order: (data as AssistantLatestOrder | null) ?? null,
  };
}

function humanOrderStatus(
  status: AssistantLatestOrder["status"],
  language: Language,
) {
  const english: Record<AssistantLatestOrder["status"], string> = {
    pending: "pending confirmation",
    confirmed: "confirmed",
    preparing: "being prepared",
    out_for_delivery: "out for delivery",
    completed: "completed",
    cancelled: "cancelled",
  };

  const french: Record<AssistantLatestOrder["status"], string> = {
    pending: "en attente de confirmation",
    confirmed: "confirmée",
    preparing: "en préparation",
    out_for_delivery: "en cours de livraison",
    completed: "terminée",
    cancelled: "annulée",
  };

  const arabic: Record<AssistantLatestOrder["status"], string> = {
    pending: "بانتظار التأكيد",
    confirmed: "مؤكد",
    preparing: "قيد التحضير",
    out_for_delivery: "خرج للتوصيل",
    completed: "مكتمل",
    cancelled: "ملغى",
  };

  if (language === "fr") {
    return french[status];
  }

  if (language === "ar") {
    return arabic[status];
  }

  return english[status];
}

function latestOrderResponse(order: AssistantLatestOrder, language: Language) {
  const status = humanOrderStatus(order.status, language);

  if (language === "fr") {
    return `Votre dernière commande #${order.order_number} est actuellement ${status}.`;
  }

  if (language === "ar") {
    return `طلبك الأخير رقم ${order.order_number} حالته حالياً: ${status}.`;
  }

  const destination = [order.delivery_area, order.delivery_city]
    .filter(Boolean)
    .join(", ");

  const payment =
    order.payment_status === "paid"
      ? "Payment is confirmed."
      : order.payment_status === "refunded"
        ? "The payment has been refunded."
        : "Payment is currently marked as unpaid.";

  const delivery = destination ? ` Delivery destination: ${destination}.` : "";

  const total =
    order.total !== null
      ? ` Order total: $${Number(order.total).toFixed(2)}.`
      : "";

  return `Your latest order #${order.order_number} is currently ${status}.${delivery}${total} ${payment}`.trim();
}

function unavailableCatalogResponse(
  parsed: ReturnType<typeof parseAssistantRequest>,
  language: Language,
) {
  const requested =
    parsed.productQuery || parsed.category || parsed.brand || "that product";

  if (language === "fr") {
    return `Je n’ai trouvé aucun produit publié correspondant à « ${requested} » dans notre boutique pour le moment. Gardez un œil sur le shop — de nouveaux produits peuvent être ajoutés.`;
  }

  if (language === "ar") {
    return `لم أجد حالياً أي منتج منشور يطابق «${requested}» في المتجر. تابع المتجر، فقد تتم إضافة منتجات جديدة قريباً.`;
  }

  return `I couldn’t find a currently published product matching “${requested}” in the store. Keep an eye on the shop — new products may be added soon.`;
}

export async function POST(request: Request) {
  let language: Language = "en";

  try {
    const body = (await request.json()) as {
      message?: unknown;
      messages?: unknown;
      language?: unknown;
      cart?: unknown;
      wishlist?: unknown;
      assistantContext?: unknown;
    };

    const incomingMessages = normalizeMessages(body.messages);

    const latest = incomingMessages.at(-1);

    if (!latest || latest.role !== "user") {
      return NextResponse.json(
        {
          message: "A customer message is required.",
          products: [],
        },
        {
          status: 400,
        },
      );
    }

    const rawMessage = latest.content;

    /*
     * Detect language from our local parser.
     * Explicit browser language remains supported.
     */
    const firstParse = parseAssistantRequest(rawMessage);

    language =
      normalizeLanguage(body.language) !== "en"
        ? normalizeLanguage(body.language)
        : firstParse.language;

    const cart = normalizeCart(body.cart);

    const wishlist = normalizeWishlist(body.wishlist);

    const assistantContext =
      normalizeAssistantContext(
        body.assistantContext,
      );

    /*
     * Reconstruct lightweight conversational memory
     * from recent USER turns.
     */
    let memory = {
      ...emptyAssistantMemory,
    };

    for (const message of incomingMessages) {
      if (message.role !== "user") {
        continue;
      }

      const historicalRequest = parseAssistantRequest(message.content);

      memory = mergeAssistantMemory(memory, historicalRequest);
    }

    let parsed = parseAssistantRequest(rawMessage);

    /*
     * Explicit high-priority intents must NEVER inherit an old
     * shopping category from conversational memory.
     *
     * Example:
     *   "show me phones"
     *   "track my latest order"
     *
     * The second message must leave the phone context entirely.
     */
    const explicitIntentBeforeMemory = parsed.intent;

    if (
      explicitIntentBeforeMemory !== "order_tracking" &&
      explicitIntentBeforeMemory !== "store_info" &&
      explicitIntentBeforeMemory !== "greeting" &&
      explicitIntentBeforeMemory !== "help"
    ) {
      parsed = applyMemoryToRequest(parsed, memory);
    }

    const actions = detectLocalAction(rawMessage);

    /*
     * ASSISTANT_STATUS_INTENT_V5
     *
     * Catalog-status language must take priority over generic
     * greeting/help classification.
     *
     * Examples:
     *
     *   "Do you have anything low stock?"
     *   "What products are coming soon?"
     *   "Show me what is out of stock."
     *   "What do you have in stock?"
     *
     * These are live catalog questions even if the lightweight
     * natural-language parser classifies their sentence structure
     * too broadly.
     */
    const earlyAvailabilityCatalogFilter =
      detectAvailabilityCatalogFilter(rawMessage);

    const cartActions: AssistantCartAction[] = [];
    const wishlistActions: AssistantWishlistAction[] = [];
    const navigationActions: AssistantNavigationAction[] = [];

    /*
     * --------------------------------------------------------
     * DIRECT NAVIGATION
     * --------------------------------------------------------
     */

    if (actions.tracking || parsed.intent === "order_tracking") {
      const latestOrder = await getLatestSignedInAssistantOrder();

      if (latestOrder.signedIn && latestOrder.order) {
        return NextResponse.json({
          message: latestOrderResponse(latestOrder.order, language),
          products: [],
          cartActions,
          wishlistActions,
          navigationActions,
          language,
          engine: "stereophonie-local-v2",
        });
      }

      if (latestOrder.signedIn && !latestOrder.order) {
        return NextResponse.json({
          message:
            language === "fr"
              ? "Je ne trouve actuellement aucune commande liée à votre compte."
              : language === "ar"
                ? "لا أجد حالياً أي طلب مرتبط بحسابك."
                : "I can’t find any orders linked to your account right now.",
          products: [],
          cartActions,
          wishlistActions,
          navigationActions,
          language,
          engine: "stereophonie-local-v2",
        });
      }

      navigationActions.push({
        type: "navigate",
        destination: "track_order",
        path: "/track-order",
      });

      return NextResponse.json({
        message:
          language === "fr"
            ? "Connectez-vous pour que je puisse consulter automatiquement votre dernière commande, ou utilisez le suivi sécurisé avec votre numéro de commande et votre email."
            : language === "ar"
              ? "سجّل الدخول كي أتمكن من التحقق من آخر طلب تلقائياً، أو استخدم صفحة التتبع الآمنة برقم الطلب والبريد الإلكتروني."
              : "Sign in and I can check your latest order automatically, or use secure order tracking with your order number and email.",
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (actions.checkout) {
      navigationActions.push({
        type: "navigate",
        destination: "checkout",
        path: "/checkout",
      });

      return NextResponse.json({
        message:
          language === "fr"
            ? "Votre passage au checkout est prêt."
            : language === "ar"
              ? "صفحة إتمام الطلب جاهزة."
              : "Your checkout navigation is ready.",
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    /*
     * --------------------------------------------------------
     * CART MANAGEMENT
     * --------------------------------------------------------
     */

    if (actions.clearCart) {
      const result = prepareCartManagementAction(
        {
          operation: "clear",
          product_reference: "",
          size: "",
          position: 0,
          quantity: 0,
        },
        cart,
      );

      if (result.action) {
        cartActions.push(result.action);
      }

      return NextResponse.json({
        message: result.message,
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (actions.removeCart) {
      const reference = cleanProductReferenceFromAction(
        localNormalize(rawMessage),
      );

      const result = prepareCartManagementAction(
        {
          operation: "remove",
          product_reference: reference,
          size: extractRequestedSize(rawMessage),
          position: parsed.ordinal ?? 0,
          quantity: 0,
        },
        cart,
      );

      if (result.action) {
        cartActions.push(result.action);
      }

      return NextResponse.json({
        message: result.message,
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (actions.addCart) {
      const reference =
        cleanProductReferenceFromAction(localNormalize(rawMessage)) ||
        parsed.productQuery ||
        "";

      const result = await prepareAddToCart({
        product_reference: reference,
        size: extractRequestedSize(rawMessage),
        quantity: extractRequestedQuantity(rawMessage),
      });

      if (result.action) {
        cartActions.push(result.action);
      }

      return NextResponse.json({
        message: result.message,
        products: result.products ?? [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    /*
     * --------------------------------------------------------
     * WISHLIST MANAGEMENT
     * --------------------------------------------------------
     */

    if (actions.clearWishlist) {
      const result = await prepareWishlistAction(
        {
          operation: "clear",
          product_reference: "",
          position: 0,
        },
        wishlist,
      );

      if (result.action) {
        wishlistActions.push(result.action);
      }

      return NextResponse.json({
        message: result.message,
        products: result.products ?? [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (actions.removeWishlist) {
      const result = await prepareWishlistAction(
        {
          operation: "remove",
          product_reference: cleanProductReferenceFromAction(
            localNormalize(rawMessage),
          ),
          position: parsed.ordinal ?? 0,
        },
        wishlist,
      );

      if (result.action) {
        wishlistActions.push(result.action);
      }

      return NextResponse.json({
        message: result.message,
        products: result.products ?? [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (actions.addWishlist) {
      const result = await prepareWishlistAction(
        {
          operation: "add",
          product_reference:
            cleanProductReferenceFromAction(localNormalize(rawMessage)) ||
            parsed.productQuery ||
            "",
          position: parsed.ordinal ?? 0,
        },
        wishlist,
      );

      if (result.action) {
        wishlistActions.push(result.action);
      }

      return NextResponse.json({
        message: result.message,
        products: result.products ?? [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    /*
     * --------------------------------------------------------
     * SIMPLE NON-CATALOG INTENTS
     * --------------------------------------------------------
     */

    if (
      parsed.intent === "greeting" &&
      !earlyAvailabilityCatalogFilter
    ) {
      return NextResponse.json({
        message: composeGreeting(parsed),
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (
      parsed.intent === "help" &&
      !earlyAvailabilityCatalogFilter
    ) {
      return NextResponse.json({
        message: composeHelpResponse(parsed),
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (
      parsed.intent === "store_info" &&
      !earlyAvailabilityCatalogFilter
    ) {
      return NextResponse.json({
        message: composeStoreInfo(parsed),
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    /*
     * --------------------------------------------------------
     * LOAD THE REAL PUBLISHED CATALOG
     * --------------------------------------------------------
     */

    const catalog = await searchProducts({
      query: "",
      category: "",
      size: "",
      maximum_price: 0,

      /*
       * ASSISTANT_FULL_CATALOG_V3
       *
       * The assistant must reason over the complete live published
       * catalogue, including:
       *
       * - in-stock products
       * - low-stock products
       * - out-of-stock products
       * - coming-soon products
       *
       * return_all is authoritative here. Do not impose an arbitrary
       * storefront-sized recommendation limit on the knowledge layer.
       */
      limit: 5000,
      return_all: true,
    });

    const rankedCatalog = catalog.map(toRankedProduct);

    /*
     * ========================================================
     * AUTHORITATIVE CATALOG RESOLUTION V4
     * ========================================================
     *
     * Resolve exact named products BEFORE recommendation
     * ranking is allowed to influence the answer.
     *
     * This is the critical protection for:
     *
     *   Do you have iPhone 18 Pro?
     *   How much is the iPhone 18 Pro?
     *   Is iPhone 18 Pro coming soon?
     *
     * A generic accessory must never outrank an exact catalog
     * product simply because both contain a word like Apple,
     * iPhone or Pro.
     */

    const exactCatalogProduct =
      /*
       * ASSISTANT_EXACT_PRODUCT_V5
       *
       * Resolve against the ORIGINAL customer sentence first.
       *
       * Example:
       *
       *   "How much is the iPhone 18 Pro?"
       *
       * The complete product name exists directly inside the raw
       * sentence. A parser-derived partial phrase such as "Apple",
       * "phone" or "Pro" must never replace that stronger evidence.
       */
      resolveExactCatalogProduct(
        catalog,
        rawMessage,
      ) ??
      (
        parsed.productQuery
          ? resolveExactCatalogProduct(
              catalog,
              parsed.productQuery,
            )
          : null
      );

    /*
     * ASSISTANT_CONVERSATION_PRODUCT_MEMORY_V5
     *
     * Exact new product names ALWAYS win.
     *
     * Context is consulted only when the new message is genuinely
     * a follow-up such as:
     *
     *   "price"
     *   "stock?"
     *   "is it coming soon?"
     *   "what about the second one?"
     */
    const contextualCatalogProduct =
      exactCatalogProduct ??
      resolveContextualCatalogProduct(
        catalog,
        rawMessage,
        assistantContext,
      );

    /*
     * A one-word follow-up like "price" can be parsed as unknown.
     * Once we have a verified contextual product, infer only the
     * small set of intents that are unambiguous from the sentence.
     */
    const normalizedFollowUp =
      normalizeProductReference(rawMessage);

    const contextualPriceQuestion =
      Boolean(contextualCatalogProduct) &&
      (
        parsed.intent === "price_question" ||
        /^(price|cost)$/.test(normalizedFollowUp) ||
        /\b(how much|what price|what is the price|what s the price)\b/.test(
          normalizedFollowUp,
        )
      );

    const contextualAvailabilityQuestion =
      Boolean(contextualCatalogProduct) &&
      (
        parsed.intent === "availability" ||
        /^(stock|availability)$/.test(normalizedFollowUp) ||
        /\b(in stock|low stock|out of stock|coming soon|available|unavailable)\b/.test(
          normalizedFollowUp,
        )
      );


    /*
     * Whole-catalog availability questions:
     *
     *   What products are coming soon?
     *   Show me low stock products.
     *   What is out of stock?
     *   What do you have in stock?
     *
     * These are STATUS FILTERS, not fuzzy product-name searches.
     *
     * A specifically named product still takes priority.
     */
    const availabilityCatalogFilter =
      earlyAvailabilityCatalogFilter;

    if (
      availabilityCatalogFilter &&
      !contextualCatalogProduct
    ) {
      const availabilityProducts = catalog.filter(
        (product) =>
          catalogProductMatchesAvailabilityFilter(
            product,
            availabilityCatalogFilter,
          ),
      );

      return NextResponse.json({
        message: availabilityCatalogResponse(
          availabilityCatalogFilter,
          availabilityProducts,
          language,
        ),

        products: availabilityProducts
          .slice(0, 4)
          .map(assistantProductForResponse),

        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v4",
      });
    }

    /*
     * Exact named-product questions bypass fuzzy ranking.
     */
    if (
      contextualCatalogProduct &&
      contextualPriceQuestion
    ) {
      return NextResponse.json({
        message: priceResponse(
          contextualCatalogProduct,
          language,
        ),

        products: [
          assistantProductForResponse(
            contextualCatalogProduct,
          ),
        ],

        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v4",
      });
    }

    if (
      contextualCatalogProduct &&
      (
        contextualAvailabilityQuestion ||
        availabilityCatalogFilter !== null
      )
    ) {
      return NextResponse.json({
        message: availabilityResponse(
          contextualCatalogProduct,
          language,
        ),

        products: [
          assistantProductForResponse(
            contextualCatalogProduct,
          ),
        ],

        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v4",
      });
    }

    if (
      contextualCatalogProduct &&
      (
        parsed.intent === "product_search" ||
        parsed.intent === "unknown"
      )
    ) {
      return NextResponse.json({
        message: directCatalogProductResponse(
          contextualCatalogProduct,
          language,
        ),

        products: [
          assistantProductForResponse(
            contextualCatalogProduct,
          ),
        ],

        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v4",
      });
    }

    /*
     * --------------------------------------------------------
     * COMPARISON
     * --------------------------------------------------------
     */

    if (parsed.intent === "comparison") {
      const conversationText = incomingMessages
        .slice(-6)
        .map((message) => message.content)
        .join(" ");

      const comparisonProducts = findComparisonProducts(
        catalog,
        conversationText,
      );

      return NextResponse.json({
        message: composeComparisonResponse(
          comparisonProducts.map(toRankedProduct),
          parsed,
        ),

        products: comparisonProducts.slice(0, 4).map(assistantProductForResponse),

        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    /*
     * --------------------------------------------------------
     * RANK PRODUCTS USING OUR OWN ENGINE
     * --------------------------------------------------------
     */

    const ranked = topAssistantProducts(rankedCatalog, parsed, 4);

    const selectedProducts = ranked
      .map((entry) => {
        const match = catalog.find(
          (product) => product.id === entry.product.id,
        );

        return match;
      })
      .filter((product): product is AssistantProduct => Boolean(product));

    const liveCatalogResolvedRequest =
      parsed.intent === "unknown" &&
      Boolean(parsed.productQuery) &&
      selectedProducts.length > 0;

    const resolvedParsed = liveCatalogResolvedRequest
      ? {
          ...parsed,
          intent: "product_search" as const,
          needsClarification: false,
          confidence: Math.max(parsed.confidence, 0.82),
        }
      : parsed;

    const explicitCatalogRequest = Boolean(
      resolvedParsed.category ||
      resolvedParsed.productQuery ||
      resolvedParsed.brand,
    );

    const productSensitiveIntent = [
      "product_search",
      "recommendation",
      "gift",
      "price_question",
      "availability",
    ].includes(resolvedParsed.intent);

    if (
      explicitCatalogRequest &&
      productSensitiveIntent &&
      selectedProducts.length === 0
    ) {
      return NextResponse.json({
        message: unavailableCatalogResponse(resolvedParsed, language),
        products: [],
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    /*
     * Price / stock questions become precise
     * when we have an obvious top match.
     */

    /*
     * --------------------------------------------------------
     * DIRECT PRODUCT KNOWLEDGE
     * --------------------------------------------------------
     *
     * A direct catalog question such as:
     *
     *   "Do you have iPhone 18 Pro?"
     *   "iPhone 18 Pro"
     *   "show me the iPhone 18 Pro"
     *
     * must reflect the LIVE availability of the resolved product.
     *
     * This prevents a coming-soon or out-of-stock product from
     * receiving a generic recommendation-style answer.
     *
     * Product cards are still returned so the customer can inspect
     * the real catalog entry.
     */
    if (
      resolvedParsed.intent === "product_search" &&
      Boolean(resolvedParsed.productQuery) &&
      selectedProducts.length === 1
    ) {
      return NextResponse.json({
        message: directCatalogProductResponse(
          selectedProducts[0],
          language,
        ),
        products: selectedProducts.slice(0, 4).map(assistantProductForResponse),
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v3",
      });
    }


    if (
      resolvedParsed.intent === "price_question" &&
      selectedProducts.length > 0
    ) {
      return NextResponse.json({
        message: priceResponse(selectedProducts[0], language),
        products: selectedProducts.slice(0, 4).map(assistantProductForResponse),
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (
      resolvedParsed.intent === "availability" &&
      selectedProducts.length > 0
    ) {
      return NextResponse.json({
        message: availabilityResponse(selectedProducts[0], language),
        products: selectedProducts.slice(0, 4).map(assistantProductForResponse),
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (resolvedParsed.intent === "offers") {
      return NextResponse.json({
        message: composeOfferResponse(ranked, resolvedParsed),
        products: selectedProducts.slice(0, 4).map(assistantProductForResponse),
        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    if (
      resolvedParsed.intent === "product_search" ||
      resolvedParsed.intent === "recommendation" ||
      resolvedParsed.intent === "gift"
    ) {
      if (resolvedParsed.needsClarification && selectedProducts.length === 0) {
        return NextResponse.json({
          message: buildClarification(resolvedParsed),
          products: [],
          cartActions,
          wishlistActions,
          navigationActions,
          language,
          engine: "stereophonie-local-v2",
        });
      }

      return NextResponse.json({
        message: composeRecommendationResponse(resolvedParsed, ranked),

        products: selectedProducts.slice(0, 4).map(assistantProductForResponse),

        cartActions,
        wishlistActions,
        navigationActions,
        language,
        engine: "stereophonie-local-v2",
      });
    }

    /*
     * Unknown question:
     * stay useful instead of hallucinating.
     */
    return NextResponse.json({
      message: composeFallbackResponse(parsed, memory),

      products: [],
      cartActions,
      wishlistActions,
      navigationActions,
      language,
      engine: "stereophonie-local-v2",
    });
  } catch (error) {
    console.error("Stereophonie local assistant failed:", error);

    return NextResponse.json(
      {
        message:
          language === "fr"
            ? "Je n’ai pas pu traiter cette demande pour le moment. Réessayez dans un instant."
            : language === "ar"
              ? "تعذر معالجة طلبك حالياً. حاول مرة أخرى بعد قليل."
              : "I couldn’t process that request right now. Please try again in a moment.",

        products: [],
        language,
        engine: "stereophonie-local-v2",
      },
      {
        status: 500,
      },
    );
  }
}
