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
    setPhase("leaving");

    removeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
    }, EXIT_TIME);
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
    >
      <div className="st-account-signin-toast__card">
        <div
          aria-hidden="true"
          className="st-account-signin-toast__top-accent"
        />

        <button
          type="button"
          onClick={closeToast}
          aria-label="Close sign in confirmation"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-[10px] border border-black/[0.06] bg-[#f7f7f5] text-black/45 transition-all duration-200 hover:border-[#f5b335]/45 hover:bg-[#fff7e4] hover:text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f5b335]/12"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4 pr-8">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#f5b335] text-[#1d1d1f] shadow-[0_6px_20px_rgba(245,179,53,0.22)]">
            <Check className="h-5 w-5 stroke-[2.4]" />
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

        <div
          aria-hidden="true"
          className={`st-account-signin-toast__progress ${
            phase === "visible"
              ? "st-account-signin-toast__progress--running"
              : ""
          }`}
        />
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
      `}</style>
    </aside>
  );
}
