"use client";

import { useStoreSettings } from "@/components/storefront/store-settings-provider";
import AssistantVoiceDictation from "./assistant-voice-dictation";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type AssistantProductCard = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string;
  imageUrl?: string | null;
  hoverImageUrl?: string | null;
  imageAlt?: string;
  price?: number | null;

  availabilityStatus?:
    | "coming_soon"
    | "in_stock"
    | "low_stock"
    | "out_of_stock"
    | "ask_for_price"
    | "mixed"
    | "unavailable";

  variants?: {
    regularPrice?: number;
    salePrice?: number | null;
    currentPrice?: number;
    stockQuantity?: number;
    availabilityStatus?: string;
  }[];
};

function normalizeAssistantAvailabilityStatus(
  value: unknown,
): AssistantProductCard["availabilityStatus"] {
  if (
    value === "coming_soon" ||
    value === "in_stock" ||
    value === "low_stock" ||
    value === "out_of_stock" ||
    value === "ask_for_price" ||
    value === "mixed" ||
    value === "unavailable"
  ) {
    return value;
  }

  return undefined;
}

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  products?: AssistantProductCard[];
  links?: { label: string; url: string }[];
};

type AssistantConversationProductReference = {
  id: string;
  name: string;
  slug: string;
};

type AssistantConversationContext = {
  focusedProduct: AssistantConversationProductReference | null;
  displayedProducts: AssistantConversationProductReference[];
};

const initialMessage: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to Stereophonie. I can help you find products, compare options, check offers, or guide you with your order.",
};

function RobotIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v3" />
      <path d="M9.5 3h5" />
      <rect x="5" y="7" width="14" height="11" rx="4" />
      <path d="M8 18v2" />
      <path d="M16 18v2" />
      <path d="M3.5 11v3" />
      <path d="M20.5 11v3" />
      <circle cx="9.2" cy="12.2" r="1" />
      <circle cx="14.8" cy="12.2" r="1" />
      <path d="M9 15h6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function StereophonieWhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      data-st-whatsapp-icon="true"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M16.02 3.2C9.04 3.2 3.36 8.8 3.36 15.7c0 2.2.58 4.35 1.69 6.24L3 29l7.26-1.9a12.8 12.8 0 0 0 5.75 1.38h.01c6.98 0 12.66-5.6 12.66-12.5S23 3.2 16.02 3.2Zm0 22.98h-.01a10.5 10.5 0 0 1-5.34-1.45l-.38-.22-4.3 1.13 1.15-4.13-.25-.4a10.28 10.28 0 0 1-1.61-5.42c0-5.67 4.68-10.29 10.74-10.29 5.91 0 10.72 4.62 10.72 10.29 0 5.67-4.81 10.49-10.72 10.49Z"
        clipRule="evenodd"
      />

      <path
        fill="currentColor"
        d="M21.84 18.38c-.32-.16-1.9-.92-2.19-1.03-.29-.1-.5-.16-.71.16-.21.31-.82 1.03-1 1.24-.18.21-.37.23-.69.08-.32-.16-1.34-.49-2.56-1.56-.95-.84-1.59-1.87-1.77-2.19-.19-.31-.02-.48.14-.64.14-.14.32-.37.48-.55.16-.18.21-.31.32-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.68-.98-2.3-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.55.08-.84.39-.29.31-1.11 1.08-1.11 2.63 0 1.55 1.14 3.05 1.3 3.26.16.21 2.24 3.39 5.43 4.75.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.9-.77 2.16-1.52.27-.76.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z"
      />
    </svg>
  );
}

function normalizeAssistantProducts(data: unknown): AssistantProductCard[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;

  if (!Array.isArray(record.products)) {
    return [];
  }

  return record.products
    .filter(
      (product): product is Record<string, unknown> =>
        Boolean(product) && typeof product === "object",
    )
    .map((product) => ({
      id: typeof product.id === "string" ? product.id : crypto.randomUUID(),

      name: typeof product.name === "string" ? product.name : "Product",

      slug: typeof product.slug === "string" ? product.slug : "",

      description:
        typeof product.description === "string" ? product.description : null,

      category: typeof product.category === "string" ? product.category : "",

      imageUrl: typeof product.imageUrl === "string" ? product.imageUrl : null,
      hoverImageUrl:
        typeof product.hoverImageUrl === "string"
          ? product.hoverImageUrl
          : null,

      imageAlt:
        typeof product.imageAlt === "string"
          ? product.imageAlt
          : typeof product.name === "string"
            ? product.name
            : "Product",

      price: typeof product.price === "number" ? product.price : null,

      availabilityStatus:
        normalizeAssistantAvailabilityStatus(
          product.availabilityStatus,
        ),

      variants: Array.isArray(product.variants)
        ? product.variants
            .filter(
              (variant): variant is Record<string, unknown> =>
                Boolean(variant) && typeof variant === "object",
            )
            .map((variant) => ({
              regularPrice:
                typeof variant.regularPrice === "number"
                  ? variant.regularPrice
                  : undefined,

              salePrice:
                typeof variant.salePrice === "number"
                  ? variant.salePrice
                  : null,

              currentPrice:
                typeof variant.currentPrice === "number"
                  ? variant.currentPrice
                  : undefined,

              stockQuantity:
                typeof variant.stockQuantity === "number"
                  ? variant.stockQuantity
                  : undefined,

              availabilityStatus:
                typeof variant.availabilityStatus === "string"
                  ? variant.availabilityStatus
                  : undefined,
            }))
        : [],
    }))
    .filter((product) => product.name && product.slug)
    .slice(0, 4);
}

function ProductRecommendationCard({
  product,
  onNavigate,
}: {
  product: AssistantProductCard;
  onNavigate?: () => void;
}) {
  const saleVariant = product.variants?.find(
    (variant) =>
      variant.salePrice !== null &&
      variant.salePrice !== undefined &&
      variant.regularPrice !== undefined &&
      variant.salePrice < variant.regularPrice,
  );

  const hasSale = Boolean(saleVariant);

  const currentPrice =
    product.availabilityStatus === "ask_for_price"
      ? null
      : product.price ?? saleVariant?.salePrice ?? null;

  const availabilityLabel =
    product.availabilityStatus === "ask_for_price"
      ? "Ask for price"
      : product.availabilityStatus === "coming_soon"
        ? "Coming soon"
        : product.availabilityStatus === "out_of_stock"
        ? "Out of stock"
        : product.availabilityStatus === "low_stock"
          ? "Low stock"
          : product.availabilityStatus === "mixed"
            ? "Check availability"
            : product.availabilityStatus === "unavailable"
              ? "Unavailable"
              : null;

  return (
    <Link
      href={`/shop/${encodeURIComponent(product.slug)}`}
      className="st3-ai-product-card"
      onClick={onNavigate}
    >
      <span className="st3-ai-product-card__visual">
        {product.imageUrl ? (
          <>
            <img
              className="st3-ai-product-card__image st3-ai-product-card__image--primary"
              src={product.imageUrl}
              alt={product.imageAlt || product.name}
              loading="lazy"
                  decoding="async"
            />

            {product.hoverImageUrl &&
            product.hoverImageUrl !== product.imageUrl ? (
              <img
                className="st3-ai-product-card__image st3-ai-product-card__image--hover"
                src={product.hoverImageUrl}
                alt=""
                aria-hidden="true"
                loading="eager"
                    fetchPriority="low"
                    decoding="async"
              />
            ) : null}
          </>
        ) : (
          <span className="st3-ai-product-card__placeholder">
            <RobotIcon />
          </span>
        )}
      </span>

      <span className="st3-ai-product-card__body">
        {product.category ? <small>{product.category}</small> : null}

        <strong>{product.name}</strong>

        <span className="st3-ai-product-card__bottom">
          <span
            className={`st3-ai-product-card__price ${
              product.availabilityStatus
                ? `is-${product.availabilityStatus.replaceAll("_", "-")}`
                : ""
            }`}
          >
            {availabilityLabel ??
              (currentPrice !== null
                ? `$${currentPrice.toFixed(
                    Number.isInteger(currentPrice) ? 0 : 2,
                  )}`
                : "View product")}
          </span>

          <span className="st3-ai-product-card__arrow" aria-hidden="true">
            →
          </span>
        </span>
      </span>
    </Link>
  );
}


/*
 * ST_ASSISTANT_VERIFIED_STORE_KNOWLEDGE_V1
 * Only render the known Maps destination, not arbitrary URLs
 * supplied by a network response.
 */
function normalizeAssistantLinks(data: unknown) {
  /*
   * ST_ASSISTANT_TRUSTED_MAP_LINKS_V2
   *
   * Only the two authoritative store navigation URLs
   * may appear as external assistant shortcuts.
   *
   * Reject arbitrary URLs, duplicates and malformed entries.
   */
  const trustedLocationUrls = new Set<string>([
    "https://www.google.com/maps/dir/?api=1&destination=Stereophonie+Store%2C+Mtaileb%2C+Lebanon&destination_place_id=ChIJ70H5JvE-HxURCdXRMYTxE_c",
    "https://maps.apple.com/?daddr=Stereophonie%20Store%2C%20Mtaileb%2C%20Lebanon",
  ]);

  if (!data || typeof data !== "object") {
    return [];
  }

  const links = (data as Record<string, unknown>).links;

  if (!Array.isArray(links)) {
    return [];
  }

  const verified: { label: string; url: string }[] = [];
  const seen = new Set<string>();

  for (const item of links) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as Record<string, unknown>;

    if (
      typeof record.label !== "string" ||
      typeof record.url !== "string" ||
      !record.label.trim() ||
      !trustedLocationUrls.has(record.url) ||
      seen.has(record.url)
    ) {
      continue;
    }

    seen.add(record.url);

    verified.push({
      label: record.label.trim().slice(0, 80),
      url: record.url,
    });

    if (verified.length === 2) {
      break;
    }
  }

  return verified;
}

function normalizeAssistantResponse(data: unknown): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    const candidates = [
      record.message,
      record.reply,
      record.response,
      record.answer,
      record.content,
      record.text,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }

      if (candidate && typeof candidate === "object") {
        const nested = candidate as Record<string, unknown>;

        if (typeof nested.content === "string" && nested.content.trim()) {
          return nested.content.trim();
        }
      }
    }
  }

  return (
    "I’m here to help. Tell me what type of product " +
    "you are looking for and I’ll guide you through the store."
  );
}

export default function V3ShoppingAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const assistantPanelRef = useRef<HTMLElement | null>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    initialMessage,
  ]);

  const [input, setInput] = useState("");
  const [dictating, setDictating] = useState(false);
  /* ST_ASSISTANT_DIRECT_VOICE_SEND_V2 */
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceStatus, setVoiceStatus] = useState("");
  const voiceDirectSendRef = useRef<(() => void) | null>(null);
  /* ST_ASSISTANT_MULTILINE_V3 */
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const field = textAreaRef.current;
    if (!field) return;

    field.style.height = "38px";
    field.style.height =
      `${Math.min(Math.max(field.scrollHeight, 38), 160)}px`;
  }, [input, dictating]);


  const [sending, setSending] = useState(false);

  /* ST_ASSISTANT_STOP_RESPONSE_V1 */
  const pendingAssistantRequestRef = useRef<{
    id: number;
    controller: AbortController;
  } | null>(null);

  const assistantRequestSequenceRef = useRef(0);

  const [error, setError] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);

  /*
   * Universal navigation close.
   *
   * The assistant lives high enough in the storefront tree that it can
   * survive client-side route transitions. Closing on pathname changes makes
   * product-card navigation behave identically on desktop, tablet and mobile.
   *
   * Keep the existing product-card onNavigate close as the immediate action;
   * this effect is the route-level guarantee.
   */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.setTimeout(() => {
      endRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 60);
  }, [open, messages]);

  function buildAssistantConversationContext(
    currentMessages: AssistantMessage[],
  ): AssistantConversationContext {
    /*
     * ========================================================
     * ASSISTANT_REFERENCE_LIST_MEMORY_V6
     * ========================================================
     *
     * We deliberately preserve TWO different kinds of memory:
     *
     * 1. focusedProduct
     *    The product being discussed most recently.
     *
     *    Example:
     *      show low-stock products
     *      price of the second one
     *      price?
     *
     *    "price?" must continue referring to product #2.
     *
     * 2. displayedProducts
     *    The latest meaningful MULTI-PRODUCT reference list.
     *
     *    Example:
     *      show low-stock products
     *      price of the second one
     *      is the first one available?
     *
     *    "first one" must still refer to product #1 from the
     *    original low-stock list — not product #2 just because
     *    the previous response displayed a single product card.
     *
     * This is the same distinction a human naturally keeps
     * during a shopping conversation.
     */

    const assistantProductMessages =
      currentMessages.filter(
        (message) =>
          message.role === "assistant" &&
          Array.isArray(message.products) &&
          message.products.length > 0,
      );

    const latestProductMessage =
      assistantProductMessages.at(-1);

    /*
     * FOCUSED PRODUCT
     * ---------------
     * The latest answer's first card is the current subject.
     */
    const latestProducts =
      (latestProductMessage?.products ?? [])
        .filter(
          (product) =>
            Boolean(product.id) &&
            Boolean(product.name),
        )
        .slice(0, 8)
        .map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
        }));

    const focusedProduct =
      latestProducts[0] ?? null;

    /*
     * REFERENCE LIST
     * --------------
     * Search backwards for the newest assistant response that
     * actually presented several choices.
     *
     * A later one-product answer must NOT destroy this list.
     */
    const latestMultiProductMessage =
      [...assistantProductMessages]
        .reverse()
        .find(
          (message) =>
            Array.isArray(message.products) &&
            message.products.length > 1,
        );

    const referenceSourceProducts =
      latestMultiProductMessage?.products ??
      latestProductMessage?.products ??
      [];

    const displayedProducts =
      referenceSourceProducts
        .filter(
          (product) =>
            Boolean(product.id) &&
            Boolean(product.name),
        )
        .slice(0, 8)
        .map((product) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
        }));

    return {
      focusedProduct,
      displayedProducts,
    };
  }

  function stopAssistantResponse() {
    const active = pendingAssistantRequestRef.current;

    if (!active) return;

    // Invalidate before aborting, so even a late
    // response cannot appear after Stop is pressed.
    pendingAssistantRequestRef.current = null;
    assistantRequestSequenceRef.current += 1;

    active.controller.abort();

    // Preserve the conversation and any typed draft.
    setSending(false);
    setError("");
  }

  async function sendMessage(rawValue?: string) {
    const value = (rawValue ?? input).trim();

    if (
      !value ||
      sending ||
      pendingAssistantRequestRef.current
    ) {
      return;
    }

    const controller = new AbortController();
    const requestId = ++assistantRequestSequenceRef.current;

    pendingAssistantRequestRef.current = {
      id: requestId,
      controller,
    };

    setError("");
    setInput("");

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: value,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setSending(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),

          /*
           * ASSISTANT_CONVERSATION_PRODUCT_MEMORY_V5
           *
           * Send verified product-card identity separately from text.
           * The server re-loads live price/stock before answering.
           */
          assistantContext:
            buildAssistantConversationContext(messages),
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed.");
      }

      const data = await response.json();

      // A cancelled or superseded request must never
      // append a late assistant response.
      if (
        controller.signal.aborted ||
        pendingAssistantRequestRef.current?.id !== requestId
      ) {
        return;
      }

      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: normalizeAssistantResponse(data),
        products: normalizeAssistantProducts(data),
        links: normalizeAssistantLinks(data),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      // Customer cancellation is not a connection error.
      if (
        controller.signal.aborted ||
        pendingAssistantRequestRef.current?.id !== requestId
      ) {
        return;
      }

      setError(
        "I couldn’t connect right now. You can still browse the store or try again in a moment.",
      );
    } finally {
      // An older request must not clear the loading
      // state belonging to a newer request.
      if (
        pendingAssistantRequestRef.current?.id === requestId
      ) {
        pendingAssistantRequestRef.current = null;
        setSending(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (sending || voiceProcessing) return;

    if (dictating) {
      voiceDirectSendRef.current?.();
      return;
    }

    void sendMessage();
  }

  /* ST_DUAL_AI_WHATSAPP_MODE */
  /*
   * STEREOPHONIE SUPPORT CONTROLS
   *
   * WhatsApp and AI are now fully independent.
   */

  const { whatsappNumber } = useStoreSettings();

  function handleWhatsAppClick() {
    const phone = whatsappNumber.replace(/\D/g, "");

    window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
  }

  function toggleAssistant() {
    setOpen((current) => !current);
  }

  /* ST_AI_OUTSIDE_CLICK_CLOSE_START */
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleAssistantOutsidePointer(event: MouseEvent | TouchEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      /*
       * Clicking inside the AI panel must never close it.
       */
      if (assistantPanelRef.current?.contains(target)) {
        return;
      }

      /*
       * Clicking the vertical AI Assistant tab is handled
       * by the tab's own toggleAssistant function.
       *
       * Prevent the document listener from interfering.
       */
      if (
        target instanceof Element &&
        target.closest('[data-st-ai-edge-launcher="true"]')
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("mousedown", handleAssistantOutsidePointer);

    document.addEventListener("touchstart", handleAssistantOutsidePointer, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleAssistantOutsidePointer);

      document.removeEventListener("touchstart", handleAssistantOutsidePointer);
    };
  }, [open]);
  /* ST_AI_OUTSIDE_CLICK_CLOSE_END */

  /*
   * ST_AI_DIRECT_CONTROL_GEOMETRY_V10
   *
   * Do not rely on the historical CSS cascade for these two controls.
   *
   * The AI tab remains INSIDE .st3-ai-shell, so the shell still moves
   * the tab together with the popup when opening and closing.
   *
   * Only the tab's own geometry is locked.
   */
  const lockAssistantEdgeTab = (
    node: HTMLButtonElement | null,
  ) => {
    if (!node) {
      return;
    }

    const tabHeight =
      "clamp(108px, calc(98px + 1.5625vw), 118px)";

    const geometry: Array<[string, string]> = [
      ["position", "absolute"],

      ["top", "50%"],
      ["right", "auto"],
      ["bottom", "auto"],
      [
        "left",
        "calc(-1 * var(--st-ai-shell-handle-width))",
      ],

      ["width", "var(--st-ai-shell-handle-width)"],
      ["min-width", "var(--st-ai-shell-handle-width)"],
      ["max-width", "var(--st-ai-shell-handle-width)"],

      ["height", tabHeight],
      ["min-height", tabHeight],
      ["max-height", tabHeight],

      ["margin", "0px"],
      ["padding", "8px 4px"],

      ["box-sizing", "border-box"],

      /*
       * This value never changes on hover/focus/active.
       */
      ["transform", "translateY(-50%)"],
      ["translate", "none"],
      ["scale", "1"],
      ["rotate", "0deg"],

      ["animation", "none"],
      ["transition", "none"],
      ["will-change", "auto"],
    ];

    for (const [property, value] of geometry) {
      node.style.setProperty(
        property,
        value,
        "important",
      );
    }
  };

  /*
   * Lock the close button as well.
   *
   * It remains a normal flex child of the header and is lowered
   * slightly so its visual center lines up with "How can I help?".
   *
   * Hover cannot replace this transform because it is inline
   * !important.
   */
  const lockAssistantCloseButton = (
    node: HTMLButtonElement | null,
  ) => {
    if (!node) {
      return;
    }

    /*
     * Make the assistant header the exact positioning context
     * for the close button.
     */
    node.parentElement?.style.setProperty(
      "position",
      "relative",
      "important",
    );

    const geometry: Array<[string, string]> = [
      ["position", "absolute"],

      ["top", "50%"],
      ["right", "14px"],
      ["bottom", "auto"],
      ["left", "auto"],

      ["margin-top", "0px"],
      ["margin-right", "0px"],
      ["margin-bottom", "0px"],
      ["margin-left", "0px"],

      ["align-self", "center"],

      /*
       * Requested optical lowering.
       */
      ["transform", "translateY(-50%)"],
      ["translate", "none"],
      ["scale", "1"],
      ["rotate", "0deg"],

      ["animation", "none"],

      [
        "transition",
        "background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
      ],
    ];

    for (const [property, value] of geometry) {
      node.style.setProperty(
        property,
        value,
        "important",
      );
    }

    /*
     * Global storefront CSS moves direct-child SVGs on hover.
     * Lock only this X icon so it can never slide independently.
     */
    const icon =
      node.querySelector<SVGElement>(
        ".st-ai-close-final-v20__icon",
      );

    if (icon) {
      icon.style.setProperty(
        "transform",
        "none",
        "important",
      );

      icon.style.setProperty(
        "translate",
        "none",
        "important",
      );

      icon.style.setProperty(
        "scale",
        "1",
        "important",
      );

      icon.style.setProperty(
        "rotate",
        "0deg",
        "important",
      );

      icon.style.setProperty(
        "animation",
        "none",
        "important",
      );

      icon.style.setProperty(
        "transition",
        "none",
        "important",
      );
    }
  };

  return (
    <>
      <div
        className={`st3-ai-shell ${open ? "is-open" : ""}`}
        data-st-ai-shell="true"
      >
        <button
          ref={lockAssistantEdgeTab}
          type="button"
          data-st-ai-edge-launcher="true"
          className="st3-ai-edge-tab"
          onClick={toggleAssistant}
          aria-label={
            open
              ? "Close Stereophonie AI assistant"
              : "Open Stereophonie AI assistant"
          }
          aria-expanded={open}
          aria-controls="stereophonie-ai-drawer"
        >
          <span className="st3-ai-edge-tab__status" aria-hidden="true" />

          <span className="st3-ai-edge-tab__icon" aria-hidden="true">
            <RobotIcon />
          </span>

          <span className="st3-ai-edge-tab__text">AI Assistant</span>
        </button>

        <aside
          ref={assistantPanelRef}
          id="stereophonie-ai-drawer"
          className={`st3-ai-panel ${open ? "st3-ai-panel--open" : ""}`}
          aria-hidden={!open}
        >
          <div className="st3-ai-panel__top">
            <div>
              <h2>How can I help?</h2>
            </div>

            <button
              ref={lockAssistantCloseButton}
              type="button"
              className="st-ai-close-final-v20"
              aria-label="Close Stereophonie assistant"
              onClick={() => setOpen(false)}
            >
              <svg
                className="st-ai-close-final-v20__icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M7 7L17 17" />
                <path d="M17 7L7 17" />
              </svg>
            </button>
          </div>

          <div className="st3-ai-panel__messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`st3-ai-message-group st3-ai-message-group--${message.role}`}
              >
                <div
                  className={`st3-ai-message st3-ai-message--${message.role}`}
                >

                  <p>{message.content}</p>
                {message.role === "assistant" &&
                message.links &&
                message.links.length > 0 ? (
                  <div
                    className="st3-ai-verified-links"
                    style={{
                      marginTop: 12,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {message.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 9,
                          padding: "10px 13px",
                          border: "1px solid rgba(0,0,0,0.12)",
                          borderRadius: 12,
                          background: "#fff",
                          color: "#181818",
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <span>{link.label}</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    ))}
                  </div>
                ) : null}
                </div>



                {message.role === "assistant" &&
                message.products &&
                message.products.length > 0 ? (
                  <div
                    className="st3-ai-product-results"
                    aria-label="Recommended products"
                  >
                    {message.products.map((product) => (
                      <ProductRecommendationCard
                        key={product.id}
                        product={product}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {sending ? (
              <div className="st3-ai-message-group st3-ai-message-group--assistant">
                <div
                  className="st3-ai-loader"
                  role="status"
                  aria-label="Stereophonie Assistant is preparing a response"
                >
                  <span className="st3-ai-loader__signal" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>

                  <span className="st3-ai-loader__label">Thinking</span>

                  <span className="st3-ai-loader__glint" aria-hidden="true" />
                </div>
              </div>
            ) : null}

            {error ? <p className="st3-ai-panel__error">{error}</p> : null}

            <div ref={endRef} />
          </div>

          <form className="st3-ai-composer" onSubmit={submit}>
            {dictating ? (
              <div
                className="st3-ai-composer__recording"
                role="status"
                aria-label="Listening to your question"
              >
                <span
                  className="st3-ai-composer__wave"
                  aria-hidden="true"
                >
                  {Array.from({ length: 13 }, (_, index) => {
                    const shape =
                      0.3 + 0.7 * Math.abs(Math.sin(index * 1.21));

                    return (
                      <i
                        key={index}
                        style={{
                          height:
                            `${Math.round(4 + voiceLevel * shape * 18)}px`,
                        }}
                      />
                    );
                  })}
                </span>
                <span className="st3-ai-composer__listening">
                  {voiceProcessing
                    ? voiceStatus || "Processing..."
                    : "Listening..."}
                </span>
              </div>
            ) : (
              <textarea
                ref={textAreaRef}
                rows={1}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    if (!sending && input.trim()) {
                      void sendMessage();
                    }
                  }
                }}
                placeholder="Ask about products, offers or orders"
                aria-label="Message Stereophonie assistant"
              />
            )}

            <AssistantVoiceDictation
              draft={input}
              onDraftChange={setInput}
              onRecordingChange={setDictating}
              onProcessingChange={setVoiceProcessing}
              onAudioLevel={setVoiceLevel}
              onStatusChange={setVoiceStatus}
              onSendText={(text) => sendMessage(text)}
              directSendRef={voiceDirectSendRef}
              disabled={sending}
              open={open}
            />

            <button
              type="submit"
              onClick={
                sending
                  ? (event) => {
                      event.preventDefault();
                      stopAssistantResponse();
                    }
                  : undefined
              }
              disabled={
                !sending &&
                (
                  voiceProcessing ||
                  (!dictating && !input.trim())
                )
              }
              aria-label={
                sending
                  ? "Stop assistant response"
                  : "Send message"
              }
              title={
                sending
                  ? "Stop response"
                  : "Send message"
              }
            >
              {sending ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                >
                  <rect
                    x="7"
                    y="7"
                    width="10"
                    height="10"
                    rx="2"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <SendIcon />
              )}
            </button>
          </form>

          <p className="st3-ai-disclaimer">
            Product details and availability may change. Confirm important
            information before checkout.
          </p>
        </aside>
      </div>

      <button
        type="button"
        data-st-ai-launcher="true"
        data-st-launcher-mode="whatsapp"
        className="st3-ai-launcher st3-ai-launcher--whatsapp st3-whatsapp-launcher"
        aria-label="Chat with Stereophonie on WhatsApp"
        onClick={handleWhatsAppClick}
      >
        <span
          data-st-ai-glow="outer"
          className="st3-ai-launcher__pulse st3-ai-launcher__pulse--outer"
          aria-hidden="true"
        />

        <span
          data-st-ai-glow="inner"
          className="st3-ai-launcher__pulse st3-ai-launcher__pulse--inner"
          aria-hidden="true"
        />

        <span
          data-st-launcher-aura="true"
          className="st3-ai-launcher__aura-live"
          aria-hidden="true"
        />

        <span
          data-st-launcher-shimmer="true"
          className="st3-ai-launcher__shimmer-live"
          aria-hidden="true"
        />

        <span className="st3-ai-launcher__icon is-whatsapp">
          <span
            className="st3-ai-launcher__icon-layer st3-ai-launcher__icon-layer--ai"
            aria-hidden="true"
          >
            <RobotIcon />
          </span>

          <span
            className="st3-ai-launcher__icon-layer st3-ai-launcher__icon-layer--whatsapp"
            aria-hidden="false"
          >
            <StereophonieWhatsAppIcon />
          </span>

          <span
            className="st3-ai-launcher__icon-layer st3-ai-launcher__icon-layer--close"
            aria-hidden="true"
          >
            <CloseIcon />
          </span>
        </span>

        <span className="st3-ai-launcher__label">WhatsApp</span>
      </button>
    </>
  );
}
