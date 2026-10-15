"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type ProductActionNoticeProps = {
  variant: "success" | "error";
  title: string;
  message: string;
  clearQueryParams?: string[];
  onDismiss?: () => void;
};

type NoticePhase =
  | "enter"
  | "shown"
  | "exit";

export default function ProductActionNotice({
  variant,
  title,
  message,
  clearQueryParams = [],
  onDismiss,
}: ProductActionNoticeProps) {
  const [visible, setVisible] =
    useState(true);

  const [phase, setPhase] =
    useState<NoticePhase>("enter");

  const clearSignature =
    clearQueryParams.join("|");

  useEffect(() => {
    setVisible(true);
    setPhase("enter");

    let secondFrame = 0;

    const firstFrame =
      window.requestAnimationFrame(() => {
        secondFrame =
          window.requestAnimationFrame(() => {
            setPhase("shown");
          });
      });

    /*
     * EXACT Categories timing:
     * remain visible for five seconds.
     */
    const exitTimer =
      window.setTimeout(() => {
        setPhase("exit");
      }, 5000);

    const removeTimer =
      window.setTimeout(() => {
        setVisible(false);

        if (clearQueryParams.length > 0) {
          const url =
            new URL(window.location.href);

          clearQueryParams.forEach(
            (parameter) => {
              url.searchParams.delete(
                parameter,
              );
            },
          );

          window.history.replaceState(
            window.history.state,
            "",
            `${url.pathname}${url.search}${url.hash}`,
          );
        }

        onDismiss?.();
      }, 5450);

    return () => {
      window.cancelAnimationFrame(
        firstFrame,
      );

      if (secondFrame) {
        window.cancelAnimationFrame(
          secondFrame,
        );
      }

      window.clearTimeout(
        exitTimer,
      );

      window.clearTimeout(
        removeTimer,
      );
    };
  }, [
    variant,
    title,
    message,
    clearSignature,
  ]);

  if (!visible) {
    return null;
  }

  const isSuccess =
    variant === "success";

  if (isSuccess) {
    return (
      <div
        data-admin-product-success="true"
        className={`st-admin-product-alert-v5 st-category-action-notice-v4 mb-7 flex items-start gap-4 rounded-[18px] border border-emerald-400/25 bg-emerald-400/[0.07] p-5 is-${phase}`}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2
          className="h-5 w-5 shrink-0 self-center text-emerald-300"
          aria-hidden="true"
        />

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            {title}
          </p>

          <p className="mt-2 text-sm leading-6 text-white/65">
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-admin-category-error="true"
      data-admin-product-error="true"
      className={`st-admin-product-alert-v5 st-category-action-notice-v4 mb-7 flex items-start gap-4 rounded-[18px] border p-5 is-${phase}`}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle
        className="h-5 w-5 shrink-0 self-center"
        aria-hidden="true"
      />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          {title}
        </p>

        <p className="mt-2 text-sm leading-6 text-white/65">
          {message}
        </p>
      </div>
    </div>
  );
}
