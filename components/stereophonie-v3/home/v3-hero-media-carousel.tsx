"use client";

/* === ST HERO MIXED MEDIA CAROUSEL === */

import Image from "next/image";

import HeroCanvasVideo from "./v3-hero-canvas-video";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type V3HeroMediaItem = {
  id: string;
  media_type: "image" | "video";
  media_url: string;
};

type Props = {
  items: V3HeroMediaItem[];
};

const HERO_IMAGE_DURATION_MS = 4000;
const HERO_CROSSFADE_DURATION_MS = 1000;

function wrapIndex(index: number, length: number) {
  if (!length) return 0;

  return ((index % length) + length) % length;
}

export default function V3HeroMediaCarousel({
  items,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingIndex, setPendingIndex] =
    useState<number | null>(null);

  const [isFading, setIsFading] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const activeIndexRef = useRef(0);
  const pendingIndexRef = useRef<number | null>(null);
  const fadeStartedRef = useRef(false);

  const activeVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const incomingVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const imageTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const fadeTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const frameOneRef = useRef<number | null>(null);
  const frameTwoRef = useRef<number | null>(null);

  const count = items.length;

  const clearImageTimer = useCallback(() => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  }, []);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const clearFrames = useCallback(() => {
    if (frameOneRef.current !== null) {
      cancelAnimationFrame(frameOneRef.current);
      frameOneRef.current = null;
    }

    if (frameTwoRef.current !== null) {
      cancelAnimationFrame(frameTwoRef.current);
      frameTwoRef.current = null;
    }
  }, []);

  const finishFade = useCallback(() => {
    const next = pendingIndexRef.current;

    if (next === null) return;

    /*
     * Old video is stopped only after the visual dissolve
     * has completely finished.
     */
    /*
     * Do not explicitly pause the outgoing video here.
     * React unmounts it immediately after the handoff.
     * Explicit pause() can trigger Safari's native pause HUD.
     */

    /*
     * Promote B logically, but keep the already-playing
     * pending B visible while permanent B initializes below it.
     */
    activeIndexRef.current = next;
    fadeStartedRef.current = false;

    setActiveIndex(next);
    setCycleKey((value) => value + 1);
  }, []);

  /*
   * Called ONLY when the incoming media is actually ready.
   *
   * Two animation frames force the browser to first paint the
   * incoming layer at opacity: 0, then animate it to opacity: 1.
   */
  const beginFade = useCallback(() => {
    if (
      pendingIndexRef.current === null ||
      fadeStartedRef.current
    ) {
      return;
    }

    fadeStartedRef.current = true;

    clearFrames();
    clearFadeTimer();

    frameOneRef.current = requestAnimationFrame(() => {
      frameTwoRef.current = requestAnimationFrame(() => {
        setIsFading(true);

        /*
         * Video B is already playing before the dissolve.
         *
         * Keep Video A moving.
         * Never rewind Video B here.
         */
        const incomingVideo = incomingVideoRef.current;

        if (incomingVideo && incomingVideo.paused) {
          incomingVideo.muted = true;
          incomingVideo.defaultMuted = true;
          incomingVideo.playbackRate = 1;

          incomingVideo.play().catch(() => {});
        }

        fadeTimerRef.current = setTimeout(
          finishFade,
          HERO_CROSSFADE_DURATION_MS,
        );
      });
    });
  }, [
    clearFadeTimer,
    clearFrames,
    finishFade,
  ]);

  const prepare = useCallback(
    (requestedIndex: number) => {
      if (count <= 1) return;

      const next =
        wrapIndex(requestedIndex, count);

      const current =
        activeIndexRef.current;

      clearImageTimer();

      /*
       * Selecting the active item simply restarts its lifecycle.
       */
      if (
        next === current &&
        pendingIndexRef.current === null
      ) {
        setCycleKey((value) => value + 1);

        if (activeVideoRef.current) {
          activeVideoRef.current.currentTime = 0;

          activeVideoRef.current
            .play()
            .catch(() => {});
        }

        return;
      }

      /*
       * Do not replace a fade that is already visibly running.
       * This keeps the transition visually stable.
       */
      if (isFading) return;

      clearFadeTimer();
      clearFrames();

      fadeStartedRef.current = false;

      pendingIndexRef.current = next;
      setPendingIndex(next);
    },
    [
      clearFadeTimer,
      clearFrames,
      clearImageTimer,
      count,
      isFading,
    ],
  );

  const goNext = useCallback(() => {
    prepare(activeIndexRef.current + 1);
  }, [prepare]);

  /*
   * IMAGE:
   * exactly four seconds before preparing the next media.
   *
   * VIDEO:
   * no artificial timer — onEnded prepares the next media.
   */
  useEffect(() => {
    clearImageTimer();

    if (
      pendingIndex !== null ||
      isFading ||
      isPaused
    ) {
      return clearImageTimer;
    }

    const item = items[activeIndex];

    if (!item || count <= 1) {
      return clearImageTimer;
    }

    if (item.media_type === "image") {
      imageTimerRef.current = setTimeout(
        goNext,
        HERO_IMAGE_DURATION_MS,
      );
    }

    return clearImageTimer;
  }, [
    activeIndex,
    count,
    cycleKey,
    goNext,
    isFading,
    isPaused,
    items,
    pendingIndex,
    clearImageTimer,
  ]);

  /*
   * Keep indexes safe after homepage revalidation.
   */
  useEffect(() => {
    if (!count) return;

    if (activeIndexRef.current >= count) {
      activeIndexRef.current = 0;
      pendingIndexRef.current = null;
      fadeStartedRef.current = false;

      setActiveIndex(0);
      setPendingIndex(null);
      setIsFading(false);
      setCycleKey((value) => value + 1);
    }
  }, [count]);

  useEffect(() => {
    return () => {
      clearImageTimer();
      clearFadeTimer();
      clearFrames();

      /* Safari: never visibly pause active hero video */
    };
  }, [
    clearFadeTimer,
    clearFrames,
    clearImageTimer,
  ]);

  if (!count) return null;

  const activeItem =
    items[activeIndex];

  const pendingItem =
    pendingIndex !== null
      ? items[pendingIndex] ?? null
      : null;

  const selectedIndex =
    pendingIndex ?? activeIndex;

  return (
    <div
      className="st3-hero-carousel"
      aria-roledescription="carousel"
      aria-label="Homepage featured media"
    >
      <div className="st3-hero-carousel__frame">
        <div className="st3-hero-carousel__stage">

          {/* CURRENT MEDIA */}

          <div
            className={[
              "st3-hero-carousel__layer",
              "st3-hero-carousel__layer--current",
              isFading ? "is-fading-out" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {activeItem.media_type === "video" ? (
              <HeroCanvasVideo
                key={`${activeItem.id}-${cycleKey}`}
                ref={activeVideoRef}
                src={activeItem.media_url}
                muted
                playsInline
                autoPlay
                loop={false}
                preload="metadata"
                disablePictureInPicture
                disableRemotePlayback
                controlsList="nodownload noplaybackrate nofullscreen"
                onLoadedData={(event) => {
                  const video = event.currentTarget;

                  video.muted = true;
                  video.defaultMuted = true;
                  video.playbackRate = 1;

                  if (
                    pendingIndexRef.current ===
                    activeIndexRef.current
                  ) {
                    const pendingVideo =
                      incomingVideoRef.current;

                    if (
                      pendingVideo &&
                      Number.isFinite(
                        pendingVideo.currentTime
                      )
                    ) {
                      try {
                        video.currentTime =
                          pendingVideo.currentTime;
                      } catch {}
                    }
                  }

                  if (!isPaused) {
                    video.play().catch(() => {});
                  }
                }}
                onCanPlay={(event) => {
                  const video = event.currentTarget;

                  video.muted = true;
                  video.defaultMuted = true;
                  video.playbackRate = 1;

                  if (
                    pendingIndexRef.current ===
                    activeIndexRef.current
                  ) {
                    const pendingVideo =
                      incomingVideoRef.current;

                    if (
                      pendingVideo &&
                      Math.abs(
                        video.currentTime -
                        pendingVideo.currentTime
                      ) > 0.15
                    ) {
                      try {
                        video.currentTime =
                          pendingVideo.currentTime;
                      } catch {}
                    }
                  }

                  if (!isPaused && video.paused) {
                    video.play().catch(() => {});
                  }
                }}
                onPlaying={() => {
                  if (
                    pendingIndexRef.current ===
                    activeIndexRef.current
                  ) {
                    /*
                     * Permanent B is now moving underneath
                     * temporary B at effectively the same time.
                     */
                    requestAnimationFrame(() => {
                      pendingIndexRef.current = null;

                      setPendingIndex(null);
                      setIsFading(false);
                    });
                  }
                }}
                onPause={(event) => {
                  const video = event.currentTarget;

                  /*
                   * If WE did not request a pause, immediately
                   * recover playback. This prevents Safari from
                   * leaving a visible paused video with its own HUD.
                   */
                  if (!isPaused) {
                    video.muted = true;
                    video.defaultMuted = true;
                    video.playbackRate = 1;

                    requestAnimationFrame(() => {
                      video.play().catch(() => {});
                    });
                  }
                }}
                onTimeUpdate={(event) => {
                  const video = event.currentTarget;

                  if (
                    !Number.isFinite(video.duration) ||
                    video.duration <= 0
                  ) {
                    return;
                  }

                  const remaining =
                    video.duration - video.currentTime;

                  /*
                   * Begin preparing the next media BEFORE Safari
                   * reaches the actual ended state.
                   */
                  if (
                    remaining <= 1.8 &&
                    !isPaused &&
                    pendingIndexRef.current === null &&
                    !fadeStartedRef.current
                  ) {
                    goNext();
                  }

                }}
                onEnded={() => {
                  if (
                    !isPaused &&
                    pendingIndexRef.current === null &&
                    !fadeStartedRef.current
                  ) {
                    goNext();
                  }
                }}
                className="st3-hero-carousel__media"
              />
            ) : (
              <Image
                key={activeItem.id}
                src={activeItem.media_url}
                alt="Stereophonie homepage hero"
                fill
                priority={activeIndex === 0}
                fetchPriority={
                  activeIndex === 0
                    ? "high"
                    : "auto"
                }
                sizes="(max-width: 900px) 100vw, 50vw"
                quality={90}
                className="st3-hero-carousel__media"
              />
            )}
          </div>

          {/* PREPARED NEXT MEDIA */}

          {pendingItem ? (
            <div
              className={[
                "st3-hero-carousel__layer",
                "st3-hero-carousel__layer--pending",
                isFading ? "is-fading-in" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden={!isFading}
            >
              {pendingItem.media_type === "video" ? (
                <HeroCanvasVideo
                  key={`pending-${pendingItem.id}`}
                  ref={incomingVideoRef}
                  src={pendingItem.media_url}
                  muted
                  playsInline
                  preload="auto"
                  loop={false}
                  disablePictureInPicture
                  disableRemotePlayback
                  controlsList="nodownload noplaybackrate nofullscreen"
                  onLoadedData={(event) => {
                    const video = event.currentTarget;

                    video.muted = true;
                    video.defaultMuted = true;
                    video.playbackRate = 1;

                    video.play().catch(() => {});
                  }}
                  onCanPlay={(event) => {
                    const video = event.currentTarget;

                    video.muted = true;
                    video.defaultMuted = true;
                    video.playbackRate = 1;

                    if (video.paused) {
                      video.play().catch(() => {});
                    }
                  }}
                  onPlaying={beginFade}
                  className="st3-hero-carousel__media"
                />
              ) : (
                <Image
                  key={`pending-${pendingItem.id}`}
                  src={pendingItem.media_url}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 50vw"
                  quality={90}
                  onLoad={beginFade}
                  className="st3-hero-carousel__media"
                />
              )}
            </div>
          ) : null}
        </div>
      </div>

      {count > 1 ? (
        <div className="st3-hero-carousel__controls">
          <div
            className="st3-hero-carousel__dots"
            aria-label="Choose hero media"
          >
            {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={[
                "st3-hero-carousel__dot",
                selectedIndex === index
                  ? "st3-hero-carousel__dot--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => prepare(index)}
              aria-label={`Show hero media ${index + 1}`}
              aria-current={
                selectedIndex === index
                  ? "true"
                  : undefined
              }
            />
            ))}
          </div>

          <button
            type="button"
            className="st3-hero-carousel__playback"
            aria-label={
              isPaused
                ? "Resume hero carousel"
                : "Pause hero carousel"
            }
            title={
              isPaused
                ? "Resume"
                : "Pause"
            }
            onClick={() => {
              const nextPaused = !isPaused;

              setIsPaused(nextPaused);

              const video = activeVideoRef.current;

              if (nextPaused) {
                clearImageTimer();

                if (video) {
                  /*
                   * Do not call pause().
                   * Safari can expose its native center Play HUD
                   * whenever a visible video enters paused state.
                   */
                  video.playbackRate = 0.0001;
                }
              } else {
                /*
                 * Resume from the exact point where the visitor
                 * paused the current hero media.
                 *
                 * For videos, DO NOT change cycleKey because it
                 * is part of the video key and would remount the
                 * element, restarting playback from 0:00.
                 *
                 * Images may still restart their display cycle.
                 */
                if (activeItem.media_type === "image") {
                  setCycleKey((value) => value + 1);
                }

                if (video) {
                  video.muted = true;
                  video.defaultMuted = true;
                  video.playbackRate = 1;

                  video.play().catch(() => {});
                }
              }
            }}
          >
            {isPaused ? (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 5.4v13.2L18.5 12 8 5.4Z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <rect x="6.5" y="5" width="4" height="14" rx="1.4" />
                <rect x="13.5" y="5" width="4" height="14" rx="1.4" />
              </svg>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
