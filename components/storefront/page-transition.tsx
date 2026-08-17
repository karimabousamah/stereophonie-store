"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import BrandLogo from "@/components/storefront/brand-logo";

type TransitionPhase = "idle" | "entering" | "holding" | "leaving";

const ENTER_DURATION = 190;
const MINIMUM_VISIBLE = 430;
const LEAVE_DURATION = 300;
const MAXIMUM_HOLD = 7000;

export default function PageTransition() {
  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.toString();

  const route = query ? `${pathname}?${query}` : pathname;

  const [phase, setPhase] = useState<TransitionPhase>("idle");

  const phaseRef = useRef<TransitionPhase>("idle");

  const currentRouteRef = useRef(route);

  const navigationPendingRef = useRef(false);

  const visibleSinceRef = useRef(0);

  const enterTimerRef = useRef<number | null>(null);

  const leaveTimerRef = useRef<number | null>(null);

  const fallbackTimerRef = useRef<number | null>(null);

  const setTransitionPhase = useCallback((next: TransitionPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimer = useCallback(
    (ref: React.MutableRefObject<number | null>) => {
      if (ref.current !== null) {
        window.clearTimeout(ref.current);
        ref.current = null;
      }
    },
    [],
  );

  const clearTimers = useCallback(() => {
    clearTimer(enterTimerRef);
    clearTimer(leaveTimerRef);
    clearTimer(fallbackTimerRef);
  }, [clearTimer]);

  const hideTransition = useCallback(() => {
    clearTimer(leaveTimerRef);

    const elapsed = performance.now() - visibleSinceRef.current;

    const delay = Math.max(0, MINIMUM_VISIBLE - elapsed);

    leaveTimerRef.current = window.setTimeout(() => {
      setTransitionPhase("leaving");

      leaveTimerRef.current = window.setTimeout(() => {
        setTransitionPhase("idle");
        leaveTimerRef.current = null;
      }, LEAVE_DURATION);
    }, delay);
  }, [clearTimer, setTransitionPhase]);

  const revealTransition = useCallback(() => {
    if (phaseRef.current !== "idle") {
      return false;
    }

    clearTimers();

    visibleSinceRef.current = performance.now();

    setTransitionPhase("entering");

    return true;
  }, [clearTimers, setTransitionPhase]);

  const navigate = useCallback(
    (destination: string) => {
      const current = new URL(window.location.href);

      const next = new URL(destination, window.location.href);

      if (current.origin !== next.origin) {
        window.location.href = next.href;
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
        window.location.hash = next.hash;
        return;
      }

      const didReveal = revealTransition();

      navigationPendingRef.current = true;

      if (!didReveal) {
        router.push(nextDestination);
        return;
      }

      enterTimerRef.current = window.setTimeout(() => {
        setTransitionPhase("holding");

        router.push(nextDestination);

        enterTimerRef.current = null;
      }, ENTER_DURATION);

      fallbackTimerRef.current = window.setTimeout(() => {
        navigationPendingRef.current = false;

        hideTransition();

        fallbackTimerRef.current = null;
      }, MAXIMUM_HOLD);
    },
    [hideTransition, revealTransition, router, setTransitionPhase],
  );

  /*
   * Route observation is deliberately independent
   * of click interception.
   *
   * This means router.push(), filter navigation,
   * checkout navigation, account navigation, etc.
   * still receive the Arcade OS transition.
   */
  useEffect(() => {
    if (route === currentRouteRef.current) {
      return;
    }

    currentRouteRef.current = route;

    clearTimer(fallbackTimerRef);

    if (!navigationPendingRef.current && phaseRef.current === "idle") {
      visibleSinceRef.current = performance.now();

      setTransitionPhase("holding");
    } else {
      setTransitionPhase("holding");
    }

    navigationPendingRef.current = false;

    const release = window.setTimeout(hideTransition, 60);

    return () => window.clearTimeout(release);
  }, [route, clearTimer, hideTransition, setTransitionPhase]);

  /*
   * Standard link navigation:
   * show transition BEFORE Next.js changes route.
   */
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

      const href = anchor.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
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

  /*
   * Back / forward navigation.
   * Browser history can change route without
   * going through our intercepted link.
   */
  useEffect(() => {
    function handlePopState() {
      if (phaseRef.current === "idle") {
        visibleSinceRef.current = performance.now();

        setTransitionPhase("holding");
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [setTransitionPhase]);

  return (
    <div
      aria-hidden="true"
      className={`stereo-transition stereo-transition--${phase}`}
    >
      <div className="st-route-signal">
        <div className="st-route-signal__grid" />

        <div className="st-route-signal__sweep" />

        <div className="st-route-signal__core">
          <span className="st-route-signal__status">
            <i />
            ROUTING STORE MODULE
          </span>

          <div className="st-route-signal__mark">
            <div className="st-route-signal__logo-hardware">
              <span>ST</span>
            </div>

            <div className="st-route-signal__identity">
              <BrandLogo
                variant="dark"
                className="st-route-signal__real-logo"
                priority
              />

              <small>ARCADE RETAIL OPERATING SYSTEM</small>
            </div>
          </div>

          <div className="st-route-signal__meter">
            <span />
          </div>

          <div className="st-route-signal__diagnostics">
            <span>CATALOG / LINKED</span>
            <span>INTERFACE / SYNC</span>
            <span>PLAYER 01 / READY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
