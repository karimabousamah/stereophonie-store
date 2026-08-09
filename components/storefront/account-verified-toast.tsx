"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";

type AccountNotice = {
  eyebrow: string;
  title: string;
  description: string;
  footer: string;
  symbol: string;
};

export default function AccountVerifiedToast() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);

  const [visible, setVisible] = useState(false);

  const [leaving, setLeaving] = useState(false);

  const accountStatus = searchParams.get("account");

  const notice = useMemo<AccountNotice | null>(() => {
    switch (accountStatus) {
      case "logged-in":
        return {
          eyebrow: "Signed in successfully",
          title: "Welcome back",
          description:
            "You are now securely signed in to your Nita Style customer account.",
          footer: "Customer session active",
          symbol: "✓",
        };

      case "logged-out":
        return {
          eyebrow: "Signed out securely",
          title: "See you soon",
          description:
            "You have been signed out successfully. Your account information remains protected.",
          footer: "Secure session ended",
          symbol: "✓",
        };

      case "created":
        return {
          eyebrow: "Account created",
          title: "Welcome to Nita Style",
          description:
            "Your customer account has been created successfully and is ready to use.",
          footer: "Customer account active",
          symbol: "✓",
        };

      case "verified":
        return {
          eyebrow: "Account verified",
          title: "Welcome to Nita Style",
          description:
            "Your email has been confirmed and your customer account is ready to use.",
          footer: "Email verification completed",
          symbol: "✓",
        };

      case "deleted":
        return {
          eyebrow: "Account deleted",
          title: "Deletion completed",
          description:
            "Your customer account has been permanently deleted and you have been signed out securely.",
          footer: "Account access removed",
          symbol: "✓",
        };

      default:
        return null;
    }
  }, [accountStatus]);

  const cleanUrlAndClose = useCallback(() => {
    setLeaving(true);

    window.setTimeout(() => {
      setVisible(false);
      setLeaving(false);

      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.delete("account");

      const query = nextParams.toString();

      router.replace(query ? `/?${query}` : "/", {
        scroll: false,
      });
    }, 300);
  }, [router, searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    setVisible(true);
    setLeaving(false);

    const timer = window.setTimeout(cleanUrlAndClose, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [accountStatus, notice, cleanUrlAndClose]);

  if (!mounted || !visible || !notice) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed right-4 top-4 z-[2147483647] w-[calc(100%-2rem)] max-w-[440px] transition-all duration-300 sm:right-7 sm:top-7 ${
        leaving ? "-translate-y-3 opacity-0" : "translate-y-0 opacity-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden border border-black/10 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
        <div className="h-1 bg-black" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-sm font-semibold text-white">
              {notice.symbol}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                {notice.eyebrow}
              </p>

              <h2 className="mt-2 text-xl font-semibold uppercase tracking-[-0.025em]">
                {notice.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-neutral-500">
                {notice.description}
              </p>
            </div>

            <button
              type="button"
              onClick={cleanUrlAndClose}
              aria-label="Close notification"
              className="grid h-8 w-8 shrink-0 place-items-center border border-neutral-200 bg-white text-base text-neutral-400 transition hover:border-black hover:bg-black hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
              {notice.footer}
            </p>

            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        <div className="h-[2px] origin-left animate-[accountNoticeProgress_5s_linear_forwards] bg-neutral-300" />

        <style jsx>{`
          @keyframes accountNoticeProgress {
            from {
              transform: scaleX(1);
            }

            to {
              transform: scaleX(0);
            }
          }
        `}</style>
      </div>
    </div>,
    document.body,
  );
}
