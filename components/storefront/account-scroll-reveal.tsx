"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

export default function AccountScrollReveal() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY < 90);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function revealAccount() {
    window.scrollTo({
      top: Math.max(window.innerHeight * 0.72, 500),
      behavior: "smooth",
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={revealAccount}
        aria-label="Scroll to reveal account information"
        className={[
          "absolute left-1/2 top-[calc(100%+105px)] z-30",
          "flex -translate-x-1/2 flex-col items-center justify-center",
          "border-0 bg-transparent p-0",
          "transition-all duration-500",
          visible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        ].join(" ")}
      >
        <span className="account-reveal-orbit">
          <span className="account-reveal-glow" />

          <span className="account-reveal-inner">
            <span className="account-reveal-label">Scroll to reveal</span>

            <span className="account-reveal-line">
              <span />
            </span>

            <ChevronDown
              aria-hidden="true"
              className="account-reveal-chevron"
            />
          </span>
        </span>
      </button>

      <style jsx>{`
        .account-reveal-orbit {
          position: relative;
          display: flex;
          width: 172px;
          min-height: 92px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          isolation: isolate;
          animation: revealFloat 3.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }

        .account-reveal-glow {
          position: absolute;
          inset: 8px 2px;
          z-index: -2;
          border-radius: 999px;
          background: radial-gradient(
            ellipse at center,
            rgba(81, 119, 255, 0.3) 0%,
            rgba(81, 101, 255, 0.16) 31%,
            rgba(81, 91, 255, 0.055) 53%,
            transparent 74%
          );
          filter: blur(15px);
          animation: revealBreath 2.8s ease-in-out infinite;
        }

        .account-reveal-orbit::before {
          content: "";
          position: absolute;
          inset: 16px 24px;
          z-index: -1;
          border: 1px solid rgba(70, 97, 220, 0.1);
          border-radius: 999px;
          opacity: 0.55;
          transform: scale(0.94);
          animation: revealRing 2.8s ease-in-out infinite;
        }

        .account-reveal-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .account-reveal-label {
          white-space: nowrap;
          color: rgba(10, 10, 10, 0.55);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.23em;
          line-height: 1;
          text-transform: uppercase;
          transition:
            color 300ms ease,
            letter-spacing 450ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .account-reveal-line {
          position: relative;
          display: block;
          width: 1px;
          height: 27px;
          margin-top: 9px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.1);
        }

        .account-reveal-line span {
          position: absolute;
          top: -80%;
          left: 0;
          width: 1px;
          height: 70%;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(64, 99, 255, 0.95),
            transparent
          );
          animation: revealLine 1.45s ease-in-out infinite;
        }

        .account-reveal-chevron {
          width: 15px;
          height: 15px;
          margin-top: 3px;
          color: rgba(62, 89, 225, 0.78);
          stroke-width: 1.5;
          animation: revealChevron 1.45s ease-in-out infinite;
        }

        button:hover .account-reveal-label {
          color: rgba(42, 67, 195, 0.95);
          letter-spacing: 0.27em;
        }

        button:hover .account-reveal-glow {
          filter: blur(18px);
        }

        @keyframes revealFloat {
          0%,
          100% {
            transform: translate3d(0, -2px, 0);
          }

          50% {
            transform: translate3d(0, 7px, 0);
          }
        }

        @keyframes revealBreath {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(0.88);
          }

          50% {
            opacity: 1;
            transform: scale(1.16);
          }
        }

        @keyframes revealRing {
          0%,
          100% {
            opacity: 0.24;
            transform: scale(0.91);
          }

          50% {
            opacity: 0.62;
            transform: scale(1.08);
          }
        }

        @keyframes revealLine {
          0% {
            transform: translateY(0);
          }

          100% {
            transform: translateY(265%);
          }
        }

        @keyframes revealChevron {
          0%,
          100% {
            opacity: 0.35;
            transform: translateY(-2px);
          }

          50% {
            opacity: 1;
            transform: translateY(4px);
          }
        }

        @media (max-width: 767px) {
          .account-reveal-orbit {
            width: 148px;
            min-height: 78px;
          }

          .account-reveal-label {
            font-size: 8px;
            letter-spacing: 0.2em;
          }

          .account-reveal-line {
            height: 22px;
            margin-top: 7px;
          }

          .account-reveal-chevron {
            width: 13px;
            height: 13px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .account-reveal-orbit,
          .account-reveal-glow,
          .account-reveal-orbit::before,
          .account-reveal-line span,
          .account-reveal-chevron {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
