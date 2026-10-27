"use client";

/*
 * ST_SLIDE_TO_PLACE_ORDER_V1
 *
 * Mouse, touch, pen and accessible keyboard confirmation.
 * No ordinary click can submit the order.
 * Early release resets the control without submission.
 */

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Check, ChevronRight } from "lucide-react";

type Props = {
  disabled: boolean;
  loading: boolean;
  onConfirm: () => Promise<void> | void;
};

type Session = {
  pointerId: number;
  startX: number;
  travel: number;
};

/*
 * ST_CHECKOUT_VISIBLE_VAT_HAPTICS_V2
 *
 * Optional touch haptics for supported browsers.
 * Does not change order submission or slider progress.
 */
function requestSlideHaptic(duration: number) {
  if (typeof navigator === "undefined") return;

  const device = navigator as Navigator & {
    vibrate?: (duration: number) => boolean;
  };

  const vibrate = device.vibrate;

  if (typeof vibrate !== "function") return;

  try {
    vibrate.call(device, duration);
  } catch {
    // Vibration must never interfere with checkout.
  }
}

const HANDLE_SIZE = 58;
const INSET = 5;
const THRESHOLD = 0.9;

/*
 * ST_SLIDE_LABEL_CROSSFADE_V2
 *
 * Keep each label mounted so the old and new text
 * can animate their opacity and position together.
 * This changes only presentation, never confirmation.
 */
const SLIDE_LABELS = [
  "Slide to place order",
  "Keep sliding to confirm",
  "Release to confirm order",
  "Press Enter to confirm",
  "Placing your order...",
  "Select a payment method first",
] as const;


function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

/*
 * ST_SLIDE_PROGRESS_CROSSFADE_V3
 *
 * Unlike discrete label switching, this interpolation
 * makes messages fade into one another as the handle
 * physically travels across the track.
 */
function smoothBlend(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

export default function SlideToPlaceOrder({
  disabled,
  loading,
  onConfirm,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const progressRef = useRef(0);
  const busyRef = useRef(false);
  const hapticStageRef = useRef(0);
  const mountedRef = useRef(true);

  const [progress, setProgress] = useState(0);
  const [travel, setTravel] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [committing, setCommitting] = useState(false);

  const unavailable = disabled || loading || committing;

  function updateProgress(value: number) {
    const next = clamp(value);
    progressRef.current = next;
    setProgress(next);
  }

  function availableTravel() {
    return Math.max(
      0,
      (trackRef.current?.clientWidth ?? 0) - HANDLE_SIZE - INSET * 2,
    );
  }

  useEffect(() => {
    mountedRef.current = true;

    const measure = () => {
      setTravel(availableTravel());
    };

    measure();

    const element = trackRef.current;
    const observer =
      element && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;

    if (element && observer) {
      observer.observe(element);
    }

    return () => {
      mountedRef.current = false;
      observer?.disconnect();
    };
  }, []);

  function confirm() {
    if (unavailable || busyRef.current) return;

    busyRef.current = true;
    setCommitting(true);
    updateProgress(1);

    try {
      void Promise.resolve(onConfirm())
        .catch((error: unknown) => {
          console.error("Order submission failed:", error);
        })
        .finally(() => {
          busyRef.current = false;

          if (mountedRef.current) {
            setCommitting(false);
            updateProgress(0);
          }
        });
    } catch (error) {
      console.error("Order submission failed:", error);
      busyRef.current = false;
      setCommitting(false);
      updateProgress(0);
    }
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (unavailable || busyRef.current) return;

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const distance = availableTravel();
    if (distance <= 0) return;

    event.preventDefault();

    sessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      travel: distance,
    };

    setTravel(distance);
    updateProgress(0);
    setDragging(true);

    hapticStageRef.current = 0;

    if (event.pointerType === "touch") {
      requestSlideHaptic(8);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const session = sessionRef.current;

    if (!session || event.pointerId !== session.pointerId) {
      return;
    }

    event.preventDefault();

    const nextProgress = clamp(
      (event.clientX - session.startX) / session.travel,
    );

    updateProgress(nextProgress);

    if (event.pointerType === "touch") {
      /*
       * Progressive tactile checkpoints.
       * Fire once at each milestone, not every frame.
       */
      const stage =
        nextProgress >= THRESHOLD ? 4
        : nextProgress >= 0.75 ? 3
        : nextProgress >= 0.5 ? 2
        : nextProgress >= 0.25 ? 1
        : 0;

      if (stage > hapticStageRef.current) {
        hapticStageRef.current = stage;

        requestSlideHaptic(stage === 4 ? 14 : 7);
      }
    }
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const session = sessionRef.current;

    if (!session || event.pointerId !== session.pointerId) {
      return;
    }

    const finalProgress = clamp(
      (event.clientX - session.startX) / session.travel,
    );

    sessionRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (finalProgress >= THRESHOLD) {
      if (event.pointerType === "touch") {
        requestSlideHaptic(22);
      }

      confirm();
    } else {
      updateProgress(0);
    }
  }

  function pointerCancel(event: PointerEvent<HTMLDivElement>) {
    const session = sessionRef.current;

    if (!session || event.pointerId !== session.pointerId) {
      return;
    }

    sessionRef.current = null;
    setDragging(false);
    updateProgress(0);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function lostCapture(event: PointerEvent<HTMLDivElement>) {
    if (sessionRef.current?.pointerId !== event.pointerId) {
      return;
    }

    sessionRef.current = null;
    setDragging(false);
    updateProgress(0);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (unavailable || busyRef.current) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      updateProgress(progressRef.current + 0.2);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateProgress(progressRef.current - 0.2);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      updateProgress(1);
      return;
    }

    if (event.key === "Home" || event.key === "Escape") {
      event.preventDefault();
      updateProgress(0);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (progressRef.current >= THRESHOLD) {
        confirm();
      }
    }
  }

  const label = loading || committing
    ? "Placing your order..."
    : disabled
      ? "Select a payment method first"
      : progress >= THRESHOLD
        ? dragging
          ? "Release to confirm order"
          : "Press Enter to confirm"
        : progress >= 0.22
          ? "Keep sliding to confirm"
          : "Slide to place order";

  /*
   * Smoothly blend three stages of the actual gesture.
   *
   * Stage 1 -> 2: 14% to 36% of handle travel.
   * Stage 2 -> 3: 74% to 94% of handle travel.
   *
   * The text overlaps transparently, rather than
   * being abruptly swapped at one particular point.
   */
  const firstTransition = smoothBlend(0.14, 0.36, progress);
  const finalTransition = smoothBlend(0.74, 0.94, progress);

  function labelOpacity(message: (typeof SLIDE_LABELS)[number]) {
    if (loading || committing) {
      return message === "Placing your order..." ? 1 : 0;
    }

    if (disabled) {
      return message === "Select a payment method first" ? 1 : 0;
    }

    if (message === "Slide to place order") {
      return 1 - firstTransition;
    }

    if (message === "Keep sliding to confirm") {
      return firstTransition * (1 - finalTransition);
    }

    if (message === "Release to confirm order") {
      return dragging ? finalTransition : 0;
    }

    if (message === "Press Enter to confirm") {
      return dragging ? 0 : finalTransition;
    }

    return 0;
  }

  /*
   * ST_SLIDER_UNIFORM_COLOR_V2
   *
   * Interpolate the entire slider background from
   * checkout cream (#fffaf1) to mustard (#fdb73e).
   *
   * No separately growing pill, strip, or fill layer.
   * Only the white handle moves over a uniformly
   * changing background.
   */
  const trackColor = `rgb(${Math.round(
    255 - progress * 2,
  )}, ${Math.round(
    250 - progress * 67,
  )}, ${Math.round(
    241 - progress * 179,
  )})`;

  return (
    <div data-checkout-slide-confirm="true" className="w-full">
      <div
        ref={trackRef}
        style={{
          backgroundColor: unavailable ? "#f5f5f5" : trackColor,
          transitionDuration: dragging ? "0ms" : "180ms",
        }}
        className={`relative isolate h-[70px] w-full overflow-hidden rounded-full border transition-[border-color,background-color,box-shadow] duration-200 ${
          unavailable
            ? "border-black/10 opacity-65"
            : "border-[#e4ad43] hover:border-[#d99c2c] hover:shadow-[0_5px_18px_rgba(189,116,0,0.09)]"
        }`}
      >


        {/*
          Animated text transitions:
          - outgoing label fades out smoothly
          - incoming label fades in smoothly
          - both stay centered in the slider
          - subtle vertical movement adds polish
          - reduced-motion preferences are respected
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {/* ST_SLIDE_STATIONARY_FADE_V4: Opacity-only crossfade; all labels remain fixed. */}
          {SLIDE_LABELS.map((message) => {
            const opacity = labelOpacity(message);

            return (
              <span
                key={message}
                className="absolute inset-0 flex items-center justify-center px-[68px] text-center text-[12px] font-semibold tracking-[0.01em] text-[#1d1d1f] transition-opacity ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none sm:text-[14px]"
                style={{
                  opacity,
                  transitionDuration: dragging ? "110ms" : "320ms",
                }}
              >
                {message}
              </span>
            );
          })}
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          {label}
        </span>

        <div
          role="slider"
          tabIndex={unavailable ? -1 : 0}
          aria-label="Slide to place order"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuetext={
            loading || committing
              ? "Placing your order"
              : `${Math.round(progress * 100)} percent. Use arrow keys to move and Enter to confirm.`
          }
          aria-disabled={unavailable}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerCancel}
          onLostPointerCapture={lostCapture}
          onKeyDown={keyDown}
          className={`absolute left-[5px] top-[5px] z-10 flex h-[58px] w-[58px] items-center justify-center rounded-full border-2 border-[#e4ad43] bg-white text-[#1d1d1f] shadow-[0_3px_12px_rgba(29,29,31,0.12)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#fdb73e]/40 focus-visible:ring-offset-2 motion-reduce:transition-none ${
            unavailable
              ? "cursor-not-allowed"
              : "cursor-grab touch-none select-none active:cursor-grabbing"
          } ${
            dragging
              ? "transition-none"
              : "transition-transform duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]"
          }`}
          style={{
            transform: `translate3d(${Math.round(progress * travel)}px, 0, 0)`,
          }}
        >
          {loading || committing ? (
            <Check className="h-6 w-6" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          )}
        </div>
      </div>

      <p className="sr-only">
        To submit using a keyboard, focus the slider, move it to
        the end with the right arrow key, then press Enter.
        Releasing the slider early will not place your order.
      </p>
    </div>
  );
}
