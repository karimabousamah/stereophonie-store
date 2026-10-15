"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export default function HomeProductShelfScrollHint() {
  const markerRef =
    useRef<HTMLSpanElement>(null);

  const [hasOverflow, setHasOverflow] =
    useState(false);

  const getShelf =
    useCallback(() => {
      const section =
        markerRef.current?.closest(
          ".st3-home-shop-products",
        );

      return (
        section?.querySelector<HTMLElement>(
          ".st3-home-product-shelf",
        ) ?? null
      );
    }, []);

  const measure =
    useCallback(() => {
      const shelf =
        getShelf();

      if (!shelf) {
        setHasOverflow(false);
        return;
      }

      const style =
        window.getComputedStyle(
          shelf,
        );

      const scrollable =
        style.overflowX === "auto" ||
        style.overflowX === "scroll";

      const overflowing =
        shelf.scrollWidth >
        shelf.clientWidth + 1;

      setHasOverflow(
        scrollable &&
          overflowing,
      );
    }, [getShelf]);

  useEffect(() => {
    const shelf =
      getShelf();

    if (!shelf) {
      setHasOverflow(false);
      return;
    }

    let secondFrame = 0;

    const firstFrame =
      window.requestAnimationFrame(
        () => {
          secondFrame =
            window.requestAnimationFrame(
              measure,
            );
        },
      );

    const observer =
      typeof ResizeObserver !==
      "undefined"
        ? new ResizeObserver(
            measure,
          )
        : null;

    observer?.observe(
      shelf,
    );

    Array.from(
      shelf.children,
    ).forEach((child) => {
      observer?.observe(
        child,
      );
    });

    window.addEventListener(
      "resize",
      measure,
    );

    window.addEventListener(
      "orientationchange",
      measure,
    );

    return () => {
      window.cancelAnimationFrame(
        firstFrame,
      );

      if (secondFrame) {
        window.cancelAnimationFrame(
          secondFrame,
        );
      }

      observer?.disconnect();

      window.removeEventListener(
        "resize",
        measure,
      );

      window.removeEventListener(
        "orientationchange",
        measure,
      );
    };
  }, [
    getShelf,
    measure,
  ]);

  return (
    <>
      <span
        ref={markerRef}
        aria-hidden="true"
        style={{
          display: "none",
        }}
      />

      {hasOverflow ? (
        <div
          className="st3-home-product-shelf__scroll-hint"
          aria-hidden="true"
        >
          <span className="st3-home-product-shelf__scroll-hint-mobile">
            Swipe to explore
          </span>

          <span className="st3-home-product-shelf__scroll-hint-desktop">
            Scroll to explore
          </span>

          <span className="st3-home-product-shelf__scroll-hint-arrow">
            →
          </span>
        </div>
      ) : null}
    </>
  );
}
