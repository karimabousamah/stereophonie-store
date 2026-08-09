"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function PremiumMotionController() {
  const pathname = usePathname();

  const [scrollProgress, setScrollProgress] = useState(0);

  const frame = useRef<number | null>(null);
  const pointerFrame = useRef<number | null>(null);
  const lastScroll = useRef(0);

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;

    if (isAdmin) {
      body.classList.remove(
        "nita-premium-motion-enabled",
        "nita-scroll-down",
        "nita-scroll-up",
      );

      return;
    }

    body.classList.add("nita-premium-motion-enabled");

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    function registerTargets() {
      const main = document.querySelector("main");

      if (!main) return;

      const sections = Array.from(
        main.querySelectorAll<HTMLElement>(":scope > section"),
      );

      sections.forEach((section, index) => {
        if (index === 0) return;

        section.dataset.nitaMotion = "section";
        section.style.setProperty(
          "--nita-motion-delay",
          `${(index % 4) * 90}ms`,
        );

        observer?.observe(section);
      });

      const headings = Array.from(
        main.querySelectorAll<HTMLElement>("h1, h2, h3"),
      );

      headings.forEach((heading, index) => {
        if (sections[0]?.contains(heading)) {
          return;
        }

        heading.dataset.nitaMotion = "heading";

        heading.style.setProperty(
          "--nita-motion-delay",
          `${(index % 5) * 75}ms`,
        );

        observer?.observe(heading);
      });

      const cards = Array.from(
        main.querySelectorAll<HTMLElement>(
          ['a[href^="/shop/"]', '[data-collections-scroller="true"] > *'].join(
            ",",
          ),
        ),
      );

      cards.forEach((card, index) => {
        card.dataset.nitaMotion = "card";

        card.style.setProperty("--nita-motion-delay", `${(index % 6) * 85}ms`);

        observer?.observe(card);
      });

      main
        .querySelectorAll<HTMLImageElement>(
          [
            'a[href^="/shop/"] img',
            '[data-collections-scroller="true"] img',
          ].join(","),
        )
        .forEach((image) => {
          image.classList.add("nita-premium-image");
        });
    }

    if (!reducedMotion) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const element = entry.target as HTMLElement;

            element.dataset.nitaInView = entry.isIntersecting
              ? "true"
              : "false";
          });
        },
        {
          threshold: 0.18,
          rootMargin: "-5% 0px -8% 0px",
        },
      );
    }

    registerTargets();

    mutationObserver = new MutationObserver(registerTargets);

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    function updateScroll() {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }

      frame.current = requestAnimationFrame(() => {
        const current = window.scrollY;

        const max = document.documentElement.scrollHeight - window.innerHeight;

        const progress = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;

        setScrollProgress(progress);

        root.style.setProperty("--nita-scroll-progress", String(progress));

        root.style.setProperty(
          "--nita-parallax-1",
          `${Math.round(current * 0.035)}px`,
        );

        root.style.setProperty(
          "--nita-parallax-2",
          `${Math.round(current * -0.022)}px`,
        );

        root.style.setProperty(
          "--nita-ambient-y",
          `${Math.round(progress * 240)}px`,
        );

        if (current > lastScroll.current + 3) {
          body.classList.add("nita-scroll-down");

          body.classList.remove("nita-scroll-up");
        } else if (current < lastScroll.current - 3) {
          body.classList.add("nita-scroll-up");

          body.classList.remove("nita-scroll-down");
        }

        lastScroll.current = current;
      });
    }

    function handlePointerMove(event: PointerEvent) {
      if (reducedMotion || event.pointerType === "touch") {
        return;
      }

      if (pointerFrame.current !== null) {
        cancelAnimationFrame(pointerFrame.current);
      }

      pointerFrame.current = requestAnimationFrame(() => {
        root.style.setProperty("--nita-pointer-x", `${event.clientX}px`);

        root.style.setProperty("--nita-pointer-y", `${event.clientY}px`);
      });
    }

    updateScroll();

    window.addEventListener("scroll", updateScroll, {
      passive: true,
    });

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    /*
     * -------------------------------------------------------
     * INTERACTIVE CURSOR FEEDBACK
     * -------------------------------------------------------
     */

    const interactiveSelector =
      'a, button, [role="button"], input, select, textarea, label';

    const handlePointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(interactiveSelector)) {
        root.dataset.nitaPointerInteractive = "true";
      }
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      if (!target.closest(interactiveSelector)) {
        return;
      }

      const nextTarget = event.relatedTarget;

      if (
        nextTarget instanceof Element &&
        nextTarget.closest(interactiveSelector)
      ) {
        return;
      }

      delete root.dataset.nitaPointerInteractive;
    };

    window.addEventListener("pointerover", handlePointerOver, {
      passive: true,
    });

    window.addEventListener("pointerout", handlePointerOut, {
      passive: true,
    });

    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();

      body.classList.remove(
        "nita-premium-motion-enabled",
        "nita-scroll-down",
        "nita-scroll-up",
      );

      window.removeEventListener("scroll", updateScroll);

      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerover", handlePointerOver);

      window.removeEventListener("pointerout", handlePointerOut);

      delete root.dataset.nitaPointerInteractive;

      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }

      if (pointerFrame.current !== null) {
        cancelAnimationFrame(pointerFrame.current);
      }
    };
  }, [isAdmin, pathname]);

  if (isAdmin) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" className="nita-premium-ambient" />

      <div aria-hidden="true" className="nita-premium-scroll-progress">
        <div
          style={{
            transform: `scaleX(${scrollProgress})`,
          }}
        />
      </div>
    </>
  );
}
