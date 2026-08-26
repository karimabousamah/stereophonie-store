"use client";

import {
  ArrowRight,
  Clapperboard,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Props = {
  initialTitle?: string;
};

/*
 * IMPORTANT:
 *
 * We intentionally try the same simple WhatsApp approach used
 * throughout Stereophonie. Change this number ONCE here if the
 * store WhatsApp number is different.
 *
 * Format: country code + number, digits only.
 */
const STEREOPHONIE_WHATSAPP = "9613161285";

export default function MoviesSeriesRequest({ initialTitle = "" }: Props) {
  const [type, setType] = useState<"Movie" | "Series">("Movie");

  const [title, setTitle] = useState(initialTitle);

  const [details, setDetails] = useState("");

  const valid = title.trim().length >= 2;

  const message = useMemo(() => {
    const cleanTitle = title.trim();
    const cleanDetails = details.trim();

    return [
      "Hello Stereophonie,",
      "",
      `I would like to ask about the ${type.toLowerCase()}: ${cleanTitle}.`,
      "",
      "Could you please let me know if it is available and what the price is?",
      cleanDetails ? `Additional details: ${cleanDetails}` : "",
      "",
      "Thank you.",
    ]
      .filter(Boolean)
      .join("\n");
  }, [type, title, details]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!valid) {
      return;
    }

    const url =
      `https://wa.me/${STEREOPHONIE_WHATSAPP}` +
      `?text=${encodeURIComponent(message)}`;

    window.location.href = url;
  }

  return (
    <section className="st-entertainment-request">
      <div className="st-entertainment-request__intro">
        <p>Stereophonie sourcing</p>

        <h2>
          One request.
          <br />
          We handle the rest.
        </h2>

        <span>
          No catalogue hunting and no checkout process. Simply tell us exactly
          what you are looking for.
        </span>

        <div className="st-entertainment-request__benefits">
          <div>
            <Search />
            <span>
              <b>Tell us the title</b>
              <small>Movie, series, season or edition.</small>
            </span>
          </div>

          <div>
            <MessageCircle />
            <span>
              <b>Open WhatsApp</b>
              <small>Your request is prepared automatically.</small>
            </span>
          </div>

          <div>
            <Sparkles />
            <span>
              <b>Get availability &amp; price</b>
              <small>Our team replies directly.</small>
            </span>
          </div>
        </div>
      </div>

      <form className="st-entertainment-request__form" onSubmit={submit}>
        <div className="st-entertainment-request__form-head">
          <div>
            <Clapperboard />
          </div>

          <span>
            <small>Request a title</small>
            <b>What are you looking for?</b>
          </span>
        </div>

        <fieldset>
          <legend>Type</legend>

          <div className="st-entertainment-request__type">
            {(["Movie", "Series"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={type === value ? "is-active" : ""}
                onClick={() => setType(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          <span>Movie or series title</span>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Example: Avengers: Endgame"
            required
          />
        </label>

        <label>
          <span>Optional details</span>

          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Example: 4K edition, complete season, language, format..."
            rows={4}
          />
        </label>

        <div className="st-entertainment-request__preview">
          <small>WhatsApp request</small>
          <p>{message}</p>
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="st-entertainment-request__submit"
        >
          <MessageCircle />
          Ask Stereophonie on WhatsApp
          <ArrowRight />
        </button>

        <p className="st-entertainment-request__note">
          You will be redirected to WhatsApp. No order is placed automatically.
        </p>
      </form>
    </section>
  );
}
