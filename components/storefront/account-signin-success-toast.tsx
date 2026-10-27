"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const DISPLAY_TIME = 4000;
const EXIT_TIME = 520;

type AccountSigninSuccessToastProps = {
  show: boolean;
};

type ToastPhase = "entering" | "visible" | "leaving";

export default function AccountSigninSuccessToast({
  show,
}: AccountSigninSuccessToastProps) {
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
      className={`st-account-signin-toast st-account-signin-toast--${phase}`}
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
      <div className="st-account-signin-toast__card">
        <button
          type="button"
          onClick={closeToast}
          aria-label="Close sign in confirmation"
          className="st-account-toast-close st-storefront-popup-close absolute right-3 top-1/2 -mt-4 grid h-8 w-8 place-items-center rounded-[10px] border border-black/[0.06] bg-[#f7f7f5] text-black/45 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f5b335]/12"
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
              Signed in successfully
            </strong>

            <p className="mt-1 text-[13px] leading-5 text-black/45">
              Welcome back to Stereophonie.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        /*
         * =====================================================
         * STEREOPHONIE — SIGN-IN SUCCESS TOAST
         * =====================================================
         */

        .st-account-signin-toast {
          position: fixed;
          z-index: 9999;
          top: 92px;
          right: 20px;

          width: min(390px, calc(100vw - 40px));

          will-change: transform, opacity, filter;
        }

        .st-account-signin-toast__card {
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

        .st-account-signin-toast__top-accent {
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

        .st-account-signin-toast--entering {
          pointer-events: none;

          animation: st-signin-toast-enter 620ms cubic-bezier(0.16, 1, 0.3, 1)
            both;
        }

        @keyframes st-signin-toast-enter {
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

        .st-account-signin-toast--visible {
          opacity: 1;

          transform: translate3d(0, 0, 0) scale(1);

          filter: blur(0);
        }

        /*
         * -----------------------------------------------------
         * EXIT
         * -----------------------------------------------------
         */

        .st-account-signin-toast--leaving {
          pointer-events: none;

          animation: st-signin-toast-exit ${EXIT_TIME}ms
            cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @keyframes st-signin-toast-exit {
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

        .st-account-signin-toast__progress {
          position: absolute;

          bottom: 0;
          left: 0;

          width: 100%;
          height: 2px;

          background: #f5b335;

          transform: scaleX(1);
          transform-origin: left center;
        }

        .st-account-signin-toast__progress--running {
          animation: st-signin-toast-progress ${DISPLAY_TIME}ms linear forwards;
        }

        @keyframes st-signin-toast-progress {
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
          .st-account-signin-toast {
            top: 82px;
            right: 16px;

            width: calc(100vw - 32px);
          }

          @keyframes st-signin-toast-enter {
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

        /* ST SIGNIN SUCCESS TOAST FINAL V3 START */

        /*
         * Final clean notification treatment.
         * No mustard top line.
         * No mustard bottom line.
         * Smooth right-side entrance and exit.
         */

        .st-account-signin-toast {
          transform-origin: top right;
          will-change: transform, opacity;
          backface-visibility: hidden;
        }

        .st-account-signin-toast__card {
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

        .st-account-signin-toast__top-accent,
        .st-account-signin-toast__progress,
        .st-account-signin-toast__progress--running {
          display: none !important;
          animation: none !important;
        }

        /*
         * ENTER
         *
         * Starts slightly to the right and transparent,
         * then glides naturally into its final position.
         */

        .st-account-signin-toast--entering {
          pointer-events: none;

          animation: stSigninSuccessEnterFinal 480ms
            cubic-bezier(0.16, 1, 0.3, 1) both !important;
        }

        @keyframes stSigninSuccessEnterFinal {
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

        .st-account-signin-toast--visible {
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

        .st-account-signin-toast--exiting {
          pointer-events: none;

          animation: stSigninSuccessExitFinal 380ms cubic-bezier(0.4, 0, 0.2, 1)
            both !important;
        }

        @keyframes stSigninSuccessExitFinal {
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

        .st-account-signin-toast__card
          button[aria-label="Close sign in confirmation"] {
          border: 1px solid rgba(29, 29, 31, 0.065) !important;

          background: #f7f7f8 !important;

          color: rgba(29, 29, 31, 0.42) !important;

          box-shadow: none !important;

          transition:
            background-color 180ms ease,
            border-color 180ms ease,
            color 180ms ease,
            box-shadow 180ms ease !important;
        }

        @media (hover: hover) {
          .st-account-signin-toast__card
            button[aria-label="Close sign in confirmation"]:hover {
            border-color: rgba(197, 139, 34, 0.8) !important;

            background: #fffaf0 !important;

            color: #1d1d1f !important;

            box-shadow:
              0 0 0 4px rgba(245, 179, 53, 0.11),
              0 10px 30px rgba(196, 135, 27, 0.13) !important;

            transform: none !important;
          }
        }

        /*
         * MOBILE
         */

        @media (max-width: 640px) {
          .st-account-signin-toast {
            top: 80px !important;
            right: 12px !important;

            width: calc(100vw - 24px) !important;
          }

          .st-account-signin-toast__card {
            padding: 17px !important;
            border-radius: 17px !important;
          }

          @keyframes stSigninSuccessEnterFinal {
            0% {
              opacity: 0;
              transform: translate3d(26px, 0, 0) scale(0.99);
            }

            100% {
              opacity: 1;
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          @keyframes stSigninSuccessExitFinal {
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
          .st-account-signin-toast--entering {
            animation: stSigninSuccessFadeIn 180ms ease-out both !important;
          }

          .st-account-signin-toast--exiting {
            animation: stSigninSuccessFadeOut 160ms ease-in both !important;
          }
        }

        @keyframes stSigninSuccessFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes stSigninSuccessFadeOut {
          from {
            opacity: 1;
          }

          to {
            opacity: 0;
          }
        }

        /* ST SIGNIN TOAST EXACT REVERSE EXIT V8 START */

        /*
         * Entrance:
         *   right -> resting position
         *
         * Exit:
         *   resting position -> right
         *
         * Same distance, same duration, inverse easing.
         * Only transform + opacity are animated for smooth
         * compositor-driven motion.
         */

        .st-account-signin-toast--leaving {
          pointer-events: none !important;

          animation: stSigninExactReverseExit 480ms
            cubic-bezier(0.7, 0, 0.84, 0) both !important;

          will-change: transform, opacity !important;
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        @keyframes stSigninExactReverseExit {
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
          .st-account-signin-toast--leaving {
            animation-duration: 480ms !important;
          }

          @keyframes stSigninExactReverseExit {
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
          .st-account-signin-toast--leaving {
            animation: stSigninSuccessFadeOut 180ms ease-in both !important;
          }
        }

        /* ST SIGNIN TOAST EXACT REVERSE EXIT V8 END */

        /* ST SIGNIN SUCCESS TOAST FINAL V3 END */
      `}</style>
    </aside>
  );
}
