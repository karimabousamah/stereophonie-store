"use client";

import { useEffect } from "react";

type CollectionsAutoScrollProps = {
  enabled?: boolean;
};

type CollectionScrollSpeed = "slow" | "normal" | "fast";

type SettingResponse = {
  enabled?: boolean;
  speed?: CollectionScrollSpeed;
};

export default function CollectionsAutoScroll({
  enabled: enabledProp,
}: CollectionsAutoScrollProps) {
  useEffect(() => {
    if (window.location.pathname !== "/") {
      return;
    }

    let cancelled = false;

    let searchTimer: ReturnType<typeof setInterval> | null = null;

    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    let animationFrame: number | null = null;

    let cleanupScroller: (() => void) | null = null;

    async function initialise() {
      let enabled = enabledProp;

      let speed: CollectionScrollSpeed = "normal";

      if (typeof enabled !== "boolean") {
        try {
          const response = await fetch(
            "/api/homepage/collections-auto-scroll",
            {
              cache: "no-store",
            },
          );

          if (response.ok) {
            const data = (await response.json()) as SettingResponse;

            enabled = data.enabled !== false;

            if (
              data.speed === "slow" ||
              data.speed === "normal" ||
              data.speed === "fast"
            ) {
              speed = data.speed;
            }
          } else {
            enabled = true;
          }
        } catch {
          enabled = true;
        }
      }

      if (cancelled || enabled === false) {
        return;
      }

      function activate() {
        if (cleanupScroller) {
          return true;
        }

        const scroller = document.querySelector<HTMLElement>(
          '[data-collections-scroller="true"]',
        );

        if (!scroller) {
          return false;
        }

        const activeScroller = scroller;

        if (activeScroller.scrollWidth <= activeScroller.clientWidth + 2) {
          return false;
        }

        let paused = false;
        let pointerDown = false;
        let scrollerVisible = true;

        /*
         * 1 = move right
         * -1 = move left
         */
        let direction: 1 | -1 = 1;

        let lastTimestamp = performance.now();

        let edgePauseUntil = 0;

        const pixelsPerSecond =
          speed === "slow" ? 18 : speed === "fast" ? 42 : 28;

        const previousSnap = activeScroller.style.scrollSnapType;

        const previousBehavior = activeScroller.style.scrollBehavior;

        const previousCursor = activeScroller.style.cursor;

        /*
         * Mandatory snap can fight continuous
         * auto-scrolling in Safari.
         */
        activeScroller.style.scrollSnapType = "none";

        activeScroller.style.scrollBehavior = "auto";

        activeScroller.style.cursor = "grab";

        function scheduleResume() {
          paused = true;

          if (resumeTimer) {
            clearTimeout(resumeTimer);
          }

          resumeTimer = setTimeout(() => {
            if (!pointerDown) {
              paused = false;

              lastTimestamp = performance.now();
            }
          }, 1900);
        }

        function onPointerDown() {
          pointerDown = true;
          paused = true;

          activeScroller.style.cursor = "grabbing";
        }

        function onPointerUp() {
          if (!pointerDown) {
            return;
          }

          pointerDown = false;

          activeScroller.style.cursor = "grab";

          scheduleResume();
        }

        function onTouchStart() {
          pointerDown = true;
          paused = true;
        }

        function onTouchEnd() {
          pointerDown = false;

          scheduleResume();
        }

        function onWheel() {
          scheduleResume();
        }

        function animate(timestamp: number) {
          if (cancelled) {
            return;
          }

          const delta = Math.min(timestamp - lastTimestamp, 40);

          lastTimestamp = timestamp;

          if (
            !paused &&
            !pointerDown &&
            !document.hidden &&
            scrollerVisible &&
            timestamp >= edgePauseUntil
          ) {
            const maximum =
              activeScroller.scrollWidth - activeScroller.clientWidth;

            if (maximum > 1) {
              if (direction === 1 && activeScroller.scrollLeft >= maximum - 1) {
                activeScroller.scrollLeft = maximum;

                direction = -1;

                edgePauseUntil = timestamp + 800;
              } else if (direction === -1 && activeScroller.scrollLeft <= 1) {
                activeScroller.scrollLeft = 0;

                direction = 1;

                edgePauseUntil = timestamp + 800;
              } else {
                const movement = (pixelsPerSecond * delta) / 1000;

                activeScroller.scrollLeft += movement * direction;
              }
            }
          }

          animationFrame = requestAnimationFrame(animate);
        }

        activeScroller.addEventListener("pointerdown", onPointerDown);

        window.addEventListener("pointerup", onPointerUp);

        window.addEventListener("pointercancel", onPointerUp);

        activeScroller.addEventListener("wheel", onWheel, {
          passive: true,
        });

        activeScroller.addEventListener("touchstart", onTouchStart, {
          passive: true,
        });

        activeScroller.addEventListener("touchend", onTouchEnd, {
          passive: true,
        });

        const visibilityObserver = new IntersectionObserver(
          ([entry]) => {
            scrollerVisible = entry?.isIntersecting ?? true;

            if (scrollerVisible) {
              lastTimestamp = performance.now();
            }
          },
          {
            root: null,
            threshold: 0.05,
          },
        );

        visibilityObserver.observe(activeScroller);

        animationFrame = requestAnimationFrame(animate);

        cleanupScroller = () => {
          visibilityObserver.disconnect();
          if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);

            animationFrame = null;
          }

          if (resumeTimer) {
            clearTimeout(resumeTimer);

            resumeTimer = null;
          }

          activeScroller.style.scrollSnapType = previousSnap;

          activeScroller.style.scrollBehavior = previousBehavior;

          activeScroller.style.cursor = previousCursor;

          activeScroller.removeEventListener("pointerdown", onPointerDown);

          window.removeEventListener("pointerup", onPointerUp);

          window.removeEventListener("pointercancel", onPointerUp);

          activeScroller.removeEventListener("wheel", onWheel);

          activeScroller.removeEventListener("touchstart", onTouchStart);

          activeScroller.removeEventListener("touchend", onTouchEnd);
        };

        return true;
      }

      if (!activate()) {
        searchTimer = setInterval(() => {
          if (activate() && searchTimer) {
            clearInterval(searchTimer);

            searchTimer = null;
          }
        }, 250);
      }
    }

    void initialise();

    return () => {
      cancelled = true;

      if (searchTimer) {
        clearInterval(searchTimer);
      }

      cleanupScroller?.();
    };
  }, [enabledProp]);

  return null;
}
