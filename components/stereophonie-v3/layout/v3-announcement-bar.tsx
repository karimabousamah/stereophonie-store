"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./v3-announcement-bar.module.css";

export type StorefrontAnnouncement = {
  id: string;
  message: string;
  link_label: string | null;
  link_href: string | null;
};

type V3AnnouncementBarProps = {
  announcements: StorefrontAnnouncement[];
  backgroundMode?: "animated" | "still" | "none";
};

const CYCLE_TIME = 4000;

/*
 * The last part of every 4-second cycle is reserved
 * for the premium message transition.
 *
 * 0.82 -> 1.00 = about 720ms.
 */
const TRANSITION_START = 0.82;

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

/*
 * Premium ease-in-out curve.
 *
 * This is calculated in JavaScript intentionally.
 * It means global CSS "animation: none" and
 * prefers-reduced-motion CSS cannot disable the
 * visual transition of this specific announcement bar.
 */
function easeInOutCubic(value: number) {
  const t = clamp(value);

  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function AnnouncementContent({
  announcement,
}: {
  announcement: StorefrontAnnouncement;
}) {
  return (
    <>
      <span className={styles.text}>{announcement.message}</span>

      {announcement.link_label && announcement.link_href ? (
        <a href={announcement.link_href} className={styles.link}>
          <span>{announcement.link_label}</span>

          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 18l6-6-6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      ) : null}
    </>
  );
}

export default function V3AnnouncementBar({
  announcements,
  backgroundMode = "animated",
}: V3AnnouncementBarProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const fillRef = useRef<HTMLDivElement | null>(null);

  const glowRef = useRef<HTMLDivElement | null>(null);

  const currentRef = useRef<HTMLDivElement | null>(null);

  const nextRef = useRef<HTMLDivElement | null>(null);

  const frameRef = useRef<number | null>(null);

  const hasMultiple = announcements.length > 1;

  const safeActiveIndex =
    announcements.length === 0 ? 0 : activeIndex % announcements.length;

  const nextIndex =
    announcements.length <= 1
      ? safeActiveIndex
      : (safeActiveIndex + 1) % announcements.length;

  useEffect(() => {
    if (announcements.length > 0 && activeIndex >= announcements.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, announcements.length]);

  useEffect(() => {
    if (announcements.length === 0) {
      return;
    }

    const fill = fillRef.current;
    const glow = glowRef.current;
    const current = currentRef.current;
    const next = nextRef.current;

    /*
     * One announcement:
     * keep it completely static.
     */
    if (!hasMultiple) {
      if (fill) {
        fill.style.transform = "scaleX(0)";
      }

      if (glow) {
        glow.style.opacity = "0";
      }

      if (current) {
        current.style.opacity = "1";
        current.style.transform = "translate3d(0, 0, 0) scale(1)";
        current.style.filter = "blur(0px)";
      }

      if (next) {
        next.style.opacity = "0";
      }

      return;
    }

    let cancelled = false;
    const startedAt = performance.now();

    /*
     * Set an exact initial frame immediately.
     */
    if (fill) {
      fill.style.transform = "scaleX(0)";
    }

    if (glow) {
      glow.style.opacity = "0";
      glow.style.transform = "translate3d(-120px, 0, 0)";
    }

    if (current) {
      current.style.opacity = "1";
      current.style.transform = "translate3d(0, 0, 0) scale(1)";
      current.style.filter = "blur(0px)";
    }

    if (next) {
      next.style.opacity = "0";
      next.style.transform = "translate3d(0, 15px, 0) scale(0.992)";
      next.style.filter = "blur(3px)";
    }

    function renderFrame(now: number) {
      if (cancelled) {
        return;
      }

      const elapsed = now - startedAt;

      const cycleProgress = clamp(elapsed / CYCLE_TIME);

      /*
       * =====================================================
       * FULL BACKGROUND MUSTARD LOADER
       * =====================================================
       *
       * The entire mustard surface grows physically from
       * 0% width to 100% width behind the announcement.
       */
      if (fill) {
        fill.style.transform = `scaleX(${cycleProgress})`;
      }

      /*
       * Moving highlight at the leading edge of the loading
       * wallpaper.
       */
      if (glow) {
        const glowX = cycleProgress * (window.innerWidth + 240) - 120;

        const glowVisibility =
          cycleProgress < 0.025 || cycleProgress > 0.985 ? 0 : 0.72;

        glow.style.opacity = String(glowVisibility);

        glow.style.transform = `translate3d(${glowX}px, 0, 0)`;
      }

      /*
       * =====================================================
       * ANNOUNCEMENT CROSSFADE / SLIDE
       * =====================================================
       */
      if (cycleProgress < TRANSITION_START) {
        if (current) {
          current.style.opacity = "1";
          current.style.transform = "translate3d(0, 0, 0) scale(1)";
          current.style.filter = "blur(0px)";
        }

        if (next) {
          next.style.opacity = "0";
          next.style.transform = "translate3d(0, 15px, 0) scale(0.992)";
          next.style.filter = "blur(3px)";
        }
      } else {
        const rawTransition =
          (cycleProgress - TRANSITION_START) / (1 - TRANSITION_START);

        const transition = easeInOutCubic(rawTransition);

        if (current) {
          const currentOpacity = 1 - transition;

          const currentY = -12 * transition;

          const currentScale = 1 - 0.008 * transition;

          const currentBlur = 2.4 * transition;

          current.style.opacity = String(currentOpacity);

          current.style.transform = `translate3d(0, ${currentY}px, 0) scale(${currentScale})`;

          current.style.filter = `blur(${currentBlur}px)`;
        }

        if (next) {
          const nextOpacity = transition;

          const nextY = 14 * (1 - transition);

          const nextScale = 0.992 + 0.008 * transition;

          const nextBlur = 2.8 * (1 - transition);

          next.style.opacity = String(nextOpacity);

          next.style.transform = `translate3d(0, ${nextY}px, 0) scale(${nextScale})`;

          next.style.filter = `blur(${nextBlur}px)`;
        }
      }

      if (elapsed >= CYCLE_TIME) {
        /*
         * Commit the next announcement.
         *
         * React then renders the new current/next pair
         * and this effect begins a brand-new 0→100 cycle.
         */
        setActiveIndex((currentIndex) => {
          return (currentIndex + 1) % announcements.length;
        });

        return;
      }

      frameRef.current = window.requestAnimationFrame(renderFrame);
    }

    frameRef.current = window.requestAnimationFrame(renderFrame);

    return () => {
      cancelled = true;

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);

        frameRef.current = null;
      }
    };
  }, [activeIndex, announcements.length, hasMultiple]);

  if (announcements.length === 0) {
    return null;
  }

  const activeAnnouncement = announcements[safeActiveIndex] ?? announcements[0];

  const nextAnnouncement = announcements[nextIndex] ?? activeAnnouncement;

  return (
    <section
      className={[
        styles.bar,
        backgroundMode === "animated"
          ? styles.backgroundAnimated
          : backgroundMode === "still"
            ? styles.backgroundStill
            : styles.backgroundNone,
      ].join(" ")}
      aria-label="Store announcements"
    >
      {hasMultiple && backgroundMode === "animated" ? (
        <>
          <div
            ref={fillRef}
            className={styles.fillSurface}
            aria-hidden="true"
          />

          <div ref={glowRef} className={styles.fillGlow} aria-hidden="true" />
        </>
      ) : null}

      <div className={styles.content}>
        <div className={styles.messageStage}>
          <div ref={currentRef} className={styles.message}>
            <AnnouncementContent announcement={activeAnnouncement} />
          </div>

          {hasMultiple ? (
            <div ref={nextRef} className={styles.message} aria-hidden="true">
              <AnnouncementContent announcement={nextAnnouncement} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
