"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { resendCustomerCode, verifyCustomerCode } from "../actions";

type VerificationFormProps = {
  email: string;
  error?: string;
  message?: string;
};

const CODE_LENGTH = 6;
const RESEND_DELAY = 60;

function maskEmail(email: string) {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email;
  }

  const visibleStart = name.length > 1 ? name.slice(0, 2) : name[0];

  const hiddenLength = Math.max(3, name.length - visibleStart.length);

  return `${visibleStart}${"•".repeat(hiddenLength)}@${domain}`;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(
    2,
    "0",
  )}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function VerificationForm({
  email,
  error,
  message,
}: VerificationFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));

  const [countdown, setCountdown] = useState(RESEND_DELAY);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const code = useMemo(() => digits.join(""), [digits]);

  const isComplete = code.length === CODE_LENGTH;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [countdown]);

  function updateDigit(index: number, value: string) {
    const number = value.replace(/\D/g, "").slice(-1);

    setDigits((current) => {
      const next = [...current];
      next[index] = number;
      return next;
    });

    if (number && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const pastedCode = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pastedCode) {
      return;
    }

    const nextDigits = Array(CODE_LENGTH).fill("");

    pastedCode.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });

    setDigits(nextDigits);

    const nextFocusIndex = Math.min(pastedCode.length, CODE_LENGTH - 1);

    inputRefs.current[nextFocusIndex]?.focus();
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
            Secure verification
          </p>

          <h1 className="mt-3 text-4xl font-semibold uppercase leading-none tracking-[-0.045em] sm:text-5xl">
            Check your email
          </h1>
        </div>

        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-neutral-200 text-sm font-semibold">
          06
        </div>
      </div>

      <p className="mt-6 max-w-md text-sm leading-7 text-neutral-500">
        We sent a six-digit verification code to:
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="break-all text-sm font-semibold">{maskEmail(email)}</p>

        <Link
          href="/account?mode=register"
          className="bg-transparent text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 shadow-none transition hover:text-black"
        >
          Change email
        </Link>
      </div>

      {error ? (
        <div className="mt-6 border border-red-200 bg-red-50 px-4 py-4">
          <p className="text-sm font-medium leading-6 text-red-700">{error}</p>
        </div>
      ) : null}

      {message ? (
        <div className="mt-6 border border-green-200 bg-green-50 px-4 py-4">
          <p className="text-sm font-medium leading-6 text-green-800">
            {message}
          </p>
        </div>
      ) : null}

      <form
        action={verifyCustomerCode}
        className="mt-8"
        onSubmit={(event) => {
          if (!isComplete) {
            event.preventDefault();
            inputRefs.current[digits.findIndex((digit) => !digit)]?.focus();
          }
        }}
      >
        <input type="hidden" name="email" value={email} />

        <input type="hidden" name="code" value={code} />

        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-[0.16em]">
            Verification code
          </legend>

          <div
            className="mt-4 grid grid-cols-6 gap-2 sm:gap-3"
            onPaste={handlePaste}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Verification digit ${index + 1}`}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onFocus={(event) => event.currentTarget.select()}
                className={`aspect-square min-w-0 border text-center text-xl font-semibold outline-none transition sm:text-2xl ${
                  digit
                    ? "border-black bg-black text-white"
                    : "border-neutral-300 bg-white text-black focus:border-black focus:ring-4 focus:ring-neutral-100"
                }`}
              />
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!isComplete}
          className="mt-7 w-full border border-black bg-black px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 disabled:text-neutral-400"
        >
          Verify my account
        </button>
      </form>

      <div className="mt-7 border-t border-neutral-200 pt-6">
        <p className="text-sm text-neutral-500">
          Didn&apos;t receive your code?
        </p>

        <form action={resendCustomerCode} className="mt-3">
          <input type="hidden" name="email" value={email} />

          <button
            type="submit"
            disabled={countdown > 0}
            className="bg-transparent text-[11px] font-semibold uppercase tracking-[0.15em] text-black shadow-none transition hover:text-neutral-500 disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            {countdown > 0
              ? `Resend available in ${formatCountdown(countdown)}`
              : "Resend verification code"}
          </button>
        </form>
      </div>

      <div className="mt-8 border border-neutral-200 bg-neutral-50 px-5 py-5">
        <div className="flex gap-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black text-[10px] font-semibold text-white">
            i
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Keep your account secure
            </p>

            <p className="mt-2 text-xs leading-6 text-neutral-500">
              Nita Style will never ask you to share this code by telephone,
              Instagram, WhatsApp, or email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
