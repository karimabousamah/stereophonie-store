"use client";
import { useStoreSettings } from "@/components/storefront/store-settings-provider";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TransitionPhase = "idle" | "covering" | "covered" | "revealing";

const COVER_DURATION = 440;
const REVEAL_DURATION = 600;
const NAVIGATION_TIMEOUT = 8000;

export default function PageTransition() {
  const { storeName } = useStoreSettings();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.toString();

  const currentRoute = query ? `${pathname}?${query}` : pathname;

  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const phaseRef = useRef<TransitionPhase>("idle");

  const currentRouteRef = useRef(currentRoute);

  const navigationPending = useRef(false);

  const coverTimer = useRef<number | null>(null);

  const revealTimer = useRef<number | null>(null);

  const fallbackTimer = useRef<number | null>(null);

  const updatePhase = useCallback((nextPhase: TransitionPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const clearTimer = useCallback(
    (timer: React.MutableRefObject<number | null>) => {
      if (timer.current === null) {
        return;
      }

      window.clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );

  const clearAllTimers = useCallback(() => {
    clearTimer(coverTimer);
    clearTimer(revealTimer);
    clearTimer(fallbackTimer);
  }, [clearTimer]);

  const revealWebsite = useCallback(() => {
    clearTimer(revealTimer);

    updatePhase("revealing");

    revealTimer.current = window.setTimeout(() => {
      updatePhase("idle");
      revealTimer.current = null;
    }, REVEAL_DURATION);
  }, [clearTimer, updatePhase]);

  const beginNavigation = useCallback(
    (destination: string) => {
      if (phaseRef.current !== "idle") {
        return;
      }

      clearAllTimers();

      navigationPending.current = true;

      updatePhase("covering");

      coverTimer.current = window.setTimeout(() => {
        updatePhase("covered");

        router.push(destination);

        coverTimer.current = null;
      }, COVER_DURATION);

      fallbackTimer.current = window.setTimeout(() => {
        navigationPending.current = false;

        revealWebsite();

        fallbackTimer.current = null;
      }, NAVIGATION_TIMEOUT);
    },
    [clearAllTimers, revealWebsite, router, updatePhase],
  );

  useEffect(() => {
    if (currentRoute === currentRouteRef.current) {
      return;
    }

    currentRouteRef.current = currentRoute;

    if (!navigationPending.current) {
      return;
    }

    navigationPending.current = false;

    clearTimer(fallbackTimer);

    const revealDelay = window.setTimeout(() => {
      revealWebsite();
    }, 80);

    return () => {
      window.clearTimeout(revealDelay);
    };
  }, [currentRoute, clearTimer, revealWebsite]);

  useEffect(() => {
    function handleLinkClick(event: MouseEvent) {
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

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const link = target.closest("a") as HTMLAnchorElement | null;

      if (!link) {
        return;
      }

      if (
        link.hasAttribute("data-no-page-transition") ||
        link.closest("[data-no-page-transition]")
      ) {
        return;
      }

      const rawHref = link.getAttribute("href");

      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        rawHref.startsWith("javascript:") ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      const currentUrl = new URL(window.location.href);

      const nextUrl = new URL(link.href, window.location.href);

      if (currentUrl.origin !== nextUrl.origin) {
        return;
      }

      const currentDestination = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;

      const nextDestination = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;

      if (currentDestination === nextDestination) {
        return;
      }

      if (
        currentUrl.pathname === nextUrl.pathname &&
        currentUrl.search === nextUrl.search &&
        nextUrl.hash
      ) {
        return;
      }

      event.preventDefault();

      beginNavigation(nextDestination);
    }

    document.addEventListener("click", handleLinkClick, true);

    return () => {
      document.removeEventListener("click", handleLinkClick, true);

      clearAllTimers();
    };
  }, [beginNavigation, clearAllTimers]);

  const active = phase !== "idle";

  return (
    <div
      aria-hidden="true"
      className={`nita-page-transition nita-page-transition--${phase} ${
        active ? "nita-page-transition--active" : ""
      }`}
    >
      <div className="nita-page-transition__sheet" />

      <div className="nita-page-transition__content">
        <p className="nita-page-transition__eyebrow">
          Selected electronics and technology
        </p>

        <p className="nita-page-transition__logo">{storeName}</p>

        <div className="nita-page-transition__line">
          <span />
        </div>
      </div>

      <style jsx global>{`
        .nita-page-transition {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          overflow: hidden;
          pointer-events: none;
          visibility: hidden;
        }

        .nita-page-transition--active {
          visibility: visible;
        }

        .nita-page-transition__sheet {
          position: absolute;
          inset: -12%;
          background: #080808;
          transform: translate3d(0, -120%, 0);
          will-change: transform;
        }

        .nita-page-transition--covering .nita-page-transition__sheet {
          border-radius: 0 0 48% 48%;
          animation: nitaPageCover ${COVER_DURATION}ms
            cubic-bezier(0.76, 0, 0.24, 1) forwards;
        }

        .nita-page-transition--covered .nita-page-transition__sheet {
          border-radius: 0;
          transform: translate3d(0, 0, 0);
        }

        .nita-page-transition--revealing .nita-page-transition__sheet {
          border-radius: 48% 48% 0 0;
          transform: translate3d(0, 0, 0);
          animation: nitaPageReveal ${REVEAL_DURATION}ms
            cubic-bezier(0.76, 0, 0.24, 1) forwards;
        }

        .nita-page-transition__content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: white;
          text-align: center;
          opacity: 0;
          transform: translateY(10px);
        }

        .nita-page-transition--covering .nita-page-transition__content {
          animation: nitaTransitionContentIn 300ms ease 150ms forwards;
        }

        .nita-page-transition--covered .nita-page-transition__content {
          opacity: 1;
          transform: translateY(0);
        }

        .nita-page-transition--revealing .nita-page-transition__content {
          animation: nitaTransitionContentOut 260ms ease forwards;
        }

        .nita-page-transition__eyebrow {
          margin: 0 0 15px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .nita-page-transition__logo {
          margin: 0;
          font-size: clamp(24px, 3vw, 40px);
          font-weight: 600;
          letter-spacing: 0.27em;
          line-height: 1;
          text-transform: uppercase;
        }

        .nita-page-transition__line {
          position: relative;
          width: min(180px, 44vw);
          height: 1px;
          margin-top: 25px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.16);
        }

        .nita-page-transition__line span {
          position: absolute;
          inset: 0;
          background: white;
          transform: translateX(-101%);
        }

        .nita-page-transition--covering .nita-page-transition__line span,
        .nita-page-transition--covered .nita-page-transition__line span {
          animation: nitaTransitionLine 900ms cubic-bezier(0.65, 0, 0.35, 1)
            180ms infinite;
        }

        @keyframes nitaPageCover {
          from {
            border-radius: 0 0 48% 48%;

            transform: translate3d(0, -120%, 0);
          }

          to {
            border-radius: 0;

            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes nitaPageReveal {
          from {
            border-radius: 0;

            transform: translate3d(0, 0, 0);
          }

          to {
            border-radius: 48% 48% 0 0;

            transform: translate3d(0, 120%, 0);
          }
        }

        @keyframes nitaTransitionContentIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes nitaTransitionContentOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }

          to {
            opacity: 0;
            transform: translateY(-8px);
          }
        }

        @keyframes nitaTransitionLine {
          from {
            transform: translateX(-101%);
          }

          55% {
            transform: translateX(0);
          }

          to {
            transform: translateX(101%);
          }
        }

        @media (max-width: 640px) {
          .nita-page-transition__eyebrow {
            font-size: 8px;
          }

          .nita-page-transition__logo {
            font-size: 25px;
            letter-spacing: 0.22em;
          }

          .nita-page-transition__line {
            margin-top: 20px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .nita-page-transition--covering .nita-page-transition__sheet {
            animation-duration: 250ms;
          }

          .nita-page-transition--revealing .nita-page-transition__sheet {
            animation-duration: 300ms;
          }
        }
      `}</style>
    </div>
  );
}
