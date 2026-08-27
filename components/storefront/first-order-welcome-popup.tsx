"use client";

import { Check, Mail, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  shouldShow: boolean;
};

const SESSION_DISMISSED = "st-welcome-dismissed-session";

const CLAIMED = "st-welcome-claimed";

export default function FirstOrderWelcomePopup({ shouldShow }: Props) {
  const pathname = usePathname();

  const [visible, setVisible] = useState(false);

  const [closing, setClosing] = useState(false);

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!shouldShow) {
      return;
    }

    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/account") ||
      pathname.startsWith("/checkout")
    ) {
      return;
    }

    try {
      /*
       * Once this browser successfully claimed the
       * welcome offer, do not keep advertising it.
       */
      if (localStorage.getItem(CLAIMED) === "true") {
        return;
      }

      /*
       * Closing the popup suppresses it only for the
       * current browser session. A future fresh visit
       * can show the offer again.
       */
      if (sessionStorage.getItem(SESSION_DISMISSED) === "true") {
        return;
      }
    } catch {}

    const timer = window.setTimeout(() => {
      setClosing(false);
      setVisible(true);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pathname, shouldShow]);

  function close() {
    if (closing) {
      return;
    }

    setClosing(true);

    try {
      sessionStorage.setItem(SESSION_DISMISSED, "true");
    } catch {}

    window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 440);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/welcome-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        setSuccess(false);
        setMessage(result.message || "Please try again.");
        return;
      }

      setSuccess(true);
      setMessage(result.message || "Your code has been sent.");

      try {
        localStorage.setItem(CLAIMED, "true");
      } catch {}
    } catch {
      setSuccess(false);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      data-st-welcome-popup-state={closing ? "closing" : "open"}
      className="st-welcome-popup-overlay fixed inset-0 z-[115] flex items-center justify-center p-5"
    >
      <button
        type="button"
        aria-label="Close welcome offer"
        onClick={close}
        className="absolute inset-0 bg-black/15"
      />

      <section
        role="dialog"
        aria-modal="true"
        className="st-welcome-popup-panel relative z-10 w-full max-w-[430px] rounded-[24px] border border-black/[0.08] bg-white shadow-[0_30px_100px_rgba(29,29,31,0.20)]"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          data-st-welcome-close="true"
          className="absolute right-4 top-4 h-10 w-10 rounded-[12px] border border-black/[0.06] bg-[#f6f6f4] p-0 text-[#1d1d1f] transition-colors duration-200 hover:border-[#f5b335]/45 hover:bg-[#fff5dc] focus:outline-none focus-visible:border-[#f5b335]/55 focus-visible:ring-4 focus-visible:ring-[#f5b335]/10"
        >
          <X
            aria-hidden="true"
            data-st-welcome-close-icon="true"
            className="pointer-events-none"
          />
        </button>

        <div className="p-8 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-[14px] bg-[#f5b335]">
            <Mail className="h-5 w-5" />
          </div>

          <span className="mt-6 block text-[9px] font-bold uppercase tracking-[0.2em] text-[#8a5b00]">
            Welcome to Stereophonie
          </span>

          <h2 className="mt-2 text-[30px] font-semibold leading-[0.98] tracking-[-0.055em]">
            10% off your
            <br />
            first order.
          </h2>

          {!success ? (
            <>
              <p className="mt-4 text-sm leading-6 text-black/48">
                Enter your email and we’ll send you a private 10% discount code
                for your first purchase.
              </p>

              <form onSubmit={submit} className="mt-6">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 w-full rounded-[13px] border border-black/[0.10] px-4 text-center text-base outline-none transition placeholder:text-center focus:border-[#f5b335] focus:ring-4 focus:ring-[#f5b335]/10"
                />

                {message ? (
                  <p className="mt-3 text-center text-xs leading-5 text-red-600">
                    {message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 h-12 w-full rounded-[13px] bg-[#f5b335] text-xs font-semibold text-black transition hover:bg-[#eaaa2b] disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Get my 10% code"}
                </button>
              </form>

              <p className="mt-4 text-[10px] leading-4 text-black/32">
                One private code per email. First order only. One successful
                use.
              </p>
            </>
          ) : (
            <div className="mt-6">
              <p className="text-sm text-black/48">{message}</p>

              <div className="mx-auto mt-6 flex max-w-[300px] flex-col items-center">
                <div className="relative grid h-16 w-16 place-items-center rounded-full border border-[#f5b335]/35 bg-[#fff8e8] shadow-[0_0_0_8px_rgba(245,179,53,0.06)]">
                  <Check className="h-7 w-7 text-[#8a5b00]" />
                  <span className="absolute inset-0 animate-ping rounded-full border border-[#f5b335]/20 opacity-40" />
                </div>

                <strong className="mt-5 text-lg font-semibold tracking-[-0.025em] text-[#1d1d1f]">
                  Check your inbox
                </strong>

                <p className="mt-2 text-xs leading-5 text-black/42">
                  Your private 10% discount code is waiting in your email.
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                className="st-welcome-continue-button mt-5 h-12 w-full rounded-[13px] border border-[#c58b22]/45 bg-white text-xs font-semibold text-[#1d1d1f] shadow-[0_2px_8px_rgba(29,29,31,0.035)] transition-all duration-300 hover:border-[#c58b22]/75 hover:bg-[#fffaf0] hover:shadow-[0_0_0_4px_rgba(245,179,53,0.10),0_10px_30px_rgba(196,135,27,0.12)] focus:outline-none focus-visible:border-[#c58b22]/80 focus-visible:ring-4 focus-visible:ring-[#f5b335]/12"
              >
                Continue shopping
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
