"use client";

import { useEffect } from "react";

type ProductSaveResultScrollProps = {
  active: boolean;
};

const MIN_DURATION_MS = 420;
const MAX_DURATION_MS = 900;

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function smoothScrollProductResultToTop() {
  const startY = window.scrollY;

  if (startY <= 1) {
    return () => {};
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reduceMotion) {
    window.scrollTo(0, 0);
    return () => {};
  }

  const duration = Math.min(
    MAX_DURATION_MS,
    Math.max(
      MIN_DURATION_MS,
      360 + startY * 0.12,
    ),
  );

  const startedAt = performance.now();
  let animationFrame = 0;
  let cancelled = false;

  const animate = (now: number) => {
    if (cancelled) {
      return;
    }

    const elapsed = now - startedAt;
    const progress = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(progress);

    window.scrollTo(
      0,
      Math.round(startY * (1 - eased)),
    );

    if (progress < 1) {
      animationFrame =
        window.requestAnimationFrame(animate);
    } else {
      window.scrollTo(0, 0);
    }
  };

  animationFrame =
    window.requestAnimationFrame(animate);

  return () => {
    cancelled = true;

    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
    }
  };
}

export default function ProductSaveResultScroll({
  active,
}: ProductSaveResultScrollProps) {
  useEffect(() => {
    if (!active) {
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    let cancelScroll = () => {};

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        cancelScroll =
          smoothScrollProductResultToTop();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      cancelScroll();
    };
  }, [active]);

  return null;
}
