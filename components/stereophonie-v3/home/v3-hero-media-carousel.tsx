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

  /*
   * HERO_PERSISTENT_TWO_SLOT_V11
   *
   * Slot A and Slot B keep fixed JSX/DOM positions.
   * The incoming media is never replaced after its crossfade.
   */
  const [activeSlot, setActiveSlot] =
    useState<0 | 1>(0);

  const [slotAIndex, setSlotAIndex] =
    useState<number | null>(0);

  const [slotBIndex, setSlotBIndex] =
    useState<number | null>(null);

  const [isFading, setIsFading] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  /*
   * HERO_PLAYBACK_CONTROL_REMOVED_V3
   * Public play/pause control removed.
   */
  const isPaused = false;
  const activeIndexRef = useRef(0);
  const pendingIndexRef = useRef<number | null>(null);
  const activeSlotRef = useRef<0 | 1>(0);
  const fadeStartedRef = useRef(false);


  /*
   * HERO_MANUAL_SELECTION_QUEUE_V3
   *
   * Never lose a visitor's selector click merely because
   * the previous dissolve is still visually completing.
   */
  const queuedIndexRef = useRef<number | null>(null);
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

  /*
   * HERO_PERSISTENT_TWO_SLOT_V11
   *
   * The incoming slot that already loaded and played becomes
   * the active slot itself. No second B is mounted.
   */
  const finishFade = useCallback(() => {
    const next = pendingIndexRef.current;

    if (next === null) return;

    const outgoingSlot =
      activeSlotRef.current;

    const incomingSlot: 0 | 1 =
      outgoingSlot === 0 ? 1 : 0;

    activeIndexRef.current = next;
    pendingIndexRef.current = null;
    activeSlotRef.current = incomingSlot;
    fadeStartedRef.current = false;
    fadeTimerRef.current = null;

    setActiveIndex(next);
    setPendingIndex(null);
    setActiveSlot(incomingSlot);
    setIsFading(false);

    /*
     * Discard only the outgoing slot.
     * The new active slot keeps the same media DOM node.
     */
    if (outgoingSlot === 0) {
      setSlotAIndex(null);
    } else {
      setSlotBIndex(null);
    }
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

  /*
   * HERO_PERSISTENT_TWO_SLOT_V11
   *
   * V9's replacement-decoder handoff is intentionally removed.
   */

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
      if (isFading) {
        queuedIndexRef.current = next;
        return;
      }

      queuedIndexRef.current = null;
      clearFadeTimer();
      clearFrames();

      fadeStartedRef.current = false;

      pendingIndexRef.current = next;
      setPendingIndex(next);

      /*
       * Load the requested media into the currently inactive
       * permanent slot.
       */
      if (activeSlotRef.current === 0) {
        setSlotBIndex(next);
      } else {
        setSlotAIndex(next);
      }
    },
    [
      clearFadeTimer,
      clearFrames,
      clearImageTimer,
      count,
      isFading,
    ],
  );

  /*
   * HERO_MANUAL_SELECTION_QUEUE_DRAIN_V3
   *
   * Wait until the existing current/pending handoff is fully
   * settled, then perform the visitor's latest queued request.
   */
  useEffect(() => {
    if (
      isFading ||
      pendingIndex !== null
    ) {
      return;
    }

    const queuedIndex =
      queuedIndexRef.current;

    if (queuedIndex === null) {
      return;
    }

    queuedIndexRef.current = null;

    const normalizedIndex =
      wrapIndex(queuedIndex, count);

    if (
      normalizedIndex ===
      activeIndexRef.current
    ) {
      return;
    }

    prepare(normalizedIndex);
  }, [
    count,
    isFading,
    pendingIndex,
    prepare,
  ]);

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
      activeSlotRef.current = 0;
      fadeStartedRef.current = false;

      setActiveIndex(0);
      setPendingIndex(null);
      setActiveSlot(0);
      setSlotAIndex(0);
      setSlotBIndex(null);
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

  const slotAItem =
    slotAIndex !== null
      ? items[slotAIndex] ?? null
      : null;

  const slotBItem =
    slotBIndex !== null
      ? items[slotBIndex] ?? null
      : null;

  const selectedIndex =
    pendingIndex ?? activeIndex;

  /*
   * HERO_PERSISTENT_TWO_SLOT_V11
   *
   * Each slot owns the exact media node it mounted.
   */
  const renderSlotMedia = (
    item: V3HeroMediaItem,
    itemIndex: number,
    slot: 0 | 1,
  ) => {
    const slotIsActive =
      activeSlot === slot;

    if (item.media_type === "video") {
      return (
        <HeroCanvasVideo
          key={`hero-slot-${slot}-video-${item.id}-${cycleKey}`}
          ref={
            slotIsActive
              ? activeVideoRef
              : incomingVideoRef
          }
          src={item.media_url}
          muted
          playsInline
          autoPlay
          loop={false}
          preload="auto"
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
          onPlaying={() => {
            if (
              !slotIsActive &&
              pendingIndexRef.current === itemIndex
            ) {
              beginFade();
            }
          }}
          onPause={(event) => {
            const video = event.currentTarget;

            const shouldPlay =
              slotIsActive ||
              pendingIndexRef.current === itemIndex;

            if (shouldPlay && !isPaused) {
              video.muted = true;
              video.defaultMuted = true;
              video.playbackRate = 1;

              requestAnimationFrame(() => {
                video.play().catch(() => {});
              });
            }
          }}
          onTimeUpdate={(event) => {
            if (!slotIsActive) {
              return;
            }

            const video = event.currentTarget;

            if (
              !Number.isFinite(video.duration) ||
              video.duration <= 0
            ) {
              return;
            }

            const remaining =
              video.duration - video.currentTime;

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
              slotIsActive &&
              !isPaused &&
              pendingIndexRef.current === null &&
              !fadeStartedRef.current
            ) {
              goNext();
            }
          }}
          className="st3-hero-carousel__media"
        />
      );
    }

    return (
      <Image
        key={`hero-slot-${slot}-image-${item.id}-${cycleKey}`}
        src={item.media_url}
        alt={
          slotIsActive
            ? "Stereophonie homepage hero"
            : ""
        }
        fill
        priority={
          slotIsActive &&
          itemIndex === 0
        }
        fetchPriority={
          slotIsActive &&
          itemIndex === 0
            ? "high"
            : "auto"
        }
        sizes="(max-width: 900px) 100vw, 50vw"
        quality={90}
        onLoad={
          !slotIsActive &&
          pendingIndexRef.current === itemIndex
            ? beginFade
            : undefined
        }
        className="st3-hero-carousel__media"
      />
    );
  };

  return (
    <div
      className="st3-hero-carousel"
      aria-roledescription="carousel"
      aria-label="Homepage featured media"
    >
      <div className="st3-hero-carousel__frame">
        <div className="st3-hero-carousel__stage">

          {/* ==================================================
              HERO_PERSISTENT_TWO_SLOT_V11
              Permanent Slot A + Permanent Slot B
              ================================================== */}

          <div
            className={[
              "st3-hero-carousel__layer",
              activeSlot === 0
                ? "st3-hero-carousel__layer--current"
                : "st3-hero-carousel__layer--pending",
              isFading && activeSlot === 0
                ? "is-fading-out"
                : "",
              isFading && activeSlot !== 0
                ? "is-fading-in"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden={
              activeSlot !== 0 &&
              !isFading
            }
          >
            {slotAItem &&
            slotAIndex !== null
              ? renderSlotMedia(
                  slotAItem,
                  slotAIndex,
                  0,
                )
              : null}
          </div>

          <div
            className={[
              "st3-hero-carousel__layer",
              activeSlot === 1
                ? "st3-hero-carousel__layer--current"
                : "st3-hero-carousel__layer--pending",
              isFading && activeSlot === 1
                ? "is-fading-out"
                : "",
              isFading && activeSlot !== 1
                ? "is-fading-in"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden={
              activeSlot !== 1 &&
              !isFading
            }
          >
            {slotBItem &&
            slotBIndex !== null
              ? renderSlotMedia(
                  slotBItem,
                  slotBIndex,
                  1,
                )
              : null}
          </div>
        </div>
      </div>

      {count > 1 ? (
        <div className="st3-hero-carousel__controls">
          <button
            type="button"
            className="st-carousel-nav-arrow st-carousel-nav-arrow--previous"
            onClick={() => prepare(selectedIndex - 1)}
            aria-label="Previous hero media"
            title="Previous"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M15 18 9 12l6-6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

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
            className="st-carousel-nav-arrow st-carousel-nav-arrow--next"
            onClick={() => prepare(selectedIndex + 1)}
            aria-label="Next hero media"
            title="Next"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="m9 18 6-6-6-6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

        </div>
      ) : null}
    </div>
  );
}
