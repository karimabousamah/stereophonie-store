"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useStoreSettings } from "@/components/storefront/store-settings-provider";

type TransitionPhase = "idle" | "entering" | "holding" | "leaving";

const ENTER_DURATION = 330;
const LEAVE_DURATION = 500;
const NAVIGATION_TIMEOUT = 8000;

export default function PageTransition() {
  const { storeName } = useStoreSettings();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.toString();
  const route = query ? `${pathname}?${query}` : pathname;

  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const phaseRef = useRef<TransitionPhase>("idle");
  const routeRef = useRef(route);
  const navigationPending = useRef(false);

  const navigationTimer = useRef<number | null>(null);
  const releaseTimer = useRef<number | null>(null);
  const fallbackTimer = useRef<number | null>(null);

  const setTransitionPhase = useCallback((next: TransitionPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimer = useCallback(
    (timer: React.MutableRefObject<number | null>) => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    },
    [],
  );

  const clearTimers = useCallback(() => {
    clearTimer(navigationTimer);
    clearTimer(releaseTimer);
    clearTimer(fallbackTimer);
  }, [clearTimer]);

  const releasePage = useCallback(() => {
    clearTimer(releaseTimer);

    setTransitionPhase("leaving");

    releaseTimer.current = window.setTimeout(() => {
      setTransitionPhase("idle");
      releaseTimer.current = null;
    }, LEAVE_DURATION);
  }, [clearTimer, setTransitionPhase]);

  const navigate = useCallback(
    (destination: string) => {
      if (phaseRef.current !== "idle") {
        return;
      }

      clearTimers();

      navigationPending.current = true;
      setTransitionPhase("entering");

      navigationTimer.current = window.setTimeout(() => {
        setTransitionPhase("holding");
        router.push(destination);
        navigationTimer.current = null;
      }, ENTER_DURATION);

      fallbackTimer.current = window.setTimeout(() => {
        navigationPending.current = false;
        releasePage();
        fallbackTimer.current = null;
      }, NAVIGATION_TIMEOUT);
    },
    [clearTimers, releasePage, router, setTransitionPhase],
  );

  useEffect(() => {
    if (route === routeRef.current) {
      return;
    }

    routeRef.current = route;

    if (!navigationPending.current) {
      return;
    }

    navigationPending.current = false;
    clearTimer(fallbackTimer);

    const timer = window.setTimeout(releasePage, 70);

    return () => window.clearTimeout(timer);
  }, [route, clearTimer, releasePage]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
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

      const anchor = target.closest("a") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (
        anchor.hasAttribute("data-no-page-transition") ||
        anchor.closest("[data-no-page-transition]")
      ) {
        return;
      }

      const rawHref = anchor.getAttribute("href");

      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        rawHref.startsWith("mailto:") ||
        rawHref.startsWith("tel:") ||
        rawHref.startsWith("javascript:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const current = new URL(window.location.href);
      const next = new URL(anchor.href, window.location.href);

      if (current.origin !== next.origin) {
        return;
      }

      const currentDestination =
        current.pathname + current.search + current.hash;

      const nextDestination = next.pathname + next.search + next.hash;

      if (currentDestination === nextDestination) {
        return;
      }

      if (
        current.pathname === next.pathname &&
        current.search === next.search &&
        next.hash
      ) {
        return;
      }

      event.preventDefault();
      navigate(nextDestination);
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      clearTimers();
    };
  }, [clearTimers, navigate]);

  return (
    <div
      aria-hidden="true"
      className={`stereo-transition stereo-transition--${phase}`}
    >
      <div className="stereo-transition__panel stereo-transition__panel--top" />
      <div className="stereo-transition__panel stereo-transition__panel--bottom" />

      <div className="stereo-transition__signal">
        <div className="stereo-transition__signal-track">
          <span />
        </div>

        <div className="stereo-transition__identity">
          <span className="stereo-transition__status">SYSTEM / ONLINE</span>

          <strong>{storeName}</strong>

          <span className="stereo-transition__status">
            TECHNOLOGY / LEBANON
          </span>
        </div>
      </div>
    </div>
  );
}
