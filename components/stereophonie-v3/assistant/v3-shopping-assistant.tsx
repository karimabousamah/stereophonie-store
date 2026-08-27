"use client";

import { useStoreSettings } from "@/components/storefront/store-settings-provider";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type AssistantProductCard = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  price?: number | null;
  variants?: {
    regularPrice?: number;
    salePrice?: number | null;
    currentPrice?: number;
    stockQuantity?: number;
    availabilityStatus?: string;
  }[];
};

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  products?: AssistantProductCard[];
};

type SuggestedAction = {
  label: string;
  prompt?: string;
  href?: string;
};

const initialMessage: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to Stereophonie. I can help you find products, compare options, check offers, or guide you with your order.",
};

const suggestions: SuggestedAction[] = [
  {
    label: "Find me a phone",
    prompt: "Help me find the right phone.",
  },
  {
    label: "Compare products",
    prompt: "I want to compare products.",
  },
  {
    label: "View offers",
    href: "/shop?offers=true",
  },
  {
    label: "Track my order",
    href: "/track-order",
  },
];

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

      imageAlt:
        typeof product.imageAlt === "string"
          ? product.imageAlt
          : typeof product.name === "string"
            ? product.name
            : "Product",

      price: typeof product.price === "number" ? product.price : null,

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
}: {
  product: AssistantProductCard;
}) {
  const saleVariant = product.variants?.find(
    (variant) =>
      variant.salePrice !== null &&
      variant.salePrice !== undefined &&
      variant.regularPrice !== undefined &&
      variant.salePrice < variant.regularPrice,
  );

  const hasSale = Boolean(saleVariant);

  const currentPrice = product.price ?? saleVariant?.salePrice ?? null;

  return (
    <Link
      href={`/shop/${encodeURIComponent(product.slug)}`}
      className="st3-ai-product-card"
    >
      <span className="st3-ai-product-card__visual">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt || product.name}
            loading="lazy"
          />
        ) : (
          <span className="st3-ai-product-card__placeholder">
            <RobotIcon />
          </span>
        )}

        {hasSale ? (
          <span className="st3-ai-product-card__sale">Offer</span>
        ) : null}
      </span>

      <span className="st3-ai-product-card__body">
        {product.category ? <small>{product.category}</small> : null}

        <strong>{product.name}</strong>

        <span className="st3-ai-product-card__bottom">
          <span className="st3-ai-product-card__price">
            {currentPrice !== null
              ? `$${currentPrice.toFixed(
                  Number.isInteger(currentPrice) ? 0 : 2,
                )}`
              : "View product"}
          </span>

          <span className="st3-ai-product-card__arrow" aria-hidden="true">
            →
          </span>
        </span>
      </span>
    </Link>
  );
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
  const [open, setOpen] = useState(false);

  const assistantPanelRef = useRef<HTMLElement | null>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    initialMessage,
  ]);

  const [input, setInput] = useState("");

  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");

  const endRef = useRef<HTMLDivElement | null>(null);

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

  async function sendMessage(rawValue?: string) {
    const value = (rawValue ?? input).trim();

    if (!value || sending) {
      return;
    }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed.");
      }

      const data = await response.json();

      const assistantMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: normalizeAssistantResponse(data),
        products: normalizeAssistantProducts(data),
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setError(
        "I couldn’t connect right now. You can still browse the store or try again in a moment.",
      );
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  return (
    <>
      <div
        className={`st3-ai-shell ${open ? "is-open" : ""}`}
        data-st-ai-shell="true"
      >
        <button
          type="button"
          data-st-ai-edge-launcher="true"
          className={`st3-ai-edge-tab ${open ? "is-open" : ""}`}
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
              <p className="st3-ai-panel__eyebrow">Stereophonie</p>

              <h2>How can I help?</h2>
            </div>

            <button
              type="button"
              className="st3-ai-panel__close"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
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
                  <span className="st3-ai-loader__track">
                    <i />
                    <i />
                    <i />
                  </span>

                  <span className="st3-ai-loader__line" />
                </div>
              </div>
            ) : null}

            {error ? <p className="st3-ai-panel__error">{error}</p> : null}

            <div ref={endRef} />
          </div>

          {messages.length <= 1 ? (
            <div className="st3-ai-suggestions">
              {suggestions.map((suggestion) =>
                suggestion.href ? (
                  <Link
                    key={suggestion.label}
                    href={suggestion.href}
                    className="st3-ai-suggestion"
                    onClick={() => setOpen(false)}
                  >
                    {suggestion.label}
                    <span aria-hidden="true">›</span>
                  </Link>
                ) : (
                  <button
                    key={suggestion.label}
                    type="button"
                    className="st3-ai-suggestion"
                    onClick={() => void sendMessage(suggestion.prompt)}
                  >
                    {suggestion.label}
                    <span aria-hidden="true">›</span>
                  </button>
                ),
              )}
            </div>
          ) : null}

          <form className="st3-ai-composer" onSubmit={submit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about products, offers or orders"
              aria-label="Message Stereophonie assistant"
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <SendIcon />
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
