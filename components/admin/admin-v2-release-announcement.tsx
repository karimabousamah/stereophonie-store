"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Images,
  Layers3,
  MousePointer2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

const releaseStorageKey =
  "stereophonie-admin-release-admin-v2-oct-2026-seen";

/*
 * October 2, 2026 at 11:59 PM in Lebanon.
 * Lebanon is UTC+3 on this date.
 */
const releaseExpiresAt = Date.parse("2026-10-02T20:59:00.000Z");

const improvements = [
  {
    icon: SlidersHorizontal,
    title: "Smarter product configurations",
    description:
      "A cleaner workflow for product options, reusable values, colorways and configuration management.",
  },
  {
    icon: Layers3,
    title: "Upgraded selectors",
    description:
      "Brand, category and product-option directories now use a faster, more consistent Admin V2 experience.",
  },
  {
    icon: Images,
    title: "Configuration media galleries",
    description:
      "Manage the exact customer-facing image gallery for each product configuration.",
  },
  {
    icon: MousePointer2,
    title: "Faster image management",
    description:
      "Upload directly into a configuration, follow live progress and hold-drag photos into the right order.",
  },
];

export default function AdminV2ReleaseAnnouncement() {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (Date.now() > releaseExpiresAt) {
      return;
    }

    try {
      if (window.localStorage.getItem(releaseStorageKey) === "1") {
        return;
      }
    } catch {
      /*
       * If browser storage is unavailable, the announcement may still
       * be shown for this visit. It never blocks the Admin.
       */
    }

    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 120);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function dismiss() {
    try {
      window.localStorage.setItem(releaseStorageKey, "1");
    } catch {
      /*
       * Dismissal still works for the current visit when storage
       * is unavailable.
       */
    }

    setIsOpen(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="st-admin-release-v39"
      role="presentation"
    >
      <button
        type="button"
        className="st-admin-release-v39__backdrop"
        onClick={dismiss}
        aria-label="Close Admin update"
        tabIndex={-1}
      />

      <section
        className="st-admin-release-v39__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="st-admin-release-v39-title"
        aria-describedby="st-admin-release-v39-description"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="st-admin-release-v39__close"
          onClick={dismiss}
          aria-label="Close Admin update"
        >
          <X aria-hidden="true" />
        </button>

        <div className="st-admin-release-v39__intro">
          <div className="st-admin-release-v39__eyebrow">
            <span className="st-admin-release-v39__eyebrow-icon">
              <Sparkles aria-hidden="true" />
            </span>

            <span>Admin V2 update</span>
          </div>

          <h2 id="st-admin-release-v39-title">
            Product management just got better.
          </h2>

          <p id="st-admin-release-v39-description">
            We upgraded the tools you use every day to make managing
            products, configurations and media faster and more precise.
          </p>
        </div>

        <div className="st-admin-release-v39__updates">
          {improvements.map((improvement) => {
            const Icon = improvement.icon;

            return (
              <article
                key={improvement.title}
                className="st-admin-release-v39__update"
              >
                <span className="st-admin-release-v39__update-icon">
                  <Icon aria-hidden="true" />
                </span>

                <span className="st-admin-release-v39__update-copy">
                  <strong>{improvement.title}</strong>
                  <span>{improvement.description}</span>
                </span>

                <Check
                  className="st-admin-release-v39__check"
                  aria-hidden="true"
                />
              </article>
            );
          })}
        </div>

        <div className="st-admin-release-v39__footer">
          <button
            type="button"
            className="st-admin-release-v39__continue"
            onClick={dismiss}
          >
            Continue to Admin
          </button>
        </div>
      </section>
    </div>
  );
}
