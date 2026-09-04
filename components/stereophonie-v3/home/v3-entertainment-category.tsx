"use client";

import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const [trailerLoadEnabled, setTrailerLoadEnabled] = useState(false);
  const [muted, setMuted] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    "next" | "previous"
  >("next");

  const railRef = useRef<HTMLDivElement>(null);
  const cinemaSectionRef = useRef<HTMLElement>(null);
  const transitionTimer = useRef<number | null>(null);

  const active = items[activeIndex] ?? items[0];

  const trailerVideoRef = useRef<HTMLVideoElement>(null);
  const posterTimerRef = useRef<number | null>(null);
  const volumeFadeFrameRef = useRef<number | null>(null);
  const soundPreferenceRef = useRef(false);
  const titleSwitchTokenRef = useRef(0);

  useEffect(() => {
    const section = cinemaSectionRef.current;

    if (!section) {
      return;
    }

    /*
     * Do not request the large native trailer while Movies & Series
     * is still off-screen. The first active trailer becomes eligible
     * for loading only when this section actually reaches the viewport.
     *
     * Once enabled, keep it enabled for the rest of this component's
     * lifetime so title switching remains immediate and cinematic.
     */
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setTrailerLoadEnabled(true);
        observer.disconnect();
      },
      {
        threshold: 0.01,
      },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    /*
     * A new title gets a fresh native video.
     *
     * Keep the poster visible for the full cinematic minimum.
     * For the initial title, that timer begins only after the section
     * is actually eligible to load its trailer.
     */
    setTrailerReady(false);
    setTrailerLoaded(false);
    setTrailerPlaying(false);
    setPosterMinimumElapsed(false);

    if (posterTimerRef.current !== null) {
      window.clearTimeout(posterTimerRef.current);
      posterTimerRef.current = null;
    }

    if (!trailerLoadEnabled) {
      return;
    }

    posterTimerRef.current = window.setTimeout(() => {
      setPosterMinimumElapsed(true);
    }, 2500);

    return () => {
      if (posterTimerRef.current !== null) {
        window.clearTimeout(posterTimerRef.current);
        posterTimerRef.current = null;
      }
    };
  }, [activeIndex, trailerLoadEnabled]);

  useEffect(() => {
    if (!trailerPlaying || !posterMinimumElapsed) {
      return;
    }

    setTrailerReady(true);
  }, [trailerPlaying, posterMinimumElapsed]);

  useEffect(() => {
    const section = cinemaSectionRef.current;

    if (!section) {
      return;
    }

    /*
     * Sound is always opt-in.
     *
     * If the customer turns the trailer sound on and then scrolls
     * away from the cinematic hero, reset it to muted. Returning
     * to the hero never restores sound automatically; the customer
     * must explicitly turn it on again.
     */
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          return;
        }

        const video = trailerVideoRef.current;

        /*
         * Sound remains opt-in, but leaving the cinema now feels
         * cinematic instead of cutting audio abruptly.
         *
         * Fade the current audible volume smoothly to zero, then
         * finish by muting. Returning to the section never restores
         * sound automatically.
         */
        if (!video || muted || video.muted) {
          soundPreferenceRef.current = false;
          setMuted(true);
          return;
        }

        if (volumeFadeFrameRef.current !== null) {
          window.cancelAnimationFrame(volumeFadeFrameRef.current);
        }

        const startedAt = performance.now();
        const startingVolume = video.volume;
        const fadeDuration = 900;

        const fadeVolume = (now: number) => {
          const progress = Math.min((now - startedAt) / fadeDuration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);

          video.volume = Math.max(0, startingVolume * (1 - eased));

          if (progress < 1) {
            volumeFadeFrameRef.current =
              window.requestAnimationFrame(fadeVolume);
            return;
          }

          video.volume = 1;
          video.muted = true;
          volumeFadeFrameRef.current = null;

          /*
           * Leaving the entire Movies & Series experience resets
           * the customer's sound preference. Coming back therefore
           * never restores audible playback automatically.
           */
          soundPreferenceRef.current = false;
          setMuted(true);
        };

        volumeFadeFrameRef.current = window.requestAnimationFrame(fadeVolume);
      },
      {
        threshold: [0, 0.2],
      },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();

      if (volumeFadeFrameRef.current !== null) {
        window.cancelAnimationFrame(volumeFadeFrameRef.current);
        volumeFadeFrameRef.current = null;
      }
    };
  }, [muted]);

  function toggleTrailerSound() {
    const video = trailerVideoRef.current;
    const nextMuted = !muted;

    if (volumeFadeFrameRef.current !== null) {
      window.cancelAnimationFrame(volumeFadeFrameRef.current);
      volumeFadeFrameRef.current = null;
    }

    soundPreferenceRef.current = !nextMuted;
    setMuted(nextMuted);

    if (!video) {
      return;
    }

    video.volume = 1;
    video.muted = nextMuted;

    if (!nextMuted) {
      void video.play().catch(() => {
        /*
         * If a browser refuses audible playback, immediately
         * return to the safe muted state.
         */
        video.muted = true;
        setMuted(true);
      });
    }
  }

  function select(index: number) {
    if (!items.length) {
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

    /*
     * Every selector press owns a token.
     *
     * If the customer moves quickly through several titles, an older
     * delayed switch is not allowed to finish after a newer selection.
     * This keeps the carousel responsive instead of locking input.
     */
    titleSwitchTokenRef.current += 1;
    const switchToken = titleSwitchTokenRef.current;

    setTransitionDirection(direction);
    setTransitioning(true);

    if (transitionTimer.current !== null) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }

    if (volumeFadeFrameRef.current !== null) {
      window.cancelAnimationFrame(volumeFadeFrameRef.current);
      volumeFadeFrameRef.current = null;
    }

    /*
     * The current trailer must disappear behind its poster before the
     * title changes. This preserves the approved zero-video-flash rule.
     */
    setTrailerReady(false);
    setTrailerLoaded(false);
    setTrailerPlaying(false);
    setPosterMinimumElapsed(false);

    const currentVideo = trailerVideoRef.current;
    const preserveSound = soundPreferenceRef.current && !muted;

    /*
     * TITLE AUDIO HANDOFF
     *
     * If the customer explicitly enabled sound, fade the outgoing
     * trailer down during the visual exit. Do NOT reset their sound
     * preference merely because they selected another title.
     */
    if (preserveSound && currentVideo && !currentVideo.muted) {
      const startedAt = performance.now();
      const startingVolume = currentVideo.volume;
      const fadeDuration = 360;

      const fadeOutgoingTitle = (now: number) => {
        if (switchToken !== titleSwitchTokenRef.current) {
          return;
        }

        const progress = Math.min((now - startedAt) / fadeDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        currentVideo.volume = Math.max(0, startingVolume * (1 - eased));

        if (progress < 1) {
          volumeFadeFrameRef.current =
            window.requestAnimationFrame(fadeOutgoingTitle);
          return;
        }

        currentVideo.volume = 0;
        volumeFadeFrameRef.current = null;
      };

      volumeFadeFrameRef.current =
        window.requestAnimationFrame(fadeOutgoingTitle);
    }

    /*
     * Give the outgoing title enough time to perform a visible,
     * deliberate exit. The title itself changes only after that exit,
     * which creates a real A -> B cinematic handoff.
     */
    transitionTimer.current = window.setTimeout(() => {
      if (switchToken !== titleSwitchTokenRef.current) {
        return;
      }

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

      /*
       * Keep the incoming title in its entrance state for two complete
       * browser frames. Then release it. This makes the new poster and
       * copy animate in instead of appearing on the same paint.
       */
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (switchToken === titleSwitchTokenRef.current) {
            setTransitioning(false);
          }
        });
      });
    }, 360);
  }

  if (!active || !items.length) {
    return null;
  }

  return (
    <section
      ref={cinemaSectionRef}
      className="st-entertainment-home st-entertainment-home--cinema"
    >
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

          <video
            key={`cinema-trailer-${active.id}`}
            ref={trailerVideoRef}
            className={`st-entertainment-cinema__trailer ${
              trailerReady ? "is-visible" : "is-shielded"
            }`}
            src={trailerLoadEnabled ? active.trailerPath : undefined}
            autoPlay={trailerLoadEnabled}
            muted={muted}
            loop
            playsInline
            preload={trailerLoadEnabled ? "auto" : "none"}
            disablePictureInPicture
            tabIndex={-1}
            aria-hidden="true"
            onLoadedData={() => {
              setTrailerLoaded(true);
            }}
            onCanPlay={(event) => {
              setTrailerLoaded(true);

              void event.currentTarget.play().catch(() => {
                /*
                 * Autoplay remains muted by default, so normal
                 * modern browsers should allow this. If a browser
                 * temporarily blocks playback, the poster simply
                 * stays visible instead of exposing a player UI.
                 */
              });
            }}
            onPlaying={(event) => {
              const video = event.currentTarget;

              setTrailerLoaded(true);
              setTrailerPlaying(true);

              /*
               * If sound was already enabled before this title change,
               * continue that preference with a smooth incoming fade.
               *
               * The new trailer begins at volume zero behind its poster,
               * then rises naturally instead of cutting in at full volume.
               */
              if (soundPreferenceRef.current && !muted) {
                if (volumeFadeFrameRef.current !== null) {
                  window.cancelAnimationFrame(volumeFadeFrameRef.current);
                  volumeFadeFrameRef.current = null;
                }

                video.volume = 0;
                video.muted = false;

                const startedAt = performance.now();
                const fadeDuration = 700;

                const fadeIncomingTitle = (now: number) => {
                  const progress = Math.min(
                    (now - startedAt) / fadeDuration,
                    1,
                  );
                  const eased = 1 - Math.pow(1 - progress, 3);

                  video.volume = Math.min(1, eased);

                  if (progress < 1) {
                    volumeFadeFrameRef.current =
                      window.requestAnimationFrame(fadeIncomingTitle);
                    return;
                  }

                  video.volume = 1;
                  volumeFadeFrameRef.current = null;
                };

                volumeFadeFrameRef.current =
                  window.requestAnimationFrame(fadeIncomingTitle);
              }
            }}
            onWaiting={() => {
              setTrailerPlaying(false);
            }}
            onStalled={() => {
              setTrailerPlaying(false);
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
                  onClick={toggleTrailerSound}
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
