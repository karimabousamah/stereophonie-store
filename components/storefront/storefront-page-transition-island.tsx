"use client";

import { Check, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TransitionPhase = "hidden" | "loading" | "complete" | "exiting";

const MINIMUM_VISIBLE_MS = 650;
const COMPLETE_VISIBLE_MS = 450;
const EXIT_DURATION_MS = 180;
const SAFETY_TIMEOUT_MS = 12000;

function normalizeRouteKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function normalizeDestinationLabel(label: string) {
  return label.replace(/^(?:Shop|View)\s+/i, "").trim();
}

function getDestinationLabel(anchor: HTMLAnchorElement, url: URL) {
  const explicit =
    anchor.getAttribute("aria-label")?.trim() ||
    anchor.getAttribute("title")?.trim();

  if (explicit) {
    return normalizeDestinationLabel(explicit).slice(0, 34);
  }

  const text = anchor.textContent?.replace(/\s+/g, " ").trim();

  if (text) {
    return normalizeDestinationLabel(text).slice(0, 34);
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "Home";
  }

  return segments[segments.length - 1]
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .slice(0, 34);
}

function syncIslandToHeaderEdge() {
  /*
   * The current storefront uses the V3 fixed header.
   * Keep the V2 selector only as a compatibility fallback.
   */
  const header =
    document.querySelector<HTMLElement>(".st3-header") ??
    document.querySelector<HTMLElement>(".st-v2-header");

  if (!header) {
    document.documentElement.style.removeProperty(
      "--st-island-header-edge",
    );
    return;
  }

  const headerRect = header.getBoundingClientRect();

  /*
   * Anchor the transition layer to the real visible bottom edge
   * of whichever storefront header is currently mounted.
   */
  const headerEdge = Math.max(
    0,
    Math.round(headerRect.bottom),
  );

  document.documentElement.style.setProperty(
    "--st-island-header-edge",
    `${headerEdge}px`,
  );
}

export default function StorefrontPageTransitionIsland() {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeKey = normalizeRouteKey(
    pathname,
    searchParams.toString(),
  );

  const [phase, setPhase] = useState<TransitionPhase>("hidden");
  const [destination, setDestination] = useState("Page");

  const phaseRef = useRef<TransitionPhase>("hidden");
  const previousRouteKeyRef = useRef(routeKey);
  const expectedDestinationRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);

  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePhase = useCallback((nextPhase: TransitionPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  useEffect(() => {
    syncIslandToHeaderEdge();

    const frame = window.requestAnimationFrame(() => {
      syncIslandToHeaderEdge();
    });

    window.addEventListener("resize", syncIslandToHeaderEdge);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncIslandToHeaderEdge);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const hideTransition = useCallback(() => {
    expectedDestinationRef.current = null;
    updatePhase("exiting");

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      updatePhase("hidden");
    }, EXIT_DURATION_MS);
  }, [updatePhase]);

  const finishTransition = useCallback(() => {
    if (phaseRef.current !== "loading") {
      return;
    }

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, MINIMUM_VISIBLE_MS - elapsed);

    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
    }

    completionTimerRef.current = setTimeout(() => {
      completionTimerRef.current = null;

      if (phaseRef.current !== "loading") {
        return;
      }

      updatePhase("complete");

      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }

      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        hideTransition();
      }, COMPLETE_VISIBLE_MS);
    }, remaining);
  }, [hideTransition, updatePhase]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");

      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      let url: URL;

      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (
        url.origin !== window.location.origin ||
        url.pathname.startsWith("/admin")
      ) {
        return;
      }

      const destinationKey = normalizeRouteKey(
        url.pathname,
        url.searchParams.toString(),
      );

      const currentKey = normalizeRouteKey(
        window.location.pathname,
        window.location.search.slice(1),
      );

      if (destinationKey === currentKey && !url.hash) {
        return;
      }

      clearTimers();

      expectedDestinationRef.current = destinationKey;
      setDestination(getDestinationLabel(anchor, url));
      startedAtRef.current = performance.now();
      updatePhase("loading");

      safetyTimerRef.current = setTimeout(() => {
        safetyTimerRef.current = null;
        hideTransition();
      }, SAFETY_TIMEOUT_MS);
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      clearTimers();
    };
  }, [clearTimers, hideTransition, updatePhase]);

  useEffect(() => {
    const previousRouteKey = previousRouteKeyRef.current;
    previousRouteKeyRef.current = routeKey;

    if (previousRouteKey === routeKey || phaseRef.current !== "loading") {
      return;
    }

    const expected = expectedDestinationRef.current;

    if (expected && routeKey !== expected) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        finishTransition();
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [finishTransition, routeKey]);

  const loading = phase === "loading";
  const complete = phase === "complete";
  const exiting = phase === "exiting";

  const loadingWidth = Math.min(
    320,
    Math.max(
      176,
      120 + destination.length * 6.4,
    ),
  );

  return (
    <AnimatePresence>
      {phase !== "hidden" ? (
        <motion.div
          key="storefront-transition-island"
          className="st-storefront-transition-layer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={
            reduceMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  y: -64,
                  scale: 0.96,
                }
          }
          animate={
            reduceMotion
              ? {
                  opacity: exiting ? 0 : 1,
                }
              : exiting
                ? {
                    opacity: 0,
                    y: -64,
                    scale: 0.96,
                  }
                : {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }
          }
          exit={
            reduceMotion
              ? { opacity: 0 }
              : {
                  opacity: 0,
                  y: -64,
                  scale: 0.96,
                  transition: {
                    duration: EXIT_DURATION_MS / 1000,
                    ease: [0.4, 0, 1, 1],
                  },
                }
          }
          transition={
            reduceMotion
              ? { duration: 0.12 }
              : exiting
                ? {
                    duration: EXIT_DURATION_MS / 1000,
                    ease: [0.4, 0, 1, 1],
                  }
                : {
                    type: "spring",
                    stiffness: 390,
                    damping: 30,
                    mass: 0.72,
                  }
          }
        >
          <motion.div
            className={`st-storefront-transition-island ${
              complete ? "is-complete" : "is-loading"
            }`}
            initial={false}
            animate={{
              width: complete ? 118 : loadingWidth,
            }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : {
                    type: "spring",
                    stiffness: 390,
                    damping: 32,
                  }
            }
          >
            <div className="st-storefront-transition-island__content">
              <AnimatePresence mode="wait" initial={false}>
                {loading ? (
                  <motion.div
                    key={`loading-${destination}`}
                    className="st-storefront-transition-island__state"
                    initial={{
                      opacity: 0,
                      y: 5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -5,
                    }}
                    transition={{
                      duration: reduceMotion ? 0.1 : 0.16,
                    }}
                  >
                    <span className="st-storefront-transition-island__icon">
                      <span
                        className="st-storefront-transition-island__spinner"
                        aria-hidden="true"
                        ref={(node) => {
                          if (!node) return;

                          if (
                            node.dataset.spinnerActive === "true"
                          ) {
                            return;
                          }

                          node.dataset.spinnerActive = "true";

                          node.animate(
                            [
                              {
                                transform: "rotate(0deg)",
                              },
                              {
                                transform: "rotate(360deg)",
                              },
                            ],
                            {
                              duration: 780,
                              iterations: Infinity,
                              easing: "linear",
                            },
                          );
                        }}
                      >
                        <LoaderCircle />
                      </span>
                    </span>

                    <span className="st-storefront-transition-island__label">
                      Loading <strong>{destination}</strong>
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="complete"
                    className="st-storefront-transition-island__state"
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    transition={{
                      duration: reduceMotion ? 0.1 : 0.16,
                    }}
                  >
                    <span className="st-storefront-transition-island__icon st-storefront-transition-island__icon--complete">
                      <Check aria-hidden="true" />
                    </span>

                    <span className="st-storefront-transition-island__label">
                      Ready
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {loading && !reduceMotion ? (
              <motion.span
                className="st-storefront-transition-island__sheen"
                aria-hidden="true"
                initial={{ x: "-160%" }}
                animate={{ x: "340%" }}
                transition={{
                  duration: 1.45,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0.12,
                }}
              />
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
