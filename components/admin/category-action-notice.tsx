"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type CategoryActionNoticeProps = {
  variant: "success" | "error";
  message: string;
};

type NoticePhase =
  | "enter"
  | "shown"
  | "exit";

function successTitle(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("subcategory")) {
    if (normalized.includes("created")) {
      return "Subcategory created";
    }

    if (normalized.includes("deleted")) {
      return "Subcategory deleted";
    }

    if (
      normalized.includes("updated") ||
      normalized.includes("saved")
    ) {
      return "Subcategory saved";
    }

    return "Subcategory updated";
  }

  if (normalized.includes("category")) {
    if (normalized.includes("created")) {
      return "Category created";
    }

    if (normalized.includes("deleted")) {
      return "Category deleted";
    }

    if (
      normalized.includes("updated") ||
      normalized.includes("saved")
    ) {
      return "Category saved";
    }

    return "Category updated";
  }

  return "Changes saved";
}

export default function CategoryActionNotice({
  variant,
  message,
}: CategoryActionNoticeProps) {
  const [visible, setVisible] =
    useState(true);

  const [phase, setPhase] =
    useState<NoticePhase>("enter");

  useEffect(() => {
    let secondFrame = 0;

    const firstFrame =
      window.requestAnimationFrame(() => {
        secondFrame =
          window.requestAnimationFrame(() => {
            setPhase("shown");
          });
      });

    const exitTimer =
      window.setTimeout(() => {
        setPhase("exit");
      }, 5000);

    const removeTimer =
      window.setTimeout(() => {
        setVisible(false);

        const url =
          new URL(window.location.href);

        url.searchParams.delete("success");
        url.searchParams.delete("error");

        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
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

      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, [message]);

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
            {successTitle(message)}
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
          Action failed
        </p>

        <p className="mt-2 text-sm leading-6 text-white/65">
          {message}
        </p>
      </div>
    </div>
  );
}
