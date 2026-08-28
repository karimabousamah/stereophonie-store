"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DISPLAY_TIME = 4000;
const EXIT_TIME = 520;

type AccountSignoutSuccessToastProps = {
  show: boolean;
};

type ToastPhase = "entering" | "visible" | "leaving";

export default function AccountSignoutSuccessToast({
  show,
}: AccountSignoutSuccessToastProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<ToastPhase>("entering");

  const displayTimerRef = useRef<number | null>(null);
  const removeTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);

  function clearTimers() {
    if (displayTimerRef.current !== null) {
      window.clearTimeout(displayTimerRef.current);
      displayTimerRef.current = null;
    }

    if (removeTimerRef.current !== null) {
      window.clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }

    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  }

  function beginExit() {
    if (phase === "leaving") {
      return;
    }

    setPhase("leaving");

    /*
     * Safety fallback only.
     * The normal removal happens from animationend so React
     * cannot remove the toast before the slide-out finishes.
     */
    removeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
    }, 900);
  }

  useEffect(() => {
    if (!show) {
      return;
    }

    clearTimers();

    /*
     * Mount directly with the entering animation class.
     * This avoids depending on React state changes being
     * painted as two separate Tailwind transition states.
     */
    setPhase("entering");
    setMounted(true);

    /*
     * Remove the one-time login query parameter.
     */
    const url = new URL(window.location.href);

    url.searchParams.delete("account");

    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );

    /*
     * Entrance animation lasts 620ms.
     */
    enterTimerRef.current = window.setTimeout(() => {
      setPhase("visible");

      /*
       * Stay fully visible for four seconds AFTER
       * the entrance animation has completed.
       */
      displayTimerRef.current = window.setTimeout(() => {
        beginExit();
      }, DISPLAY_TIME);
    }, 620);

    return clearTimers;
  }, [show]);

  function closeToast() {
    clearTimers();
    beginExit();
  }

  if (!mounted) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-phase={phase}
      className={`st-account-signout-toast st-account-signout-toast--${phase}`}
      onAnimationEnd={(event) => {
        if (phase === "leaving" && event.target === event.currentTarget) {
          if (removeTimerRef.current !== null) {
            window.clearTimeout(removeTimerRef.current);
            removeTimerRef.current = null;
          }

          setMounted(false);
        }
      }}
    >
      <div className="st-account-signout-toast__card">
        <button
          type="button"
          onClick={closeToast}
          aria-label="Close sign out confirmation"
          className="st-account-toast-close absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[10px] border border-black/[0.06] bg-[#f7f7f5] text-black/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f5b335]/12"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 pr-8">
          <div className="relative top-[14px] grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#f5b335] text-[#1d1d1f] shadow-[0_6px_20px_rgba(245,179,53,0.22)]">
            <Check className="h-[14px] w-[14px] stroke-[2.25]" />
          </div>

          <div className="min-w-0 pt-0.5">
            <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[#8a5b00]">
              Account
            </span>

            <strong className="mt-1 block text-[17px] font-semibold tracking-[-0.025em] text-[#1d1d1f]">
              Signed out successfully
            </strong>

            <p className="mt-1 text-[13px] leading-5 text-black/45">
              See you again soon.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        /*
         * =====================================================
         * STEREOPHONIE — SIGN-OUT SUCCESS TOAST
         * =====================================================
         */

        .st-account-signout-toast {
          position: fixed;
          z-index: 9999;
          top: 92px;
          right: 20px;

          width: min(390px, calc(100vw - 40px));

          will-change: transform, opacity, filter;
        }

        .st-account-signout-toast__card {
          position: relative;

          overflow: hidden;

          padding: 20px;

          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 18px;

          background: #ffffff;

          box-shadow:
            0 20px 60px rgba(29, 29, 31, 0.16),
            0 4px 16px rgba(29, 29, 31, 0.05);
        }

        .st-account-signout-toast__top-accent {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;

          height: 3px;

          background: #f5b335;
        }

        /*
         * -----------------------------------------------------
         * ENTER
         *
         * Starts clearly outside its resting position and
         * eases naturally into place.
         * -----------------------------------------------------
         */

        .st-account-signout-toast--entering {
          pointer-events: none;

          animation: st-signout-toast-enter 620ms cubic-bezier(0.16, 1, 0.3, 1)
            both;
        }

        @keyframes st-signout-toast-enter {
          0% {
            opacity: 0;
            transform: translate3d(72px, -10px, 0) scale(0.96);

            filter: blur(3px);
          }

          45% {
            opacity: 1;
          }

          100% {
            opacity: 1;

            transform: translate3d(0, 0, 0) scale(1);

            filter: blur(0);
          }
        }

        /*
         * -----------------------------------------------------
         * RESTING STATE
         * -----------------------------------------------------
         */

        .st-account-signout-toast--visible {
          opacity: 1;

          transform: translate3d(0, 0, 0) scale(1);

          filter: blur(0);
        }

        /*
         * -----------------------------------------------------
         * EXIT
         * -----------------------------------------------------
         */

        .st-account-signout-toast--leaving {
          pointer-events: none;

          animation: st-signout-toast-exit ${EXIT_TIME}ms
            cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @keyframes st-signout-toast-exit {
          0% {
            opacity: 1;

            transform: translate3d(0, 0, 0) scale(1);

            filter: blur(0);
          }

          100% {
            opacity: 0;

            transform: translate3d(56px, -6px, 0) scale(0.98);

            filter: blur(2px);
          }
        }

        /*
         * -----------------------------------------------------
         * TIMER BAR
         * -----------------------------------------------------
         */

        .st-account-signout-toast__progress {
          position: absolute;

          bottom: 0;
          left: 0;

          width: 100%;
          height: 2px;

          background: #f5b335;

          transform: scaleX(1);
          transform-origin: left center;
        }

        .st-account-signout-toast__progress--running {
          animation: st-signout-toast-progress ${DISPLAY_TIME}ms linear forwards;
        }

        @keyframes st-signout-toast-progress {
          from {
            transform: scaleX(1);
          }

          to {
            transform: scaleX(0);
          }
        }

        /*
         * -----------------------------------------------------
         * MOBILE
         * -----------------------------------------------------
         */

        @media (max-width: 640px) {
          .st-account-signout-toast {
            top: 82px;
            right: 16px;

            width: calc(100vw - 32px);
          }

          @keyframes st-signout-toast-enter {
            0% {
              opacity: 0;

              transform: translate3d(32px, -8px, 0) scale(0.97);

              filter: blur(2px);
            }

            100% {
              opacity: 1;

              transform: translate3d(0, 0, 0) scale(1);

              filter: blur(0);
            }
          }
        }

        /* ST SIGNOUT SUCCESS TOAST FINAL V3 START */

        /*
         * Final clean notification treatment.
         * No mustard top line.
         * No mustard bottom line.
         * Smooth right-side entrance and exit.
         */

        .st-account-signout-toast {
          transform-origin: top right;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }

        .st-account-signout-toast__card {
          padding: 19px !important;

          border: 1px solid rgba(29, 29, 31, 0.08) !important;
          border-radius: 18px !important;

          background: rgba(255, 255, 255, 0.98) !important;

          box-shadow:
            0 2px 8px rgba(29, 29, 31, 0.035),
            0 14px 40px rgba(29, 29, 31, 0.105) !important;

          -webkit-backdrop-filter: saturate(180%) blur(20px);
          backdrop-filter: saturate(180%) blur(20px);
        }

        /*
         * Kill the old decorative elements defensively too.
         */

        .st-account-signout-toast__top-accent,
        .st-account-signout-toast__progress,
        .st-account-signout-toast__progress--running {
          display: none !important;
          animation: none !important;
        }

        /*
         * ENTER
         *
         * Starts slightly to the right and transparent,
         * then glides naturally into its final position.
         */

        .st-account-signout-toast--entering {
          pointer-events: none;

          animation: stSignoutSuccessEnterFinal 480ms
            cubic-bezier(0.16, 1, 0.3, 1) both !important;

          will-change: transform, opacity !important;
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        @keyframes stSignoutSuccessEnterFinal {
          0% {
            opacity: 0;
            transform: translate3d(46px, 0, 0) scale(0.985);
          }

          55% {
            opacity: 1;
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        /*
         * VISIBLE
         */

        .st-account-signout-toast--visible {
          opacity: 1 !important;

          transform: translate3d(0, 0, 0) scale(1) !important;

          filter: none !important;

          animation: none !important;
        }

        /*
         * EXIT
         *
         * Reverse visual direction:
         * smoothly returns toward the right while fading.
         */

        .st-account-signout-toast--exiting {
          pointer-events: none;

          animation: stSignoutSuccessExitFinal 380ms
            cubic-bezier(0.4, 0, 0.2, 1) both !important;
        }

        @keyframes stSignoutSuccessExitFinal {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }

          100% {
            opacity: 0;
            transform: translate3d(38px, 0, 0) scale(0.985);
          }
        }

        /*
         * Clean close button.
         * Remove the mustard hover treatment from the old template.
         */

        .st-account-signout-toast__card
          button[aria-label="Close sign out confirmation"] {
          border: 1px solid rgba(29, 29, 31, 0.065) !important;

          background: #f7f7f8 !important;

          color: rgba(29, 29, 31, 0.42) !important;

          box-shadow: none !important;

          transition:
            background-color 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            transform 180ms ease !important;
        }

        @media (hover: hover) {
          .st-account-signout-toast__card
            button[aria-label="Close sign out confirmation"]:hover {
            border-color: rgba(29, 29, 31, 0.1) !important;

            background: #efeff1 !important;

            color: #1d1d1f !important;

            transform: scale(0.96);
          }
        }

        /*
         * MOBILE
         */

        @media (max-width: 640px) {
          .st-account-signout-toast {
            top: 80px !important;
            right: 12px !important;

            width: calc(100vw - 24px) !important;
          }

          .st-account-signout-toast__card {
            padding: 17px !important;
            border-radius: 17px !important;
          }

          @keyframes stSignoutSuccessEnterFinal {
            0% {
              opacity: 0;
              transform: translate3d(26px, 0, 0) scale(0.99);
            }

            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          @keyframes stSignoutSuccessExitFinal {
            0% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }

            100% {
              opacity: 0;
              transform: translate3d(24px, 0, 0) scale(0.99);
            }
          }
        }

        /*
         * REDUCED MOTION
         *
         * Still fade instead of abruptly popping.
         */

        @media (prefers-reduced-motion: reduce) {
          .st-account-signout-toast--entering {
            animation: stSignoutSuccessFadeIn 180ms ease-out both !important;
          }

          .st-account-signout-toast--exiting {
            animation: stSignoutSuccessFadeOut 160ms ease-in both !important;
          }
        }

        @keyframes stSignoutSuccessFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes stSignoutSuccessFadeOut {
          from {
            opacity: 1;
          }

          to {
            opacity: 0;
          }
        }

        /* ST SIGNOUT TOAST EXACT REVERSE EXIT V8 START */

        /*
         * Exact reverse of the working entrance:
         *
         * ENTER:
         *   46px right + transparent
         *   -> resting position + opaque
         *
         * EXIT:
         *   resting position + opaque
         *   -> 46px right + transparent
         *
         * Only transform + opacity.
         * No blur.
         * No intermediate keyframes.
         */
        .st-account-signout-toast--leaving {
          pointer-events: none !important;

          animation: stSignoutExactReverseExit 480ms
            cubic-bezier(0.7, 0, 0.84, 0) both !important;

          will-change: transform, opacity !important;
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        @keyframes stSignoutExactReverseExit {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }

          to {
            opacity: 0;
            transform: translate3d(46px, 0, 0) scale(0.985);
          }
        }

        @media (max-width: 640px) {
          .st-account-signout-toast--leaving {
            animation-duration: 480ms !important;
          }

          @keyframes stSignoutExactReverseExit {
            from {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }

            to {
              opacity: 0;
              transform: translate3d(26px, 0, 0) scale(0.99);
            }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .st-account-signout-toast--leaving {
            animation: stSignoutSuccessFadeOut 180ms ease-in both !important;
          }
        }

        /* ST SIGNOUT TOAST EXACT REVERSE EXIT V8 END */

        /* ST SIGNOUT SUCCESS TOAST FINAL V3 END */
      `}</style>
    </aside>
  );
}
