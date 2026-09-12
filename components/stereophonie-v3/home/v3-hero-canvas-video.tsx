"use client";

/*
 * HERO_NATIVE_VIDEO_V10E
 *
 * The Hero now renders the browser's native video surface directly.
 *
 * Previously:
 * video decode -> hidden source video -> canvas draw on every frame.
 *
 * Now:
 * video decode -> native browser video surface.
 *
 * The carousel's refs, callbacks, crossfade logic and V9 handoff
 * continue to operate on a normal HTMLVideoElement.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import type {
  VideoHTMLAttributes,
} from "react";

type HeroCanvasVideoProps =
  VideoHTMLAttributes<HTMLVideoElement>;

const HeroCanvasVideo = forwardRef<
  HTMLVideoElement,
  HeroCanvasVideoProps
>(function HeroCanvasVideo(
  {
    className = "",
    ...videoProps
  },
  forwardedRef,
) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => videoRef.current!,
  );

  /*
   * HERO_NATIVE_AUTOPLAY_RECOVERY_V10E
   *
   * Muted inline autoplay is normally permitted, but Safari/mobile
   * can reject an extremely early play attempt while the document
   * is becoming active.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    let cancelled = false;

    const requestPlayback = () => {
      if (cancelled) {
        return;
      }

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.playbackRate = 1;

      const attempt = video.play();

      if (
        attempt &&
        typeof attempt.catch === "function"
      ) {
        attempt.catch(() => {});
      }
    };

    requestPlayback();

    const handleReady = () => {
      requestPlayback();
    };

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible"
      ) {
        requestPlayback();
      }
    };

    const handlePageShow = () => {
      requestPlayback();
    };

    video.addEventListener(
      "loadedmetadata",
      handleReady,
    );

    video.addEventListener(
      "loadeddata",
      handleReady,
    );

    video.addEventListener(
      "canplay",
      handleReady,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    const retryOne = window.setTimeout(
      requestPlayback,
      80,
    );

    const retryTwo = window.setTimeout(
      requestPlayback,
      300,
    );

    const retryThree = window.setTimeout(
      requestPlayback,
      900,
    );

    return () => {
      cancelled = true;

      window.clearTimeout(retryOne);
      window.clearTimeout(retryTwo);
      window.clearTimeout(retryThree);

      video.removeEventListener(
        "loadedmetadata",
        handleReady,
      );

      video.removeEventListener(
        "loadeddata",
        handleReady,
      );

      video.removeEventListener(
        "canplay",
        handleReady,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );
    };
  }, []);

  return (
    <video
      {...videoProps}
      ref={videoRef}
      muted
      autoPlay
      playsInline
      controls={false}
      preload={videoProps.preload ?? "auto"}
      className={className}
    />
  );
});

export default HeroCanvasVideo;
