"use client";

import { useEffect } from "react";

type PremiumBadgeKind = "new" | "low-stock" | "trending";

const badgeLabels = new Map<string, PremiumBadgeKind>([
  ["NEW", "new"],
  ["NEW ARRIVAL", "new"],
  ["NEW ARRIVALS", "new"],

  ["LOW STOCK", "low-stock"],
  ["LOW STOCK.", "low-stock"],

  ["TRENDING", "trending"],
]);

export default function PremiumMerchandiseBadges() {
  useEffect(() => {
    function decorateBadges() {
      const candidates = document.querySelectorAll<HTMLElement>(
        "main span, main div, main p",
      );

      candidates.forEach((element) => {
        /*
         * Only decorate real text badges.
         * Never decorate containers/headings.
         */
        if (element.children.length > 0) {
          return;
        }

        const value = (element.textContent ?? "")
          .trim()
          .replace(/\\s+/g, " ")
          .toUpperCase();

        const badgeKind = badgeLabels.get(value);

        if (!badgeKind) {
          return;
        }

        const rect = element.getBoundingClientRect();

        /*
         * Prevent accidental styling of large UI blocks.
         */
        if (rect.width > 280 || rect.height > 110) {
          return;
        }

        /*
         * Remove stale variant classes first.
         */
        element.classList.remove(
          "nita-merch-badge--new",
          "nita-merch-badge--low-stock",
          "nita-merch-badge--trending",
        );

        element.classList.add(
          "nita-merch-badge",
          `nita-merch-badge--${badgeKind}`,
        );
      });
    }

    decorateBadges();

    const observer = new MutationObserver(() => {
      decorateBadges();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
