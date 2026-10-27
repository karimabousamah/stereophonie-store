"use client";

import { useEffect, useRef, useState } from "react";

import V2ProductCard from "@/components/stereophonie-v2/shop/v2-product-card";
import StoreProductCard, { type StoreProductCardProduct } from "@/components/storefront/store-product-card";

type Props = {
  products: StoreProductCardProduct[];
  variant?: "home" | "related";
};

// ST_HOME_RESPONSIVE_INFINITE_PRODUCT_LOOP_V1
//
// The existing shelf remains the horizontal scroll container.
// We append only enough repeated cards to fill the viewport
// beyond the loop boundary. The repeated cards use the exact
// same V2ProductCard component and existing product actions.
//
// The loop resets scrollLeft at the first repeated card.
// Because it visually matches the first real card, no rewind
// or empty gap should be visible.

export default function HomeProductShelfAutoLoop({
  products,
  variant = "home",
}: Props) {
  const shelfRef = useRef<HTMLDivElement>(null);

  const [cloneCount, setCloneCount] = useState(0);

  const cycleWidthRef = useRef(0);
  const focusedRef = useRef(false);
  const manualPauseUntilRef = useRef(0);

  // ST_HOME_LOOP_POPUP_INDEPENDENCE_V4
  const pointerPositionRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const keyboardInputRef = useRef(false);
  const touchActiveRef = useRef(false);

  const productSignature = products
    .map((product) => product.id)
    .join("|");

  // ST_RELATED_AUTOLOOP_IPAD_QUICKVIEW_V1
  // Homepage retains V2ProductCard directly.
  // Recommendations retain StoreProductCard, which
  // preserves the authoritative configuration photography.
  const ProductCard =
    variant === "related" ? StoreProductCard : V2ProductCard;

  // Measure actual rendered card width rather than guessing
  // how many cards fit at a particular breakpoint.
  useEffect(() => {
    const shelf = shelfRef.current;

    if (!shelf) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let measureFrame = 0;

    const measure = () => {
      measureFrame = 0;

      const originalCards = Array.from(shelf.children)
        .slice(0, products.length) as HTMLElement[];

      const first = originalCards[0];
      const last = originalCards[originalCards.length - 1];

      if (!first || !last || first.offsetWidth <= 0) {
        cycleWidthRef.current = 0;
        setCloneCount(0);
        return;
      }

      const style = window.getComputedStyle(shelf);

      const leftPadding =
        Number.parseFloat(style.paddingLeft) || 0;

      const rightPadding =
        Number.parseFloat(style.paddingRight) || 0;

      const gap =
        Number.parseFloat(style.columnGap) ||
        Number.parseFloat(style.gap) ||
        0;

      const visibleWidth = Math.max(
        1,
        shelf.clientWidth - leftPadding - rightPadding,
      );

      const cardWidth = first.offsetWidth;

      const visibleCount = Math.max(
        1,
        Math.floor(
          (visibleWidth + gap + 0.5) /
          (cardWidth + gap),
        ),
      );

      const originalRowWidth =
        last.offsetLeft +
        last.offsetWidth -
        first.offsetLeft;

      // ST_HOME_PRODUCT_LOOP_ACTIVATION_V2
      // A partially hidden next card still counts as hidden.
      // Activation follows the actual number of full cards
      // that fit rather than relying on a second width gate.
      const hasHiddenProducts =
        originalCards.length > visibleCount;

      shelf.dataset.stLoopProducts =
        String(originalCards.length);
      shelf.dataset.stLoopVisible =
        String(visibleCount);
      shelf.dataset.stLoopViewport =
        String(Math.round(visibleWidth));
      shelf.dataset.stLoopContent =
        String(Math.round(originalRowWidth));

      const shouldLoop =
        !reducedMotion.matches && hasHiddenProducts;

      shelf.dataset.stLoopStatus =
        reducedMotion.matches
          ? "reduced-motion"
          : hasHiddenProducts
            ? "initializing"
            : "all-products-visible";

      // Duplicate just enough cards to cover the viewport
      // when the scrolling boundary reaches the first card.
      const neededClones = shouldLoop
        ? Math.min(products.length, visibleCount + 2)
        : 0;

      if (neededClones !== cloneCount) {
        cycleWidthRef.current = 0;
        setCloneCount(neededClones);
        return;
      }

      if (!shouldLoop) {
        cycleWidthRef.current = 0;
        return;
      }

      const firstClone = shelf.children.item(
        products.length,
      ) as HTMLElement | null;

      const cycleWidth = firstClone
        ? firstClone.offsetLeft - first.offsetLeft
        : 0;

      cycleWidthRef.current = Math.max(0, cycleWidth);

      shelf.dataset.stLoopCycle =
        String(Math.round(cycleWidth));

      shelf.dataset.stLoopStatus =
        cycleWidth > 1
          ? "ready"
          : "invalid-loop-width";

      if (
        cycleWidth > 1 &&
        shelf.scrollLeft >= cycleWidth
      ) {
        shelf.scrollLeft %= cycleWidth;
      }
    };

    const scheduleMeasure = () => {
      if (measureFrame) {
        window.cancelAnimationFrame(measureFrame);
      }

      measureFrame = window.requestAnimationFrame(measure);
    };

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleMeasure)
        : null;

    observer?.observe(shelf);

    if (shelf.parentElement) {
      observer?.observe(shelf.parentElement);
    }

    const firstCard = shelf.children.item(0);

    if (firstCard) {
      observer?.observe(firstCard);
    }

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener(
      "orientationchange",
      scheduleMeasure,
    );

    reducedMotion.addEventListener(
      "change",
      scheduleMeasure,
    );

    scheduleMeasure();

    return () => {
      if (measureFrame) {
        window.cancelAnimationFrame(measureFrame);
      }

      observer?.disconnect();

      window.removeEventListener(
        "resize",
        scheduleMeasure,
      );

      window.removeEventListener(
        "orientationchange",
        scheduleMeasure,
      );

      reducedMotion.removeEventListener(
        "change",
        scheduleMeasure,
      );
    };
  }, [cloneCount, productSignature, products.length]);

  // One animation loop per shelf. It runs only while
  // the shelf is visible and the document is active.
  useEffect(() => {
    const shelf = shelfRef.current;

    if (!shelf || cloneCount <= 0) return;

    let frame = 0;
    let previousTime = 0;
    const initialBounds = shelf.getBoundingClientRect();

    let isVisible =
      initialBounds.bottom > 0 &&
      initialBounds.top < window.innerHeight;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const hoverCapable = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    const rememberPointer = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        pointerPositionRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    };

    const rememberKeyboard = (event: KeyboardEvent) => {
      if (
        event.key === "Tab" ||
        event.key.startsWith("Arrow")
      ) {
        keyboardInputRef.current = true;
      }
    };

    const rememberPointerInput = () => {
      keyboardInputRef.current = false;
    };

    window.addEventListener(
      "pointermove",
      rememberPointer,
      { passive: true },
    );

    window.addEventListener(
      "pointerdown",
      rememberPointerInput,
      true,
    );

    window.addEventListener(
      "keydown",
      rememberKeyboard,
      true,
    );

    const tick = (now: number) => {
      const elapsed = previousTime
        ? Math.min(50, Math.max(0, now - previousTime))
        : 0;

      previousTime = now;

      // A card only counts as hovered if it is physically
      // the topmost element below the mouse pointer.
      // This prevents popup backdrops from leaving an
      // underlying card falsely marked as hovered.
      const pointer = pointerPositionRef.current;

      const topElement =
        hoverCapable && pointer
          ? document.elementFromPoint(pointer.x, pointer.y)
          : null;

      const hoveredCard =
        topElement instanceof Element
          ? topElement.closest(".st-retail-card")
          : null;

      const hoveringProduct =
        hoverCapable &&
        hoveredCard !== null &&
        shelf.contains(hoveredCard);

      // Quick View, Pre-order, Get Price and other dialogs
      // must never pause the homepage shelf behind them.
      const popupOpen =
        document.querySelector('[aria-modal="true"]') !== null;

      // Only genuine keyboard navigation may hold focus.
      // A mouse click or focus restored after a popup must
      // not freeze the carousel.
      const keyboardFocus =
        keyboardInputRef.current &&
        focusedRef.current &&
        document.activeElement instanceof HTMLElement &&
        shelf.contains(document.activeElement) &&
        document.activeElement.matches(":focus-visible");

      const isPaused =
        !popupOpen &&
        (
          hoveringProduct ||
          keyboardFocus ||
          touchActiveRef.current ||
          now < manualPauseUntilRef.current
        );

      const status = isPaused
        ? "paused-for-interaction"
        : cycleWidthRef.current > 1
          ? "moving"
          : "invalid-loop-width";

      if (shelf.dataset.stLoopStatus !== status) {
        shelf.dataset.stLoopStatus = status;
      }

      const span = cycleWidthRef.current;

      if (
        !isPaused &&
        !reducedMotion.matches &&
        span > 1 &&
        elapsed > 0
      ) {
        // Smooth, visible motion at 88px per second.
        // Frame-rate independent and without CSS snapping.
        let next = shelf.scrollLeft + elapsed * 0.088;

        if (next >= span) {
          next %= span;
        }

        shelf.scrollLeft = next;
      }

      frame = window.requestAnimationFrame(tick);
    };

    const syncAnimation = () => {
      const canRun =
        isVisible &&
        !document.hidden &&
        !reducedMotion.matches;

      if (canRun && !frame) {
        previousTime = 0;
        frame = window.requestAnimationFrame(tick);
      } else if (!canRun) {
        shelf.dataset.stLoopStatus =
          reducedMotion.matches
            ? "reduced-motion"
            : document.hidden
              ? "hidden-tab"
              : "offscreen";

        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
          previousTime = 0;
        }
      }
    };

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              isVisible = Boolean(
                entries[0]?.isIntersecting,
              );
              syncAnimation();
            },
            {
              rootMargin: "80px",
              threshold: 0,
            },
          )
        : null;

    observer?.observe(shelf);

    document.addEventListener(
      "visibilitychange",
      syncAnimation,
    );

    reducedMotion.addEventListener(
      "change",
      syncAnimation,
    );

    syncAnimation();

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      observer?.disconnect();

      window.removeEventListener(
        "pointermove",
        rememberPointer,
      );

      window.removeEventListener(
        "pointerdown",
        rememberPointerInput,
        true,
      );

      window.removeEventListener(
        "keydown",
        rememberKeyboard,
        true,
      );

      document.removeEventListener(
        "visibilitychange",
        syncAnimation,
      );

      reducedMotion.removeEventListener(
        "change",
        syncAnimation,
      );
    };
  }, [cloneCount, productSignature]);

  const shelf = (
      <div
        ref={shelfRef}
        className={
          (variant === "related"
            ? "st-related-products-grid st-product-v5__related-grid st-product-related-shelf"
            : "st3-shop-v4__grid st-product-grid-canonical st3-home-product-shelf") +
          (cloneCount > 0
            ? " st-home-product-shelf--autoloop"
            : "")
        }
        // ST_HOME_CAROUSEL_RESUME_QUICKVIEW_V3
        // Mouse clicks must not leave an artificial pause.
        // Touch and pen interactions retain a short pause.
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") {
            manualPauseUntilRef.current = 0;
            focusedRef.current = false;
            return;
          }

          manualPauseUntilRef.current =
            performance.now() + 900;
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") {
            // Continue as soon as the pointer leaves.
            // Also clear pauses caused by mouse-wheel input.
            manualPauseUntilRef.current = 0;
            focusedRef.current = false;
          }
        }}
        onTouchStart={() => {
          touchActiveRef.current = true;
          manualPauseUntilRef.current = 0;
        }}
        onTouchEnd={() => {
          touchActiveRef.current = false;
          manualPauseUntilRef.current =
            performance.now() + 650;
        }}
        onTouchCancel={() => {
          touchActiveRef.current = false;
          manualPauseUntilRef.current = 0;
        }}
        onWheel={() => {
          // Protect the immediate manual wheel movement
          // without leaving a multi-second pause.
          manualPauseUntilRef.current =
            performance.now() + 180;
        }}
        onFocusCapture={(event) => {
          // Keyboard-visible focus pauses autoplay.
          // Programmatic mouse focus (e.g. after Quick View
          // closes) must not stop it indefinitely.
          focusedRef.current =
            event.target instanceof HTMLElement &&
            event.target.matches(":focus-visible");
        }}
        onBlurCapture={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget as Node | null,
            )
          ) {
            focusedRef.current = false;
          }
        }}
        onScroll={() => {
          const shelf = shelfRef.current;
          const span = cycleWidthRef.current;

          if (
            shelf &&
            span > 1 &&
            shelf.scrollLeft >= span
          ) {
            shelf.scrollLeft %= span;
          }
        }}
      >
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
          />
        ))}

        {cloneCount > 0
          ? products.slice(0, cloneCount).map(
              (product, index) => (
                <ProductCard
                  key={`home-loop-${product.id}`}
                  product={product}
                  index={index}
                />
              ),
            )
          : null}
      </div>
  );

  // Preserve the original recommendation CSS selectors:
  // .st-product-v5__related > .st-related-products-grid
  // The homepage retains its original outer wrapper.
  return variant === "related" ? shelf : (
    <div className="st3-shop-card-context st3-home-product-shelf-context">
      {shelf}
    </div>
  );
}
