"use client";

import { useEffect } from "react";

const badgeLabels = new Set(["NEW", "NEW ARRIVAL", "NEW ARRIVALS"]);

export default function PremiumMerchandiseBadges() {
  useEffect(() => {
    function decorateBadges() {
      const candidates = document.querySelectorAll<HTMLElement>(
        "main span, main div, main p",
      );

      candidates.forEach((element) => {
        if (element.children.length > 0) {
          return;
        }

        const value = (element.textContent ?? "")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase();

        if (!badgeLabels.has(value)) {
          return;
        }

        const rect = element.getBoundingClientRect();

        /*
         * Avoid decorating headings or large text blocks.
         */
        if (rect.width > 260 || rect.height > 100) {
          return;
        }

        element.classList.add("nita-merch-badge");
      });
    }

    decorateBadges();

    const observer = new MutationObserver(() => {
      decorateBadges();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
