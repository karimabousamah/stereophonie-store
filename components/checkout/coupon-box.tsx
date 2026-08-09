"use client";

import { AlertCircle, Check, Loader2, TicketPercent, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useState } from "react";

import { previewCoupon } from "@/app/checkout/coupon-actions";

export type AppliedCoupon = {
  code: string;
  name: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  subtotalAfterDiscount: number;
  appliedSubtotal: number;
};

type CouponBoxProps = {
  subtotal: number;
  customerEmail?: string;
  value: AppliedCoupon | null;
  onChange: (coupon: AppliedCoupon | null) => void;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function CouponBox({
  subtotal,
  customerEmail = "",
  value,
  onChange,
}: CouponBoxProps) {
  const [code, setCode] = useState("");

  const [message, setMessage] = useState("");

  const [hasError, setHasError] = useState(false);

  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!value) {
      return;
    }

    const subtotalChanged = Math.abs(value.appliedSubtotal - subtotal) > 0.009;

    if (!subtotalChanged) {
      return;
    }

    onChange(null);
    setCode("");
    setHasError(false);

    setMessage("Your cart changed. Apply the coupon again.");
  }, [subtotal, value, onChange]);

  async function applyCoupon() {
    if (isApplying || subtotal <= 0) {
      return;
    }

    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setHasError(true);

      setMessage("Enter a coupon code.");

      return;
    }

    setIsApplying(true);
    setHasError(false);
    setMessage("");

    try {
      const result = await previewCoupon({
        code: normalizedCode,
        subtotal,
        customerEmail,
      });

      if (!result.success || !result.code) {
        onChange(null);
        setHasError(true);

        setMessage(result.message || "This coupon could not be applied.");

        return;
      }

      const appliedCoupon: AppliedCoupon = {
        code: result.code,

        name: result.name || "Promotion",

        description: result.description ?? null,

        discountType: result.discountType || "fixed",

        discountValue: Number(result.discountValue ?? 0),

        discountAmount: Number(result.discountAmount ?? 0),

        subtotalAfterDiscount: Number(result.subtotalAfterDiscount ?? subtotal),

        appliedSubtotal: subtotal,
      };

      onChange(appliedCoupon);

      setCode(appliedCoupon.code);

      setHasError(false);

      setMessage(result.message || "Coupon applied successfully.");
    } catch (error) {
      onChange(null);
      setHasError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "The coupon could not be checked.",
      );
    } finally {
      setIsApplying(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    void applyCoupon();
  }

  function removeCoupon() {
    onChange(null);
    setCode("");
    setMessage("");
    setHasError(false);
  }

  if (value) {
    return (
      <section className="border border-emerald-200 bg-emerald-50">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
            <Check className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Coupon applied
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.12em]">
                {value.code}
              </p>

              <span className="text-xs text-emerald-800/55">·</span>

              <p className="text-sm font-semibold text-emerald-900">
                {money(value.discountAmount)} discount
              </p>
            </div>

            <p className="mt-2 text-xs leading-5 text-emerald-900/60">
              {value.name}
            </p>

            {value.description ? (
              <p className="mt-1 text-xs leading-5 text-emerald-900/50">
                {value.description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={removeCoupon}
            aria-label="Remove coupon"
            className="flex h-9 w-9 shrink-0 items-center justify-center text-emerald-900/45 transition hover:bg-emerald-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="border border-black/10 bg-black/[0.02] p-4">
      <div className="flex items-center gap-2">
        <TicketPercent className="h-4 w-4 text-black/45" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-black/55">
          Coupon code
        </p>
      </div>

      <div className="mt-4 flex">
        <input
          type="text"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());

            if (hasError) {
              setHasError(false);
              setMessage("");
            }
          }}
          onKeyDown={handleInputKeyDown}
          disabled={isApplying}
          placeholder="Enter code"
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Coupon code"
          aria-invalid={hasError}
          className={`min-h-12 min-w-0 flex-1 border bg-white px-4 text-sm font-medium uppercase tracking-[0.1em] text-black outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-black/25 disabled:opacity-60 ${
            hasError
              ? "border-red-500 focus:border-red-600"
              : "border-black/15 focus:border-black"
          }`}
        />

        <button
          type="button"
          onClick={() => {
            void applyCoupon();
          }}
          disabled={isApplying || subtotal <= 0}
          className="flex min-h-12 min-w-24 items-center justify-center gap-2 bg-black px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isApplying ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking
            </>
          ) : (
            "Apply"
          )}
        </button>
      </div>

      {message ? (
        <div
          role={hasError ? "alert" : undefined}
          className={`mt-3 flex items-start gap-2 text-xs leading-5 ${
            hasError ? "text-red-600" : "text-black/50"
          }`}
        >
          {hasError ? (
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}

          <span>{message}</span>
        </div>
      ) : null}
    </section>
  );
}
