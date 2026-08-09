import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Language = "en" | "fr" | "ar";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProductImageRow = {
  image_url?: string | null;
  alt_text?: string | null;
  position?: number | null;
  is_primary?: boolean | null;
};

type ProductVariantRow = {
  id: string;
  size?: string | null;
  regular_price?: number | string | null;
  sale_price?: number | string | null;
  stock_quantity?: number | null;
  availability_status?: string | null;
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

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  categories: CategoryRelation;
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
  category: string;
  imageUrl: string | null;
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

function getPrimaryImage(images: ProductImageRow[]) {
  return [...images]
    .sort((first, second) => {
      if (Boolean(first.is_primary) !== Boolean(second.is_primary)) {
        return first.is_primary ? -1 : 1;
      }

      return (first.position ?? 999) - (second.position ?? 999);
    })
    .find((image) => Boolean(image.image_url));
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

function mapProduct(product: ProductRow): AssistantProduct {
  const variants = (product.product_variants ?? [])
    .map(mapVariant)
    .filter((variant) => variant.currentPrice > 0)
    .sort((first, second) => first.currentPrice - second.currentPrice);

  const purchasablePrices = variants
    .filter((variant) => variant.purchasable)
    .map((variant) => variant.currentPrice);

  const primaryImage = getPrimaryImage(product.product_images ?? []);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug ?? product.id,
    description: product.description,
    category: getCategoryName(product.categories),
    imageUrl: primaryImage?.image_url ?? null,
    imageAlt: primaryImage?.alt_text || product.name,
    price: purchasablePrices.length > 0 ? Math.min(...purchasablePrices) : null,
    variants,
  };
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
  const words = normalizeWords(query);

  if (words.length === 0) {
    return true;
  }

  const searchable = normalizeWords(
    [product.name, product.category, product.description ?? ""].join(" "),
  ).join(" ");

  return words.some((word) => searchable.includes(word));
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

  const requestedLimit = Number(argumentsValue.limit);

  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 8)
    : 6;

  const supabase = createAdminClient();

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
      product_images (
        image_url,
        alt_text,
        position,
        is_primary
      ),
      product_variants (
        id,
        size,
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
    .limit(100);

  if (error) {
    console.error("Assistant catalog tool failed:", error);

    throw new Error("The live catalog could not be searched.");
  }

  return ((data ?? []) as ProductRow[])
    .map(mapProduct)
    .filter((product) => {
      if (category && !product.category.toLowerCase().includes(category)) {
        return false;
      }

      if (query && !productMatchesQuery(product, query)) {
        return false;
      }

      const matchingVariants = product.variants.filter((variant) => {
        if (!variant.purchasable) {
          return false;
        }

        if (size && variant.size.toLowerCase() !== size) {
          return false;
        }

        if (maximumPrice !== null && variant.currentPrice > maximumPrice) {
          return false;
        }

        return true;
      });

      product.variants = matchingVariants;

      product.price =
        matchingVariants.length > 0
          ? Math.min(...matchingVariants.map((variant) => variant.currentPrice))
          : null;

      return matchingVariants.length > 0;
    })
    .slice(0, limit);
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
Verified Nita Style checkout and customer-support information:

Checkout:
- Checkout begins at /checkout.
- The customer enters contact information and a delivery address during checkout.
- The customer reviews the products, contact information and delivery information before placing the order.
- No payment is collected on the checkout review page.
- After the order is placed, the customer is contacted to confirm delivery and payment arrangements.
- Do not claim that a specific payment method such as cash, card, bank transfer or cash on delivery is supported unless it is explicitly verified elsewhere.
- Never ask the customer to send card numbers, passwords, security codes or banking credentials in the assistant chat.

Order tracking:
- Order tracking is available at /track-order.
- To track an order, the customer must enter the order number and the email address used during checkout.
- An example order-number format shown on the tracking page is NITA-000123.
- The assistant must not request or display order information directly because tracking is handled securely on the tracking page.

Returns:
- Nita Style currently has a No Returns policy.
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
You are the official Nita Style AI shopping assistant.

${languageInstruction}

Nita Style sells selected Italian women's apparel and fashion accessories.

You are a professional, warm, elegant and concise ecommerce concierge.

Capabilities:
- Hold a natural conversation.
- Answer general fashion and styling questions.
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
- Never invent a Nita Style product, price, size, stock level, discount or availability.
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
        "Search Nita Style's live published catalog and return purchasable products, variants, current prices, sizes and stock.",
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
              "Catalog category such as Bags, Dresses, Tops, T-Shirts, Skirts, Pants, Scarves or Overalls. Use an empty string when unspecified.",
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

export async function POST(request: Request) {
  let language: Language = "en";

  try {
    const body = (await request.json()) as {
      messages?: unknown;
      language?: unknown;
      cart?: unknown;
      wishlist?: unknown;
    };

    language = normalizeLanguage(body.language);

    const incomingMessages = normalizeMessages(body.messages);

    const cart = normalizeCart(body.cart);

    const wishlist = normalizeWishlist(body.wishlist);

    if (
      incomingMessages.length === 0 ||
      incomingMessages.at(-1)?.role !== "user"
    ) {
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

    const conversation: OllamaMessage[] = [
      {
        role: "system",
        content: getSystemInstruction(language),
      },
      {
        role: "system",
        content: getCartContext(cart),
      },
      {
        role: "system",
        content: getStoreSupportContext(),
      },
      {
        role: "system",
        content: getWishlistContext(wishlist),
      },
      ...incomingMessages,
    ];

    const displayedProducts = new Map<string, AssistantProduct>();

    const cartActions: AssistantCartAction[] = [];

    const wishlistActions: AssistantWishlistAction[] = [];

    const navigationActions: AssistantNavigationAction[] = [];

    let result = await callOllama(conversation);

    for (let round = 0; round < 3; round += 1) {
      const assistantMessage = result.message;

      const toolCalls = assistantMessage?.tool_calls ?? [];

      if (toolCalls.length === 0) {
        break;
      }

      conversation.push({
        role: "assistant",
        content: assistantMessage?.content ?? "",
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function?.name ?? "";

        const argumentsValue = toolCall.function?.arguments ?? {};

        if (toolName === "search_products") {
          try {
            const products = await searchProducts(argumentsValue);

            for (const product of products) {
              displayedProducts.set(product.id, product);
            }

            conversation.push({
              role: "tool",
              tool_name: "search_products",
              content: JSON.stringify({
                success: true,
                products: products.map((product, index) => ({
                  displayPosition: index + 1,
                  name: product.name,
                  category: product.category,
                  description: product.description,
                  price: product.price,
                  variants: product.variants.map((variant) => ({
                    size: variant.size,
                    price: variant.currentPrice,
                    stock: variant.stockQuantity,
                    status: variant.availabilityStatus,
                  })),
                })),
              }),
            });
          } catch (error) {
            console.error("Assistant catalog search failed:", error);

            conversation.push({
              role: "tool",
              tool_name: "search_products",
              content: JSON.stringify({
                success: false,
                error: "The catalog search failed.",
              }),
            });
          }

          continue;
        }

        if (toolName === "prepare_add_to_cart") {
          try {
            const preparation = await prepareAddToCart(argumentsValue);

            for (const product of preparation.products) {
              displayedProducts.set(product.id, product);
            }

            if (preparation.success && preparation.action) {
              cartActions.push(preparation.action);
            }

            conversation.push({
              role: "tool",
              tool_name: "prepare_add_to_cart",
              content: JSON.stringify({
                ...preparation,
                products: preparation.products.map((product, index) => ({
                  displayPosition: index + 1,
                  name: product.name,
                  category: product.category,
                  price: product.price,
                  availableSizes: product.variants.map(
                    (variant) => variant.size,
                  ),
                })),
                action:
                  preparation.action?.type === "add_to_cart"
                    ? {
                        prepared: true,
                        productName: preparation.action.name,
                        size: preparation.action.size,
                        quantity: preparation.action.quantity,
                      }
                    : null,
              }),
            });
          } catch (error) {
            console.error("Assistant cart preparation failed:", error);

            conversation.push({
              role: "tool",
              tool_name: "prepare_add_to_cart",
              content: JSON.stringify({
                success: false,
                error: "The cart action could not be prepared.",
              }),
            });
          }

          continue;
        }

        if (toolName === "prepare_cart_action") {
          try {
            const preparation = prepareCartManagementAction(
              argumentsValue,
              cart,
            );

            if (preparation.success && preparation.action) {
              cartActions.push(preparation.action);
            }

            conversation.push({
              role: "tool",
              tool_name: "prepare_cart_action",
              content: JSON.stringify({
                success: preparation.success,
                reason: preparation.reason,
                message: preparation.message,
                matchingItems:
                  "matchingItems" in preparation
                    ? preparation.matchingItems
                    : undefined,
                action: preparation.action
                  ? {
                      prepared: true,
                      type: preparation.action.type,
                    }
                  : null,
              }),
            });
          } catch (error) {
            console.error("Assistant cart management failed:", error);

            conversation.push({
              role: "tool",
              tool_name: "prepare_cart_action",
              content: JSON.stringify({
                success: false,
                error: "The cart action could not be prepared.",
              }),
            });
          }

          continue;
        }

        if (toolName === "prepare_wishlist_action") {
          try {
            const preparation = await prepareWishlistAction(
              argumentsValue,
              wishlist,
            );

            for (const product of preparation.products) {
              displayedProducts.set(product.id, product);
            }

            if (preparation.success && preparation.action) {
              wishlistActions.push(preparation.action);
            }

            conversation.push({
              role: "tool",
              tool_name: "prepare_wishlist_action",
              content: JSON.stringify({
                success: preparation.success,
                reason: preparation.reason,
                message: preparation.message,
                products: preparation.products.map((product, index) => ({
                  displayPosition: index + 1,
                  name: product.name,
                  category: product.category,
                  price: product.price,
                })),
                action: preparation.action
                  ? {
                      prepared: true,
                      type: preparation.action.type,
                    }
                  : null,
              }),
            });
          } catch (error) {
            console.error("Assistant wishlist preparation failed:", error);

            conversation.push({
              role: "tool",
              tool_name: "prepare_wishlist_action",
              content: JSON.stringify({
                success: false,
                error: "The wishlist action could not be prepared.",
              }),
            });
          }

          continue;
        }

        if (toolName === "prepare_navigation") {
          const destination = cleanText(
            argumentsValue.destination,
          ).toLowerCase();

          const action =
            destination === "checkout"
              ? ({
                  type: "navigate",
                  destination: "checkout",
                  path: "/checkout",
                } satisfies AssistantNavigationAction)
              : destination === "track_order"
                ? ({
                    type: "navigate",
                    destination: "track_order",
                    path: "/track-order",
                  } satisfies AssistantNavigationAction)
                : destination === "wishlist"
                  ? ({
                      type: "navigate",
                      destination: "wishlist",
                      path: "/wishlist",
                    } satisfies AssistantNavigationAction)
                  : null;

          if (action) {
            navigationActions.splice(0, navigationActions.length, action);

            conversation.push({
              role: "tool",
              tool_name: "prepare_navigation",
              content: JSON.stringify({
                success: true,
                prepared: true,
                destination: action.destination,
                path: action.path,
              }),
            });
          } else {
            conversation.push({
              role: "tool",
              tool_name: "prepare_navigation",
              content: JSON.stringify({
                success: false,
                error: "Unsupported navigation destination.",
              }),
            });
          }

          continue;
        }

        conversation.push({
          role: "tool",
          tool_name: toolName,
          content: JSON.stringify({
            success: false,
            error: "Unknown tool.",
          }),
        });
      }

      result = await callOllama(conversation);
    }

    const reply =
      cleanText(result.message?.content) || getUnavailableMessage(language);

    return NextResponse.json({
      message: reply,
      products: Array.from(displayedProducts.values()).slice(0, 8),
      cartActions,
      wishlistActions,
      navigationActions,
      language,
    });
  } catch (error) {
    console.error("Ollama assistant failed:", error);

    return NextResponse.json(
      {
        message: getUnavailableMessage(language),
        products: [],
        language,
      },
      {
        status: 503,
      },
    );
  }
}
