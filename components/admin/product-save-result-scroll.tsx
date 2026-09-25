"use client";

import { useEffect } from "react";

type ProductSaveResultScrollProps = {
  active: boolean;
};

const MIN_DURATION_MS = 480;
const MAX_DURATION_MS = 1050;
const RESULT_GAP_PX = 22;
const PRODUCT_SAVE_SCROLL_STORAGE_KEY =
  "stereophonie-admin-product-save-scroll-y";

export function rememberProductSaveScrollPosition() {
  try {
    window.sessionStorage.setItem(
      PRODUCT_SAVE_SCROLL_STORAGE_KEY,
      String(Math.max(0, Math.round(window.scrollY))),
    );
  } catch {
    /*
     * Storage can be unavailable in restrictive browser modes.
     * Saving the product must never depend on scroll restoration.
     */
  }
}

function consumeProductSaveScrollPosition() {
  try {
    const storedValue = window.sessionStorage.getItem(
      PRODUCT_SAVE_SCROLL_STORAGE_KEY,
    );

    window.sessionStorage.removeItem(
      PRODUCT_SAVE_SCROLL_STORAGE_KEY,
    );

    if (storedValue === null) {
      return null;
    }

    const scrollY = Number(storedValue);

    return Number.isFinite(scrollY)
      ? Math.max(0, scrollY)
      : null;
  } catch {
    return null;
  }
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function getProductResultScrollTarget() {
  const result =
    document.querySelector<HTMLElement>(
      '[data-admin-product-success="true"], [data-admin-product-error="true"]',
    );

  if (!result) {
    return 0;
  }

  const fixedHeader =
    document.querySelector<HTMLElement>(
      '[data-admin-product-fixed-header="true"]',
    );

  const headerHeight =
    fixedHeader?.getBoundingClientRect().height ?? 0;

  const resultTop =
    window.scrollY +
    result.getBoundingClientRect().top;

  return Math.max(
    0,
    Math.round(
      resultTop -
      headerHeight -
      RESULT_GAP_PX,
    ),
  );
}

export function smoothScrollProductResultToTop() {
  const startY = window.scrollY;
  const targetY = getProductResultScrollTarget();
  const distance = targetY - startY;

  if (Math.abs(distance) <= 1) {
    return () => {};
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reduceMotion) {
    window.scrollTo(0, targetY);
    return () => {};
  }

  const travelDistance = Math.abs(distance);

  const duration = Math.min(
    MAX_DURATION_MS,
    Math.max(
      MIN_DURATION_MS,
      420 + travelDistance * 0.11,
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
    const progress = Math.min(
      1,
      elapsed / duration,
    );
    const eased = easeInOutCubic(progress);

    window.scrollTo(
      0,
      Math.round(
        startY + distance * eased,
      ),
    );

    if (progress < 1) {
      animationFrame =
        window.requestAnimationFrame(animate);
    } else {
      window.scrollTo(0, targetY);
    }
  };

  animationFrame =
    window.requestAnimationFrame(animate);

  return () => {
    cancelled = true;

    if (animationFrame) {
      window.cancelAnimationFrame(
        animationFrame,
      );
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
