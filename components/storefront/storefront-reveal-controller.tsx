"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR = [
  "main > section",
  "main article",
  "main aside",
  "main header",
  "[data-storefront-reveal]",
].join(", ");

export default function StorefrontRevealController() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      return;
    }

    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let animationFrame = 0;

    function prepareElements() {
      const elements = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);

      let cardIndex = 0;

      elements.forEach((element) => {
        if (element.dataset.revealPrepared === "true") {
          return;
        }

        element.dataset.revealPrepared = "true";
        element.dataset.reveal = "true";

        const isProductCard = element.tagName === "ARTICLE";

        const customDelay = element.dataset.revealDelay;

        if (customDelay) {
          element.style.setProperty("--reveal-delay", `${customDelay}ms`);
        } else if (isProductCard) {
          const staggerDelay = (cardIndex % 4) * 90;

          element.style.setProperty("--reveal-delay", `${staggerDelay}ms`);

          cardIndex += 1;
        }

        observer?.observe(element);
      });
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;

          element.dataset.revealed = "true";

          observer?.unobserve(element);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -45px 0px",
      },
    );

    animationFrame = window.requestAnimationFrame(prepareElements);

    mutationObserver = new MutationObserver(() => {
      window.cancelAnimationFrame(animationFrame);

      animationFrame = window.requestAnimationFrame(prepareElements);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  return null;
}
