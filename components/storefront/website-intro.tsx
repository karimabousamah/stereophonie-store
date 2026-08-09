"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INTRO_VISIBLE_DURATION = 2700;
const INTRO_EXIT_DURATION = 700;

type WebsiteIntroProps = {
  showOnFirstRender: boolean;
  cookieName: string;
};

export default function WebsiteIntro({
  showOnFirstRender,
  cookieName,
}: WebsiteIntroProps) {
  const [visible, setVisible] = useState(showOnFirstRender);

  const [leaving, setLeaving] = useState(false);

  const closeStarted = useRef(false);

  const automaticTimer = useRef<number | null>(null);

  const exitTimer = useRef<number | null>(null);

  const closeIntro = useCallback(() => {
    if (closeStarted.current) {
      return;
    }

    closeStarted.current = true;
    setLeaving(true);

    if (automaticTimer.current !== null) {
      window.clearTimeout(automaticTimer.current);

      automaticTimer.current = null;
    }

    exitTimer.current = window.setTimeout(() => {
      setVisible(false);
      setLeaving(false);

      exitTimer.current = null;
    }, INTRO_EXIT_DURATION);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    /*
     * No Max-Age or Expires is included.
     * This intentionally creates a session cookie.
     */
    document.cookie = `${encodeURIComponent(
      cookieName,
    )}=true; Path=/; SameSite=Lax`;

    const body = document.body;

    const html = document.documentElement;

    const previousBodyOverflow = body.style.overflow;

    const previousHtmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    automaticTimer.current = window.setTimeout(() => {
      closeIntro();
    }, INTRO_VISIBLE_DURATION);

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeIntro();
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      body.style.overflow = previousBodyOverflow;

      html.style.overflow = previousHtmlOverflow;

      window.removeEventListener("keydown", closeWithEscape);

      if (automaticTimer.current !== null) {
        window.clearTimeout(automaticTimer.current);

        automaticTimer.current = null;
      }

      if (exitTimer.current !== null) {
        window.clearTimeout(exitTimer.current);

        exitTimer.current = null;
      }
    };
  }, [closeIntro, cookieName, visible]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <style data-nita-intro-styles>{`
        .nita-intro {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          width: 100%;
          height: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          overflow: hidden;
          isolation: isolate;
          background: #f3f0e9;
          color: #080808;
          opacity: 1;
          visibility: visible;
          transition:
            opacity ${INTRO_EXIT_DURATION}ms
              cubic-bezier(
                0.16,
                1,
                0.3,
                1
              ),
            visibility
              ${INTRO_EXIT_DURATION}ms;
        }

        .nita-intro--leaving {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .nita-intro__grain {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          opacity: 0.12;
          background-image:
            radial-gradient(
              rgba(
                  0,
                  0,
                  0,
                  0.28
                )
                0.55px,
              transparent 0.55px
            );
          background-size: 5px 5px;
          mix-blend-mode: multiply;
        }

        .nita-intro__top-line {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          z-index: 4;
          height: 3px;
          background: #080808;
          transform-origin: left;
          animation:
            nitaIntroTopLine
            1400ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            both;
        }

        .nita-intro__corner {
          position: absolute;
          top: 28px;
          z-index: 5;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0;
          animation:
            nitaIntroCorner
            750ms
            ease
            400ms
            both;
        }

        .nita-intro__corner--left {
          left: 30px;
        }

        .nita-intro__corner--right {
          right: 30px;
        }

        .nita-intro__stage {
          position: absolute;
          inset: 0;
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          text-align: center;
        }

        .nita-intro__eyebrow {
          margin: 0 0 26px;
          color: rgba(
            0,
            0,
            0,
            0.4
          );
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          opacity: 0;
          transform: translateY(
            12px
          );
          animation:
            nitaIntroTextReveal
            700ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            260ms
            both;
        }

        .nita-intro__logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(
            16px,
            3vw,
            42px
          );
          overflow: hidden;
        }

        .nita-intro__logo {
          display: block;
          font-size: clamp(
            44px,
            9vw,
            144px
          );
          font-weight: 600;
          letter-spacing: -0.065em;
          line-height: 0.86;
          text-transform: uppercase;
        }

        .nita-intro__logo--left {
          opacity: 0;
          transform: translateX(
            -46vw
          );
          animation:
            nitaIntroLogoLeft
            1100ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            180ms
            both;
        }

        .nita-intro__logo--right {
          opacity: 0;
          transform: translateX(
            46vw
          );
          animation:
            nitaIntroLogoRight
            1100ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            180ms
            both;
        }

        .nita-intro__message {
          margin: 28px 0 0;
          color: rgba(
            0,
            0,
            0,
            0.48
          );
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.19em;
          text-transform: uppercase;
          opacity: 0;
          transform: translateY(
            12px
          );
          animation:
            nitaIntroTextReveal
            700ms
            cubic-bezier(
              0.16,
              1,
              0.3,
              1
            )
            780ms
            both;
        }

        .nita-intro__progress {
          position: relative;
          width: min(
            240px,
            54vw
          );
          height: 1px;
          margin-top: 32px;
          overflow: hidden;
          background: rgba(
            0,
            0,
            0,
            0.13
          );
          opacity: 0;
          animation:
            nitaIntroProgressShow
            250ms
            ease
            700ms
            both;
        }

        .nita-intro__progress span {
          position: absolute;
          inset: 0;
          background: #080808;
          transform: translateX(
            -101%
          );
          animation:
            nitaIntroProgress
            1450ms
            cubic-bezier(
              0.65,
              0,
              0.35,
              1
            )
            760ms
            both;
        }

        .nita-intro__skip {
          position: absolute;
          right: 25px;
          bottom: 23px;
          z-index: 8;
          border: 0;
          background: transparent;
          color: rgba(
            0,
            0,
            0,
            0.38
          );
          padding: 8px;
          cursor: pointer;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          transition: color 200ms ease;
        }

        .nita-intro__skip:hover {
          color: #080808;
        }

        @keyframes nitaIntroTopLine {
          from {
            transform: scaleX(0);
          }

          to {
            transform: scaleX(1);
          }
        }

        @keyframes nitaIntroCorner {
          from {
            opacity: 0;
          }

          to {
            opacity: 0.38;
          }
        }

        @keyframes nitaIntroTextReveal {
          from {
            opacity: 0;
            transform: translateY(
              12px
            );
          }

          to {
            opacity: 1;
            transform: translateY(
              0
            );
          }
        }

        @keyframes nitaIntroLogoLeft {
          from {
            opacity: 0;
            transform: translateX(
              -46vw
            );
          }

          to {
            opacity: 1;
            transform: translateX(
              0
            );
          }
        }

        @keyframes nitaIntroLogoRight {
          from {
            opacity: 0;
            transform: translateX(
              46vw
            );
          }

          to {
            opacity: 1;
            transform: translateX(
              0
            );
          }
        }

        @keyframes nitaIntroProgressShow {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes nitaIntroProgress {
          0% {
            transform: translateX(
              -101%
            );
          }

          68% {
            transform: translateX(
              0
            );
          }

          100% {
            transform: translateX(
              101%
            );
          }
        }

        @media (
          max-width: 640px
        ) {
          .nita-intro__corner {
            top: 22px;
            font-size: 7px;
          }

          .nita-intro__corner--left {
            left: 20px;
          }

          .nita-intro__corner--right {
            right: 20px;
          }

          .nita-intro__logo-wrap {
            flex-direction: column;
            gap: 7px;
          }

          .nita-intro__logo {
            font-size: clamp(
              58px,
              20vw,
              92px
            );
          }

          .nita-intro__message {
            max-width: 270px;
            line-height: 1.8;
          }

          .nita-intro__skip {
            right: 16px;
            bottom: 16px;
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .nita-intro__top-line,
          .nita-intro__corner,
          .nita-intro__eyebrow,
          .nita-intro__logo,
          .nita-intro__message,
          .nita-intro__progress,
          .nita-intro__progress span {
            animation-duration: 1ms;
            animation-delay: 0ms;
          }
        }
      `}</style>

      <div
        className={`nita-intro ${leaving ? "nita-intro--leaving" : ""}`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483646,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          isolation: "isolate",
          background: "#f3f0e9",
          color: "#080808",
        }}
        aria-hidden="true"
      >
        <div className="nita-intro__grain" />

        <div className="nita-intro__top-line" />

        <div className="nita-intro__corner nita-intro__corner--left">
          electronics and technology
        </div>

        <div className="nita-intro__corner nita-intro__corner--right">
          Est. 2026
        </div>

        <div className="nita-intro__stage">
          <p className="nita-intro__eyebrow">
            Selected electronics and technology
          </p>

          <div className="nita-intro__logo-wrap">
            <span className="nita-intro__logo nita-intro__logo--left">
              Nita
            </span>

            <span className="nita-intro__logo nita-intro__logo--right">
              Style
            </span>
          </div>

          <p className="nita-intro__message">
            Modern products. Distinctive details.
          </p>

          <div className="nita-intro__progress">
            <span />
          </div>
        </div>

        <button
          type="button"
          onClick={closeIntro}
          className="nita-intro__skip"
          aria-label="Skip welcome animation"
        >
          Skip
        </button>
      </div>
    </>
  );
}
