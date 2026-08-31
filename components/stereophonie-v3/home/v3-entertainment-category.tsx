"use client";

import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { StereophonieEntertainmentItem } from "@/lib/stereophonie-entertainment";

type Props = {
  title: string;
  description: string;
  items: StereophonieEntertainmentItem[];
};

export default function V3EntertainmentCategory({
  title,
  description,
  items,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [trailerReady, setTrailerReady] = useState(false);
  const [trailerLoaded, setTrailerLoaded] = useState(false);
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const [posterMinimumElapsed, setPosterMinimumElapsed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    "next" | "previous"
  >("next");

  const railRef = useRef<HTMLDivElement>(null);
  const trailerTimer = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);

  const active = items[activeIndex] ?? items[0];

  const trailerSrc = useMemo(() => {
    if (!active) {
      return "";
    }

    const params = new URLSearchParams({
      autoplay: "1",
      mute: muted ? "1" : "0",

      /*
       * Background-video mode:
       * no normal player controls / keyboard UI / fullscreen.
       */
      controls: "0",
      disablekb: "1",
      fs: "0",

      /*
       * Hide annotations and keep captions OFF by default.
       */
      iv_load_policy: "3",
      cc_load_policy: "0",

      /*
       * Reduce YouTube chrome as much as the embed API allows.
       */
      modestbranding: "1",
      rel: "0",

      playsinline: "1",

      /*
       * Keep the cinematic background moving.
       */
      loop: "1",
      playlist: active.trailerYoutubeId,
      start: "0",
    });

    return `https://www.youtube.com/embed/${active.trailerYoutubeId}?${params.toString()}`;
  }, [active, muted]);

  useEffect(() => {
    /*
     * Reliable cinematic preload:
     *
     * YouTube begins immediately behind the poster.
     * The poster remains completely visible while the
     * background trailer boots and its startup UI disappears.
     */
    setTrailerReady(false);
    setTrailerLoaded(false);
    setPosterMinimumElapsed(false);

    if (trailerTimer.current !== null) {
      window.clearTimeout(trailerTimer.current);
    }

    trailerTimer.current = window.setTimeout(() => {
      setPosterMinimumElapsed(true);
    }, 4300);

    return () => {
      if (trailerTimer.current !== null) {
        window.clearTimeout(trailerTimer.current);
      }
    };
  }, [activeIndex]);

  useEffect(() => {
    /*
     * Reveal only after:
     *
     * 1. iframe finished loading
     * 2. poster has covered it for at least 4.3s
     * 3. another 700ms startup-shield buffer
     *
     * Normal reveal: approximately five seconds.
     */
    if (!trailerLoaded || !posterMinimumElapsed) {
      return;
    }

    const revealTimer = window.setTimeout(() => {
      setTrailerReady(true);
    }, 700);

    return () => {
      window.clearTimeout(revealTimer);
    };
  }, [trailerLoaded, posterMinimumElapsed]);

  function select(index: number) {
    if (!items.length || transitioning) {
      return;
    }

    const safe = (index + items.length) % items.length;

    if (safe === activeIndex) {
      return;
    }

    const direction =
      safe > activeIndex || (activeIndex === items.length - 1 && safe === 0)
        ? "next"
        : "previous";

    setTransitionDirection(direction);
    setTransitioning(true);

    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
    }

    transitionTimer.current = window.setTimeout(() => {
      setActiveIndex(safe);

      const rail = railRef.current;

      if (rail) {
        const target = rail.querySelector<HTMLElement>(
          `[data-entertainment-index="${safe}"]`,
        );

        target?.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }

      window.setTimeout(() => {
        setTransitioning(false);
      }, 40);
    }, 240);
  }

  if (!active || !items.length) {
    return null;
  }

  return (
    <section className="st-entertainment-home st-entertainment-home--cinema">
      <div
        className={`st-entertainment-cinema ${
          transitioning
            ? `is-switching is-switching-${transitionDirection}`
            : "is-settled"
        }`}
      >
        {/* ==================================================
            CINEMATIC BACKGROUND / TRAILER
            ================================================== */}

        <div className="st-entertainment-cinema__media" aria-hidden="true">
          <img
            key={`cinema-poster-${active.id}`}
            src={active.backdropUrl}
            alt=""
            className={`st-entertainment-cinema__poster ${
              trailerReady ? "is-hidden" : ""
            }`}
          />

          <iframe
            key={`cinema-trailer-${active.id}-${muted ? "muted" : "sound"}`}
            className="st-entertainment-cinema__trailer"
            src={trailerSrc}
            title=""
            tabIndex={-1}
            aria-hidden="true"
            allow="autoplay; encrypted-media"
            onLoad={() => {
              setTrailerLoaded(true);
            }}
          />

          <div className="st-entertainment-cinema__media-shade" />
        </div>

        {/* ==================================================
            LEFT CONTENT
            ================================================== */}

        <div className="st-entertainment-cinema__content">
          <div className="st-entertainment-cinema__copy">
            <p className="st-entertainment-cinema__eyebrow">
              Movies &amp; Series
            </p>

            <div className="st-entertainment-cinema__active-kicker">
              {active.kind} · {active.year}
            </div>

            <div
              key={`trailer-status-${active.id}`}
              className={`st-entertainment-cinema__trailer-status ${
                trailerReady ? "is-finished" : ""
              }`}
              aria-live="polite"
            >
              <div className="st-entertainment-cinema__trailer-status-copy">
                <span>
                  {trailerPlaying
                    ? "Trailer ready"
                    : trailerLoaded
                      ? "Preparing trailer"
                      : "Preparing trailer"}
                </span>
              </div>

              <div className="st-entertainment-cinema__trailer-progress">
                <span />
              </div>
            </div>

            <h2 key={`cinema-title-${active.id}`}>{active.title}</h2>

            <p
              key={`cinema-tagline-${active.id}`}
              className="st-entertainment-cinema__tagline"
            >
              {active.tagline}
            </p>

            <div className="st-entertainment-cinema__actions">
              <Link
                href="/movies-series"
                className="st-entertainment-cinema__explore"
              >
                Explore
                <span aria-hidden="true">›</span>
              </Link>

              {trailerReady ? (
                <button
                  type="button"
                  className="st-entertainment-cinema__sound"
                  onClick={() => setMuted((value) => !value)}
                  aria-label={muted ? "Turn trailer sound on" : "Mute trailer"}
                >
                  {muted ? <VolumeX /> : <Volume2 />}
                </button>
              ) : null}
            </div>

            {/* ==============================================
                PRODUCT-GALLERY STYLE SELECTOR
                ============================================== */}

            <div className="st-entertainment-cinema__selector-wrap">
              <div
                className="st-entertainment-cinema__selector"
                role="tablist"
                aria-label="Choose movie or series"
              >
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-label={`Show ${item.title}`}
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? "is-active" : ""}
                    onClick={() => select(index)}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            SMALL ACTIVE-TITLE LABEL
            ================================================== */}

        <Link
          href={`/movies-series?title=${encodeURIComponent(active.title)}`}
          className="st-entertainment-cinema__request"
        >
          Ask about this title
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </section>
  );
}
