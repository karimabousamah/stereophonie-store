"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  Check,
  LoaderCircle,
} from "lucide-react";

type IslandPhase =
  | "hidden"
  | "loading"
  | "complete"
  | "exiting";

type PendingNavigation = {
  key: string;
  label: string;
};

const MINIMUM_VISIBLE_MS = 520;
const COMPLETE_VISIBLE_MS = 430;
const EXIT_DURATION_MS = 360;
const SAFETY_TIMEOUT_MS = 10000;

const ADMIN_DESTINATION_LABELS: Record<
  string,
  string
> = {
  "/admin": "Dashboard",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/brands": "Brands",
  "/admin/homepage": "Homepage",
  "/admin/orders": "Orders",
  "/admin/best-selling": "Best Selling",
  "/admin/stock-alerts": "Stock Alerts",
  "/admin/customers": "Customers",
  "/admin/coupons": "Coupons",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings",
};

function isModifiedClick(
  event: MouseEvent,
) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function destinationLabel(
  pathname: string,
) {
  const direct =
    ADMIN_DESTINATION_LABELS[pathname];

  if (direct) {
    return direct;
  }

  if (
    pathname.startsWith(
      "/admin/products/",
    )
  ) {
    if (
      pathname ===
      "/admin/products/new"
    ) {
      return "New Product";
    }

    return "Product";
  }

  if (
    pathname.startsWith(
      "/admin/orders/",
    )
  ) {
    return "Order";
  }

  const segment =
    pathname
      .split("/")
      .filter(Boolean)
      .at(-1) ?? "Admin";

  return segment
    .split("-")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function getAdminDestination(
  event: MouseEvent,
): PendingNavigation | null {
  if (isModifiedClick(event)) {
    return null;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest("a");

  if (
    !(anchor instanceof HTMLAnchorElement)
  ) {
    return null;
  }

  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download")
  ) {
    return null;
  }

  let destination: URL;

  try {
    destination = new URL(
      anchor.href,
      window.location.href,
    );
  } catch {
    return null;
  }

  if (
    destination.origin !==
    window.location.origin
  ) {
    return null;
  }

  if (
    !destination.pathname.startsWith(
      "/admin",
    )
  ) {
    return null;
  }

  const current = new URL(
    window.location.href,
  );

  const destinationKey =
    destination.pathname +
    destination.search;

  const currentKey =
    current.pathname +
    current.search;

  if (destinationKey === currentKey) {
    return null;
  }

  return {
    key: destinationKey,
    label: destinationLabel(
      destination.pathname,
    ),
  };
}

export default function AdminPageTransitionIsland() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  const searchKey =
    searchParams?.toString() ?? "";

  const routeKey =
    pathname +
    (searchKey ? `?${searchKey}` : "");

  const [phase, setPhase] =
    useState<IslandPhase>("hidden");

  const [destination, setDestination] =
    useState("Admin");

  const phaseRef =
    useRef<IslandPhase>("hidden");

  const startedAtRef = useRef(0);

  const expectedDestinationRef =
    useRef<string | null>(null);

  const previousRouteKeyRef =
    useRef(routeKey);

  const completionTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const hideTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const safetyTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const updatePhase = useCallback(
    (nextPhase: IslandPhase) => {
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
    },
    [],
  );

  const clearTimers = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(
        completionTimerRef.current,
      );
      completionTimerRef.current = null;
    }

    if (hideTimerRef.current) {
      clearTimeout(
        hideTimerRef.current,
      );
      hideTimerRef.current = null;
    }

    if (safetyTimerRef.current) {
      clearTimeout(
        safetyTimerRef.current,
      );
      safetyTimerRef.current = null;
    }
  }, []);

  const finishTransition =
    useCallback(() => {
      if (
        phaseRef.current !== "loading"
      ) {
        return;
      }

      const elapsed =
        performance.now() -
        startedAtRef.current;

      const remaining = Math.max(
        0,
        MINIMUM_VISIBLE_MS - elapsed,
      );

      if (completionTimerRef.current) {
        clearTimeout(
          completionTimerRef.current,
        );
      }

      completionTimerRef.current =
        setTimeout(() => {
          completionTimerRef.current =
            null;

          if (
            phaseRef.current !==
            "loading"
          ) {
            return;
          }

          updatePhase("complete");

          if (safetyTimerRef.current) {
            clearTimeout(
              safetyTimerRef.current,
            );
            safetyTimerRef.current = null;
          }

          hideTimerRef.current =
            setTimeout(() => {
              hideTimerRef.current =
                null;

              expectedDestinationRef.current =
                null;

              updatePhase("exiting");

              hideTimerRef.current =
                setTimeout(() => {
                  hideTimerRef.current =
                    null;

                  updatePhase("hidden");
                }, EXIT_DURATION_MS);
            }, COMPLETE_VISIBLE_MS);
        }, remaining);
    }, [updatePhase]);

  useEffect(() => {
    function handleDocumentClick(
      event: MouseEvent,
    ) {
      const navigation =
        getAdminDestination(event);

      if (!navigation) {
        return;
      }

      clearTimers();

      expectedDestinationRef.current =
        navigation.key;

      setDestination(
        navigation.label,
      );

      startedAtRef.current =
        performance.now();

      updatePhase("loading");

      safetyTimerRef.current =
        setTimeout(() => {
          safetyTimerRef.current = null;

          expectedDestinationRef.current =
            null;

          updatePhase("exiting");

          hideTimerRef.current =
            setTimeout(() => {
              hideTimerRef.current =
                null;

              updatePhase("hidden");
            }, EXIT_DURATION_MS);
        }, SAFETY_TIMEOUT_MS);
    }

    document.addEventListener(
      "click",
      handleDocumentClick,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick,
        true,
      );

      clearTimers();
    };
  }, [
    clearTimers,
    updatePhase,
  ]);

  useEffect(() => {
    const previousRouteKey =
      previousRouteKeyRef.current;

    previousRouteKeyRef.current =
      routeKey;

    if (
      previousRouteKey === routeKey ||
      phaseRef.current !== "loading"
    ) {
      return;
    }

    const expected =
      expectedDestinationRef.current;

    if (
      expected &&
      routeKey !== expected
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(
      () => {
        window.requestAnimationFrame(
          () => {
            finishTransition();
          },
        );
      },
    );

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    routeKey,
    finishTransition,
  ]);

  const loading =
    phase === "loading";

  const complete =
    phase === "complete";

  const exiting =
    phase === "exiting";

  const loadingWidth = Math.min(
    310,
    Math.max(
      188,
      126 + destination.length * 7,
    ),
  );

  return (
    <AnimatePresence>
      {phase !== "hidden" ? (
        <motion.div
          key="admin-transition-island"
          className="st-admin-transition-island-layer"
          aria-live="polite"
          aria-atomic="true"
          initial={
            reduceMotion
              ? {
                  opacity: 0,
                }
              : {
                  opacity: 0,
                  y: -52,
                  scale: 0.78,
                }
          }
          animate={
            reduceMotion
              ? {
                  opacity: exiting
                    ? 0
                    : 1,
                }
              : exiting
                ? {
                    opacity: 0,
                    y: -58,
                    scale: 0.82,
                  }
                : {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }
          }
          exit={
            reduceMotion
              ? {
                  opacity: 0,
                }
              : {
                  opacity: 0,
                  y: -58,
                  scale: 0.82,
                  transition: {
                    duration: 0.3,
                    ease: [0.4, 0, 1, 1],
                  },
                }
          }
          transition={
            reduceMotion
              ? {
                  duration: 0.12,
                }
              : exiting
                ? {
                    duration:
                      EXIT_DURATION_MS / 1000,
                    ease: [
                      0.4,
                      0,
                      1,
                      1,
                    ],
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
            className={`st-admin-transition-island ${
              complete
                ? "is-complete"
                : "is-loading"
            }`}
            initial={false}
            animate={{
              width: complete
                ? 142
                : loadingWidth,
            }}
            transition={
              reduceMotion
                ? {
                    duration: 0.12,
                  }
                : {
                    type: "spring",
                    stiffness: 390,
                    damping: 32,
                  }
            }
          >
            <div className="st-admin-transition-island__content">
              <AnimatePresence
                mode="wait"
                initial={false}
              >
                {loading ? (
                  <motion.div
                    key={`loading-${destination}`}
                    className="st-admin-transition-island__state"
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
                      duration: reduceMotion
                        ? 0.1
                        : 0.16,
                    }}
                  >
                    <span className="st-admin-transition-island__icon">
                      <span
                        className="st-admin-transition-island__spinner"
                        aria-hidden="true"
                        ref={(node) => {
                          if (!node) {
                            return;
                          }

                          if (
                            node.dataset.spinnerActive ===
                            "true"
                          ) {
                            return;
                          }

                          node.dataset.spinnerActive =
                            "true";

                          node.animate(
                            [
                              {
                                transform:
                                  "rotate(0deg)",
                              },
                              {
                                transform:
                                  "rotate(360deg)",
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

                    <span className="st-admin-transition-island__label">
                      Loading{" "}
                      <strong>
                        {destination}
                      </strong>
                    </span>

                  </motion.div>
                ) : (
                  <motion.div
                    key="complete"
                    className="st-admin-transition-island__state"
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
                      duration: reduceMotion
                        ? 0.1
                        : 0.16,
                    }}
                  >
                    <span className="st-admin-transition-island__icon st-admin-transition-island__icon--complete">
                      <Check
                        aria-hidden="true"
                      />
                    </span>

                    <span className="st-admin-transition-island__label">
                      Ready
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {loading && !reduceMotion ? (
              <motion.span
                className="st-admin-transition-island__sheen"
                aria-hidden="true"
                initial={{
                  x: "-160%",
                }}
                animate={{
                  x: "340%",
                }}
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
