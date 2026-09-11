"use client";

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

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  useImperativeHandle(
    forwardedRef,
    () => videoRef.current!,
  );

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const context =
      canvas.getContext("2d", {
        alpha: true,
      });

    if (!context) {
      return;
    }

    let animationFrame = 0;
    let disposed = false;

    const resizeCanvas = () => {
      const rect =
        canvas.getBoundingClientRect();

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2,
      );

      const width = Math.max(
        1,
        Math.round(rect.width * dpr),
      );

      const height = Math.max(
        1,
        Math.round(rect.height * dpr),
      );

      if (
        canvas.width !== width ||
        canvas.height !== height
      ) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const drawCoverFrame = () => {
      if (disposed) {
        return;
      }

      resizeCanvas();

      const cw = canvas.width;
      const ch = canvas.height;

        context.clearRect(0, 0, cw, ch);

      if (
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        const videoRatio = vw / vh;
        const canvasRatio = cw / ch;

        let sx = 0;
        let sy = 0;
        let sw = vw;
        let sh = vh;

        if (videoRatio > canvasRatio) {
          sw = vh * canvasRatio;
          sx = (vw - sw) / 2;
        } else {
          sh = vw / canvasRatio;
          sy = (vh - sh) / 2;
        }

        try {
          context.drawImage(
            video,
            sx,
            sy,
            sw,
            sh,
            0,
            0,
            cw,
            ch,
          );
        } catch {
          // Next animation frame will retry.
        }
      }

      animationFrame =
        requestAnimationFrame(
          drawCoverFrame,
        );
    };

    const observer =
      new ResizeObserver(
        resizeCanvas,
      );

    observer.observe(canvas);

    resizeCanvas();

    animationFrame =
      requestAnimationFrame(
        drawCoverFrame,
      );

    return () => {
      disposed = true;

      cancelAnimationFrame(
        animationFrame,
      );

      observer.disconnect();
    };
  }, []);

  /*
   * ST HERO INITIAL AUTOPLAY GUARD
   *
   * The visible hero surface is canvas-based, but Safari can
   * occasionally leave the underlying muted source video in an
   * initial non-playing state after first page navigation/load.
   *
   * Request playback immediately, then retry on the browser
   * lifecycle events that commonly unlock muted inline autoplay.
   *
   * This does NOT add native controls and does NOT change the
   * carousel's custom pause/resume behavior.
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

      const attempt = video.play();

      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(() => {
          // Safari may reject one early attempt before metadata
          // or page visibility is ready. The listeners below retry.
        });
      }
    };

    requestPlayback();

    const handleReady = () => {
      requestPlayback();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestPlayback();
      }
    };

    const handlePageShow = () => {
      requestPlayback();
    };

    video.addEventListener("loadedmetadata", handleReady);
    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);

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

    return () => {
      cancelled = true;

      window.clearTimeout(retryOne);
      window.clearTimeout(retryTwo);

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
    <div
      className={[
        "st3-hero-canvas-video",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <canvas
        ref={canvasRef}
        className="st3-hero-canvas-video__canvas"
        aria-hidden="true"
      />

      <video
        muted
        autoPlay
        {...videoProps}
        ref={videoRef}
        controls={false}
        playsInline
        className="st3-hero-canvas-video__source"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
});

export default HeroCanvasVideo;
