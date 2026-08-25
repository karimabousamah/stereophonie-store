"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type AssistantMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
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

  return (
    <>
      <button
        type="button"
        className={`st3-ai-launcher ${open ? "st3-ai-launcher--open" : ""}`}
        aria-label={
          open ? "Close Stereophonie assistant" : "Open Stereophonie assistant"
        }
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="st3-ai-launcher__icon">
          {open ? <CloseIcon /> : <RobotIcon />}
        </span>

        <span className="st3-ai-launcher__label">Ask Stereophonie</span>
      </button>

      <aside
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
              className={`st3-ai-message st3-ai-message--${message.role}`}
            >
              <p>{message.content}</p>
            </div>
          ))}

          {sending ? (
            <div className="st3-ai-message st3-ai-message--assistant">
              <div className="st3-ai-thinking">
                <span />
                <span />
                <span />
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
    </>
  );
}
