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
      "in_stock" | "low_stock" | "out_of_stock" | "coming_soon" | "ask_for_price" | null;
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
    (
      availabilityStatus === "in_stock" ||
      availabilityStatus === "low_stock"
    );

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
  | "in_stock"
  | "ask_for_price";

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

  if (filter === "ask_for_price") {
    return product.variants.some(
      (variant) =>
        variant.availabilityStatus === "ask_for_price",
    );
  }

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

  if (filter === "ask_for_price") {
    if (language === "fr") {
      return products.length > 0
        ? `Voici quelques produits actuellement proposés sur demande de prix : ${visibleProducts.map((product) => product.name).join(", ")}.`
        : "Aucun produit publié n’est actuellement marqué comme disponible sur demande de prix.";
    }

    if (language === "ar") {
      return products.length > 0
        ? `هذه بعض المنتجات التي سعرها متوفر عند الطلب: ${visibleProducts.map((product) => product.name).join("، ")}.`
        : "لا توجد حالياً منتجات منشورة بحالة سعر عند الطلب.";
    }

    return products.length > 0
      ? `These products are currently listed as Ask for Price: ${visibleProducts.map((product) => product.name).join(", ")}.`
      : "There are currently no published products marked as Ask for Price.";
  }

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
        variant.availabilityStatus === "coming_soon" ||
        variant.availabilityStatus === "ask_for_price"
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
  | "ask_for_price"
  | "mixed"
  | "unavailable";

function assistantCatalogAvailability(
  product: AssistantProduct,
): AssistantCatalogAvailability {
  const activeVariants =
    product.variants ?? [];

  if (activeVariants.length === 0) {
    return "unavailable";
  }

  const comingSoon =
    activeVariants.filter(
      (variant) =>
        variant.availabilityStatus === "coming_soon",
    );

  const askForPrice =
    activeVariants.filter(
      (variant) =>
        variant.availabilityStatus === "ask_for_price",
    );

  const lowStock =
    activeVariants.filter(
      (variant) =>
        variant.availabilityStatus === "low_stock" &&
        variant.stockQuantity > 0,
    );

  const inStock =
    activeVariants.filter(
      (variant) =>
        variant.availabilityStatus === "in_stock" &&
        variant.stockQuantity > 0,
    );

  const outOfStock =
    activeVariants.filter(
      (variant) =>
        variant.availabilityStatus === "out_of_stock" ||
        variant.availabilityStatus === "unavailable" ||
        (
          variant.stockQuantity <= 0 &&
          variant.availabilityStatus !== "coming_soon" &&
          variant.availabilityStatus !== "ask_for_price"
        ),
    );

  const immediatelyAvailable =
    inStock.length + lowStock.length;

  if (
    askForPrice.length > 0 &&
    immediatelyAvailable === 0 &&
    comingSoon.length === 0 &&
    outOfStock.length === 0
  ) {
    return "ask_for_price";
  }

  if (
    comingSoon.length > 0 &&
    immediatelyAvailable === 0 &&
    askForPrice.length === 0 &&
    outOfStock.length === 0
  ) {
    return "coming_soon";
  }

  if (immediatelyAvailable > 0) {
    if (
      comingSoon.length > 0 ||
      askForPrice.length > 0 ||
      outOfStock.length > 0
    ) {
      return "mixed";
    }

    if (
      inStock.length === 0 &&
      lowStock.length > 0
    ) {
      return "low_stock";
    }

    return "in_stock";
  }

  if (
    askForPrice.length > 0 &&
    (
      comingSoon.length > 0 ||
      outOfStock.length > 0
    )
  ) {
    return "mixed";
  }

  if (
    outOfStock.length > 0 &&
    comingSoon.length > 0
  ) {
    return "mixed";
  }

  if (askForPrice.length > 0) {
    return "ask_for_price";
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

  const hasAskForPrice =
    product.variants.some(
      (variant) =>
        variant.availabilityStatus === "ask_for_price",
    );

  if (availability === "ask_for_price") {
    if (language === "fr") {
      return `${product.name} est proposé sur demande de prix. Contactez Stereophonie pour obtenir le prix actuel.`;
    }

    if (language === "ar") {
      return `${product.name} متوفر بسعر عند الطلب. تواصل مع Stereophonie للحصول على السعر الحالي.`;
    }

    return `${product.name} is listed as Ask for Price. Contact Stereophonie for the current price.`;
  }

  if (
    availability === "mixed" &&
    hasAskForPrice
  ) {
    if (language === "fr") {
      return `${product.name} est bien référencé dans notre catalogue. La disponibilité varie selon la configuration, et au moins une configuration est proposée sur demande de prix.`;
    }

    if (language === "ar") {
      return `${product.name} موجود ضمن الكتالوج لدينا. تختلف حالة التوفر حسب النسخة، وهناك نسخة واحدة على الأقل بسعر عند الطلب.`;
    }

    return `${product.name} is in our catalog. Availability varies by configuration, and at least one configuration is Ask for Price.`;
  }


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

  if (availability === "ask_for_price") {
    if (language === "fr") {
      return `Le prix de ${product.name} est disponible sur demande. Contactez Stereophonie pour obtenir le prix actuel.`;
    }

    if (language === "ar") {
      return `سعر ${product.name} متوفر عند الطلب. تواصل مع Stereophonie للحصول على السعر الحالي.`;
    }

    return `${product.name} is Ask for Price. Contact Stereophonie for the current price.`;
  }


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

  const askForPrice = variants.filter(
    (variant) =>
      variant.availabilityStatus === "ask_for_price",
  );

  const outOfStock = variants.filter(
    (variant) =>
      variant.availabilityStatus === "out_of_stock" ||
      variant.availabilityStatus === "unavailable" ||
      (
        variant.stockQuantity <= 0 &&
        variant.availabilityStatus !== "coming_soon" &&
        variant.availabilityStatus !== "ask_for_price"
      ),
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

  if (
    askForPrice.length > 0 &&
    availableCount === 0 &&
    comingSoon.length === 0 &&
    outOfStock.length === 0
  ) {
    if (language === "fr") {
      return `${product.name} est proposé sur demande de prix. Contactez Stereophonie pour obtenir le prix actuel.`;
    }

    if (language === "ar") {
      return `${product.name} متوفر بسعر عند الطلب. تواصل مع Stereophonie للحصول على السعر الحالي.`;
    }

    return `${product.name} is available through Ask for Price. Contact Stereophonie for the current price.`;
  }

  if (
    availableCount > 0 &&
    askForPrice.length > 0
  ) {
    if (language === "fr") {
      return `${product.name} est disponible. Certaines configurations sont disponibles maintenant, et au moins une autre est proposée sur demande de prix.`;
    }

    if (language === "ar") {
      return `${product.name} متوفر. بعض النسخ متاحة حالياً، وهناك نسخة أخرى واحدة على الأقل بسعر عند الطلب.`;
    }

    return `${product.name} is available. Some configurations are available now, while at least one other configuration is Ask for Price.`;
  }

  if (
    askForPrice.length > 0 &&
    availableCount === 0
  ) {
    if (language === "fr") {
      return `${product.name} a plusieurs états selon la configuration, et au moins une configuration est proposée sur demande de prix.`;
    }

    if (language === "ar") {
      return `${product.name} لديه حالات توفر مختلفة حسب النسخة، وهناك نسخة واحدة على الأقل بسعر عند الطلب.`;
    }

    return `${product.name} has different availability states by configuration, and at least one configuration is Ask for Price.`;
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



/* ============================================================
 * ASSISTANT_LANGUAGE_INTELLIGENCE_V2
 * ============================================================
 *
 * This layer expands the assistant's natural-language coverage
 * WITHOUT replacing the live catalog.
 *
 * The catalog remains authoritative for:
 * - products
 * - prices
 * - configurations
 * - offers
 * - stock
 * - coming soon
 * - ask for price
 *
 * This layer only helps the assistant understand how customers
 * naturally phrase their needs.
 */

function normalizeAssistantLanguageV2(
  value: string,
) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}


function augmentAssistantRequestV2(
  request: ReturnType<typeof parseAssistantRequest>,
  rawMessage: string,
): ReturnType<typeof parseAssistantRequest> {
  const normalized =
    normalizeAssistantLanguageV2(rawMessage);

  let intent = request.intent;

  let productQuery =
    request.productQuery;

  const useCases =
    new Set(request.useCases);


  /*
   * ----------------------------------------------------------
   * BROAD INTENT VOCABULARY
   * ----------------------------------------------------------
   */

  const giftSignal =
    /\b(gift|present|birthday gift|birthday present|anniversary gift|christmas gift|surprise gift|something for my|buy something for my|shopping for my)\b/.test(
      normalized,
    ) ||
    /\b(cadeau|idee cadeau|idée cadeau|anniversaire|offrir|quelque chose pour mon|quelque chose pour ma)\b/.test(
      normalized,
    ) ||
    /(هدية|هديه|عيد ميلاد|أريد أن أشتري.*ل|بدي اشتري.*ل)/.test(
      rawMessage,
    );


  const comparisonSignal =
    /\b(compare|comparison|versus|vs\.?|difference between|differences between|which one is better|which is better|choose between|better between)\b/.test(
      normalized,
    ) ||
    /\b(comparer|comparaison|contre|difference entre|différence entre|lequel est meilleur|laquelle est meilleure)\b/.test(
      normalized,
    ) ||
    /(قارن|مقارنة|الفرق بين|ايهما افضل|أيهم أفضل)/.test(
      rawMessage,
    );


  const offerSignal =
    /\b(offer|offers|deal|deals|discount|discounts|promotion|promotions|promo|sale|sales|special price|special prices|reduced price|reduced prices|on sale)\b/.test(
      normalized,
    ) ||
    /\b(offre|offres|promo|promos|promotion|promotions|reduction|réduction|reductions|réductions|solde|soldes)\b/.test(
      normalized,
    ) ||
    /(عرض|عروض|خصم|خصومات|تنزيلات|حسم)/.test(
      rawMessage,
    );


  const recommendationSignal =
    /\b(recommend|recommendation|suggest|suggestion|what should i buy|what should i get|what do you recommend|help me choose|help me pick|best option for|best choice for|looking for something|i need something|likes|loves|is into|interested in)\b/.test(
      normalized,
    ) ||
    /\b(recommande|recommandez|conseille|conseiller|suggestion|que dois-je acheter|aidez-moi a choisir|aidez-moi à choisir|meilleur choix)\b/.test(
      normalized,
    ) ||
    /(شو بتنصح|ماذا تنصح|اقترح|اقتراح|ساعدني اختار|ساعدني أختار|شو اشتري)/.test(
      rawMessage,
    );


  if (comparisonSignal) {
    intent = "comparison";
  } else if (giftSignal) {
    intent = "gift";
  } else if (offerSignal) {
    intent = "offers";
  } else if (
    recommendationSignal &&
    intent !== "order_tracking" &&
    intent !== "store_info"
  ) {
    intent = "recommendation";
  }


  /*
   * ----------------------------------------------------------
   * USE-CASE VOCABULARY
   * ----------------------------------------------------------
   *
   * These canonical values already exist in the product ranker.
   */

  const addUseCase = (
    value: (typeof request.useCases)[number],
  ) => {
    useCases.add(value);
  };


  if (
    /\b(gaming|gamer|video games?|play games?|fortnite|call of duty|cod|playstation|ps5|xbox|nintendo|console gaming|pc gaming|jeu video|jeux video|jeux videos|jeu vidéo|jeux vidéo|console de jeu)\b/.test(
      normalized,
    ) ||
    /(العاب|ألعاب|بلايستيشن|اكس بوكس|نينتندو)/.test(
      rawMessage,
    )
  ) {
    addUseCase("gaming");
  }


  if (
    /\b(music|audio|listen to music|listening to music|songs?|headphones?|earbuds?|earphones?|speaker|sound)\b/.test(
      normalized,
    ) ||
    /\b(musique|audio|ecouter de la musique|écouter de la musique|casque|ecouteurs|écouteurs|enceinte)\b/.test(
      normalized,
    ) ||
    /(موسيقى|اغاني|أغاني|سماعات|صوت)/.test(
      rawMessage,
    )
  ) {
    addUseCase("music");
  }


  if (
    /\b(gym|fitness|workout|working out|exercise|running|runner|sport|sports|training|health tracking|activity tracking)\b/.test(
      normalized,
    ) ||
    /\b(gym|fitness|sport|course|entrainement|entraînement)\b/.test(
      normalized,
    ) ||
    /(رياضة|جيم|تمارين|ركض|لياقة)/.test(
      rawMessage,
    )
  ) {
    addUseCase("fitness");
  }


  if (
    /\b(photo|photos|photography|camera|video|videos|filming|content creator|content creation|vlog|vlogging|creator)\b/.test(
      normalized,
    ) ||
    /\b(photo|photos|photographie|camera|caméra|video|vidéo|createur de contenu|créateur de contenu)\b/.test(
      normalized,
    ) ||
    /(تصوير|كاميرا|فيديو|صناعة محتوى|صانع محتوى)/.test(
      rawMessage,
    )
  ) {
    addUseCase("photography");
  }


  if (
    /\b(school|study|studying|student|university|college|homework|class|classes|notes|note taking|education)\b/.test(
      normalized,
    ) ||
    /\b(ecole|école|etudes|études|etudier|étudier|universite|université|etudiant|étudiant|cours)\b/.test(
      normalized,
    ) ||
    /(مدرسة|جامعة|دراسة|طالب|طالبة|تعليم)/.test(
      rawMessage,
    )
  ) {
    addUseCase("school");
  }


  if (
    /\b(work|working|office|business|professional|productivity|meetings?|remote work|work from home|wfh)\b/.test(
      normalized,
    ) ||
    /\b(travail|bureau|business|professionnel|professionnelle|productivite|productivité|reunions|réunions)\b/.test(
      normalized,
    ) ||
    /(عمل|شغل|مكتب|اجتماعات|بيزنس)/.test(
      rawMessage,
    )
  ) {
    addUseCase("work");
  }


  if (
    /\b(travel|travelling|traveling|trip|trips|flight|flights|vacation|holiday|portable|on the go|commute|commuting)\b/.test(
      normalized,
    ) ||
    /\b(voyage|voyager|vacances|avion|portable|deplacement|déplacement)\b/.test(
      normalized,
    ) ||
    /(سفر|رحلة|طائرة|محمول)/.test(
      rawMessage,
    )
  ) {
    addUseCase("travel");
  }


  /*
   * V3.1 semantic conflict cleanup:
   *
   * "video games" / "jeux vidéo" contains the word "video",
   * but that does NOT mean photography/content creation.
   */
  if (
    /\b(video games?|jeu video|jeux video|jeux videos|jeu vidéo|jeux vidéo|gaming|gamer)\b/.test(
      normalized,
    )
  ) {
    useCases.delete("photography");
    addUseCase("gaming");
  }


  /*
   * ----------------------------------------------------------
   * SHOPPING PREFERENCES
   * ----------------------------------------------------------
   */

  const wantsCheapest =
    request.wantsCheapest ||
    /\b(cheap|cheaper|cheapest|affordable|budget friendly|budget-friendly|low cost|lowest price|not expensive|inexpensive)\b/.test(
      normalized,
    ) ||
    /\b(pas cher|moins cher|le moins cher|abordable|economique|économique)\b/.test(
      normalized,
    ) ||
    /(رخيص|ارخص|أرخص|اقتصادي)/.test(
      rawMessage,
    );


  const wantsPremium =
    request.wantsPremium ||
    /\b(premium|high end|high-end|flagship|top of the line|top-of-the-line|best possible|money is no object)\b/.test(
      normalized,
    ) ||
    /\b(premium|haut de gamme|meilleur possible)\b/.test(
      normalized,
    ) ||
    /(فاخر|فئة عالية|الأفضل مهما كان السعر)/.test(
      rawMessage,
    );


  const wantsBestValue =
    request.wantsBestValue ||
    /\b(best value|value for money|worth it|good value|bang for the buck|bang for buck|good deal)\b/.test(
      normalized,
    ) ||
    /\b(meilleur rapport qualite prix|meilleur rapport qualité prix|bon rapport qualite prix|bon rapport qualité prix)\b/.test(
      normalized,
    ) ||
    /(أفضل قيمة|احسن قيمة|أحسن قيمة|قيمة مقابل السعر)/.test(
      rawMessage,
    );


  const wantsAvailableOnly =
    request.wantsAvailableOnly ||
    /\b(in stock|available now|available today|ready now|ready to buy|can buy now|immediately available)\b/.test(
      normalized,
    ) ||
    /\b(en stock|disponible maintenant|disponible aujourd hui|disponible aujourd'hui)\b/.test(
      normalized,
    ) ||
    /(متوفر الآن|متوفر حاليا|جاهز للشراء)/.test(
      rawMessage,
    );


  /*
   * ----------------------------------------------------------
   * NATURAL BUDGET EXPRESSIONS
   * ----------------------------------------------------------
   */

  let budgetMax =
    request.budgetMax;

  let budgetMin =
    request.budgetMin;


  if (budgetMax === null) {
    const maxBudgetMatch =
      normalized.match(
        /\b(?:under|below|less than|up to|maximum|max|budget(?: of)?|spend up to|not more than)\s*(?:usd|\$)?\s*(\d{2,5}(?:\.\d{1,2})?)\b/,
      ) ??
      normalized.match(
        /\b(?:moins de|jusqu a|jusqu'à|budget de|maximum)\s*(?:usd|\$)?\s*(\d{2,5}(?:\.\d{1,2})?)\b/,
      );

    if (maxBudgetMatch) {
      budgetMax =
        Number(maxBudgetMatch[1]);
    }
  }


  if (budgetMin === null) {
    const minBudgetMatch =
      normalized.match(
        /\b(?:at least|minimum|min|starting from|more than|over)\s*(?:usd|\$)?\s*(\d{2,5}(?:\.\d{1,2})?)\b/,
      ) ??
      normalized.match(
        /\b(?:au moins|minimum|plus de)\s*(?:usd|\$)?\s*(\d{2,5}(?:\.\d{1,2})?)\b/,
      );

    if (minBudgetMatch) {
      budgetMin =
        Number(minBudgetMatch[1]);
    }
  }


  /*
   * ----------------------------------------------------------
   * GENERIC GIFT QUERY CLEANUP
   * ----------------------------------------------------------
   *
   * Some lightweight parsers may treat:
   *
   *   "I need a gift for my daughter"
   *
   * as though "gift for my daughter" were a product name.
   *
   * Keep a product query only if there is evidence of a real
   * product/category/brand/model.
   */

  if (
    intent === "gift" &&
    productQuery
  ) {
    const normalizedProductQuery =
      normalizeAssistantLanguageV2(productQuery);

    const looksLikeSpecificProduct =
      Boolean(request.brand) ||
      /\d/.test(normalizedProductQuery) ||
      /\b(iphone|ipad|phone|smartphone|tablet|watch|smartwatch|whoop|fitbit|airpods?|earbuds?|earphones?|headphones?|speaker|macbook|laptop|computer|desktop|pc|playstation|ps5|xbox|nintendo|switch|controller|keyboard|mouse|camera|gopro|instax|charger|charging|power bank|powerbank|cable|adapter|hub|case|cover|router|wifi|wi fi|monitor|microphone|mic|webcam)\b/.test(
        normalizedProductQuery,
      );

    if (!looksLikeSpecificProduct) {
      productQuery = null;
    }
  }



  /*
   * ----------------------------------------------------------
   * V3: CONVERSATIONAL ADVICE IS NOT A PRODUCT NAME
   * ----------------------------------------------------------
   *
   * The base parser intentionally builds a free-form productQuery
   * from leftover words. That is useful for:
   *
   *   "JBL Live 670NC"
   *
   * but harmful for:
   *
   *   "gift for my son who loves gaming under $300"
   *
   * A budget number alone is NOT evidence of a model number.
   */
  const adviceIntent =
    intent === "gift" ||
    intent === "recommendation";

  /*
   * ASSISTANT_GIFT_LANGUAGE_FIX_V31
   *
   * Category detection must NOT preserve a fake free-form product
   * query in an advice request.
   *
   * Example:
   *
   *   "gift for my son, he loves gaming under $300"
   *
   * may correctly detect category/use-case "gaming", but the leftover
   * words are still not a product model.
   */
  if (adviceIntent) {
    const explicitProductCue =
      /\b(iphone|ipad|airpods?|apple watch|galaxy watch|pixel watch|whoop|fitbit|macbook|playstation|ps5|xbox|nintendo switch|switch oled|gopro|instax|jbl|beats|headset|headsets|headphones?|earbuds?|earphones?|speaker|smartwatch|fitness tracker|tablet|laptop|desktop|monitor|controller|gamepad|keyboard|mouse|camera|charger|power bank|powerbank|router|webcam|microphone|mic)\b/.test(
        normalized,
      );

    if (!explicitProductCue) {
      productQuery = null;
    }
  }

  const needsClarification =
    intent === "unknown" ||
    (
      (intent === "gift" ||
        intent === "recommendation") &&
      !request.category &&
      !request.brand &&
      !productQuery &&
      useCases.size === 0
    );


  return {
    ...request,
    intent,
    productQuery,
    needsClarification,
    useCases: Array.from(useCases),
    budgetMin,
    budgetMax,
    wantsCheapest,
    wantsPremium,
    wantsBestValue,
    wantsAvailableOnly,
  };
}


function giftRecipientV2(
  rawMessage: string,
  language: ReturnType<typeof parseAssistantRequest>["language"],
) {
  const normalized =
    normalizeAssistantLanguageV2(rawMessage);

  const englishRecipients: Array<[RegExp, string]> = [
    [/\bdaughter\b/, "your daughter"],
    [/\bson\b/, "your son"],
    [/\bhusband\b/, "your husband"],
    [/\bwife\b/, "your wife"],
    [/\bboyfriend\b/, "your boyfriend"],
    [/\bgirlfriend\b/, "your girlfriend"],
    [/\bmother\b|\bmom\b|\bmum\b/, "your mother"],
    [/\bfather\b|\bdad\b/, "your father"],
    [/\bsister\b/, "your sister"],
    [/\bbrother\b/, "your brother"],
    [/\bfriend\b/, "your friend"],
    [/\bchild\b|\bkid\b/, "your child"],
  ];

  if (language === "en") {
    for (const [pattern, label] of englishRecipients) {
      if (pattern.test(normalized)) {
        return label;
      }
    }

    return "the person you’re shopping for";
  }


  if (language === "fr") {
    if (/\bfille\b/.test(normalized)) return "votre fille";
    if (/\bfils\b/.test(normalized)) return "votre fils";
    if (/\bmari\b/.test(normalized)) return "votre mari";
    if (/\bfemme\b/.test(normalized)) return "votre femme";
    if (/\bmere\b|\bmaman\b/.test(normalized)) return "votre mère";
    if (/\bpere\b|\bpapa\b/.test(normalized)) return "votre père";

    return "la personne à qui vous souhaitez offrir le cadeau";
  }


  if (/(ابنتي|بنتي)/.test(rawMessage)) return "ابنتك";
  if (/(ابني|إبني)/.test(rawMessage)) return "ابنك";
  if (/(زوجي)/.test(rawMessage)) return "زوجك";
  if (/(زوجتي)/.test(rawMessage)) return "زوجتك";
  if (/(امي|أمي)/.test(rawMessage)) return "والدتك";
  if (/(ابي|أبي)/.test(rawMessage)) return "والدك";

  return "الشخص الذي تريد شراء الهدية له";
}


function giftAdvisorClarificationV2(
  request: ReturnType<typeof parseAssistantRequest>,
  rawMessage: string,
) {
  if (request.intent !== "gift") {
    return null;
  }

  /*
   * Once the customer gives us a product direction or a meaningful
   * use case, let the live ranking engine do its job.
   */
  const enoughDirection =
    Boolean(
      request.productQuery ||
      request.category ||
      request.brand,
    ) ||
    request.useCases.length > 0;

  if (enoughDirection) {
    return null;
  }

  const recipient =
    giftRecipientV2(
      rawMessage,
      request.language,
    );

  const hasBudget =
    request.budgetMin !== null ||
    request.budgetMax !== null;


  if (request.language === "fr") {
    return hasBudget
      ? `Bien sûr. Je peux vous aider à choisir un cadeau pour ${recipient}. J’ai déjà votre budget ; dites-moi simplement son âge approximatif si c’est pertinent et ce qu’elle ou il aime — gaming, musique, sport, photo, études, travail, voyage, etc. Je vérifierai ensuite les produits réellement disponibles dans le catalogue.`
      : `Bien sûr. Je peux vous aider à choisir un cadeau pour ${recipient}. Donnez-moi simplement son âge approximatif si c’est pertinent, ce qu’elle ou il aime — gaming, musique, sport, photo, études, travail, voyage, etc. — et votre budget. Je vérifierai ensuite les produits réellement disponibles dans le catalogue.`;
  }


  if (request.language === "ar") {
    return hasBudget
      ? `أكيد. أقدر أساعدك تختار هدية مناسبة لـ${recipient}. عرفت ميزانيتك؛ قل لي فقط العمر التقريبي إذا كان مهماً وما هي الاهتمامات مثل الألعاب، الموسيقى، الرياضة، التصوير، الدراسة، العمل أو السفر، وبعدها سأختار من المنتجات المتوفرة فعلياً في المتجر.`
      : `أكيد. أقدر أساعدك تختار هدية مناسبة لـ${recipient}. قل لي العمر التقريبي إذا كان مهماً، الاهتمامات مثل الألعاب أو الموسيقى أو الرياضة أو التصوير أو الدراسة أو السفر، وميزانيتك، وبعدها سأختار من المنتجات المتوفرة فعلياً في المتجر.`;
  }


  return hasBudget
    ? `Absolutely. I can help you choose a good gift for ${recipient}. I already have your budget; tell me their approximate age if relevant and what they’re into — gaming, music, fitness, photography, school, work, travel, or something else. I’ll then narrow it down using products that are actually in the live Stereophonie catalog.`
    : `Absolutely. I can help you choose a good gift for ${recipient}. Tell me their approximate age if relevant, what they’re into — gaming, music, fitness, photography, school, work, travel, or something else — and your budget. I’ll then narrow it down using products that are actually in the live Stereophonie catalog.`;
}


function detectAvailabilityCatalogFilterV2(
  rawMessage: string,
): AssistantAvailabilityCatalogFilter | null {
  const normalized =
    normalizeAssistantLanguageV2(rawMessage);


  if (
    /\b(ask for price|price on request|price upon request|request a price|request price|need a quote|quote required|contact for price|call for price)\b/.test(
      normalized,
    ) ||
    /\b(prix sur demande|demander le prix|demande de prix|devis)\b/.test(
      normalized,
    ) ||
    /(سعر عند الطلب|اطلب السعر|طلب سعر|عرض سعر)/.test(
      rawMessage,
    )
  ) {
    return "ask_for_price";
  }


  if (
    /\b(coming soon|arriving soon|upcoming|upcoming products?|not released yet|launching soon|releasing soon)\b/.test(
      normalized,
    ) ||
    /\b(bientot|bientôt|arrive bientot|arrive bientôt|prochainement|a venir|à venir)\b/.test(
      normalized,
    ) ||
    /(قريبا|قريباً|قادم قريبا|قادم قريباً)/.test(
      rawMessage,
    )
  ) {
    return "coming_soon";
  }


  if (
    /\b(low stock|limited stock|limited availability|few left|only a few left|almost sold out|running low|nearly sold out)\b/.test(
      normalized,
    ) ||
    /\b(stock limite|stock limité|presque epuise|presque épuisé|quelques pieces|quelques pièces)\b/.test(
      normalized,
    ) ||
    /(مخزون قليل|كمية محدودة|بقي القليل)/.test(
      rawMessage,
    )
  ) {
    return "low_stock";
  }


  if (
    /\b(out of stock|sold out|no stock|not in stock|currently unavailable|not available anymore|unavailable products?)\b/.test(
      normalized,
    ) ||
    /\b(rupture de stock|epuise|épuisé|indisponible|plus disponible)\b/.test(
      normalized,
    ) ||
    /(نفد المخزون|غير متوفر|خلص المخزون)/.test(
      rawMessage,
    )
  ) {
    return "out_of_stock";
  }


  if (
    /\b(in stock|available now|available today|ready to buy|ready stock|immediately available|can buy now|currently available)\b/.test(
      normalized,
    ) ||
    /\b(en stock|disponible maintenant|disponible aujourd hui|disponible aujourd'hui)\b/.test(
      normalized,
    ) ||
    /(متوفر الآن|متوفر حاليا|متوفر حالياً|جاهز للشراء)/.test(
      rawMessage,
    )
  ) {
    return "in_stock";
  }


  return null;
}


/* ============================================================
 * ASSISTANT_ROUTING_RESOLUTION_V3
 * ============================================================
 *
 * Fixes behavioral routing rather than adding isolated keywords:
 *
 * - conversational shopping requests are not fake product names
 * - the longest / most-specific model mention wins
 * - comparison sides resolve independently
 * - natural support wording never leaks into catalog search
 * - recommendations explain why the products were selected
 */

function normalizeCatalogIdentityV3(
  value: string | null | undefined,
) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function catalogProductAliasesV3(
  product: AssistantProduct,
) {
  const full =
    normalizeCatalogIdentityV3(product.name);

  if (!full) {
    return [];
  }

  const aliases = new Set<string>([full]);

  /*
   * Official catalog titles frequently begin with a brand:
   *
   *   Apple iPhone 18 Pro Max
   *   Samsung Galaxy ...
   *
   * Customers naturally omit that first brand token.
   */
  const words = full.split(" ");

  if (words.length >= 3) {
    aliases.add(
      words.slice(1).join(" "),
    );
  }

  return Array.from(aliases)
    .filter(Boolean)
    .sort(
      (first, second) =>
        second.length - first.length,
    );
}


function resolveMostSpecificCatalogProductV3(
  catalog: AssistantProduct[],
  rawReference: string,
) {
  const normalizedReference =
    normalizeCatalogIdentityV3(rawReference);

  if (!normalizedReference) {
    return null;
  }

  const matches: Array<{
    product: AssistantProduct;
    alias: string;
  }> = [];

  for (const product of catalog) {
    for (
      const alias
      of catalogProductAliasesV3(product)
    ) {
      if (
        alias.length >= 3 &&
        normalizedReference.includes(alias)
      ) {
        matches.push({
          product,
          alias,
        });

        break;
      }
    }
  }

  matches.sort((first, second) => {
    /*
     * Critical:
     *
     *   "iPhone 18 Pro Max"
     *
     * also contains:
     *
     *   "iPhone 18 Pro"
     *
     * The longer exact identity must always win.
     */
    if (
      second.alias.length !==
      first.alias.length
    ) {
      return (
        second.alias.length -
        first.alias.length
      );
    }

    return (
      second.product.name.length -
      first.product.name.length
    );
  });

  return matches[0]?.product ?? null;
}


function findComparisonProductsV3(
  catalog: AssistantProduct[],
  rawMessage: string,
) {
  /*
   * Resolve each side independently.
   *
   * Example:
   *
   *   Which is better,
   *   iPhone 18 Pro
   *   or
   *   iPhone 18 Pro Max?
   *
   * This prevents an iPhone 18 Pro Max case from being
   * interpreted as the second requested product.
   */
  const segments = rawMessage
    .split(
      /\s+(?:vs\.?|versus|or|against|with|to|and)\s+/i,
    )
    .map((value) => value.trim())
    .filter(Boolean);

  const products: AssistantProduct[] = [];
  const seen = new Set<string>();

  for (const segment of segments) {
    const product =
      resolveMostSpecificCatalogProductV3(
        catalog,
        segment,
      );

    if (
      product &&
      !seen.has(product.id)
    ) {
      seen.add(product.id);
      products.push(product);
    }
  }

  return products;
}


function directStoreSupportResponseV3(
  message: string,
  language: Language,
): string | null {
  const normalized =
    normalizeAssistantLanguageV2(message);


  /*
   * RETURNS
   *
   * Covers natural wording such as:
   * "send a product back"
   * "can I bring this back?"
   */
  const returnQuestion =
    /\b(return|refund|exchange)\b/.test(
      normalized,
    ) ||
    /\b(send|bring|give|take)\s+(?:a|an|the|this|that|my)?\s*(?:product|item|order|purchase)?\s*back\b/.test(
      normalized,
    ) ||
    /\bwant to send .* back\b/.test(
      normalized,
    ) ||
    /\b(retourner|renvoyer|rembourser|echanger|échanger)\b/.test(
      normalized,
    ) ||
    /(ارجع|أرجع|إرجاع|ارجاع|استرجاع|تبديل)/.test(
      message,
    );

  if (returnQuestion) {
    if (language === "fr") {
      return "La politique actuelle de Stereophonie est une politique sans retour. Si vous avez un problème précis avec un produit ou une commande, expliquez-moi le cas et je vous guiderai vers l’étape la plus appropriée.";
    }

    if (language === "ar") {
      return "سياسة Stereophonie الحالية هي عدم قبول الإرجاع. إذا كانت لديك مشكلة محددة بمنتج أو بطلب، اشرح لي الحالة وسأساعدك بالخطوة الأنسب.";
    }

    return "Stereophonie currently has a No Returns policy. If you have a specific problem with a product or an order, tell me what happened and I’ll guide you to the most appropriate next step.";
  }


  /*
   * CHECKOUT / ORDERING
   */
  const checkoutQuestion =
    /\bhow\s+(?:does|do)\s+(?:ordering|ordering from|an order|orders?)\b.*\bwork\b/.test(
      normalized,
    ) ||
    /\bhow\s+(?:can|do)\s+i\s+(?:order|buy|purchase)\b/.test(
      normalized,
    ) ||
    /\bhow to (?:order|buy|purchase)\b/.test(
      normalized,
    ) ||
    /\border from (?:the )?(?:website|site|shop|store)\b/.test(
      normalized,
    ) ||
    /\bcheckout (?:process|steps|work|works)\b/.test(
      normalized,
    ) ||
    /\b(comment commander|comment acheter|passer une commande)\b/.test(
      normalized,
    ) ||
    /(كيف اطلب|كيف أطلب|كيف اشتري|كيف أشتري|طريقة الطلب)/.test(
      message,
    );

  if (checkoutQuestion) {
    if (language === "fr") {
      return "Pour commander, ajoutez les produits souhaités au panier puis passez au checkout. Renseignez vos coordonnées et votre adresse de livraison, vérifiez la commande puis confirmez-la. Aucun paiement n’est encaissé pendant cette étape ; Stereophonie vous contacte ensuite pour confirmer la livraison et le paiement.";
    }

    if (language === "ar") {
      return "لإتمام الطلب، أضف المنتجات إلى السلة ثم انتقل إلى صفحة إتمام الطلب. أدخل معلومات التواصل وعنوان التوصيل، راجع الطلب ثم أكده. لا يتم تحصيل الدفع في هذه المرحلة؛ يتواصل معك Stereophonie بعد ذلك لتأكيد التوصيل وطريقة الدفع.";
    }

    return "To place an order, add the products you want to your cart and continue to checkout. Enter your contact information and delivery address, review the order, then place it. No payment is collected during that step; Stereophonie contacts you afterward to confirm delivery and payment.";
  }


  /*
   * STORE LOCATION / HOURS
   */
  const storeInfoQuestion =
    /\bwhen\s+(?:is|are)\s+(?:your|the)?\s*(?:shop|store)\s+open\b/.test(
      normalized,
    ) ||
    /\bwhat are your (?:opening )?hours\b/.test(
      normalized,
    ) ||
    /\bwhen do you (?:open|close)\b/.test(
      normalized,
    ) ||
    /\bare you open\b/.test(
      normalized,
    ) ||
    /\bwhere (?:are you|is your shop|is your store|is stereophonie)\b/.test(
      normalized,
    ) ||
    /\b(store|shop) (?:location|address|hours)\b/.test(
      normalized,
    ) ||
    /\b(horaires|heure d ouverture|heures d ouverture|ou est le magasin|où est le magasin)\b/.test(
      normalized,
    ) ||
    /(وين المحل|أين المحل|اين المحل|ساعات العمل|متى تفتحون|متى تسكرون)/.test(
      message,
    );

  if (storeInfoQuestion) {
    if (language === "fr") {
      return "Stereophonie se trouve à Mtaileb, au Liban. Le magasin est ouvert du lundi au samedi de 10h00 à 20h00 et fermé le dimanche.";
    }

    if (language === "ar") {
      return "متجر Stereophonie موجود في المطيلب، لبنان. يفتح من الاثنين إلى السبت من الساعة 10 صباحاً حتى 8 مساءً، ويغلق يوم الأحد.";
    }

    return "Stereophonie is located in Mtaileb, Lebanon. The store is open Monday through Saturday from 10:00 AM to 8:00 PM and closed on Sunday.";
  }


  return null;
}


function professionalRecommendationResponseV3(
  request: ReturnType<typeof parseAssistantRequest>,
  products: AssistantProduct[],
  rawMessage: string,
  language: Language,
) {
  if (products.length === 0) {
    return null;
  }

  const primary = products[0];

  const alternatives =
    products
      .slice(1, 4)
      .map((product) => product.name);

  const guidedUseCases = new Set([
    "gaming",
    "music",
    "fitness",
    "photography",
    "school",
    "work",
    "travel",
  ]);

  const useCase =
    request.useCases.find(
      (value) =>
        guidedUseCases.has(value),
    ) ?? null;

  const recipient =
    giftRecipientV2(
      rawMessage,
      language,
    );

  const budget =
    request.budgetMax !== null
      ? `$${request.budgetMax}`
      : request.budgetMin !== null
        ? `$${request.budgetMin}+`
        : null;

  const contextParts: string[] = [];

  if (useCase) {
    contextParts.push(
      useCaseLabelV32(
        useCase,
        language,
      ),
    );
  }

  if (budget) {
    contextParts.push(
      language === "fr"
        ? `un budget de ${budget}`
        : language === "ar"
          ? `ميزانية ${budget}`
          : `a budget of ${budget}`,
    );
  }


  /*
   * ASSISTANT_NATURAL_RESPONSE_POLISH_V311
   * Natural recommendation wording in French and English.
   * Product selection, price, and stock remain unchanged.
   */
  /*
   * ASSISTANT_GIFT_RESPONSE_POLISH_V312
   *
   * Natural localized gift wording only.
   * Selection, ranking, prices, and stock are unchanged.
   */
  if (language === "fr") {
    const alternativesText =
      alternatives.length > 0
        ? ` D’autres options intéressantes sont ${alternatives.join(", ")}.`
        : "";

    const context =
      contextParts.length > 0
        ? ` en tenant compte de ${contextParts.join(" et ")}`
        : "";

    return request.intent === "gift"
      ? `Pour ${recipient}, je vous recommande ${primary.name}.${alternativesText}${context ? ` J’ai tenu compte de vos critères${budget ? `, notamment de votre budget de ${budget}` : ""}.` : ""}`
      : `Je vous recommande ${primary.name}.${alternativesText} Cette sélection tient compte de vos besoins${request.budgetMax !== null ? ` et de votre budget de $${request.budgetMax}` : ""}, ainsi que des informations de disponibilité du catalogue.`;
  }


  if (language === "ar") {
    const alternativesText =
      alternatives.length > 0
        ? ` ومن الخيارات الجيدة أيضاً: ${alternatives.join("، ")}.`
        : "";

    return request.intent === "gift"
      ? `بالنسبة إلى ${recipient}، اختياري الأول من المنتجات المتوفرة فعلياً هو ${primary.name}.${alternativesText} رتبت الخيارات حسب مدى ملاءمتها للاستخدام المطلوب، توفرها حالياً، والميزانية عندما تكون محددة.`
      : `بناءً على احتياجك، اختياري الأول هو ${primary.name}.${alternativesText} رتبت الخيارات حسب الملاءمة والتوفر الحالي والميزانية عندما تكون محددة.`;
  }


  const context =
    contextParts.length > 0
      ? ` based on ${contextParts.join(" and ")}`
      : "";

  const alternativesText =
    alternatives.length > 0
      ? ` Strong alternatives are ${alternatives.join(", ")}.`
      : "";

  return request.intent === "gift"
    ? `For ${recipient}, I’d recommend ${primary.name}.${alternativesText}${context ? ` I kept your preferences${budget ? ` and your ${budget} budget` : ""} in mind.` : ""}`
    : `My first recommendation is ${primary.name}.${alternativesText} I considered your requirements${request.budgetMax !== null ? ` and your $${request.budgetMax} budget` : ""}, along with current catalog availability.`;
}


/* ============================================================
 * ASSISTANT_STRUCTURAL_INTELLIGENCE_V32
 * ============================================================
 *
 * Structural fixes:
 *
 * - vague gifts clarify before catalog ranking
 * - natural support language bypasses product ranking
 * - category recommendations remain inside the category
 * - short model follow-ups inherit the previous product family
 * - category advice is not treated as a literal product name
 * - recommendation wording is localized
 */


function guidedUseCaseV32(
  request: ReturnType<typeof parseAssistantRequest>,
) {
  const guided = new Set([
    "gaming",
    "music",
    "fitness",
    "photography",
    "school",
    "work",
    "travel",
  ]);

  return (
    request.useCases.find(
      (value) =>
        guided.has(value),
    ) ?? null
  );
}


function useCaseLabelV32(
  useCase: string,
  language: Language,
) {
  if (language === "fr") {
    const labels: Record<string, string> = {
      gaming: "jeu vidéo",
      music: "musique",
      fitness: "fitness",
      photography: "photographie",
      school: "études",
      work: "travail",
      travel: "voyage",
    };

    return labels[useCase] ?? useCase;
  }

  if (language === "ar") {
    const labels: Record<string, string> = {
      gaming: "الألعاب",
      music: "الموسيقى",
      fitness: "الرياضة واللياقة",
      photography: "التصوير",
      school: "الدراسة",
      work: "العمل",
      travel: "السفر",
    };

    return labels[useCase] ?? useCase;
  }

  return useCase;
}


function refineAssistantRequestV32(
  request: ReturnType<typeof parseAssistantRequest>,
  rawMessage: string,
): ReturnType<typeof parseAssistantRequest> {
  const normalized =
    normalizeAssistantLanguageV2(
      rawMessage,
    );

  /*
   * "What is the best phone under $500?"
   *
   * is recommendation intent over a category,
   * NOT an exact product called:
   *
   * "best phone under $500".
   */
  const categoryAdviceSignal =
    Boolean(request.category) &&
    (
      /\b(best|better|cheapest|affordable|premium|recommend|recommended|recommendation|suggest|suggestion|good|worth buying|should i buy|should i get)\b/.test(
        normalized,
      ) ||
      /\b(meilleur|meilleure|moins cher|abordable|premium|recommande|recommandez|conseille|conseiller)\b/.test(
        normalized,
      ) ||
      /(الأفضل|افضل|أفضل|ارخص|أرخص|تنصح|اقتراح)/.test(
        rawMessage,
      )
    );

  if (!categoryAdviceSignal) {
    return request;
  }

  return {
    ...request,
    intent: "recommendation",
    productQuery: null,
    needsClarification: false,
    confidence:
      Math.max(
        request.confidence,
        0.88,
      ),
  };
}


function giftClarificationResponseV32(
  request: ReturnType<typeof parseAssistantRequest>,
  rawMessage: string,
): string | null {
  if (request.intent !== "gift") {
    return null;
  }

  const normalized =
    normalizeAssistantLanguageV2(
      rawMessage,
    );

  const useCase =
    guidedUseCaseV32(request);

  /*
   * Named products, brands or useful product categories
   * provide enough direction.
   *
   * Recipient + budget alone does NOT.
   */
  const explicitDirection =
    Boolean(
      request.category ||
      request.brand,
    ) ||
    /\b(iphone|ipad|airpods?|apple watch|galaxy watch|pixel watch|whoop|fitbit|macbook|playstation|ps5|xbox|nintendo|switch|gopro|instax|jbl|beats|razer|headphones?|headsets?|earbuds?|speaker|smartwatch|tablet|laptop|desktop|monitor|controller|keyboard|mouse|camera)\b/.test(
      normalized,
    );

  if (
    useCase ||
    explicitDirection
  ) {
    return null;
  }

  const recipient =
    giftRecipientV2(
      rawMessage,
      request.language,
    );

  /*
   * ASSISTANT_GIFT_PRONOUN_V312
   *
   * Use an appropriate possessive for known recipients.
   * Preserve neutral language for unspecified recipients.
   */
  const recipientPossessiveV312 =
    /\b(?:daughter|sister|mother|mom|wife|girlfriend)\b/.test(
      normalized,
    )
      ? "her"
      : /\b(?:son|brother|father|dad|husband|boyfriend)\b/.test(
            normalized,
          )
        ? "his"
        : "their";

  const hasBudget =
    request.budgetMin !== null ||
    request.budgetMax !== null;

  if (request.language === "fr") {
    return hasBudget
      ? `Bien sûr. J’ai votre budget. Pour choisir un cadeau qui plaira à ${recipient}, dites-moi simplement ses centres d’intérêt — par exemple la musique, le gaming, le sport, la photo, les études, le travail ou le voyage.`
      : `Bien sûr. Pour choisir un cadeau qui plaira à ${recipient}, dites-moi ses centres d’intérêt — par exemple la musique, le gaming, le sport, la photo, les études, le travail ou le voyage — et votre budget.`;
  }

  if (request.language === "ar") {
    return hasBudget
      ? `أكيد. عرفت ميزانيتك. حتى أختار هدية مناسبة فعلاً لـ${recipient}، قل لي ما هي الاهتمامات مثل الألعاب، الموسيقى، الرياضة، التصوير، الدراسة، العمل أو السفر.`
      : `أكيد. حتى أختار هدية مناسبة فعلاً لـ${recipient}، قل لي الاهتمامات مثل الألعاب أو الموسيقى أو الرياضة أو التصوير أو الدراسة أو السفر، وميزانيتك.`;
  }

  return hasBudget
    ? `Absolutely. I have your budget. To choose a gift that actually fits ${recipient}, tell me about ${recipientPossessiveV312} interests — for example gaming, music, fitness, photography, school, work, or travel.`
    : `Absolutely. To choose a gift that actually fits ${recipient}, tell me about ${recipientPossessiveV312} interests — for example gaming, music, fitness, photography, school, work, or travel — and your budget.`;
}



/* ============================================================
 * ASSISTANT_STORE_HOURS_INTELLIGENCE_V33
 * ============================================================
 *
 * Regular store schedule:
 *
 * Monday - Saturday: 10:00 AM - 8:00 PM
 * Sunday: Closed
 *
 * This layer understands:
 *
 * - what days are you open?
 * - what days of the week do you work?
 * - are you open Sunday?
 * - are you open Saturdays?
 * - are you open on weekends?
 * - what time do you open?
 * - what time do you close?
 * - are you open today?
 * - are you open tomorrow?
 * - are you open right now?
 * - business hours / working days / opening days
 * - equivalent French and Arabic phrasings
 */


const STORE_WEEKDAYS_V33 = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;


function storeWeekdayIndexV33(
  message: string,
) {
  const normalized =
    normalizeAssistantLanguageV2(
      message,
    );

  const aliases: Array<{
    index: number;
    patterns: RegExp[];
  }> = [
    {
      index: 0,
      patterns: [
        /\bmonday\b/,
        /\blundi\b/,
        /(الاثنين|الإثنين)/,
      ],
    },
    {
      index: 1,
      patterns: [
        /\btuesday\b/,
        /\bmardi\b/,
        /(الثلاثاء)/,
      ],
    },
    {
      index: 2,
      patterns: [
        /\bwednesday\b/,
        /\bmercredi\b/,
        /(الاربعاء|الأربعاء)/,
      ],
    },
    {
      index: 3,
      patterns: [
        /\bthursday\b/,
        /\bjeudi\b/,
        /(الخميس)/,
      ],
    },
    {
      index: 4,
      patterns: [
        /\bfriday\b/,
        /\bvendredi\b/,
        /(الجمعة)/,
      ],
    },
    {
      index: 5,
      patterns: [
        /\bsaturday\b/,
        /\bsamedi\b/,
        /(السبت)/,
      ],
    },
    {
      index: 6,
      patterns: [
        /\bsunday\b/,
        /\bdimanche\b/,
        /(الاحد|الأحد)/,
      ],
    },
  ];

  for (const entry of aliases) {
    if (
      entry.patterns.some(
        (pattern) =>
          pattern.test(
            pattern.source.includes(
              "\\b",
            )
              ? normalized
              : message,
          ),
      )
    ) {
      return entry.index;
    }
  }

  return null;
}


function storeDayLabelV33(
  index: number,
  language: Language,
) {
  const english = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const french = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
  ];

  const arabic = [
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
    "الأحد",
  ];

  if (language === "fr") {
    return french[index] ?? "";
  }

  if (language === "ar") {
    return arabic[index] ?? "";
  }

  return english[index] ?? "";
}


function beirutStoreClockV33() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Beirut",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
    ).formatToParts(
      new Date(),
    );

  const weekday =
    parts.find(
      (part) =>
        part.type === "weekday",
    )?.value.toLowerCase() ?? "";

  const hour =
    Number(
      parts.find(
        (part) =>
          part.type === "hour",
      )?.value ?? "0",
    );

  const minute =
    Number(
      parts.find(
        (part) =>
          part.type === "minute",
      )?.value ?? "0",
    );

  const dayIndex =
    STORE_WEEKDAYS_V33.indexOf(
      weekday as
        (typeof STORE_WEEKDAYS_V33)[number],
    );

  return {
    dayIndex:
      dayIndex >= 0
        ? dayIndex
        : 0,

    hour,
    minute,
  };
}


function storeDayOpenV33(
  dayIndex: number,
) {
  return dayIndex !== 6;
}


function storeCurrentlyOpenV33() {
  const clock =
    beirutStoreClockV33();

  if (
    !storeDayOpenV33(
      clock.dayIndex,
    )
  ) {
    return {
      ...clock,
      open: false,
    };
  }

  const minutes =
    clock.hour * 60 +
    clock.minute;

  return {
    ...clock,
    open:
      minutes >= 10 * 60 &&
      minutes < 20 * 60,
  };
}


function storeHoursAnswerV33(
  message: string,
  language: Language,
): string | null {
  const normalized =
    normalizeAssistantLanguageV2(
      message,
    );

  const dayIndex =
    storeWeekdayIndexV33(
      message,
    );

  const mentionsSaturday =
    /\bsaturday\b|\bsamedi\b/.test(
      normalized,
    ) ||
    /(السبت)/.test(
      message,
    );

  const mentionsSunday =
    /\bsunday\b|\bdimanche\b/.test(
      normalized,
    ) ||
    /(الاحد|الأحد)/.test(
      message,
    );


  /*
   * Broad intent signals.
   */
  const hoursSignal =
    /\b(opening hours?|store hours?|shop hours?|business hours?|working hours?|hours of operation|opening times?|store schedule|shop schedule|business schedule|timings?)\b/.test(
      normalized,
    ) ||

    /\bwhen (?:are|is|do|does) (?:you|your store|your shop|the store|the shop)?\s*(?:open|opened|close|closed)\b/.test(
      normalized,
    ) ||

    /\bwhat time (?:do|does|are|is) (?:you|your store|your shop|the store|the shop)?\s*(?:open|close|opened|closed)\b/.test(
      normalized,
    ) ||

    /\bwhat time (?:are you|is the store|is your store) open\b/.test(
      normalized,
    ) ||

    /\bwhen can i (?:come|visit|stop by|come by)\b/.test(
      normalized,
    ) ||

    /\bwhat days?(?: of the week)? (?:are you|is the store|is your store|do you|does the store) (?:open|opened|working|work)\b/.test(
      normalized,
    ) ||

    /\bwhich days?(?: of the week)? (?:are you|is the store|do you) (?:open|working|work)\b/.test(
      normalized,
    ) ||

    /*
     * ASSISTANT_STORE_HOURS_INTELLIGENCE_V34
     *
     * Natural reversed / conversational wording:
     *
     * - Which days do you guys work?
     * - What days do you work?
     * - Which day are you closed?
     */
    /\b(?:which|what) days?(?: of the week)? do (?:you|you guys|you all|your staff|the store|the shop) (?:work|open|operate)\b/.test(
      normalized,
    ) ||

    /\b(?:which|what) days? (?:are you|is your store|is the store|is your shop|is the shop) closed\b/.test(
      normalized,
    ) ||

    /\bwhat are your (?:open|opening|working|business) days\b/.test(
      normalized,
    ) ||

    /\bwhich days are you closed\b/.test(
      normalized,
    ) ||

    /\bwhat days are you closed\b/.test(
      normalized,
    ) ||

    /\bworking days\b/.test(
      normalized,
    ) ||

    /\bbusiness days\b/.test(
      normalized,
    ) ||

    /\bopen days\b/.test(
      normalized,
    ) ||

    /\bopening days\b/.test(
      normalized,
    ) ||

    /\bopen every day\b/.test(
      normalized,
    ) ||

    /\bopen everyday\b/.test(
      normalized,
    ) ||

    /\bopen 7 days\b/.test(
      normalized,
    ) ||

    /\bare you open\b/.test(
      normalized,
    ) ||

    /\bis (?:the|your) (?:store|shop) open\b/.test(
      normalized,
    ) ||

    /\bdo you open\b/.test(
      normalized,
    ) ||

    /\bdo you work\b/.test(
      normalized,
    ) ||

    /*
     * French
     */
    /\bhoraires?\b/.test(
      normalized,
    ) ||

    /\bheures? d ouverture\b/.test(
      normalized,
    ) ||

    /\bjours? d ouverture\b/.test(
      normalized,
    ) ||

    /\bquels? jours?\b.*\bouverts?\b/.test(
      normalized,
    ) ||

    /\bquels? jours?\b.*\btravaillez\b/.test(
      normalized,
    ) ||

    /\bvous travaillez quels? jours?\b/.test(
      normalized,
    ) ||

    /\bvous ouvrez quels? jours?\b/.test(
      normalized,
    ) ||

    /\bvous etes ouverts? quels? jours?\b/.test(
      normalized,
    ) ||

    /\b(?:quel|quels) jours? (?:etes[- ]vous|vous etes) fermes?\b/.test(
      normalized,
    ) ||

    /\bquand (?:etes vous|vous etes|est le magasin) ouvert\b/.test(
      normalized,
    ) ||

    /\bquand ouvrez vous\b/.test(
      normalized,
    ) ||

    /\bquand fermez vous\b/.test(
      normalized,
    ) ||

    /\ba quelle heure (?:ouvrez|fermez|etes vous ouvert)\b/.test(
      normalized,
    ) ||

    /\bvous etes ouverts?\b/.test(
      normalized,
    ) ||

    /*
     * Arabic
     */
    /(ساعات العمل|اوقات العمل|أوقات العمل|مواعيد العمل|دوامكم|دوام المحل|متى تفتحون|متى بتفتحوا|متى تفتحوا|متى تسكرون|متى بتسكروا|ايام العمل|أيام العمل|ايام الدوام|أيام الدوام|ايام بتفتحوا|أيام بتفتحوا|اي يوم بتفتحوا|أي يوم بتفتحوا)/.test(
      message,
    );


  const todaySignal =
    /\btoday\b/.test(
      normalized,
    ) ||
    /\baujourd(?: hui|hui)\b/.test(
      normalized,
    ) ||
    /aujourd['’]hui/i.test(
      message,
    ) ||
    /(اليوم)/.test(
      message,
    );


  const tomorrowSignal =
    /\btomorrow\b/.test(
      normalized,
    ) ||
    /\bdemain\b/.test(
      normalized,
    ) ||
    /(بكرا|غدا|غداً)/.test(
      message,
    );


  const nowSignal =
    /\bright now\b/.test(
      normalized,
    ) ||
    /\bcurrently open\b/.test(
      normalized,
    ) ||
    /\bopen now\b/.test(
      normalized,
    ) ||
    /\ben ce moment\b/.test(
      normalized,
    ) ||
    /\bmaintenant\b/.test(
      normalized,
    ) ||
    /(هلق|هلأ|الان|الآن)/.test(
      message,
    );


  const weekendSignal =
    /\bweekends?\b/.test(
      normalized,
    ) ||
    /\bweek end\b/.test(
      normalized,
    ) ||
    /\bweek-end\b/.test(
      normalized,
    ) ||
    /\bfin de semaine\b/.test(
      normalized,
    ) ||
    /(عطلة نهاية الأسبوع|الويكند|ويكند)/.test(
      message,
    );


  const openTimeSignal =
    /\bwhat time\b.*\bopen\b/.test(
      normalized,
    ) ||
    /\bwhen do you open\b/.test(
      normalized,
    ) ||
    /\bopening time\b/.test(
      normalized,
    ) ||
    /\ba quelle heure\b.*\b(?:ouvrez|ouvrir|ouvert)\b/.test(
      normalized,
    ) ||
    /(اي ساعة بتفتحوا|أي ساعة بتفتحوا|الساعة كم بتفتحوا)/.test(
      message,
    );


  const closeTimeSignal =
    /\bwhat time\b.*\bclose\b/.test(
      normalized,
    ) ||
    /\bwhen do you close\b/.test(
      normalized,
    ) ||
    /\bclosing time\b/.test(
      normalized,
    ) ||
    /\ba quelle heure\b.*\b(?:fermez|fermer|ferme)\b/.test(
      normalized,
    ) ||
    /(اي ساعة بتسكروا|أي ساعة بتسكروا|الساعة كم بتسكروا)/.test(
      message,
    );


  /*
   * Questions asking specifically which day(s) the store is closed.
   */
  /*
   * ASSISTANT_STORE_HOURS_INTELLIGENCE_V341
   *
   * Additional natural French closed-day wording.
   */
  const frenchClosedDayExtendedV341 =
    /\b(?:quel|quels) jours? est ce que vous etes fermes?\b/.test(
      normalized,
    ) ||
    /\b(?:quel|quels) jours? (?:votre|le) magasin est ferme\b/.test(
      normalized,
    ) ||
    /\b(?:votre|le) magasin est ferme (?:quel|quels) jours?\b/.test(
      normalized,
    );


  const closedDaysSignal =
    /\b(?:which|what) days? (?:are you|is your store|is the store|is your shop|is the shop) closed\b/.test(
      normalized,
    ) ||
    /\b(?:which|what) days? do you close\b/.test(
      normalized,
    ) ||
    /\b(?:quel|quels) jours? (?:etes[- ]vous|vous etes) fermes?\b/.test(
      normalized,
    ) ||
    /\b(?:quel|quels) jours? (?:le magasin|votre magasin) est ferme\b/.test(
      normalized,
    ) ||
    /(اي يوم مسكرين|أي يوم مسكرين|ايام مسكرين|أيام مسكرين|اي يوم المحل مسكر|أي يوم المحل مسكر)/.test(
      message,
    ) ||
    frenchClosedDayExtendedV341;


  const daySpecificSignal =
    dayIndex !== null &&
    (
      hoursSignal ||
      /\bopen\b|\bclosed\b|\bclose\b|\bworking\b|\bwork\b/.test(
        normalized,
      ) ||
      /\bouvert\b|\bferme\b|\bfermé\b|\btravaillez\b/.test(
        normalized,
      ) ||
      /(فاتحين|مفتوح|مسكر|دوام)/.test(
        message,
      )
    );


  const relevant =
    hoursSignal ||
    openTimeSignal ||
    closeTimeSignal ||
    closedDaysSignal ||
    todaySignal ||
    tomorrowSignal ||
    nowSignal ||
    weekendSignal ||
    daySpecificSignal ||
    (
      mentionsSaturday &&
      mentionsSunday
    );

  if (!relevant) {
    return null;
  }


  /*
   * OPEN RIGHT NOW
   */
  if (nowSignal) {
    const clock =
      storeCurrentlyOpenV33();

    const today =
      storeDayLabelV33(
        clock.dayIndex,
        language,
      );

    if (language === "fr") {
      if (clock.open) {
        return `Oui. Selon les horaires réguliers, le magasin est ouvert maintenant et ferme à 20h00. Aujourd’hui (${today}), les horaires sont de 10h00 à 20h00.`;
      }

      if (
        !storeDayOpenV33(
          clock.dayIndex,
        )
      ) {
        return `Non. Le magasin est fermé aujourd’hui (${today}). Il est normalement ouvert du lundi au samedi de 10h00 à 20h00 et fermé le dimanche.`;
      }

      return `Non, pas en ce moment. Aujourd’hui (${today}), les horaires réguliers sont de 10h00 à 20h00.`;
    }

    if (language === "ar") {
      if (clock.open) {
        return `نعم. حسب الدوام العادي، المتجر مفتوح الآن ويغلق الساعة 8 مساءً. دوام اليوم (${today}) من 10 صباحاً حتى 8 مساءً.`;
      }

      if (
        !storeDayOpenV33(
          clock.dayIndex,
        )
      ) {
        return `لا. المتجر مغلق اليوم (${today}). الدوام العادي من الاثنين إلى السبت من 10 صباحاً حتى 8 مساءً، ويغلق يوم الأحد.`;
      }

      return `لا، المتجر ليس مفتوحاً الآن. دوام اليوم (${today}) من 10 صباحاً حتى 8 مساءً.`;
    }

    if (clock.open) {
      return `Yes. Based on the regular schedule, the store is open right now and closes at 8:00 PM. Today (${today}), the hours are 10:00 AM–8:00 PM.`;
    }

    if (
      !storeDayOpenV33(
        clock.dayIndex,
      )
    ) {
      return `No. The store is closed today (${today}). Regular hours are Monday through Saturday, 10:00 AM–8:00 PM, with Sunday closed.`;
    }

    return `Not right now. Today (${today}), the regular store hours are 10:00 AM–8:00 PM.`;
  }


  /*
   * TODAY
   */
  if (todaySignal) {
    const clock =
      beirutStoreClockV33();

    const today =
      storeDayLabelV33(
        clock.dayIndex,
        language,
      );

    if (
      !storeDayOpenV33(
        clock.dayIndex,
      )
    ) {
      if (language === "fr") {
        return `Non. Aujourd’hui (${today}), le magasin est fermé.`;
      }

      if (language === "ar") {
        return `لا. اليوم (${today}) المتجر مغلق.`;
      }

      return `No. Today (${today}), the store is closed.`;
    }

    if (language === "fr") {
      return `Oui. Aujourd’hui (${today}), le magasin est ouvert de 10h00 à 20h00.`;
    }

    if (language === "ar") {
      return `نعم. اليوم (${today}) المتجر مفتوح من 10 صباحاً حتى 8 مساءً.`;
    }

    return `Yes. Today (${today}), the store is open from 10:00 AM to 8:00 PM.`;
  }


  /*
   * TOMORROW
   */
  if (tomorrowSignal) {
    const clock =
      beirutStoreClockV33();

    const tomorrow =
      (
        clock.dayIndex + 1
      ) % 7;

    const label =
      storeDayLabelV33(
        tomorrow,
        language,
      );

    if (
      !storeDayOpenV33(
        tomorrow,
      )
    ) {
      if (language === "fr") {
        return `Non. Demain (${label}), le magasin est fermé.`;
      }

      if (language === "ar") {
        return `لا. بكرا (${label}) المتجر مغلق.`;
      }

      return `No. Tomorrow (${label}), the store is closed.`;
    }

    if (language === "fr") {
      return `Oui. Demain (${label}), le magasin est ouvert de 10h00 à 20h00.`;
    }

    if (language === "ar") {
      return `نعم. بكرا (${label}) المتجر مفتوح من 10 صباحاً حتى 8 مساءً.`;
    }

    return `Yes. Tomorrow (${label}), the store is open from 10:00 AM to 8:00 PM.`;
  }


  /*
   * SATURDAY + SUNDAY / WEEKEND
   */
  if (
    weekendSignal ||
    (
      mentionsSaturday &&
      mentionsSunday
    )
  ) {
    if (language === "fr") {
      return "Le samedi, le magasin est ouvert de 10h00 à 20h00. Le dimanche, il est fermé.";
    }

    if (language === "ar") {
      return "يوم السبت المتجر مفتوح من 10 صباحاً حتى 8 مساءً، ويوم الأحد مغلق.";
    }

    return "On Saturday, the store is open from 10:00 AM to 8:00 PM. On Sunday, it is closed.";
  }


  /*
   * WHICH DAY IS CLOSED?
   */
  if (closedDaysSignal) {
    if (language === "fr") {
      return "Le magasin est fermé le dimanche. Il est ouvert du lundi au samedi de 10h00 à 20h00.";
    }

    if (language === "ar") {
      return "المتجر مغلق يوم الأحد. وهو مفتوح من الاثنين إلى السبت من الساعة 10 صباحاً حتى 8 مساءً.";
    }

    return "The store is closed on Sunday. It is open Monday through Saturday from 10:00 AM to 8:00 PM.";
  }


  /*
   * SPECIFIC DAY
   */
  if (
    daySpecificSignal &&
    dayIndex !== null
  ) {
    const label =
      storeDayLabelV33(
        dayIndex,
        language,
      );

    if (
      !storeDayOpenV33(
        dayIndex,
      )
    ) {
      if (language === "fr") {
        return `Non. Le magasin est fermé le ${label}.`;
      }

      if (language === "ar") {
        return `لا. المتجر مغلق يوم ${label}.`;
      }

      return `No. The store is closed on ${label}.`;
    }

    if (language === "fr") {
      return `Oui. Le ${label}, le magasin est ouvert de 10h00 à 20h00.`;
    }

    if (language === "ar") {
      return `نعم. يوم ${label} المتجر مفتوح من 10 صباحاً حتى 8 مساءً.`;
    }

    return `Yes. On ${label}, the store is open from 10:00 AM to 8:00 PM.`;
  }


  /*
   * OPENING TIME
   */
  if (
    openTimeSignal &&
    !closeTimeSignal
  ) {
    if (language === "fr") {
      return "Le magasin ouvre à 10h00 du lundi au samedi. Il est fermé le dimanche.";
    }

    if (language === "ar") {
      return "يفتح المتجر الساعة 10 صباحاً من الاثنين إلى السبت، ويغلق يوم الأحد.";
    }

    return "The store opens at 10:00 AM Monday through Saturday. It is closed on Sunday.";
  }


  /*
   * CLOSING TIME
   */
  if (
    closeTimeSignal &&
    !openTimeSignal
  ) {
    if (language === "fr") {
      return "Le magasin ferme à 20h00 du lundi au samedi. Il est fermé toute la journée le dimanche.";
    }

    if (language === "ar") {
      return "يغلق المتجر الساعة 8 مساءً من الاثنين إلى السبت، ويكون مغلقاً طوال يوم الأحد.";
    }

    return "The store closes at 8:00 PM Monday through Saturday. It is closed all day Sunday.";
  }


  /*
   * GENERAL DAYS / HOURS
   */
  if (language === "fr") {
    return "Le magasin est ouvert du lundi au samedi de 10h00 à 20h00. Il est fermé le dimanche.";
  }

  if (language === "ar") {
    return "المتجر مفتوح من الاثنين إلى السبت من الساعة 10 صباحاً حتى 8 مساءً، ويغلق يوم الأحد.";
  }

  return "The store is open Monday through Saturday from 10:00 AM to 8:00 PM. It is closed on Sunday.";
}



/* ============================================================
 * ASSISTANT_WIDE_VOCABULARY_V35
 * ============================================================
 *
 * Wide natural-language understanding for a real electronics
 * store assistant.
 *
 * The goal is NOT to memorize one exact question.
 *
 * The goal is:
 *
 *     MANY PHRASES -> ONE CUSTOMER INTENT
 *
 * Customer-question families covered here:
 *
 * STORE
 * - opening hours
 * - opening time
 * - closing time
 * - opening days
 * - closed days
 * - today / tomorrow / right now
 * - store location
 * - directions
 * - holiday hours
 * - contact information
 *
 * ORDERING
 * - how to order
 * - checkout
 * - payment methods
 * - delivery time
 * - delivery policy
 * - pickup / collection
 * - order changes / cancellation
 * - invoice / receipt
 * - financing / installments
 * - personal order tracking
 *
 * AFTER SALES
 * - returns
 * - refunds
 * - exchanges
 * - warranty
 * - repairs
 *
 * SHOPPING
 * - gifts
 * - recommendations
 * - comparisons
 * - offers
 * - price questions
 * - availability / stock
 *
 * IMPORTANT:
 *
 * Vocabulary recognition is broad.
 *
 * Answers are NOT borrowed from another retailer.
 * Existing Stereophonie functions and live catalog data remain
 * authoritative.
 *
 * If a store policy is not verified in the current system,
 * the assistant must say that instead of hallucinating.
 */


type BroadStoreSupportIntentV35 =
  | "hours"
  | "location"
  | "delivery_time"
  | "delivery_policy"
  | "checkout"
  | "payment"
  | "returns"
  | "warranty"
  | "pickup"
  | "holiday_hours"
  | "contact"
  | "order_change"
  | "invoice"
  | "financing"
  | null;


function broadSupportTextV35(
  rawMessage: string,
) {
  return normalizeAssistantLanguageV2(
    rawMessage,
  )
    .replace(
      /[-‐-‒–—―'’`´]/g,
      " ",
    )
    .replace(
      /[?!.,;:()[\]{}"]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}


function broadAnyV35(
  text: string,
  patterns: RegExp[],
) {
  return patterns.some(
    (pattern) =>
      pattern.test(text),
  );
}


/*
 * ============================================================
 * EXISTING ORDER TRACKING
 * ============================================================
 *
 * This must stay separate from GENERAL delivery-time questions.
 *
 * "How long does delivery take?"
 *      -> store delivery policy
 *
 * "Where is MY order?"
 *      -> real order tracking
 */
function personalOrderTrackingSignalV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  const english = broadAnyV35(
    normalized,
    [
      /\btrack\b.{0,30}\b(my )?(order|package|parcel|shipment)\b/,
      /\btracking\b.{0,30}\b(my )?(order|package|parcel|shipment)\b/,
      /\bwhere is my (order|package|parcel|shipment)\b/,
      /\bwhere s my (order|package|parcel|shipment)\b/,
      /\b(my )?(order|package|parcel|shipment) status\b/,
      /\bstatus of my (order|package|parcel|shipment)\b/,
      /\bhas my (order|package|parcel|shipment) shipped(?: yet)?\b/,
      /\bhas my (order|package|parcel|shipment) been shipped(?: yet)?\b/,
      /\bdid my (order|package|parcel|shipment) ship(?: yet)?\b/,
      /\bhas my (order|package|parcel|shipment) been dispatched(?: yet)?\b/,
      /\bhas my (order|package|parcel|shipment) left(?: yet)?\b/,
      /\bis my order ready\b/,
      /\bis my order shipped\b/,
      /\bis my order dispatched\b/,
      /\bis my order delivered\b/,
      /\bwhen will my (order|package|parcel|shipment) arrive\b/,
      /\bwhen is my (order|package|parcel|shipment) arriving\b/,
      /\bwhen will my (order|package|parcel|shipment) be delivered\b/,
      /\bwhat happened to my order\b/,
      /\bfind my order\b/,
      /\blocate my order\b/,
    ],
  );

  const french = broadAnyV35(
    normalized,
    [
      /\bou est ma commande\b/,
      /\bou est mon colis\b/,
      /\bma commande est ou\b/,
      /\bmon colis est ou\b/,
      /\bsuivre ma commande\b/,
      /\bsuivi de ma commande\b/,
      /\bsuivre mon colis\b/,
      /\bstatut de ma commande\b/,
      /\bstatut de mon colis\b/,
      /\bquand ma commande va arriver\b/,
      /\bquand mon colis va arriver\b/,
      /\bma commande a ete expediee\b/,
      /\bmon colis a ete expedie\b/,
    ],
  );

  const arabic =
    /(وين طلبي|طلبي وين|وين الشحنة|وين الباكج|تتبع طلبي|تتبع الطلب|حالة طلبي|حالة الطلب|وصل طلبي|امتى بيوصل طلبي|إمتى بيوصل طلبي|متى يصل طلبي|وين وصلت طلبيتي)/.test(
      rawMessage,
    );

  return (
    english ||
    french ||
    arabic
  );
}


/*
 * ============================================================
 * OPENING HOURS
 * ============================================================
 */
function broadHoursIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );


  const english = broadAnyV35(
    normalized,
    [
      /\bopening hour\b/,
      /\bopening hours\b/,
      /\bopening time\b/,
      /\bopening times\b/,
      /\bclosing hour\b/,
      /\bclosing hours\b/,
      /\bclosing time\b/,
      /\bclosing times\b/,
      /\bstore hours\b/,
      /\bshop hours\b/,
      /\bbusiness hours\b/,
      /\bworking hours\b/,
      /\bwork hours\b/,
      /\bhours of operation\b/,
      /\boperating hours\b/,
      /\bstore schedule\b/,
      /\bshop schedule\b/,
      /\bopening schedule\b/,
      /\bworking days\b/,
      /\bopening days\b/,
      /\bopen days\b/,
      /\bdays open\b/,
      /\bdays closed\b/,

      /\bwhen do you open\b/,
      /\bwhen you open\b/,
      /\bwhen are you open\b/,
      /\bwhen is your store open\b/,
      /\bwhen is the store open\b/,
      /\bwhen does your store open\b/,
      /\bwhen does the shop open\b/,
      /\bwhen do you close\b/,
      /\bwhen you close\b/,
      /\bwhen are you closed\b/,
      /\bwhen does your store close\b/,

      /\bwhat time do you open\b/,
      /\bwhat time you open\b/,
      /\bwhat time are you open\b/,
      /\bwhat time does your store open\b/,
      /\bwhat time does the shop open\b/,
      /\bat what time do you open\b/,
      /\bat what time you open\b/,
      /\bat what time does the store open\b/,

      /\bwhat time do you close\b/,
      /\bwhat time you close\b/,
      /\bwhat time are you closing\b/,
      /\bat what time do you close\b/,
      /\bat what time does the store close\b/,

      /\buntil what time are you open\b/,
      /\buntil what time do you stay open\b/,
      /\buntil when are you open\b/,
      /\bhow late are you open\b/,
      /\bhow late do you stay open\b/,
      /\bhow early do you open\b/,

      /\bwhat days are you open\b/,
      /\bwhich days are you open\b/,
      /\bwhat days do you open\b/,
      /\bwhich days do you open\b/,
      /\bwhat days do you work\b/,
      /\bwhich days do you work\b/,
      /\bwhat days do you guys work\b/,
      /\bwhich days do you guys work\b/,
      /\bwhat days do you operate\b/,
      /\bwhich days do you operate\b/,
      /\bwhat day are you closed\b/,
      /\bwhich day are you closed\b/,
      /\bwhat days are you closed\b/,
      /\bwhich days are you closed\b/,

      /\bare you open\b/,
      /\bare you closed\b/,
      /\bare you working today\b/,
      /\bare you working tomorrow\b/,
      /\bare you open today\b/,
      /\bare you open tomorrow\b/,
      /\bare you open now\b/,
      /\bare you open right now\b/,
      /\bare you still open\b/,
      /\bis your store open\b/,
      /\bis the store open\b/,
      /\bis your shop open\b/,

      /\bdo you open on\b/,
      /\bdo you work on\b/,
      /\bdo you open saturday\b/,
      /\bdo you open sunday\b/,
      /\bdo you work saturday\b/,
      /\bdo you work sunday\b/,

      /\bcan i come today\b/,
      /\bcan i come tomorrow\b/,
      /\bcan i come saturday\b/,
      /\bcan i come sunday\b/,
      /\bwhen can i come\b/,
      /\bwhen can i visit\b/,
      /\bwhen can i stop by\b/,
      /\bwhen can i come by\b/,

      /\bopen every day\b/,
      /\bopen everyday\b/,
      /\bopen seven days\b/,
      /\bopen 7 days\b/,
      /\bopen weekends\b/,
      /\bopen on weekends\b/,
      /\bopen saturday\b/,
      /\bopen sunday\b/,
      /\bclosed saturday\b/,
      /\bclosed sunday\b/,
    ],
  );


  const french = broadAnyV35(
    normalized,
    [
      /\bhoraires\b/,
      /\bhoraire du magasin\b/,
      /\bheures d ouverture\b/,
      /\bheure d ouverture\b/,
      /\bheures de fermeture\b/,
      /\bheure de fermeture\b/,
      /\bjours d ouverture\b/,
      /\bjour d ouverture\b/,
      /\bjours de travail\b/,

      /\bquand ouvrez vous\b/,
      /\bquand vous ouvrez\b/,
      /\bquand est ce que vous ouvrez\b/,
      /\bquand etes vous ouverts\b/,
      /\bquand vous etes ouverts\b/,
      /\bquand fermez vous\b/,
      /\bquand vous fermez\b/,
      /\bquand est ce que vous fermez\b/,

      /\ba quelle heure ouvrez vous\b/,
      /\ba quelle heure vous ouvrez\b/,
      /\ba quelle heure est ce que vous ouvrez\b/,
      /\ba quelle heure fermez vous\b/,
      /\ba quelle heure vous fermez\b/,
      /\ba quelle heure est ce que vous fermez\b/,
      /\bjusqu a quelle heure etes vous ouverts\b/,
      /\bjusqu a quelle heure vous etes ouverts\b/,

      /\bquels jours etes vous ouverts\b/,
      /\bquel jour etes vous ouverts\b/,
      /\bquels jours vous etes ouverts\b/,
      /\bvous etes ouverts quels jours\b/,
      /\bvous ouvrez quels jours\b/,
      /\bquels jours ouvrez vous\b/,
      /\bvous travaillez quels jours\b/,
      /\bquels jours travaillez vous\b/,

      /\bquel jour etes vous fermes\b/,
      /\bquels jours etes vous fermes\b/,
      /\bquel jour vous etes ferme\b/,
      /\bquels jours vous etes fermes\b/,
      /\bquel jour est ce que vous etes fermes\b/,
      /\bvotre magasin est ferme quel jour\b/,

      /\bvous etes ouverts aujourd hui\b/,
      /\bvous etes ouverts demain\b/,

      /*
       * ASSISTANT_FRENCH_HOURS_OWNERSHIP_V38
       *
       * Closed-form questions must belong to the hours router
       * exactly like their open-form equivalents.
       *
       * normalizeAssistantLanguageV2 + broadSupportTextV35 turn:
       *
       *   Vous êtes fermés demain ?
       *   Êtes-vous fermés demain ?
       *   Est-ce que vous êtes fermés aujourd’hui ?
       *
       * into unaccented, space-normalized forms.
       */
      /\bvous etes fermes? aujourd hui\b/,
      /\bvous etes fermes? demain\b/,
      /\betes vous fermes? aujourd hui\b/,
      /\betes vous fermes? demain\b/,
      /\best ce que vous etes fermes? aujourd hui\b/,
      /\best ce que vous etes fermes? demain\b/,
      /\ble magasin est ferme aujourd hui\b/,
      /\ble magasin est ferme demain\b/,
      /\bvotre magasin est ferme aujourd hui\b/,
      /\bvotre magasin est ferme demain\b/,

      /\bvous etes ouverts maintenant\b/,
      /\bvous etes encore ouverts\b/,
      /\bvous etes ouverts samedi\b/,
      /\bvous etes ouverts dimanche\b/,
      /\bvous ouvrez samedi\b/,
      /\bvous ouvrez dimanche\b/,
      /\bmagasin ouvert aujourd hui\b/,
      /\bmagasin ouvert demain\b/,
    ],
  );


  const arabic =
    /(ساعات العمل|ساعات الدوام|اوقات العمل|أوقات العمل|اوقات الدوام|أوقات الدوام|مواعيد العمل|دوامكم|دوام المحل|ايام الدوام|أيام الدوام|ايام العمل|أيام العمل|متى تفتحون|متى بتفتحوا|امتى بتفتحوا|إمتى بتفتحوا|متى تفتحوا|متى تسكرون|متى بتسكروا|امتى بتسكروا|إمتى بتسكروا|اي ساعة بتفتحوا|أي ساعة بتفتحوا|الساعة كم بتفتحوا|اي ساعة بتسكروا|أي ساعة بتسكروا|الساعة كم بتسكروا|فاتحين اليوم|فاتحين بكرا|فاتحين هلق|فاتحين هلأ|فاتحين الان|فاتحين الآن|فاتحين السبت|فاتحين الاحد|فاتحين الأحد|مسكرين اليوم|مسكرين بكرا|اي يوم مسكرين|أي يوم مسكرين|ايام مسكرين|أيام مسكرين|اي يوم بتفتحوا|أي يوم بتفتحوا)/.test(
      rawMessage,
    );


  return (
    english ||
    french ||
    arabic
  );
}


function broadOpeningTimeQuestionV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bopening hour\b/,
        /\bopening time\b/,
        /\bwhen do you open\b/,
        /\bwhen you open\b/,
        /\bwhen does the store open\b/,
        /\bwhat time do you open\b/,
        /\bwhat time you open\b/,
        /\bat what time do you open\b/,
        /\bhow early do you open\b/,

        /\bheure d ouverture\b/,
        /\bquand ouvrez vous\b/,
        /\bquand vous ouvrez\b/,
        /\bquand est ce que vous ouvrez\b/,
        /\ba quelle heure ouvrez vous\b/,
        /\ba quelle heure vous ouvrez\b/,
      ],
    ) ||
    /(متى تفتحون|متى بتفتحوا|امتى بتفتحوا|إمتى بتفتحوا|اي ساعة بتفتحوا|أي ساعة بتفتحوا|الساعة كم بتفتحوا)/.test(
      rawMessage,
    )
  );
}


function broadClosingTimeQuestionV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bclosing hour\b/,
        /\bclosing time\b/,
        /\bwhen do you close\b/,
        /\bwhen you close\b/,
        /\bwhat time do you close\b/,
        /\bwhat time you close\b/,
        /\bat what time do you close\b/,
        /\bhow late are you open\b/,
        /\buntil what time are you open\b/,
        /\buntil what time do you stay open\b/,

        /\bheure de fermeture\b/,
        /\bquand fermez vous\b/,
        /\bquand vous fermez\b/,
        /\bquand est ce que vous fermez\b/,
        /\ba quelle heure fermez vous\b/,
        /\ba quelle heure vous fermez\b/,
        /\bjusqu a quelle heure etes vous ouverts\b/,
        /\bjusqu a quelle heure vous etes ouverts\b/,
      ],
    ) ||
    /(متى تسكرون|متى بتسكروا|امتى بتسكروا|إمتى بتسكروا|اي ساعة بتسكروا|أي ساعة بتسكروا|الساعة كم بتسكروا)/.test(
      rawMessage,
    )
  );
}


function broadHoursResponseV35(
  rawMessage: string,
  language: Language,
) {
  /*
   * ASSISTANT_INTENT_BOUNDARIES_V36
   *
   * Resolve the most specific interpretation before allowing
   * the older broad hours engine to answer.
   */

  const closedRelativeAnswer =
    broadRelativeClosedAnswerV36(
      rawMessage,
      language,
    );

  if (closedRelativeAnswer) {
    return closedRelativeAnswer;
  }


  const weekdayAnswer =
    broadSpecificWeekdayAnswerV36(
      rawMessage,
      language,
    );

  if (weekdayAnswer) {
    return weekdayAnswer;
  }


  if (
    broadClosingTimeQuestionV35(
      rawMessage,
    )
  ) {
    if (language === "fr") {
      return "Le magasin ferme à 20h00 du lundi au samedi. Il est fermé le dimanche.";
    }

    if (language === "ar") {
      return "يغلق المتجر الساعة 8 مساءً من الاثنين إلى السبت، ويغلق يوم الأحد.";
    }

    return "The store closes at 8:00 PM Monday through Saturday. It is closed on Sunday.";
  }


  /*
   * Existing V3.3/V3.4 logic is better whenever it already
   * understands the exact question because it can reason about
   * weekdays, today, tomorrow and current Beirut time.
   */
  const detailed =
    storeHoursAnswerV33(
      rawMessage,
      language,
    );

  if (detailed) {
    return detailed;
  }


  if (
    broadOpeningTimeQuestionV35(
      rawMessage,
    )
  ) {
    if (language === "fr") {
      return "Le magasin ouvre à 10h00 du lundi au samedi. Il est fermé le dimanche.";
    }

    if (language === "ar") {
      return "يفتح المتجر الساعة 10 صباحاً من الاثنين إلى السبت، ويغلق يوم الأحد.";
    }

    return "The store opens at 10:00 AM Monday through Saturday. It is closed on Sunday.";
  }


  if (
    broadClosingTimeQuestionV35(
      rawMessage,
    )
  ) {
    if (language === "fr") {
      return "Le magasin ferme à 20h00 du lundi au samedi. Il est fermé le dimanche.";
    }

    if (language === "ar") {
      return "يغلق المتجر الساعة 8 مساءً من الاثنين إلى السبت، ويغلق يوم الأحد.";
    }

    return "The store closes at 8:00 PM Monday through Saturday. It is closed on Sunday.";
  }


  if (language === "fr") {
    return "Le magasin est ouvert du lundi au samedi de 10h00 à 20h00. Il est fermé le dimanche.";
  }

  if (language === "ar") {
    return "المتجر مفتوح من الاثنين إلى السبت من الساعة 10 صباحاً حتى 8 مساءً، ويغلق يوم الأحد.";
  }

  return "The store is open Monday through Saturday from 10:00 AM to 8:00 PM. It is closed on Sunday.";
}


/*
 * ============================================================
 * STORE LOCATION
 * ============================================================
 */
function broadLocationIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bwhere are you\b/,
        /\bwhere are you located\b/,
        /\bwhere is your store\b/,
        /\bwhere is your shop\b/,
        /\bwhere is the store\b/,
        /\bwhere is the shop\b/,
        /\bwhere can i find you\b/,
        /\bwhat is your address\b/,
        /\bwhat s your address\b/,
        /\bwhat is your location\b/,
        /\bwhat s your location\b/,
        /\bstore address\b/,
        /\bshop address\b/,
        /\bphysical store\b/,
        /\bphysical shop\b/,
        /\bhow do i get to your store\b/,
        /\bhow do i get to your shop\b/,
        /\bdirections to your store\b/,
        /\bdirections to your shop\b/,
        /\bnearest store\b/,
        /\bnearest branch\b/,

        /\bou etes vous\b/,
        /\bou se trouve votre magasin\b/,
        /\bou se trouve le magasin\b/,
        /\bquelle est votre adresse\b/,
        /\badresse du magasin\b/,
        /\bmagasin physique\b/,
        /\bcomment venir au magasin\b/,
      ],
    ) ||
    /(وين محلكم|وين المحل|وين المتجر|وين الفرع|أين متجركم|اين متجركم|شو العنوان|ما هو العنوان|عنوان المحل|موقع المحل|كيف بوصل عالمحل|كيف بوصل للمحل)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * DELIVERY TIME
 * ============================================================
 */
function broadDeliveryTimeIntentV35(
  rawMessage: string,
) {
  if (
    personalOrderTrackingSignalV35(
      rawMessage,
    )
  ) {
    return false;
  }

  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bdelivery time\b/,
        /\bshipping time\b/,
        /\bdelivery eta\b/,
        /\bshipping eta\b/,
        /\bhow long does delivery take\b/,
        /\bhow long is delivery\b/,
        /\bhow long does shipping take\b/,
        /\bhow long to receive\b/,
        /\bhow long until i receive\b/,
        /\bhow many days does delivery take\b/,
        /\bhow many days until i receive\b/,
        /\bhow many days to deliver\b/,
        /\bhow fast do you deliver\b/,
        /\bhow quickly do you deliver\b/,
        /\bhow soon can you deliver\b/,
        /\bwhen should i receive\b/,
        /\bwhen would i receive\b/,
        /\bwhen will i receive\b/,
        /\bif i order today how long\b/,
        /\bif i buy today how long\b/,

        /\bdelai de livraison\b/,
        /\bcombien de temps prend la livraison\b/,
        /\bcombien de temps pour la livraison\b/,
        /\bcombien de jours pour la livraison\b/,
        /\bcombien de jours avant de recevoir\b/,
        /\bquand vais je recevoir\b/,
        /\bquand est ce que je vais recevoir\b/,
      ],
    ) ||
    /(كم يوم.*(توصيل|شحن|يوصل)|قديش.*(توصيل|شحن|يوصل)|متى.*(يوصل|التوصيل)|وقت التوصيل|مدة التوصيل|مدة الشحن|اذا بطلب اليوم امتى بيوصل|إذا بطلب اليوم إمتى بيوصل)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * PAYMENT
 * ============================================================
 */
function broadPaymentIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bpayment method\b/,
        /\bpayment methods\b/,
        /\bways to pay\b/,
        /\bway to pay\b/,
        /\bhow can i pay\b/,
        /\bhow do i pay\b/,
        /\bwhen do i pay\b/,
        /\bwhen is payment\b/,
        /\bdo you accept cards\b/,
        /\bdo you take cards\b/,
        /\bdo you accept cash\b/,
        /\bdo you take cash\b/,
        /\bdo you accept visa\b/,
        /\bdo you accept mastercard\b/,
        /\bcan i pay by card\b/,
        /\bcan i pay with card\b/,
        /\bcan i pay cash\b/,
        /\bcan i pay by visa\b/,
        /\bcan i pay with visa\b/,
        /\bcan i pay by mastercard\b/,
        /\bpay by card\b/,
        /\bpay cash\b/,
        /\bcash on delivery\b/,
        /\bpay on delivery\b/,
        /\bcredit card\b/,
        /\bdebit card\b/,
        /\bapple pay\b/,
        /\bgoogle pay\b/,

        /\bmoyen de paiement\b/,
        /\bmoyens de paiement\b/,
        /\bcomment payer\b/,
        /\bcomment je peux payer\b/,
        /\bcomment puis je payer\b/,
        /\bpayer par carte\b/,
        /\bpayer en especes\b/,
        /\bpaiement a la livraison\b/,
      ],
    ) ||
    /(طرق الدفع|طريقة الدفع|كيف ادفع|كيف أدفع|في دفع كاش|دفع كاش|دفع بالبطاقة|بطاقة ائتمان|فيزا|ماستركارد|الدفع عند الاستلام|كاش عند الاستلام)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * ORDERING / CHECKOUT
 * ============================================================
 */
function broadCheckoutIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bhow do i order\b/,
        /\bhow can i order\b/,
        /\bhow do i buy\b/,
        /\bhow can i buy\b/,
        /\bhow do i purchase\b/,
        /\bhow can i purchase\b/,
        /\bhow does ordering work\b/,
        /\bhow does checkout work\b/,
        /\bcheckout process\b/,
        /\bordering process\b/,
        /\bsteps to order\b/,
        /\bsteps to buy\b/,
        /\bsteps to checkout\b/,
        /\bplace an order\b/,
        /\bmake an order\b/,
        /\border from your website\b/,
        /\border from the website\b/,
        /\bbuy from your website\b/,
        /\bbuy from the website\b/,
        /\bcan i order online\b/,
        /\bcan i buy online\b/,

        /\bcomment commander\b/,
        /\bcomment je commande\b/,
        /\bcomment on commande\b/,
        /\bcomment puis je commander\b/,
        /\bcomment est ce que je commande\b/,
        /\bcomment acheter\b/,
        /\bcomment je peux acheter\b/,
        /\bcomment passer une commande\b/,
        /\bcomment faire une commande\b/,
        /\bje veux commander\b/,
        /\bje voudrais commander\b/,
        /\bpasser une commande\b/,
        /\bcommander sur votre site\b/,
        /\bcommander sur le site\b/,
        /\bacheter sur votre site\b/,
        /\bacheter sur le site\b/,
      ],
    ) ||
    /(كيف اطلب|كيف أطلب|كيف اشتري|كيف أشتري|طريقة الطلب|كيف بعمل طلب|كيف اعمل طلب|كيف أعمل طلب|كيف بشتري من الموقع)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * RETURNS / REFUNDS / EXCHANGES
 * ============================================================
 */
function broadReturnsIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\breturn policy\b/,
        /\brefund policy\b/,
        /\bexchange policy\b/,
        /\bcan i return\b/,
        /\bcan i get a refund\b/,
        /\bcan i exchange\b/,
        /\bcan i send it back\b/,
        /\bcan i send something back\b/,
        /\bcan i bring it back\b/,
        /\bcan i bring something back\b/,
        /\bhow do i return\b/,
        /\bhow can i return\b/,
        /\bhow do refunds work\b/,
        /\bhow do exchanges work\b/,
        /\bi want to return\b/,
        /\bi want a refund\b/,
        /\bi want to exchange\b/,
        /\bchange my mind\b/,
        /\bchanged my mind\b/,
        /\bdont want it anymore\b/,
        /\bdon t want it anymore\b/,

        /\bpolitique de retour\b/,
        /\bpolitique de remboursement\b/,
        /\bje peux retourner\b/,
        /\bpuis je retourner\b/,
        /\bje peux echanger\b/,
        /\bje veux retourner\b/,
        /\bje veux un remboursement\b/,
        /\bchanger d avis\b/,
      ],
    ) ||
    /(سياسة الارجاع|سياسة الإرجاع|ارجاع المنتج|إرجاع المنتج|استرجاع المنتج|بدي رجع|بدي أرجع|فيني رجع|فيني أرجع|بدي بدل|تبديل المنتج|رد المصاري)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * WARRANTY / REPAIR
 * ============================================================
 */
function broadWarrantyIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bwarranty\b/,
        /\bwarranties\b/,
        /\bmanufacturer warranty\b/,
        /\bwarranty period\b/,
        /\bwarranty coverage\b/,
        /\bcovered by warranty\b/,
        /\bcovered under warranty\b/,
        /\bdoes it have warranty\b/,
        /\bdoes this have warranty\b/,
        /\bhow long is the warranty\b/,
        /\bguarantee\b/,
        /\brepair service\b/,
        /\brepairs\b/,
        /\bcan you repair\b/,
        /\bservice center\b/,
        /\bfaulty product\b/,
        /\bdefective product\b/,

        /\bgarantie\b/,
        /\bduree de garantie\b/,
        /\bcouvert par la garantie\b/,
        /\breparation\b/,
        /\breparer\b/,
        /\bproduit defectueux\b/,
      ],
    ) ||
    /(كفالة|ضمان|تصليح|صيانة|عطل|خربان|معطل)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * PICKUP / COLLECTION
 * ============================================================
 */
function broadPickupIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bstore pickup\b/,
        /\bin store pickup\b/,
        /\bpick up from the store\b/,
        /\bpick up from your store\b/,
        /\bpickup from the store\b/,
        /\bpickup from your store\b/,
        /\bcollect from the store\b/,
        /\bcollect from your store\b/,
        /\bclick and collect\b/,
        /\bcan i collect\b/,
        /\bcan i pick it up\b/,
        /\bcan i pick up\b/,
        /\breserve in store\b/,
        /\breserve at the store\b/,

        /\bretrait en magasin\b/,
        /\brecuperer en magasin\b/,
        /\bretirer en magasin\b/,
        /\breserver en magasin\b/,
      ],
    ) ||
    /(استلام من المحل|استلام من المتجر|بستلم من المحل|فيني استلم من المحل|فيني استلم من المتجر|حجز بالمحل)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * HOLIDAY HOURS
 * ============================================================
 */
function broadHolidayHoursIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  const holiday =
    broadAnyV35(
      normalized,
      [
        /\bchristmas\b/,
        /\bnew year\b/,
        /\bnew years\b/,
        /\beaster\b/,
        /\bholiday\b/,
        /\bholidays\b/,
        /\bpublic holiday\b/,
        /\beid\b/,
        /\bramadan\b/,
        /\bindependence day\b/,

        /\bnoel\b/,
        /\bnouvel an\b/,
        /\bjour ferie\b/,
        /\bjours feries\b/,
        /\bpaques\b/,
      ],
    ) ||
    /(عيد|الأعياد|الاعياد|رمضان|عطلة رسمية)/.test(
      rawMessage,
    );

  const schedule =
    broadHoursIntentV35(
      rawMessage,
    ) ||
    /\b(open|closed|hours|schedule|working)\b/.test(
      normalized,
    ) ||
    /\b(ouvert|ferme|horaire)\b/.test(
      normalized,
    ) ||
    /(فاتحين|مسكرين|دوام)/.test(
      rawMessage,
    );

  return holiday && schedule;
}


/*
 * ============================================================
 * CONTACT DETAILS
 * ============================================================
 */
function broadContactIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bphone number\b/,
        /\btelephone number\b/,
        /\bcontact number\b/,
        /\bwhatsapp number\b/,
        /\bwhatsapp\b/,
        /\bemail address\b/,
        /\bcontact details\b/,
        /\bhow can i contact you\b/,
        /\bhow do i contact you\b/,
        /\bhow can i reach you\b/,
        /\bcan i call you\b/,
        /\bcan i message you\b/,

        /\bnumero de telephone\b/,
        /\bnumero whatsapp\b/,
        /\badresse email\b/,
        /\bcomment vous contacter\b/,
        /\bcomment vous joindre\b/,
      ],
    ) ||
    /(رقم الهاتف|رقم تلفون|رقم واتساب|واتساب|كيف اتواصل|كيف أتواصل|كيف احكي معكم|ايميلكم|إيميلكم)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * ORDER CHANGE / CANCELLATION
 * ============================================================
 */
function broadOrderChangeIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bcancel my order\b/,
        /\bcancel an order\b/,
        /\bchange my order\b/,
        /\bedit my order\b/,
        /\bmodify my order\b/,
        /\bchange an order\b/,
        /\bmodify an order\b/,
        /\bchange delivery address\b/,
        /\bchange shipping address\b/,
        /\bchange my address\b/,
        /\badd something to my order\b/,
        /\bremove something from my order\b/,

        /\bannuler ma commande\b/,
        /\bannuler une commande\b/,
        /\bmodifier ma commande\b/,
        /\bchanger ma commande\b/,
        /\bchanger adresse de livraison\b/,
      ],
    ) ||
    /(الغاء الطلب|إلغاء الطلب|بدي الغي طلبي|بدي ألغي طلبي|تعديل الطلب|غير طلبي|غيّر طلبي|تغيير عنوان التوصيل)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * INVOICE / RECEIPT
 * ============================================================
 */
function broadInvoiceIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\binvoice\b/,
        /\breceipt\b/,
        /\bsales receipt\b/,
        /\btax invoice\b/,
        /\bproof of purchase\b/,

        /\bfacture\b/,
        /\brecu\b/,
        /\bpreuve d achat\b/,
      ],
    ) ||
    /(فاتورة|وصل|ايصال|إيصال)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * FINANCING / INSTALLMENTS
 * ============================================================
 */
function broadFinancingIntentV35(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bfinancing\b/,
        /\bfinance option\b/,
        /\bfinance options\b/,
        /\binstallment\b/,
        /\binstallments\b/,
        /\binstalment\b/,
        /\binstalments\b/,
        /\bmonthly payment\b/,
        /\bmonthly payments\b/,
        /\bpay monthly\b/,
        /\bsplit payment\b/,
        /\bpayment plan\b/,

        /\bfinancement\b/,
        /\bpaiement en plusieurs fois\b/,
        /\bmensualite\b/,
        /\bmensualites\b/,
      ],
    ) ||
    /(تقسيط|اقساط|أقساط|دفع شهري|دفعات شهرية)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * GENERAL DELIVERY POLICY
 * ============================================================
 */
function broadDeliveryPolicyIntentV35(
  rawMessage: string,
) {
  if (
    broadDeliveryTimeIntentV35(
      rawMessage,
    ) ||
    personalOrderTrackingSignalV35(
      rawMessage,
    )
  ) {
    return false;
  }

  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bdelivery fee\b/,
        /\bdelivery fees\b/,
        /\bdelivery cost\b/,
        /\bdelivery costs\b/,
        /\bdelivery charge\b/,
        /\bhow much is delivery\b/,
        /\bhow much is shipping\b/,
        /\bhow much does delivery cost\b/,
        /\bhow much does shipping cost\b/,
        /\bwhat does delivery cost\b/,
        /\bwhat does shipping cost\b/,
        /\bis delivery free\b/,
        /\bis shipping free\b/,
        /\bdo i pay for delivery\b/,
        /\bdo i pay for shipping\b/,
        /\bdelivery charges\b/,
        /\bshipping fee\b/,
        /\bshipping fees\b/,
        /\bshipping cost\b/,
        /\bshipping costs\b/,
        /\bfree delivery\b/,
        /\bfree shipping\b/,
        /\bdo you deliver to\b/,
        /\bdo you ship to\b/,
        /\bwhere do you deliver\b/,
        /\bwhere do you ship\b/,
        /\bdelivery areas\b/,
        /\bdelivery area\b/,
        /\bshipping areas\b/,
        /\binternational delivery\b/,
        /\binternational shipping\b/,
        /\bdo you deliver internationally\b/,
        /\bdo you ship internationally\b/,
        /\bcan you deliver internationally\b/,
        /\bcan you ship internationally\b/,
        /\bdo you deliver outside lebanon\b/,
        /\bdo you ship outside lebanon\b/,
        /\bcan you deliver outside lebanon\b/,
        /\bcan you ship outside lebanon\b/,
        /\bdeliver abroad\b/,
        /\bship abroad\b/,
        /\bsame day delivery\b/,
        /\bexpress delivery\b/,

        /\bfrais de livraison\b/,
        /\bcout de livraison\b/,
        /\blivraison gratuite\b/,
        /\blivrez vous a\b/,
        /\blivraison internationale\b/,
      ],
    ) ||
    /(سعر التوصيل|كلفة التوصيل|تكلفة التوصيل|التوصيل مجاني|بتوصلوا على|بتشحنوا على|شحن دولي|توصيل بنفس اليوم)/.test(
      rawMessage,
    )
  );
}


/*
 * ============================================================
 * SUPPORT INTENT CLASSIFIER
 * ============================================================
 */
function detectBroadStoreSupportIntentV35(
  rawMessage: string,
): BroadStoreSupportIntentV35 {
  if (
    broadHolidayHoursIntentV35(
      rawMessage,
    )
  ) {
    return "holiday_hours";
  }

  if (
    broadHoursIntentV35(
      rawMessage,
    )
  ) {
    return "hours";
  }

  if (
    broadLocationIntentV35(
      rawMessage,
    )
  ) {
    return "location";
  }

  if (
    broadCheckoutIntentV35(
      rawMessage,
    )
  ) {
    return "checkout";
  }

  if (
    broadPaymentIntentV35(
      rawMessage,
    )
  ) {
    return "payment";
  }

  if (
    broadReturnsIntentV35(
      rawMessage,
    )
  ) {
    return "returns";
  }

  if (
    broadWarrantyIntentV35(
      rawMessage,
    )
  ) {
    return "warranty";
  }

  if (
    broadDeliveryTimeIntentV35(
      rawMessage,
    )
  ) {
    return "delivery_time";
  }

  if (
    broadDeliveryPolicyIntentV35(
      rawMessage,
    )
  ) {
    return "delivery_policy";
  }

  if (
    broadPickupIntentV35(
      rawMessage,
    )
  ) {
    return "pickup";
  }

  if (
    broadContactIntentV35(
      rawMessage,
    )
  ) {
    return "contact";
  }

  if (
    broadOrderChangeIntentV35(
      rawMessage,
    )
  ) {
    return "order_change";
  }

  if (
    broadInvoiceIntentV35(
      rawMessage,
    )
  ) {
    return "invoice";
  }

  if (
    broadFinancingIntentV35(
      rawMessage,
    )
  ) {
    return "financing";
  }

  return null;
}


/*
 * ============================================================
 * SAFE RESPONSE FOR UNVERIFIED STORE POLICIES
 * ============================================================
 */
function unverifiedStorePolicyResponseV35(
  topic: BroadStoreSupportIntentV35,
  language: Language,
) {
  if (!topic) {
    return null;
  }

  if (language === "fr") {
    const responses: Partial<
      Record<
        Exclude<
          BroadStoreSupportIntentV35,
          null
        >,
        string
      >
    > = {
      delivery_policy:
        "Je n’ai pas de règle vérifiée dans les données actuelles du magasin pour ce détail précis de livraison. Je préfère ne pas inventer une réponse. Vérifiez ce point avec Stereophonie avant de finaliser votre commande.",

      pickup:
        "Je n’ai pas de politique vérifiée dans les données actuelles concernant le retrait ou la réservation en magasin. Je préfère ne pas vous donner une information incertaine.",

      holiday_hours:
        "Je connais les horaires réguliers du magasin, mais je n’ai pas d’horaire spécial vérifié pour les jours fériés. Ces horaires peuvent changer, donc il vaut mieux confirmer directement avec Stereophonie.",

      contact:
        "Je n’ai pas de numéro de téléphone, WhatsApp ou adresse e-mail vérifié dans les données actuelles auxquelles j’ai accès. Je préfère ne pas inventer des coordonnées.",

      order_change:
        "Je peux vous aider à retrouver ou suivre votre commande, mais je n’ai pas de procédure vérifiée ici pour modifier ou annuler une commande déjà passée. Il vaut mieux confirmer directement avec Stereophonie.",

      invoice:
        "Je n’ai pas de procédure vérifiée dans les données actuelles concernant les factures ou reçus. Je préfère ne pas inventer une règle.",

      financing:
        "Je n’ai pas d’option de financement ou de paiement en plusieurs fois vérifiée dans les données actuelles du magasin. Je préfère ne pas confirmer quelque chose qui n’est pas vérifié.",
    };

    return responses[topic] ?? null;
  }


  if (language === "ar") {
    const responses: Partial<
      Record<
        Exclude<
          BroadStoreSupportIntentV35,
          null
        >,
        string
      >
    > = {
      delivery_policy:
        "ما عندي حالياً سياسة موثقة في بيانات المتجر لهذا التفصيل بالتوصيل، لذلك ما بدي أعطيك معلومة غير مؤكدة. الأفضل التأكد من Stereophonie قبل إتمام الطلب.",

      pickup:
        "ما عندي حالياً سياسة موثقة عن الاستلام أو الحجز من المتجر، لذلك ما بدي أعطيك معلومة غير مؤكدة.",

      holiday_hours:
        "بعرف دوام المتجر العادي، لكن ما عندي دوام خاص موثق للأعياد أو العطل الرسمية. ممكن يتغير الدوام بهالأيام، لذلك الأفضل التأكد من Stereophonie.",

      contact:
        "ما عندي حالياً رقم هاتف أو واتساب أو بريد إلكتروني موثق ضمن البيانات المتاحة إلي، لذلك ما بدي أخترع معلومات اتصال.",

      order_change:
        "فيني ساعدك بتتبع طلبك، لكن ما عندي حالياً إجراء موثق لتعديل أو إلغاء طلب تم إرساله. الأفضل التأكد مباشرةً من Stereophonie.",

      invoice:
        "ما عندي حالياً إجراء موثق بخصوص الفواتير أو الإيصالات، لذلك ما بدي أعطيك معلومة غير مؤكدة.",

      financing:
        "ما عندي حالياً خيار تقسيط أو تمويل موثق ضمن بيانات المتجر، لذلك ما بدي أكد لك شيء غير موثق.",
    };

    return responses[topic] ?? null;
  }


  const responses: Partial<
    Record<
      Exclude<
        BroadStoreSupportIntentV35,
        null
      >,
      string
    >
  > = {
    delivery_policy:
      "I don’t have a verified Stereophonie rule in the current store data for that specific delivery detail, so I don’t want to invent an answer. Please confirm that point with Stereophonie before completing the order.",

    pickup:
      "I don’t have a verified Stereophonie pickup or in-store reservation policy in the current store data, so I don’t want to give you an uncertain answer.",

    holiday_hours:
      "I know the store’s regular hours, but I don’t have verified special holiday hours. Holiday schedules can change, so please confirm with Stereophonie for that specific holiday.",

    contact:
      "I don’t have a verified phone number, WhatsApp number, or email address in the current store data available to me, so I don’t want to invent contact details.",

    order_change:
      "I can help identify or track an order, but I don’t have a verified procedure here for changing or cancelling an order that has already been placed. Please confirm that directly with Stereophonie.",

    invoice:
      "I don’t have a verified invoice or receipt procedure in the current store data, so I don’t want to invent a policy.",

    financing:
      "I don’t have a verified financing or installment option in the current store data, so I don’t want to confirm something that isn’t verified.",
  };

  return responses[topic] ?? null;
}



/* ============================================================
 * ASSISTANT_INTENT_BOUNDARIES_V36
 * ============================================================
 *
 * Most-specific customer intent owns the message.
 *
 * Examples:
 *
 * "What's on sale right now?"
 *   -> offers, not opening hours
 *
 * "Has my order shipped yet?"
 *   -> order tracking, not generic delivery
 *
 * "How much is delivery?"
 *   -> delivery policy/cost, not delivery duration
 *
 * "Do you ship internationally?"
 *   -> delivery policy, not delivery duration
 *
 * "Until what time are you open?"
 *   -> closing time, not opening time
 */


function shoppingIntentOwnsMessageV36(
  intent: ReturnType<
    typeof parseAssistantRequest
  >["intent"],
) {
  return (
    intent === "order_tracking" ||
    intent === "gift" ||
    intent === "recommendation" ||
    intent === "comparison" ||
    intent === "offers" ||
    intent === "price_question" ||
    intent === "availability"
  );
}


function broadClosedQuestionV36(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bare you closed today\b/,
        /\bare you closed tomorrow\b/,
        /\bis the store closed today\b/,
        /\bis the store closed tomorrow\b/,
        /\bis your store closed today\b/,
        /\bis your store closed tomorrow\b/,

        /\bvous etes fermes aujourd hui\b/,
        /\bvous etes fermes demain\b/,
        /\ble magasin est ferme aujourd hui\b/,
        /\ble magasin est ferme demain\b/,
      ],
    ) ||
    /*
       * ASSISTANT_SEMANTIC_PRECISION_V37
       *
       * Preserve natural accented French:
       *
       *   Vous êtes fermés demain ?
       *   Êtes-vous fermés demain ?
       *   Vous êtes fermé aujourd'hui ?
       */
      /vous\s+(?:êtes|etes)\s+ferm(?:é|ée|és|ées|e|es)\s+(?:aujourd['’]?hui|demain)/iu.test(
        rawMessage,
      ) ||
      /(?:êtes|etes)[-\s]+vous\s+ferm(?:é|ée|és|ées|e|es)\s+(?:aujourd['’]?hui|demain)/iu.test(
        rawMessage,
      ) ||

    /(مسكرين اليوم|مسكرين بكرا|المحل مسكر اليوم|المحل مسكر بكرا)/.test(
      rawMessage,
    )
  );
}


function broadRelativeClosedAnswerV36(
  rawMessage: string,
  language: Language,
) {
  if (
    !broadClosedQuestionV36(
      rawMessage,
    )
  ) {
    return null;
  }

  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  const clock =
    beirutStoreClockV33();

  const today =
    /\btoday\b/.test(
      normalized,
    ) ||
    /\baujourd hui\b/.test(
      normalized,
    ) ||
    /(اليوم)/.test(
      rawMessage,
    );

  const tomorrow =
    /\btomorrow\b/.test(
      normalized,
    ) ||
    /\bdemain\b/.test(
      normalized,
    ) ||
    /(بكرا|غدا|غداً)/.test(
      rawMessage,
    );

  let dayIndex: number | null =
    null;

  if (today) {
    dayIndex =
      clock.dayIndex;
  } else if (tomorrow) {
    dayIndex =
      (
        clock.dayIndex + 1
      ) % 7;
  }

  if (dayIndex === null) {
    return null;
  }

  const closed =
    !storeDayOpenV33(
      dayIndex,
    );

  const day =
    storeDayLabelV33(
      dayIndex,
      language,
    );

  if (language === "fr") {
    const relative =
      today
        ? "Aujourd’hui"
        : "Demain";

    return closed
      ? `Oui. ${relative} (${day}), le magasin est fermé.`
      : `Non. ${relative} (${day}), le magasin est ouvert de 10h00 à 20h00.`;
  }

  if (language === "ar") {
    const relative =
      today
        ? "اليوم"
        : "بكرا";

    return closed
      ? `نعم. ${relative} (${day}) المتجر مغلق.`
      : `لا. ${relative} (${day}) المتجر مفتوح من 10 صباحاً حتى 8 مساءً.`;
  }

  const relative =
    today
      ? "Today"
      : "Tomorrow";

  return closed
    ? `Yes. ${relative} (${day}), the store is closed.`
    : `No. ${relative} (${day}), the store is open from 10:00 AM to 8:00 PM.`;
}


function broadVisitDayQuestionV36(
  rawMessage: string,
) {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );

  return (
    broadAnyV35(
      normalized,
      [
        /\bcan i come\b/,
        /\bcan i visit\b/,
        /\bcan i stop by\b/,
        /\bcan i pass by\b/,
        /\bare you open\b/,
        /\bare you closed\b/,
        /\bdo you open\b/,
        /\bdo you work\b/,
        /\bare you working\b/,

        /\bje peux venir\b/,
        /\bpuis je venir\b/,
        /\bje peux passer\b/,
        /\bvous ouvrez\b/,
        /\bvous etes ouverts\b/,
        /\bvous etes fermes\b/,
        /\bvous travaillez\b/,
      ],
    ) ||
    /(فيني اجي|فيني أجي|فيني مرق|فاتحين|مسكرين|بتفتحوا)/.test(
      rawMessage,
    )
  );
}


function broadSpecificWeekdayAnswerV36(
  rawMessage: string,
  language: Language,
) {
  if (
    !broadVisitDayQuestionV36(
      rawMessage,
    )
  ) {
    return null;
  }

  const dayIndex =
    storeWeekdayIndexV33(
      rawMessage,
    );

  if (dayIndex === null) {
    return null;
  }

  const day =
    storeDayLabelV33(
      dayIndex,
      language,
    );

  const isOpen =
    storeDayOpenV33(
      dayIndex,
    );

  if (language === "fr") {
    return isOpen
      ? `Oui. Le ${day}, le magasin est ouvert de 10h00 à 20h00.`
      : `Non. Le magasin est fermé le ${day}.`;
  }

  if (language === "ar") {
    return isOpen
      ? `نعم. يوم ${day} المتجر مفتوح من 10 صباحاً حتى 8 مساءً.`
      : `لا. المتجر مغلق يوم ${day}.`;
  }

  return isOpen
    ? `Yes. On ${day}, the store is open from 10:00 AM to 8:00 PM.`
    : `No. The store is closed on ${day}.`;
}


/*
 * ============================================================
 * DIRECT SUPPORT COMPOSER
 * ============================================================
 */
function directStoreSupportResponseV35(
  message: string,
  language: Language,
): string | null {
  const intent =
    detectBroadStoreSupportIntentV35(
      message,
    );

  if (!intent) {
    return null;
  }


  /*
   * STORE HOURS
   */
  if (intent === "hours") {
    return broadHoursResponseV35(
      message,
      language,
    );
  }


  /*
   * LOCATION
   */
  if (intent === "location") {
    return directStoreSupportResponseV32(
      "Where is your physical store?",
      language,
    );
  }


  /*
   * STANDARD DELIVERY TIME
   */
  if (intent === "delivery_time") {
    return directStoreSupportResponseV32(
      "If I order today how long should it take before I receive my stuff?",
      language,
    );
  }


  /*
   * ORDERING / CHECKOUT
   *
   * Use an existing canonical question so the answer remains
   * tied to the current Stereophonie checkout implementation.
   */
  if (intent === "checkout") {
    return (
      directStoreSupportResponseV3(
        "How does ordering from the website work?",
        language,
      ) ??
      directStoreSupportResponse(
        "How do I place an order?",
        language,
      ) ??
      (
        language === "fr"
          ? "Vous pouvez choisir vos produits sur le site puis continuer vers le panier et le checkout pour finaliser la commande."
          : language === "ar"
            ? "يمكنك اختيار المنتجات من الموقع ثم الانتقال إلى السلة وإكمال خطوات الطلب."
            : "Choose your products on the website, add them to your cart, and continue through checkout to place the order."
      )
    );
  }


  /*
   * PAYMENT
   */
  if (intent === "payment") {
    return (
      directStoreSupportResponseV3(
        "What payment methods do you accept?",
        language,
      ) ??
      directStoreSupportResponse(
        "What payment methods do you accept?",
        language,
      ) ??
      (
        language === "fr"
          ? "Je n’ai pas trouvé une réponse de paiement vérifiée pour cette question précise, donc je préfère ne pas inventer un moyen de paiement."
          : language === "ar"
            ? "ما لقيت جواب دفع موثق لهالسؤال بالتحديد، لذلك ما بدي أخترع طريقة دفع."
            : "I couldn’t find a verified payment answer for that specific question, so I don’t want to invent a payment method."
      )
    );
  }


  /*
   * RETURNS
   */
  if (intent === "returns") {
    return directStoreSupportResponseV32(
      "Can I bring something back if I change my mind?",
      language,
    );
  }


  /*
   * WARRANTY / REPAIR
   *
   * Warranty may vary by product, so do not invent a duration.
   */
  if (intent === "warranty") {
    if (language === "fr") {
      return "La garantie et le service peuvent varier selon le produit et la marque. Donnez-moi le produit exact si vous voulez vérifier un article précis ; je ne vais pas inventer une durée ou une couverture.";
    }

    if (language === "ar") {
      return "الكفالة والخدمة ممكن تختلف حسب المنتج والعلامة التجارية. أعطني اسم المنتج بالتحديد إذا بدك نتحقق منه، وما رح أفترض مدة أو تغطية غير مؤكدة.";
    }

    return "Warranty and service can vary by product and brand. Tell me the exact product if you want to check a specific item; I won’t invent a warranty duration or coverage.";
  }


  /*
   * UNVERIFIED POLICY TOPICS
   */
  return unverifiedStorePolicyResponseV35(
    intent,
    language,
  );
}


/*
 * ============================================================
 * SHOPPING / PRODUCT INTENT AUGMENTATION
 * ============================================================
 */
function augmentAssistantRequestV35(
  request: ReturnType<typeof parseAssistantRequest>,
  rawMessage: string,
): ReturnType<typeof parseAssistantRequest> {
  const normalized =
    broadSupportTextV35(
      rawMessage,
    );


  /*
   * Existing-order tracking.
   */
  if (
    personalOrderTrackingSignalV35(
      rawMessage,
    )
  ) {
    return {
      ...request,
      intent: "order_tracking",
      needsClarification: false,
      confidence:
        Math.max(
          request.confidence,
          0.98,
        ),
    };
  }


  /*
   * GIFT
   */
  const giftSignal =
    broadAnyV35(
      normalized,
      [
        /\bgift\b/,
        /\bpresent\b/,
        /\bbirthday gift\b/,
        /\bbirthday present\b/,
        /\banniversary gift\b/,
        /\bchristmas gift\b/,
        /\bgift idea\b/,
        /\bgift ideas\b/,
        /\bsomething for my daughter\b/,
        /\bsomething for my son\b/,
        /\bsomething for my husband\b/,
        /\bsomething for my wife\b/,
        /\bsomething for my boyfriend\b/,
        /\bsomething for my girlfriend\b/,

        /\bcadeau\b/,
        /\bidee cadeau\b/,
        /\bcadeau pour\b/,
      ],
    ) ||
    /(هدية|هديه|بدي جيب شي ل|شو بجيب ل)/.test(
      rawMessage,
    );

  if (giftSignal) {
    return {
      ...request,
      intent: "gift",
      confidence:
        Math.max(
          request.confidence,
          0.94,
        ),
    };
  }


  /*
   * COMPARISON
   */
  const comparisonSignal =
    broadAnyV35(
      normalized,
      [
        /\bcompare\b/,
        /\bcomparison\b/,
        /\bversus\b/,
        /\bvs\b/,
        /\bdifference between\b/,
        /\bdifferences between\b/,
        /\bwhich is better\b/,
        /\bwhich one is better\b/,
        /\bwhich should i choose\b/,
        /\bwhich should i get\b/,

        /\bcomparer\b/,
        /\bcomparaison\b/,
        /\bdifference entre\b/,
        /\blequel est meilleur\b/,
        /\blaquelle est meilleure\b/,
      ],
    ) ||
    /(قارن|مقارنة|شو الفرق|ما الفرق|مين احسن|مين أفضل|أيهما أفضل)/.test(
      rawMessage,
    );

  if (comparisonSignal) {
    return {
      ...request,
      intent: "comparison",
      needsClarification: false,
      confidence:
        Math.max(
          request.confidence,
          0.96,
        ),
    };
  }


  /*
   * OFFERS / SALE
   */
  const offerSignal =
    broadAnyV35(
      normalized,
      [
        /\bon sale\b/,
        /\bsale price\b/,
        /\bsale products\b/,
        /\bdiscount\b/,
        /\bdiscounted\b/,
        /\bdiscounts\b/,
        /\bdeal\b/,
        /\bdeals\b/,
        /\bpromotion\b/,
        /\bpromotions\b/,
        /\bpromo\b/,
        /\bspecial offer\b/,
        /\bspecial offers\b/,
        /\bprice drop\b/,
        /\breduced price\b/,
        /\bwhat s on sale\b/,
        /\bwhat is on sale\b/,

        /\bremise\b/,
        /\bpromo\b/,
        /\bpromotion\b/,
        /\bsolde\b/,
        /\bsoldes\b/,
        /\breduction\b/,
        /\boffre speciale\b/,
      ],
    ) ||
    /(عرض|عروض|خصم|خصومات|تنزيلات|تخفيض|تخفيضات)/.test(
      rawMessage,
    );

  if (offerSignal) {
    return {
      ...request,
      intent: "offers",
      needsClarification: false,
      confidence:
        Math.max(
          request.confidence,
          0.94,
        ),
    };
  }


  /*
   * RECOMMENDATION
   */
  const recommendationSignal =
    broadAnyV35(
      normalized,
      [
        /\bwhat should i buy\b/,
        /\bwhat should i get\b/,
        /\bwhat do you recommend\b/,
        /\bwhat would you recommend\b/,
        /\brecommend me\b/,
        /\brecommend something\b/,
        /\bsuggest something\b/,
        /\bsuggest me\b/,
        /\bhelp me choose\b/,
        /\bhelp me pick\b/,
        /\bhelp me decide\b/,
        /\bwhat is the best\b/,
        /\bwhat s the best\b/,
        /\bwhich one should i buy\b/,
        /\bwhich one should i get\b/,
        /\bworth buying\b/,
        /\bgood option for\b/,

        /\bque me conseillez vous\b/,
        /\bque recommandez vous\b/,
        /\bvous me conseillez\b/,
        /\baidez moi a choisir\b/,
        /\baide moi a choisir\b/,
        /\bquel est le meilleur\b/,
      ],
    ) ||
    /(شو بتنصح|شو تنصح|شو بشتري|شو أشتري|شو اشتري|ساعدني اختار|ساعدني أختار|شو الاحسن|شو الأفضل|شو احسن)/.test(
      rawMessage,
    );

  /*
   * ASSISTANT_NATURAL_FRENCH_SHOPPING_V39
   *
   * A category-directed French shopping request is advice,
   * not an exact model lookup. Preserve budget/category/brand,
   * while removing the leftover free-form product query.
   *
   * Do not capture verified support, stock, price, comparison
   * or gift requests. Exact model requests remain separate.
   */
  const frenchExactModelSignalV39 =
    /\b(?:iphone|ipad|galaxy|pixel|airpods|apple watch)\s+(?:(?:pro|air|series|tab|s|a)\s+)?\d{1,3}\b/.test(
      normalized,
    ) ||
    /\b(?:macbook|ipad)\s+(?:air|pro)\s+m\d+\b/.test(
      normalized,
    );

  const frenchCategoryShoppingSignalV39 =
    Boolean(request.category) &&
    ![
      "gift",
      "comparison",
      "offers",
      "availability",
      "price_question",
      "store_info",
      "order_tracking",
    ].includes(request.intent) &&
    !frenchExactModelSignalV39 &&
    !/\b(?:combien coute|combien coutent|quel est le prix|prix de|en stock|disponible|avez vous|vous avez)\b/.test(
      normalized,
    ) &&
    (
      /\bje (?:cherche|recherche) (?:un|une|des)\b/.test(normalized) ||
      /\bje (?:veux|voudrais|souhaite) acheter (?:un|une|des)\b/.test(normalized) ||
      /\b(?:je voudrais|j aimerais) (?:un|une|des)\b/.test(normalized) ||
      /\bquel(?:le|s|les)?\b.{0,75}\bme conseillez vous\b/.test(normalized) ||
      /\bqu est ce que vous me conseillez\b/.test(normalized)
    );

  if (recommendationSignal || frenchCategoryShoppingSignalV39) {
    return {
      ...request,
      intent: "recommendation",
      ...(frenchCategoryShoppingSignalV39
        ? {
            productQuery: null,
            needsClarification: false,
          }
        : {}),
      confidence:
        Math.max(
          request.confidence,
          0.92,
        ),
    };
  }


  /*
   * PRICE
   */
  const priceSignal =
    broadAnyV35(
      normalized,
      [
        /\bhow much is\b/,
        /\bhow much does\b/,
        /\bwhat is the price\b/,
        /\bwhat s the price\b/,
        /\bprice of\b/,
        /\bcost of\b/,
        /\bhow much for\b/,

        /\bcombien coute\b/,
        /\bquel est le prix\b/,
        /\bprix de\b/,
      ],
    ) ||
    /(قديش سعر|كم سعر|شو سعر|بكم|كم حق)/.test(
      rawMessage,
    );

  if (
    priceSignal &&
    request.productQuery
  ) {
    return {
      ...request,
      intent: "price_question",
      confidence:
        Math.max(
          request.confidence,
          0.96,
        ),
    };
  }


  /*
   * AVAILABILITY / STOCK
   */
  const availabilitySignal =
    broadAnyV35(
      normalized,
      [
        /\bin stock\b/,
        /\bout of stock\b/,
        /\blow stock\b/,
        /\bavailable\b/,
        /\bavailability\b/,
        /\bdo you have\b/,
        /\bhave you got\b/,
        /\bdo you carry\b/,
        /\bdo you sell\b/,
        /\bstill available\b/,
        /\bcoming soon\b/,
        /\bfew left\b/,
        /\bany left\b/,

        /\ben stock\b/,
        /\brupture de stock\b/,
        /\bdisponible\b/,
        /\bdisponibilite\b/,
        /\bavez vous\b/,
        /\bvous avez\b/,
      ],
    ) ||
    /(متوفر|موجود|عندكم|خلص من الستوك|نفد|قريب ينزل|كم باقي)/.test(
      rawMessage,
    );

  if (
    availabilitySignal &&
    request.productQuery
  ) {
    return {
      ...request,
      intent: "availability",
      confidence:
        Math.max(
          request.confidence,
          0.94,
        ),
    };
  }


  return request;
}

function directStoreSupportResponseV32(
  message: string,
  language: Language,
): string | null {
  const normalized =
    normalizeAssistantLanguageV2(
      message,
    );


  /*
   * DELIVERY
   */
  const deliverySignal =
    /\bhow long\b.*\b(receive|get|arrive|arrival|order|package|parcel|delivery|shipping|stuff)\b/.test(
      normalized,
    ) ||
    /\bif i order\b.*\b(receive|get|arrive|take|long)\b/.test(
      normalized,
    ) ||
    /\bwhen will\b.*\b(order|package|parcel|stuff)\b.*\b(arrive|get here|reach me)\b/.test(
      normalized,
    ) ||
    /\breceive my (?:order|package|parcel|stuff)\b/.test(
      normalized,
    );

  if (deliverySignal) {
    if (language === "fr") {
      return "La livraison standard prend généralement entre 1 et 4 jours ouvrables.";
    }

    if (language === "ar") {
      return "يستغرق التوصيل عادةً من يوم إلى 4 أيام عمل.";
    }

    return "Standard delivery usually takes 1–4 working days.";
  }


  /*
   * RETURNS
   */
  const returnSignal =
    /\b(return|refund|exchange)\b/.test(
      normalized,
    ) ||
    /\bbring\b.*\bback\b/.test(
      normalized,
    ) ||
    /\bsend\b.*\bback\b/.test(
      normalized,
    ) ||
    /\bgive\b.*\bback\b/.test(
      normalized,
    ) ||
    /\bchange my mind\b/.test(
      normalized,
    ) ||
    /\b(retourner|renvoyer|rembourser|echanger|échanger|changer d avis|changer d'avis)\b/.test(
      normalized,
    ) ||
    /(ارجع|أرجع|إرجاع|ارجاع|استرجاع|تبديل)/.test(
      message,
    );

  if (returnSignal) {
    if (language === "fr") {
      return "La politique actuelle de Stereophonie est une politique sans retour. Si vous avez un problème précis avec un produit ou une commande, expliquez-moi le cas et je vous guiderai vers l’étape la plus appropriée.";
    }

    if (language === "ar") {
      return "سياسة Stereophonie الحالية هي عدم قبول الإرجاع. إذا كانت لديك مشكلة محددة بمنتج أو بطلب، اشرح لي الحالة وسأساعدك بالخطوة الأنسب.";
    }

    return "Stereophonie currently has a No Returns policy. If you have a specific problem with a product or an order, tell me what happened and I’ll guide you to the most appropriate next step.";
  }


  /*
   * STORE LOCATION
   */
  const locationSignal =
    /\bwhere is your (?:physical )?(?:store|shop)\b/.test(
      normalized,
    ) ||
    /\bwhere is the (?:physical )?(?:store|shop)\b/.test(
      normalized,
    ) ||
    /\bwhere can i find your (?:store|shop)\b/.test(
      normalized,
    ) ||
    /\bphysical (?:store|shop) location\b/.test(
      normalized,
    ) ||
    /\b(ou est votre magasin|où est votre magasin|ou se trouve votre magasin|où se trouve votre magasin)\b/.test(
      normalized,
    ) ||
    /(وين محلكم|أين متجركم|اين متجركم|وين المتجر)/.test(
      message,
    );

  if (locationSignal) {
    if (language === "fr") {
      return "Stereophonie se trouve à Mtaileb, au Liban.";
    }

    if (language === "ar") {
      return "متجر Stereophonie موجود في المطيلب، لبنان.";
    }

    return "Stereophonie is located in Mtaileb, Lebanon.";
  }


  /*
   * STORE HOURS / OPENING DAYS
   *
   * V3.3 handles broad natural-language scenarios and returns
   * the most specific answer possible.
   */
  const storeHoursAnswer =
    storeHoursAnswerV33(
      message,
      language,
    );

  if (storeHoursAnswer) {
    return storeHoursAnswer;
  }


  return null;
}


function sameCatalogFamilyVariantV32(
  previousProduct: AssistantProduct,
  candidate: AssistantProduct,
  qualifier: string,
) {
  const previousCategory =
    normalizeCatalogIdentityV3(
      previousProduct.category,
    );

  const candidateCategory =
    normalizeCatalogIdentityV3(
      candidate.category,
    );

  if (
    previousCategory &&
    candidateCategory !==
      previousCategory
  ) {
    return false;
  }

  const previousName =
    normalizeCatalogIdentityV3(
      previousProduct.name,
    );

  const candidateName =
    normalizeCatalogIdentityV3(
      candidate.name,
    );

  const qualifierTerms =
    normalizeCatalogIdentityV3(
      qualifier,
    )
      .split(/\s+/)
      .filter(
        (term) =>
          term.length >= 2,
      );

  if (qualifierTerms.length === 0) {
    return false;
  }

  const candidateWords =
    candidateName.split(/\s+/);

  if (
    !qualifierTerms.every(
      (term) =>
        candidateWords.includes(term),
    )
  ) {
    return false;
  }

  /*
   * Variant words do not define the family itself.
   */
  const variantWords =
    new Set([
      "pro",
      "max",
      "plus",
      "ultra",
      "mini",
      "air",
      "se",
      "fe",
      "lite",
    ]);

  /*
   * Skip the first token because it is commonly the brand.
   *
   * Apple iPhone 18 Pro
   * -> iphone 18
   */
  const previousFamilyWords =
    previousName
      .split(/\s+/)
      .slice(1)
      .filter(
        (word) =>
          word.length >= 2 &&
          !variantWords.has(word),
      );

  if (
    previousFamilyWords.length === 0
  ) {
    return false;
  }

  return previousFamilyWords.every(
    (word) =>
      candidateWords.includes(word),
  );
}


function resolveConversationVariantFollowUpV32(
  catalog: AssistantProduct[],
  rawMessage: string,
  previousMessages: IncomingMessage[],
) {
  const normalized =
    normalizeCatalogIdentityV3(
      rawMessage,
    );

  const followUpMatch =
    normalized.match(
      /^(?:what about|how about)(?: the)? (.+)$/,
    );

  if (!followUpMatch) {
    return null;
  }

  const qualifier =
    followUpMatch[1].trim();

  if (
    !qualifier ||
    qualifier.split(/\s+/).length > 4
  ) {
    return null;
  }

  const previousUserMessages =
    [...previousMessages]
      .reverse()
      .filter(
        (message) =>
          message.role === "user",
      );

  for (
    const previousMessage
    of previousUserMessages
  ) {
    const previousProduct =
      resolveMostSpecificCatalogProductV3(
        catalog,
        previousMessage.content,
      ) ??
      resolveExactCatalogProduct(
        catalog,
        previousMessage.content,
      );

    if (!previousProduct) {
      continue;
    }

    const candidates =
      catalog
        .filter(
          (candidate) =>
            candidate.id !==
              previousProduct.id &&
            sameCatalogFamilyVariantV32(
              previousProduct,
              candidate,
              qualifier,
            ),
        )
        .sort(
          (first, second) =>
            second.name.length -
            first.name.length,
        );

    if (candidates.length > 0) {
      return candidates[0];
    }
  }

  return null;
}


function strictCategoryCatalogScopeV32(
  products: RankedAssistantProduct[],
  request: ReturnType<typeof parseAssistantRequest>,
  rawMessage: string,
  fallbackToOriginal = true,
) {
  const normalized =
    normalizeAssistantLanguageV2(
      rawMessage,
    );

  const requestedCategory =
    normalizeCatalogIdentityV3(
      request.category,
    );

  let scope:
    | "phone"
    | "tablet"
    | "laptop"
    | null = null;

  if (
    /\b(phones?|smartphones?|mobile phones?)\b/.test(
      normalized,
    ) ||
    requestedCategory.includes("phone")
  ) {
    scope = "phone";
  } else if (
    /\b(tablets?|ipads?)\b/.test(
      normalized,
    ) ||
    requestedCategory.includes("tablet")
  ) {
    scope = "tablet";
  } else if (
    /\b(laptops?|notebooks?)\b/.test(
      normalized,
    ) ||
    requestedCategory.includes("laptop")
  ) {
    scope = "laptop";
  }

  if (!scope) {
    return products;
  }

  const filtered =
    products.filter(
      (product) => {
        const category =
          normalizeCatalogIdentityV3(
            product.category,
          );

        const name =
          normalizeCatalogIdentityV3(
            product.name,
          );

        const combined =
          `${category} ${name}`;

        /*
         * Explicitly reject accessories that merely mention
         * the device category/model.
         */
        const accessory =
          /\b(case|cover|screen protector|protector|tempered glass|privacy glass|charger|charging|cable|adapter|holder|mount|stand|skin|sleeve)\b/.test(
            combined,
          );

        if (accessory) {
          return false;
        }

        if (scope === "phone") {
          return (
            category.includes(
              "mobile phone",
            ) ||
            category === "phones" ||
            category === "phone" ||
            category === "smartphones"
          );
        }

        if (scope === "tablet") {
          return category.includes(
            "tablet",
          );
        }

        if (scope === "laptop") {
          return category.includes(
            "laptop",
          );
        }

        return true;
      },
    );

  /*
   * Defensive fallback in case the live category name changes.
   */
  return (
    filtered.length > 0 ||
    !fallbackToOriginal
  )
    ? filtered
    : products;
}

/* ASSISTANT_SUPPORT_INTELLIGENCE_V1 */

/*
 * Clear store-support questions are handled before old shopping
 * memory and product ranking.
 *
 * This prevents a prior product discussion from contaminating
 * questions such as:
 *
 *   "how many days does delivery take?"
 */
function directStoreSupportResponse(
  message: string,
  language: Language,
): string | null {
  const normalized = message
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  const deliveryQuestion =
    /\b(delivery|deliver|delivered|shipping|ship|shipped|arrival|arrive|arrives|delivery time|shipping time|how long does delivery take|how long does shipping take|how long does it take|when should it arrive|when will it arrive|when should my package arrive)\b/i.test(
      normalized,
    ) ||
    /\b(livraison|livrer|livré|expédition|expédier|arriver|délai)\b/i.test(
      normalized,
    ) ||
    /(التوصيل|توصيل|الشحن|شحن|يوصل|تصل|الوصول)/.test(
      message,
    );

  if (deliveryQuestion) {
    const existingOrder =
      /\b(my order|my package|my parcel|order i placed|package i ordered)\b/i.test(
        normalized,
      ) ||
      /\b(ma commande|mon colis)\b/i.test(
        normalized,
      ) ||
      /(طلبي|شحنتي)/.test(
        message,
      );

    if (language === "fr") {
      return existingOrder
        ? "La livraison standard prend généralement entre 1 et 4 jours ouvrables. Si vous parlez d’une commande déjà passée, je peux aussi vous aider à vérifier son suivi."
        : "La livraison standard prend généralement entre 1 et 4 jours ouvrables.";
    }

    if (language === "ar") {
      return existingOrder
        ? "يستغرق التوصيل عادةً من يوم إلى 4 أيام عمل. إذا كنت تقصد طلباً تم تسجيله بالفعل، يمكنني أيضاً مساعدتك في التحقق من حالة التتبع."
        : "يستغرق التوصيل عادةً من يوم إلى 4 أيام عمل.";
    }

    return existingOrder
      ? "Standard delivery usually takes 1–4 working days. If you mean an order you already placed, I can also help you check its tracking status."
      : "Standard delivery usually takes 1–4 working days.";
  }

  const paymentQuestion =
    /\b(payment|payment method|payment methods|pay|paying|card|credit card|debit card|visa|mastercard|apple pay|google pay|cash on delivery|cod)\b/i.test(
      normalized,
    ) ||
    /\b(paiement|payer|carte bancaire|carte de credit|carte de crédit|visa|mastercard)\b/i.test(
      normalized,
    ) ||
    /(دفع|طريقة الدفع|بطاقة|فيزا|ماستركارد|كاش)/.test(
      message,
    );

  if (paymentQuestion) {
    if (language === "fr") {
      return "Aucun paiement n’est encaissé pendant l’étape de vérification du checkout. Après avoir passé la commande, Stereophonie vous contacte pour confirmer la livraison et les modalités de paiement. Le paiement par carte n’est pas proposé directement au checkout.";
    }

    if (language === "ar") {
      return "لا يتم تحصيل أي دفعة أثناء مرحلة مراجعة الطلب. بعد تسجيل الطلب، يتواصل معك Stereophonie لتأكيد التوصيل وطريقة الدفع. الدفع بالبطاقة غير متاح مباشرةً في صفحة إتمام الطلب.";
    }

    return "No payment is collected during the checkout review step. After you place the order, Stereophonie contacts you to confirm delivery and the payment arrangement. Card payment is not currently offered directly at checkout.";
  }


  const returnsQuestion =
    /\b(return|returns|return policy|refund|refunds|send it back|give it back)\b/i.test(
      normalized,
    ) ||
    /\b(retour|retours|remboursement|rembourser|politique de retour)\b/i.test(
      normalized,
    ) ||
    /(إرجاع|ارجاع|استرجاع|رد المنتج|سياسة الإرجاع)/.test(
      message,
    );

  if (returnsQuestion) {
    if (language === "fr") {
      return "La politique actuelle de Stereophonie est une politique sans retour. Si vous avez un problème précis avec un produit ou une commande, expliquez-moi le cas et je vous guiderai vers l’étape la plus appropriée.";
    }

    if (language === "ar") {
      return "سياسة Stereophonie الحالية هي عدم قبول الإرجاع. إذا كانت لديك مشكلة محددة بمنتج أو بطلب، اشرح لي الحالة وسأساعدك بالخطوة الأنسب.";
    }

    return "Stereophonie currently has a No Returns policy. If you have a specific problem with a product or an order, tell me what happened and I’ll guide you to the most appropriate next step.";
  }


  const checkoutQuestion =
    /\b(how do i order|how can i order|place an order|placing an order|how to buy|checkout process|checkout steps|how does checkout work)\b/i.test(
      normalized,
    ) ||
    /\b(comment commander|passer une commande|comment acheter|processus de commande|checkout)\b/i.test(
      normalized,
    ) ||
    /(كيف اطلب|كيف أطلب|كيف اشتري|كيف أشتري|إتمام الطلب)/.test(
      message,
    );

  if (checkoutQuestion) {
    if (language === "fr") {
      return "Pour commander, ajoutez les produits souhaités au panier puis passez au checkout. Vous renseignez vos coordonnées et votre adresse de livraison, vous vérifiez la commande, puis vous la confirmez. Aucun paiement n’est encaissé pendant cette étape ; Stereophonie vous contacte ensuite pour confirmer la livraison et le paiement.";
    }

    if (language === "ar") {
      return "لإتمام الطلب، أضف المنتجات إلى السلة ثم انتقل إلى صفحة إتمام الطلب. أدخل معلومات التواصل وعنوان التوصيل، راجع الطلب ثم أكده. لا يتم تحصيل الدفع في هذه المرحلة؛ يتواصل معك Stereophonie بعد ذلك لتأكيد التوصيل وطريقة الدفع.";
    }

    return "To place an order, add the products you want to your cart and continue to checkout. Enter your contact information and delivery address, review the order, then place it. No payment is collected during that step; Stereophonie contacts you afterward to confirm delivery and payment.";
  }


  const storeInfoQuestion =
    /\b(where are you located|where is stereophonie|store location|shop location|your address|opening hours|store hours|what time do you open|what time do you close|when are you open|are you open today)\b/i.test(
      normalized,
    ) ||
    /\b(ou etes vous|où êtes-vous|adresse du magasin|heures d ouverture|heures d'ouverture|horaires|quand etes vous ouvert|quand êtes-vous ouvert)\b/i.test(
      normalized,
    ) ||
    /(وين المحل|اين المتجر|أين المتجر|عنوان المحل|ساعات العمل|متى تفتحون|متى تسكرون)/.test(
      message,
    );

  if (storeInfoQuestion) {
    if (language === "fr") {
      return "Stereophonie se trouve à Mtaileb, au Liban. Le magasin est ouvert du lundi au samedi de 10h00 à 20h00 et fermé le dimanche.";
    }

    if (language === "ar") {
      return "متجر Stereophonie موجود في المطيلب، لبنان. يفتح من الاثنين إلى السبت من الساعة 10 صباحاً حتى 8 مساءً، ويغلق يوم الأحد.";
    }

    return "Stereophonie is located in Mtaileb, Lebanon. The store is open Monday through Saturday from 10:00 AM to 8:00 PM and closed on Sunday.";
  }


  const genericWarrantyQuestion =
    /\b(do you offer warranty|do you have warranty|warranty policy|what is your warranty|how does warranty work)\b/i.test(
      normalized,
    ) ||
    /\b(garantie magasin|politique de garantie|avez vous une garantie|avez-vous une garantie)\b/i.test(
      normalized,
    ) ||
    /(هل يوجد ضمان|هل عندكم ضمان|سياسة الضمان)/.test(
      message,
    );

  if (genericWarrantyQuestion) {
    if (language === "fr") {
      return "La garantie peut varier selon le produit et la marque. Donnez-moi le produit exact et je m’appuierai uniquement sur les informations disponibles dans le catalogue ; si la garantie n’y est pas précisée, je ne l’inventerai pas.";
    }

    if (language === "ar") {
      return "الضمان يمكن أن يختلف حسب المنتج والعلامة التجارية. أعطني اسم المنتج بالتحديد وسأعتمد فقط على المعلومات الموجودة في الكتالوج، وإذا لم تكن معلومات الضمان مذكورة فلن أخمّنها.";
    }

    return "Warranty coverage can vary by product and brand. Tell me the exact product and I’ll rely only on the information available in the catalog; if warranty details are not specified there, I won’t guess.";
  }


  return null;
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
     * ASSISTANT_LANGUAGE_INTELLIGENCE_V2
     *
     * Expand natural customer wording into the assistant's existing
     * canonical intents/preferences/use cases.
     */
    parsed = augmentAssistantRequestV2(
      parsed,
      rawMessage,
    );

    parsed = refineAssistantRequestV32(
      parsed,
      rawMessage,
    );

    parsed = augmentAssistantRequestV35(
      parsed,
      rawMessage,
    );

    const normalizedFreshProductQuery =
      parsed.productQuery
        ? normalizeProductReference(
            parsed.productQuery,
          )
        : "";

    const genericProductFollowUp =
      /^(price|cost|stock|availability|available|in stock|out of stock|low stock|coming soon|what about it|what about that one|that one|this one|it)$/.test(
        normalizedFreshProductQuery,
      );

    /*
     * A genuine product phrase in THIS message should not inherit
     * an unrelated product from conversation memory.
     */
    const hasFreshProductQuery =
      Boolean(normalizedFreshProductQuery) &&
      !genericProductFollowUp;

    /*
     * General support always wins over previous shopping context.
     */
    /*
     * ASSISTANT_INTENT_BOUNDARIES_V36
     */
    const broadSupportIntentV36 =
      detectBroadStoreSupportIntentV35(
        rawMessage,
      );

    const shoppingOwnsMessageV36 =
      shoppingIntentOwnsMessageV36(
        parsed.intent,
      );

    /*
     * If the parser clearly identified a product-shopping
     * request and the broad support detector only thinks this
     * might be an hours question, the shopping intent wins.
     *
     * Example:
     * "What's on sale right now?"
     */
    const productIntentOverridesHoursV36 =
      shoppingOwnsMessageV36 &&
      parsed.intent !== "order_tracking" &&
      broadSupportIntentV36 === "hours";

    /*
     * Existing-order questions always continue to the real
     * order-tracking branch below.
     */
    const v35DirectSupportAnswer =
      parsed.intent === "order_tracking" ||
      productIntentOverridesHoursV36
        ? null
        : directStoreSupportResponseV35(
            rawMessage,
            language,
          );

    /*
     * Once V3.5 recognizes a shopping/order intent, old generic
     * support routers are not allowed to reinterpret it.
     */
    const legacySupportBlockedV36 =
      shoppingOwnsMessageV36;

    const directSupportAnswer =
      v35DirectSupportAnswer ??
      (
        legacySupportBlockedV36
          ? null
          : (
              directStoreSupportResponseV32(
                rawMessage,
                language,
              ) ??
              directStoreSupportResponseV3(
                rawMessage,
                language,
              ) ??
              directStoreSupportResponse(
                rawMessage,
                language,
              )
            )
      );

    if (directSupportAnswer) {
      return NextResponse.json({
        message: directSupportAnswer,
        products: [],
        cartActions: [],
        wishlistActions: [],
        navigationActions: [],
        language,
        engine: "stereophonie-local-v5",
      });
    }

    const giftGuidanceAnswer =
      giftClarificationResponseV32(
        parsed,
        rawMessage,
      ) ??
      giftAdvisorClarificationV2(
        parsed,
        rawMessage,
      );

    if (giftGuidanceAnswer) {
      return NextResponse.json({
        message: giftGuidanceAnswer,
        products: [],
        cartActions: [],
        wishlistActions: [],
        navigationActions: [],
        language,
        engine: "stereophonie-local-v6",
      });
    }


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
      explicitIntentBeforeMemory !== "help" &&
      !hasFreshProductQuery
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
      detectAvailabilityCatalogFilter(rawMessage) ??
      detectAvailabilityCatalogFilterV2(
        rawMessage,
      );

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
      resolveConversationVariantFollowUpV32(
        catalog,
        rawMessage,
        incomingMessages.slice(0, -1),
      ) ??
      resolveMostSpecificCatalogProductV3(
        catalog,
        rawMessage,
      ) ??
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
      (
        hasFreshProductQuery
          ? null
          : resolveContextualCatalogProduct(
              catalog,
              rawMessage,
              assistantContext,
            )
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

      const exactComparisonProducts =
        findComparisonProductsV3(
          catalog,
          rawMessage,
        );

      const comparisonProducts =
        exactComparisonProducts.length >= 2
          ? exactComparisonProducts
          : findComparisonProducts(
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

    /*
     * Offer requests must use REAL current sale pricing.
     * Do not show ordinary full-price products as "offers".
     */
    const offerAwareRankedCatalog =
      parsed.intent === "offers"
        ? rankedCatalog.filter(
            (product) =>
              product.variants.some(
                (variant) =>
                  variant.salePrice !== null &&
                  variant.salePrice > 0 &&
                  variant.regularPrice > variant.salePrice,
              ),
          )
        : rankedCatalog;

    const categoryScopedRankedCatalog =
      strictCategoryCatalogScopeV32(
        offerAwareRankedCatalog,
        parsed,
        rawMessage,

          /*
           * ASSISTANT_SEMANTIC_PRECISION_V37
           *
           * General recommendations may still fall back.
           * Explicit offer categories may not.
           */
          parsed.intent !== "offers",
        );

    const ranked =
      topAssistantProducts(
        categoryScopedRankedCatalog,
        parsed,
        4,
      );

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
        /*
         * ASSISTANT_SEMANTIC_PRECISION_V37
         *
         * If the shopper requests a category, returning an
         * unrelated category is worse than returning no result.
         */
        if (selectedProducts.length === 0) {
          const normalizedOfferRequest =
            normalizeAssistantLanguageV2(
              rawMessage,
            );

          const phoneOfferRequest =
            /\b(phones?|smartphones?|mobile phones?)\b/.test(
              normalizedOfferRequest,
            );

          const tabletOfferRequest =
            /\b(tablets?|ipads?)\b/.test(
              normalizedOfferRequest,
            );

          const laptopOfferRequest =
            /\b(laptops?|notebooks?)\b/.test(
              normalizedOfferRequest,
            );

          let emptyOfferMessage: string;

          if (language === "fr") {
            emptyOfferMessage =
              phoneOfferRequest
                ? "Je ne vois actuellement aucune offre active sur les téléphones dans le catalogue publié."
                : tabletOfferRequest
                  ? "Je ne vois actuellement aucune offre active sur les tablettes dans le catalogue publié."
                  : laptopOfferRequest
                    ? "Je ne vois actuellement aucune offre active sur les ordinateurs portables dans le catalogue publié."
                    : "Je ne vois actuellement aucune offre active correspondant à votre demande dans le catalogue publié.";
          } else if (language === "ar") {
            emptyOfferMessage =
              phoneOfferRequest
                ? "لا أرى حالياً أي عروض فعّالة على الهواتف ضمن الكتالوج المنشور."
                : tabletOfferRequest
                  ? "لا أرى حالياً أي عروض فعّالة على الأجهزة اللوحية ضمن الكتالوج المنشور."
                  : laptopOfferRequest
                    ? "لا أرى حالياً أي عروض فعّالة على أجهزة اللابتوب ضمن الكتالوج المنشور."
                    : "لا أرى حالياً أي عروض فعّالة تطابق طلبك ضمن الكتالوج المنشور.";
          } else {
            emptyOfferMessage =
              phoneOfferRequest
                ? "I don’t see any active phone offers in the current published catalog."
                : tabletOfferRequest
                  ? "I don’t see any active tablet offers in the current published catalog."
                  : laptopOfferRequest
                    ? "I don’t see any active laptop offers in the current published catalog."
                    : "I don’t see any active offers matching that request in the current published catalog.";
          }

          return NextResponse.json({
            message:
              emptyOfferMessage,

            products: [],

            cartActions,
            wishlistActions,
            navigationActions,

            language,

            engine:
              "stereophonie-local-v7",
          });
        }


        return NextResponse.json({
          message:
            composeOfferResponse(
              ranked,
              resolvedParsed,
            ),

          products:
            selectedProducts
              .slice(0, 4)
              .map(
                assistantProductForResponse,
              ),

          cartActions,
          wishlistActions,
          navigationActions,

          language,

          engine:
            "stereophonie-local-v7",
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
        message:
          professionalRecommendationResponseV3(
            resolvedParsed,
            selectedProducts.slice(0, 4),
            rawMessage,
            language,
          ) ??
          composeRecommendationResponse(
            resolvedParsed,
            ranked,
          ),

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
