"use client";

import { useStoreSettings } from "@/components/storefront/store-settings-provider";

import { useMemo, useState } from "react";

type RequestType = "movie" | "series";

function cleanPhone(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

export default function MovieSeriesRequestForm() {
  const { whatsappNumber } = useStoreSettings();

  const [requestType, setRequestType] = useState<RequestType>("movie");

  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState("");

  const cleanTitle = title.trim();
  const cleanDetails = details.trim();

  const message = useMemo(() => {
    const typeLabel = requestType === "movie" ? "Movie" : "Series";

    const lines = [
      "Hello Stereophonie,",
      "",
      "I would like to request the following title:",
      "",
      `${typeLabel}: ${cleanTitle || "-"}`,
      `Quantity: ${Math.max(1, Number(quantity) || 1)}`,
    ];

    if (cleanDetails) {
      lines.push(`Details: ${cleanDetails}`);
    }

    lines.push(
      "",
      "Could you please confirm if it is available and let me know the price?",
      "",
      "Thank you.",
    );

    return lines.join("\n");
  }, [requestType, cleanTitle, quantity, cleanDetails]);

  function openWhatsApp() {
    if (!cleanTitle) {
      const input = document.getElementById(
        "st-movie-series-title",
      ) as HTMLInputElement | null;

      input?.focus();
      return;
    }

    const phone = cleanPhone(whatsappNumber);

    const url =
      `https://wa.me/${phone}` + `?text=${encodeURIComponent(message)}`;

    /*
     * Use direct navigation instead of window.open().
     * This is more reliable on Safari and mobile browsers and
     * guarantees the request opens the Stereophonie conversation.
     */
    window.location.href = url;
  }

  return (
    <section className="st-media-request">
      <div className="st-media-request__intro">
        <span className="st-media-request__eyebrow">Movies &amp; Series</span>

        <h1>Request a title.</h1>

        <p>
          Tell us what you are looking for. Stereophonie will confirm
          availability and price directly with you on WhatsApp.
        </p>
      </div>

      <div className="st-media-request__card">
        <div className="st-media-request__field">
          <span className="st-media-request__label">Type</span>

          <div
            className="st-media-request__type"
            role="group"
            aria-label="Choose movie or series"
          >
            <button
              type="button"
              aria-pressed={requestType === "movie"}
              className={requestType === "movie" ? "is-active" : ""}
              onClick={() => setRequestType("movie")}
            >
              Movie
            </button>

            <button
              type="button"
              aria-pressed={requestType === "series"}
              className={requestType === "series" ? "is-active" : ""}
              onClick={() => setRequestType("series")}
            >
              Series
            </button>
          </div>
        </div>

        <div className="st-media-request__request-grid">
          <label className="st-media-request__field st-media-request__field--title">
            <span className="st-media-request__label">
              {requestType === "movie" ? "Movie title" : "Series title"}
            </span>

            <input
              id="st-movie-series-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                requestType === "movie"
                  ? "Example: Oppenheimer"
                  : "Example: Stranger Things"
              }
              autoComplete="off"
            />
          </label>

          <label className="st-media-request__field st-media-request__field--quantity">
            <span className="st-media-request__label">Quantity</span>

            <div className="st-media-request__quantity-shell">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
              >
                −
              </button>

              <input
                type="number"
                min="1"
                max="99"
                inputMode="numeric"
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Number(event.target.value) || 1))
                }
              />

              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() =>
                  setQuantity((current) => Math.min(99, current + 1))
                }
              >
                +
              </button>
            </div>
          </label>
        </div>

        <label className="st-media-request__field">
          <span className="st-media-request__label">Optional details</span>

          <textarea
            rows={3}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={
              requestType === "movie"
                ? "Edition, format or any specific request."
                : "Season, complete series, edition or any specific request."
            }
          />
        </label>

        <div className="st-media-request__action">
          <button type="button" onClick={openWhatsApp} disabled={!cleanTitle}>
            <span>Send on WhatsApp</span>

            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12h13M13 7l5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <small>
            WhatsApp opens with your request already prepared. Review it and
            press Send.
          </small>
        </div>

        <div className="st-media-request__inside-note">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 10.25v5M12 7.5h.01"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>

          <p>
            No order is placed automatically. Stereophonie will reply with
            availability and price.
          </p>
        </div>
      </div>
    </section>
  );
}
